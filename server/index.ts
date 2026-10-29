import express, { type Request, type Response, type NextFunction } from "express";
import multer from "multer";
import fs from "fs";
import { z } from "zod";
import { ApiError, ok, fail } from "./envelope.js";
import { configFromRequest, generateJson } from "./llm.js";
import { runSpecForgePipeline } from "./pipeline.js";
import { workflowStore } from "./workflowStore.js";

const app = express();
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

const api = express.Router();

api.get("/health", (_req: Request, res: Response) => ok(res, { status: "up" }));

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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

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

app.use("/api/v1", api);
app.use("/api", (_req: Request, res: Response) => fail(res, 404, "NOT_FOUND", "No such route"));

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) return fail(res, err.status, err.code, err.message);
  console.error("Unhandled:", err instanceof Error ? err.message : "unknown error");
  fail(res, 500, "SERVER_ERROR", "Something went wrong on the server.");
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, "0.0.0.0", () => console.log(`API on http://0.0.0.0:${port}/api/v1`));
