# SpecForge: Automated Course Specification & Quality Engine

SpecForge converts messy university course specifications and optional question-paper blueprints into corrected, validated curriculum specifications with complete CO-PO-PSO articulation matrices, Bloom's taxonomy verification, automated defect remediation (Rules V1–V10), and a multi-role governance workflow (Author, Reviewer, HOD).

---

## Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Scorer API (Port 3001)
To run the backend API server evaluated by the automated competition scorer:
```bash
npm start
```
The API is available at `http://localhost:3001/api/v1`.

### 3. Start the Interactive Web Application (Port 3000 / 5173)
To run the full visual interface with document preview, matrix editor, and workflow controls:
```bash
npm run dev
```

---

## Verification & Scoring

### Quick Schema Validation
Checks that `outputs/specforge_output.json` conforms to `config/specforge_output.schema.json` and has `input_id: "SAMPLE"`:
```bash
npm run check
```

### Full End-to-End Scorer Verification
Sends the official sample files (`sample_course_spec.docx` and `sample_blueprint.doc`) to `POST /api/v1/generate`, saves `outputs/specforge_output.json` and `outputs/spec.html`, and verifies schema conformity:
```bash
npm run verify -- gemini YOUR_API_KEY
```
*(Supports providers: `gemini`, `openrouter`, or `anthropic`)*

### Typecheck & Build
```bash
npm run typecheck
npm run build
```

---

## API Contract

- **`POST /api/v1/generate`**: Multipart form data with fields `spec` (required) and `blueprint` (optional).
  - Headers: `x-llm-provider`, `x-llm-key`, `x-llm-model`.
  - Response: `{ "success": true, "data": { "output": <specforge_output>, "html": "<filled spec>" } }`.
- **`GET /api/v1/health`**: `{ "success": true, "data": { "status": "up" } }`.
- **`POST /api/v1/workflow/transition`**: Enforces role permissions (HTTP 403 on unauthorized actions).

---

## Submission Artifacts

- `outputs/specforge_output.json`: Scored JSON output conforming to `config/specforge_output.schema.json`.
- `outputs/spec.html`: Standalone rendered specification based on official university HTML templates with dynamic `DRAFT` watermark until approved.
