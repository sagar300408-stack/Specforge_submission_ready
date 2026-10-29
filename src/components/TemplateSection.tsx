import React, { useState } from 'react';
import { 
  Layout, 
  Download, 
  AlertCircle, 
  Check, 
  RotateCw, 
  FileCode, 
  SlidersHorizontal,
  ExternalLink
} from 'lucide-react';
import type { WorkflowState } from '../types';

interface TemplateSectionProps {
  templateChoice: 'integrated' | 'non_lab';
  signals: string[];
  html: string;
  workflowState: WorkflowState;
  onOverride: (template: 'integrated' | 'non_lab', reason: string) => Promise<void>;
}

export const TemplateSection: React.FC<TemplateSectionProps> = ({
  templateChoice,
  signals,
  html,
  workflowState,
  onOverride,
}) => {
  const [overrideActive, setOverrideActive] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<'integrated' | 'non_lab'>(templateChoice);
  const [overrideReason, setOverrideReason] = useState('');
  const [savingOverride, setSavingOverride] = useState(false);

  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) return;
    setSavingOverride(true);
    try {
      await onOverride(selectedTemplate, overrideReason);
      setOverrideActive(false);
    } finally {
      setSavingOverride(false);
    }
  };

  const handleDownloadSpec = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spec.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">Template Engine & Official Document Preview</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Official university layout with sample placeholder scrubbing and dynamic DRAFT watermark
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOverrideActive(!overrideActive)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Manual Override</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadSpec}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export spec.html</span>
          </button>
        </div>
      </div>

      {/* Signals & Detection Banner */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Chosen Template:</span>
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {templateChoice === 'integrated' ? 'Integrated Lab Template' : 'Non-Lab Template'}
            </span>
            {workflowState !== 'Approved' && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Watermark: DRAFT Active
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Signals used:</span>
            {(signals || []).map((sig, idx) => (
              <span key={idx} className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300 text-[11px]">
                &bull; {sig}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Override form modal / drop down */}
      {overrideActive && (
        <form onSubmit={handleApplyOverride} className="p-4 bg-indigo-950/30 border border-indigo-500/40 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-200">
              Template Selection Override (Author)
            </h4>
            <span className="text-[10px] text-indigo-300">Reason is logged into the audit report</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Target Template</label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
              >
                <option value="integrated">Integrated Lab Template</option>
                <option value="non_lab">Non-Lab Template</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Mandatory Override Rationale</label>
              <input
                type="text"
                required
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Approved departmental deviation for external workshop format..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOverrideActive(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingOverride || !overrideReason.trim()}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg cursor-pointer"
            >
              Save Override
            </button>
          </div>
        </form>
      )}

      {/* HTML Document Viewport */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-white shadow-2xl relative">
        <div className="bg-slate-950 text-slate-400 text-xs px-4 py-2 border-b border-slate-800 flex items-center justify-between">
          <span className="font-mono">spec.html &bull; Official Academic Formatting</span>
          <span className="text-[11px] text-slate-400">
            {workflowState === 'Approved' ? 'Status: Approved (No watermark)' : 'Status: In-Progress (DRAFT watermark displayed)'}
          </span>
        </div>

        <iframe
          srcDoc={html}
          title="Course Specification Render"
          className="w-full h-[650px] border-0 bg-white"
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
};
