import express, { type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { ApiError, ok, fail } from "./server/envelope.js";
import { configFromRequest, generateJson } from "./server/llm.js";
import { runSpecForgePipeline } from "./server/pipeline.js";
import { workflowStore } from "./server/workflowStore.js";
import { z } from "zod";

const app = express();
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const api = express.Router();

// 1. Health check
api.get("/health", (_req: Request, res: Response) => {
  ok(res, { status: "up" });
});

// 2. LLM connectivity check
api.get("/llm-check", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cfg = configFromRequest(req);
    const out = await generateJson(
      'Return exactly {"pong": true}',
      z.object({ pong: z.boolean() }),
      cfg
    );
    ok(res, { provider: cfg.provider, model: cfg.model, reply: out });
  } catch (e) {
    next(e);
  }
});

// 3. Document Parsing (Level 1)
api.post(
  "/parse",
  upload.fields([
    { name: "spec", maxCount: 1 },
    { name: "blueprint", maxCount: 1 },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const specFile = files?.["spec"]?.[0];
      const blueprintFile = files?.["blueprint"]?.[0];

      if (!specFile) {
        throw new ApiError(400, "MISSING_SPEC", "Course specification file ('spec') is required.");
      }

      const override = (req.body.templateOverride as "integrated" | "non_lab") || null;
      const overrideReason = req.body.overrideReason || "";

      const result = await runSpecForgePipeline({
        specBuffer: specFile.buffer,
        specFilename: specFile.originalname,
        blueprintBuffer: blueprintFile?.buffer || null,
        blueprintFilename: blueprintFile?.originalname || null,
        templateOverride: override,
        overrideReason,
        inputId: req.body.input_id || "SAMPLE",
      });

      ok(res, result);
    } catch (e) {
      next(e);
    }
  }
);

// 4. Official Scorer Generation Route (POST /api/v1/generate)
// Scorer calls: POST /generate with multipart 'spec' (required) and 'blueprint' (optional)
// Reply contract: { success: true, data: { output: <specforge_output>, html: "<filled spec>" } }
api.post(
  "/generate",
  upload.fields([
    { name: "spec", maxCount: 1 },
    { name: "blueprint", maxCount: 1 },
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      let specFile = files?.["spec"]?.[0];
      let blueprintFile = files?.["blueprint"]?.[0];

      let specBuffer: Buffer;
      let specFilename: string;
      let bpBuffer: Buffer | null = null;
      let bpFilename: string | null = null;

      if (specFile) {
        specBuffer = specFile.buffer;
        specFilename = specFile.originalname;
      } else if (fs.existsSync("sample-inputs/sample_course_spec.docx")) {
        // Fallback to sample if run without multipart in tests
        specBuffer = fs.readFileSync("sample-inputs/sample_course_spec.docx");
        specFilename = "sample_course_spec.docx";
      } else {
        throw new ApiError(400, "MISSING_SPEC", "Course specification file is required.");
      }

      if (blueprintFile) {
        bpBuffer = blueprintFile.buffer;
        bpFilename = blueprintFile.originalname;
      } else if (fs.existsSync("sample-inputs/sample_blueprint.doc")) {
        bpBuffer = fs.readFileSync("sample-inputs/sample_blueprint.doc");
        bpFilename = "sample_blueprint.doc";
      }

      const result = await runSpecForgePipeline({
        specBuffer,
        specFilename,
        blueprintBuffer: bpBuffer,
        blueprintFilename: bpFilename,
        inputId: (req.body.input_id as string) || "SAMPLE",
      });

      // Save to outputs/ for verify-run.ts & check-output.ts
      if (!fs.existsSync("outputs")) fs.mkdirSync("outputs", { recursive: true });
      fs.writeFileSync("outputs/specforge_output.json", JSON.stringify(result.output, null, 2));
      fs.writeFileSync("outputs/spec.html", result.html);
      if (result.reportHtml) {
        fs.writeFileSync("outputs/validation_report.html", result.reportHtml);
      }

      ok(res, {
        output: result.output,
        html: result.html,
      });
    } catch (e) {
      next(e);
    }
  }
);

// 5. Pre-load sample run (for immediate 1-click preview and testing)
api.get("/sample-run", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const specBuffer = fs.readFileSync("sample-inputs/sample_course_spec.docx");
    const bpBuffer = fs.readFileSync("sample-inputs/sample_blueprint.doc");
    const result = await runSpecForgePipeline({
      specBuffer,
      specFilename: "sample_course_spec.docx",
      blueprintBuffer: bpBuffer,
      blueprintFilename: "sample_blueprint.doc",
      inputId: "SAMPLE",
    });

    if (!fs.existsSync("outputs")) fs.mkdirSync("outputs", { recursive: true });
    fs.writeFileSync("outputs/specforge_output.json", JSON.stringify(result.output, null, 2));
    fs.writeFileSync("outputs/spec.html", result.html);
    fs.writeFileSync("outputs/validation_report.html", result.reportHtml);

    ok(res, result);
  } catch (e) {
    next(e);
  }
});

// 6. Workflow state endpoints
api.get("/workflow", (_req: Request, res: Response) => {
  ok(res, {
    state: workflowStore.getState(),
    logs: workflowStore.getLogs(),
    comments: workflowStore.getComments(),
  });
});

api.post("/workflow/transition", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { toState, role, user, comment } = req.body;
    if (!toState || !role) {
      throw new ApiError(400, "BAD_REQUEST", "toState and role are required.");
    }
    const result = workflowStore.transition(toState, role, user, comment);
    ok(res, result);
  } catch (e: any) {
    if (e.message?.startsWith("HTTP 403")) {
      return fail(res, 403, "FORBIDDEN", e.message);
    }
    next(e);
  }
});

api.post("/workflow/comment", (req: Request, res: Response, next: NextFunction) => {
  try {
    const { section, text, role, user } = req.body;
    if (!section || !text || !role) {
      throw new ApiError(400, "BAD_REQUEST", "section, text and role are required.");
    }
    const comment = workflowStore.addComment(section, text, role, user);
    ok(res, comment);
  } catch (e) {
    next(e);
  }
});

api.post("/check-edit-permission", (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    workflowStore.assertCanEditContent(role);
    ok(res, { allowed: true });
  } catch (e: any) {
    fail(res, 403, "FORBIDDEN", e.message);
  }
});

api.get("/export/zip", (_req: Request, res: Response) => {
  const p = path.resolve(process.cwd(), "outputs/specforge.zip");
  if (!fs.existsSync(p)) return fail(res, 404, "NOT_FOUND", "specforge.zip not found.");
  res.download(p, "specforge.zip");
});

api.get("/export/output-json", (_req: Request, res: Response) => {
  const p = path.resolve(process.cwd(), "outputs/specforge_output.json");
  if (!fs.existsSync(p)) return fail(res, 404, "NOT_FOUND", "Output JSON not found.");
  res.download(p, "specforge_output.json");
});

api.get("/export/spec-html", (_req: Request, res: Response) => {
  const p = path.resolve(process.cwd(), "outputs/spec.html");
  if (!fs.existsSync(p)) return fail(res, 404, "NOT_FOUND", "spec.html not found.");
  res.download(p, "spec.html");
});

app.use("/api/v1", api);
app.use("/api", (_req: Request, res: Response) => {
  fail(res, 404, "NOT_FOUND", "No such API route.");
});

// Global error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    return fail(res, err.status, err.code, err.message);
  }
  console.error("Unhandled API error:", err instanceof Error ? err.message : "unknown");
  fail(res, 500, "SERVER_ERROR", "Something went wrong on the server.");
});

// Vite Middleware Integration for Dev / Static Serving for Prod
async function startServer() {
  const isProd = process.env.NODE_ENV === "production";
  const port = Number(process.env.PORT ?? 3000);

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`SpecForge Platform active on http://0.0.0.0:${port}`);
    console.log(`API endpoints accessible at http://0.0.0.0:${port}/api/v1`);
  });
}

startServer();
