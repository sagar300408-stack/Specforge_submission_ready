import React, { useState } from 'react';
import { MessageSquare, Plus, Send, X, Clock, User } from 'lucide-react';
import type { SectionComment, WorkflowRole } from '../types';

interface CommentsDrawerProps {
  comments: SectionComment[];
  role: WorkflowRole;
  onAddComment: (section: string, text: string) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
}

export const CommentsDrawer: React.FC<CommentsDrawerProps> = ({
  comments,
  role,
  onAddComment,
  isOpen,
  onClose,
}) => {
  const [section, setSection] = useState('Section 3: Course Outcomes');
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await onAddComment(section, text);
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold text-sm text-white">Reviewer & HOD Section Notes</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Add note form */}
      <form onSubmit={handleSubmit} className="p-4 border-b border-slate-800 space-y-3 bg-slate-950/60">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Target Section
          </label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
          >
            <option value="Section 1: Course Summary">Section 1: Course Summary</option>
            <option value="Section 2: Credits & Hours">Section 2: Credits & Hours</option>
            <option value="Section 3: Course Outcomes">Section 3: Course Outcomes</option>
            <option value="Section 4: Syllabus & Units">Section 4: Syllabus & Units</option>
            <option value="Section 5: CO-PO-PSO Mapping">Section 5: CO-PO-PSO Mapping</option>
            <option value="Section 7: Assessment Scheme">Section 7: Assessment Scheme</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Feedback Note as {role}
          </label>
          <textarea
            rows={2}
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Add specific guidance or review feedback...`}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !text.trim()}
          className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Post Review Comment</span>
        </button>
      </form>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {comments.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            No section comments yet. Reviewer or HOD can post notes here.
          </div>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-1.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded">
                  {c.section}
                </span>
                <span className="text-[10px] text-slate-500">
                  {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed">{c.text}</p>
              <div className="flex items-center gap-1 text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                <User className="w-3 h-3" />
                <span>
                  {c.user} ({c.role})
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
