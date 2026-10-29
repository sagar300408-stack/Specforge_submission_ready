import React, { useState } from 'react';
import { 
  GitPullRequest, 
  Send, 
  CheckCircle2, 
  RotateCcw, 
  History, 
  MessageSquare,
  AlertTriangle,
  Lock,
  Clock,
  ArrowRight
} from 'lucide-react';
import type { WorkflowRole, WorkflowState, WorkflowLogEntry } from '../types';

interface WorkflowBarProps {
  state: WorkflowState;
  role: WorkflowRole;
  logs: WorkflowLogEntry[];
  onTransition: (toState: WorkflowState, comment?: string) => Promise<void>;
  onOpenLogs: () => void;
}

export const WorkflowBar: React.FC<WorkflowBarProps> = ({
  state,
  role,
  logs,
  onTransition,
  onOpenLogs,
}) => {
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnComment, setReturnComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const steps: WorkflowState[] = ['Draft', 'Submitted', 'Under Review', 'Pending HOD', 'Approved'];
  const currentIndex = steps.indexOf(state);

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnComment.trim()) return;
    setSubmitting(true);
    try {
      await onTransition('Returned', returnComment);
      setReturnModalOpen(false);
      setReturnComment('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickAction = async (toState: WorkflowState) => {
    setSubmitting(true);
    try {
      await onTransition(toState);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Timeline Pipeline */}
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 lg:pb-0">
          {steps.map((step, idx) => {
            const isCompleted = state !== 'Returned' && currentIndex > idx;
            const isCurrent = state === step;
            const isReturned = state === 'Returned' && step === 'Draft';

            return (
              <React.Fragment key={step}>
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    isCurrent
                      ? state === 'Approved'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 ring-1 ring-emerald-500/30'
                        : 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/50 ring-1 ring-indigo-500/40'
                      : isCompleted
                      ? 'bg-slate-800 text-slate-400'
                      : isReturned
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'text-slate-500 bg-slate-950/60'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : isCurrent ? (
                    <Clock className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-current text-[10px] flex items-center justify-center">
                      {idx + 1}
                    </span>
                  )}
                  <span>{step}</span>
                </div>
                {idx < steps.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-slate-700 shrink-0" />
                )}
              </React.Fragment>
            );
          })}

          {state === 'Returned' && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
              <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
              <span>Returned to Author</span>
            </div>
          )}
        </div>

        {/* Role Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Author Actions */}
          {role === 'Author' && (state === 'Draft' || state === 'Returned') && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleQuickAction('Submitted')}
              className="px-3 py-1.5 hover:opacity-90 disabled:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow-sm cursor-pointer"
              style={{ backgroundColor: '#a90000' }}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit to Reviewer</span>
            </button>
          )}

          {/* Reviewer Actions */}
          {role === 'Reviewer' && state === 'Submitted' && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleQuickAction('Under Review')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>Start Review</span>
            </button>
          )}

          {role === 'Reviewer' && state === 'Under Review' && (
            <>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleQuickAction('Pending HOD')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Forward to HOD</span>
              </button>
              <button
                type="button"
                onClick={() => setReturnModalOpen(true)}
                className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Return with Comment</span>
              </button>
            </>
          )}

          {/* HOD Actions */}
          {role === 'HOD' && state === 'Pending HOD' && (
            <>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleQuickAction('Approved')}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-emerald-600/30"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve Specification</span>
              </button>
              <button
                type="button"
                onClick={() => setReturnModalOpen(true)}
                className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Return with Comment</span>
              </button>
            </>
          )}

          {/* Permission Notice Pill */}
          {role !== 'Author' && (
            <span className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-md flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>Read-only: Only Author edits content</span>
            </span>
          )}

          {/* View Audit Log */}
          <button
            type="button"
            onClick={onOpenLogs}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span>Audit Log ({logs.length})</span>
          </button>
        </div>
      </div>

      {/* Return Modal */}
      {returnModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
              <RotateCcw className="w-5 h-5" />
              <span>Return Specification to Author</span>
            </div>
            <p className="text-xs text-slate-300">
              Please specify the required adjustments, syllabus corrections, or mapping rationale needed before resubmission.
            </p>
            <form onSubmit={handleReturnSubmit} className="space-y-4">
              <textarea
                value={returnComment}
                onChange={(e) => setReturnComment(e.target.value)}
                required
                rows={4}
                placeholder="e.g. Please verify CO-5 Bloom level alignment and recheck practical assessment allocation..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !returnComment.trim()}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Confirm Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
