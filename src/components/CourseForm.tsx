import React, { useState } from 'react';
import { 
  FileEdit, 
  ChevronDown, 
  ChevronRight, 
  Code, 
  Check, 
  BookOpen, 
  Layers, 
  Lock,
  Calendar,
  Clock,
  Award
} from 'lucide-react';
import type { ParsedCourseData, WorkflowRole, CourseOutcome } from '../types';

interface CourseFormProps {
  data: ParsedCourseData;
  role: WorkflowRole;
  onUpdateCourse: (updated: Partial<ParsedCourseData>) => void;
}

export const CourseForm: React.FC<CourseFormProps> = ({
  data,
  role,
  onUpdateCourse,
}) => {
  const [showJson, setShowJson] = useState(false);
  const isAuthor = role === 'Author';

  const handleInputChange = (field: keyof ParsedCourseData, value: any) => {
    if (!isAuthor) {
      alert('HTTP 403: Only the Author is permitted to edit course specification content.');
      return;
    }
    onUpdateCourse({ [field]: value });
  };

  const handleCoChange = (index: number, newStmt: string) => {
    if (!isAuthor) return;
    const updatedCos = [...data.course_outcomes];
    updatedCos[index] = { ...updatedCos[index], statement: newStmt };
    onUpdateCourse({ course_outcomes: updatedCos });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">Parsed Course Structure & Metadata</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Structured Data
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Validated data fields extracted from specification and blueprint
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowJson(!showJson)}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
        >
          <Code className="w-3.5 h-3.5 text-indigo-400" />
          <span>{showJson ? 'Hide Raw JSON' : 'View Raw JSON'}</span>
        </button>
      </div>

      {!isAuthor && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2">
          <Lock className="w-4 h-4 shrink-0 text-amber-400" />
          <span>Content fields are in read-only mode for {role}. Switch to Author role to make modifications.</span>
        </div>
      )}

      {/* Main Course Metadata Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Course Title
          </label>
          <input
            type="text"
            disabled={!isAuthor}
            value={data.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 disabled:opacity-70 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Course Code
          </label>
          <input
            type="text"
            disabled={!isAuthor}
            value={data.code}
            onChange={(e) => handleInputChange('code', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 disabled:opacity-70 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Credit Structure (L:T:P)
          </label>
          <input
            type="text"
            disabled={!isAuthor}
            value={data.credits_ltp}
            onChange={(e) => handleInputChange('credits_ltp', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 disabled:opacity-70 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Course Type
          </label>
          <input
            type="text"
            disabled={!isAuthor}
            value={data.course_type}
            onChange={(e) => handleInputChange('course_type', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 disabled:opacity-70 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Department
          </label>
          <input
            type="text"
            disabled={!isAuthor}
            value={data.department}
            onChange={(e) => handleInputChange('department', e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 disabled:opacity-70 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Total Hours of Interaction
          </label>
          <input
            type="number"
            disabled={!isAuthor}
            value={data.total_hours}
            onChange={(e) => handleInputChange('total_hours', parseInt(e.target.value, 10))}
            className="w-full bg-slate-950 border border-slate-800 disabled:opacity-70 rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Revised Course Summary */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Revised Comprehensive Course Summary (Covers all syllabus units)
        </label>
        <textarea
          rows={3}
          disabled={!isAuthor}
          value={data.summary}
          onChange={(e) => handleInputChange('summary', e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 disabled:opacity-70 rounded-lg p-3 text-xs text-white leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {/* Course Outcomes List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-indigo-400" />
            <span>Course Outcomes ({data.course_outcomes.length})</span>
          </label>
          <span className="text-[11px] text-slate-400">Classified with Bloom's Taxonomy</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {data.course_outcomes.map((co, idx) => (
            <div
              key={co.id}
              className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <span className="font-mono font-bold text-xs bg-indigo-950 text-indigo-300 border border-indigo-800/80 px-2.5 py-1 rounded-md shrink-0">
                  {co.id}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 whitespace-nowrap">
                  Bloom L{co.bloom_level} ({co.verb || 'Cognitive'})
                </span>
              </div>

              <input
                type="text"
                disabled={!isAuthor}
                value={co.statement}
                onChange={(e) => handleCoChange(idx, e.target.value)}
                className="w-full sm:flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Units Breakdown */}
      <div className="space-y-3">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-purple-400" />
          <span>Unit Syllabus ({data.units.length} Units)</span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.units.map((u) => (
            <div key={u.number} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">
                  Unit {u.number}: {u.title}
                </span>
                {u.hours && (
                  <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded">
                    {u.hours} Hours
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                {u.content || 'Content outlined in syllabus blueprint.'}
              </p>
              {u.lab && (
                <div className="text-[10px] text-indigo-300 bg-indigo-950/60 border border-indigo-900/60 p-2 rounded">
                  <strong>Lab Exercises:</strong> {u.lab}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Collapsible JSON Viewer */}
      {showJson && (
        <div className="pt-2">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-[11px] text-slate-300 max-h-96 overflow-y-auto">
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
