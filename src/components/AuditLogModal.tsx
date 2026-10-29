import React from 'react';
import { History, X, Clock, User, MessageSquare } from 'lucide-react';
import type { WorkflowLogEntry } from '../types';

interface AuditLogModalProps {
  logs: WorkflowLogEntry[];
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ logs, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Workflow Audit Trail & Governance Log</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Complete chronological record of all state transitions, approvals, returns, and reviewer comments.
        </p>

        <div className="overflow-y-auto space-y-3 flex-1 pr-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.role === 'Author'
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : log.role === 'Reviewer'
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {log.role}
                  </span>
                  <span className="font-semibold text-white">{log.user}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <div className="text-slate-300 font-medium">{log.action}</div>

              {log.comment && (
                <div className="bg-slate-900 border border-slate-800/80 rounded-lg p-2.5 text-slate-400 text-[11px] leading-relaxed flex items-start gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <span>{log.comment}</span>
                </div>
              )}
            </div>
          ))}
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
