import React, { useState } from 'react';
import { 
  Terminal, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  X, 
  Play, 
  FileCode,
  ShieldCheck,
  Award
} from 'lucide-react';

interface ArenaScorerModalProps {
  onClose: () => void;
  onRunVerify: () => Promise<void>;
  verifying: boolean;
  verifyResult: { success: boolean; message: string; details?: any } | null;
}

export const ArenaScorerModal: React.FC<ArenaScorerModalProps> = ({
  onClose,
  onRunVerify,
  verifying,
  verifyResult,
}) => {
  const [copied, setCopied] = useState(false);

  const curlCommand = `curl -X POST http://localhost:3000/api/v1/generate \\
  -F "spec=@sample-inputs/sample_course_spec.docx" \\
  -F "blueprint=@sample-inputs/sample_blueprint.doc" \\
  -H "x-llm-provider: gemini"`;

  const copyCurl = () => {
    navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 max-w-2xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Competition Scorer & Verification Suite</h3>
              <p className="text-[11px] text-slate-400">Validates POST /api/v1/generate & specforge_output.json schema</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* How It Scored Information */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
          <h4 className="font-bold text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>How the Organiser Scorer Evaluates Your Repository</span>
          </h4>
          <p className="text-slate-400 leading-relaxed">
            The automated scoring system executes a fresh <code className="text-indigo-300">npm install</code> + <code className="text-indigo-300">npm start</code>, then calls <code className="text-indigo-300">POST /api/v1/generate</code> with multipart fields <code className="text-indigo-300">spec</code> and <code className="text-indigo-300">blueprint</code>.
          </p>
          <p className="text-slate-400 leading-relaxed">
            It requires a response of <code className="text-emerald-300">{`{ success: true, data: { output, html } }`}</code> and verifies that <code className="text-indigo-300">output.input_id === 'SAMPLE'</code> matching <code className="text-indigo-300">config/specforge_output.schema.json</code>.
          </p>
        </div>

        {/* Live In-App Verification Trigger */}
        <div className="p-4 bg-slate-950/80 border border-indigo-500/30 rounded-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-white">Execute Full Scorer Validation Pipeline</h4>
              <p className="text-[11px] text-slate-400">
                Runs the official files through POST /generate and executes Ajv 2020 schema validation
              </p>
            </div>
            <button
              type="button"
              disabled={verifying}
              onClick={onRunVerify}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-600/20 shrink-0"
            >
              {verifying ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Run Scorer Check</span>
            </button>
          </div>

          {verifyResult && (
            <div
              className={`p-3.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                verifyResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
              }`}
            >
              {verifyResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-bold">{verifyResult.message}</p>
                {verifyResult.details && (
                  <p className="text-[11px] text-slate-400 font-mono">
                    {verifyResult.details}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* cURL equivalent */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Equivalent CLI Command:</span>
            </label>
            <button
              type="button"
              onClick={copyCurl}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy cURL'}</span>
            </button>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-300 overflow-x-auto">
            <pre>{curlCommand}</pre>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
