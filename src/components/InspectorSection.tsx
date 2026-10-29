import React from 'react';
import { 
  ShieldAlert, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Bug, 
  Wrench,
  Search
} from 'lucide-react';
import type { Defect, ValidationRuleResult } from '../types';

interface InspectorSectionProps {
  defects: Defect[];
  rules: ValidationRuleResult[];
  reportHtml?: string;
}

export const InspectorSection: React.FC<InspectorSectionProps> = ({
  defects,
  rules,
  reportHtml,
}) => {
  const high = defects.filter((d) => d.severity === 'High').length;
  const medium = defects.filter((d) => d.severity === 'Medium').length;
  const low = defects.filter((d) => d.severity === 'Low').length;

  const handleDownloadReport = () => {
    if (!reportHtml) return;
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'validation_report.html';
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
            <h2 className="text-xl font-bold text-white">Quality Inspector & Defect Remediation</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Level 4 Inspector
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic rule validation (V1–V10) and automated defect resolution log
          </p>
        </div>

        {reportHtml && (
          <button
            type="button"
            onClick={handleDownloadReport}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition shadow-md shadow-amber-600/20 cursor-pointer self-start sm:self-auto"
          >
            <Download className="w-4 h-4" />
            <span>Export validation_report.html</span>
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Bug className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Total Defects</p>
            <p className="text-xl font-bold text-white">{defects.length}</p>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400">High Severity</p>
            <p className="text-xl font-bold text-rose-300">{high}</p>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Medium Severity</p>
            <p className="text-xl font-bold text-amber-300">{medium}</p>
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400">Low Severity</p>
            <p className="text-xl font-bold text-sky-300">{low}</p>
          </div>
        </div>
      </div>

      {/* 10-Point Checklist (Rules V1 to V10) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Rules Evaluation (V1 to V10)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {(rules || []).map((r) => (
            <div
              key={r.id}
              className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-start gap-3"
            >
              <div className="shrink-0 mt-0.5">
                {r.status === 'PASS' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : r.status === 'WARN' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded">
                    {r.id}
                  </span>
                  <span className="text-xs font-medium text-slate-200">{r.rule}</span>
                </div>
                <p className="text-[11px] text-slate-400">{r.details}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Defect Log */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Wrench className="w-4 h-4 text-indigo-400" />
          <span>Detected Anomalies & Automated Fixes Applied</span>
        </h3>

        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold">
                <th className="p-3">Defect Code</th>
                <th className="p-3">Location</th>
                <th className="p-3">Problem Identified in Input</th>
                <th className="p-3">Automated Resolution Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {(defects || []).map((d, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40 transition">
                  <td className="p-3 font-mono font-bold text-indigo-300 whitespace-nowrap">
                    {d.code}
                  </td>
                  <td className="p-3 text-slate-300 whitespace-nowrap">
                    <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded font-mono text-[10px]">
                      {d.location.source}
                      {d.location.section ? ` &bull; Sec ${d.location.section}` : ''}
                      {d.location.refs ? ` [${d.location.refs.join(', ')}]` : ''}
                    </span>
                  </td>
                  <td className="p-3 text-rose-300/90 leading-relaxed max-w-sm">
                    {d.description}
                  </td>
                  <td className="p-3 text-emerald-400 font-medium leading-relaxed max-w-sm">
                    {d.fix}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
