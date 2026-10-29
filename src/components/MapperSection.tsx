import React, { useState } from 'react';
import { 
  Grid, 
  Download, 
  Info, 
  Edit3, 
  Check, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import type { CourseOutcome, CoPoPsoCell, SpecForgeOutput, WorkflowRole } from '../types';

interface MapperSectionProps {
  cos: CourseOutcome[];
  matrix: Record<string, Record<string, CoPoPsoCell | null>>;
  output: SpecForgeOutput;
  role: WorkflowRole;
  onUpdateCell: (coId: string, targetId: string, level: 1 | 2 | 3 | null, justification: string) => void;
}

export const MapperSection: React.FC<MapperSectionProps> = ({
  cos,
  matrix,
  output,
  role,
  onUpdateCell,
}) => {
  const [activeCell, setActiveCell] = useState<{
    coId: string;
    targetId: string;
    cell: CoPoPsoCell | null;
  } | null>(null);

  const [editLevel, setEditLevel] = useState<'none' | '1' | '2' | '3'>('none');
  const [editJustification, setEditJustification] = useState('');

  const poList = Array.from({ length: 11 }, (_, i) => `PO-${i + 1}`);
  const psoList = ['PSO-1', 'PSO-2'];

  const handleOpenEdit = (coId: string, targetId: string, cell: CoPoPsoCell | null) => {
    if (role !== 'Author') {
      alert('Only the Author is authorized to edit matrix mappings in Draft or Returned status.');
      return;
    }
    setActiveCell({ coId, targetId, cell });
    setEditLevel(cell ? (String(cell.level) as any) : 'none');
    setEditJustification(cell?.justification || '');
  };

  const handleSaveCell = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCell) return;
    const level = editLevel === 'none' ? null : (parseInt(editLevel, 10) as 1 | 2 | 3);
    onUpdateCell(activeCell.coId, activeCell.targetId, level, editJustification);
    setActiveCell(null);
  };

  const handleDownloadOutput = () => {
    const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'specforge_output.json';
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
            <h2 className="text-xl font-bold text-white">CO-PO-PSO Articulation Matrix</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Level 3 Mapper
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Correlates each Course Outcome with Programme Outcomes and Programme Specific Outcomes with justification tooltips
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadOutput}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition shadow-md shadow-emerald-600/20 cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Export specforge_output.json</span>
        </button>
      </div>

      {/* Legend & Instructions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-semibold text-slate-300">Matrix Scale:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
              3
            </span>
            <span className="text-slate-300 text-[11px]">Very Strong</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-teal-500/80 text-white font-bold flex items-center justify-center text-[10px]">
              2
            </span>
            <span className="text-slate-300 text-[11px]">Strong</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-sky-500/70 text-white font-bold flex items-center justify-center text-[10px]">
              1
            </span>
            <span className="text-slate-300 text-[11px]">Moderate</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-slate-800 text-slate-500 font-bold flex items-center justify-center text-[10px]">
              -
            </span>
            <span className="text-slate-400 text-[11px]">No relation (null)</span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-indigo-400" />
          <span>Hover cell for engineering justification. {role === 'Author' ? 'Click to edit.' : 'Author edits.'}</span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
        <table className="w-full text-xs text-center border-collapse">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-800 text-slate-300 font-bold">
              <th className="p-3 text-left w-24 border-r border-slate-800 sticky left-0 bg-slate-900 z-10">
                Course Outcome
              </th>
              {poList.map((po) => (
                <th key={po} className="p-2 border-r border-slate-800 font-mono min-w-12">
                  {po}
                </th>
              ))}
              {psoList.map((pso) => (
                <th key={pso} className="p-2 border-r border-slate-800 font-mono min-w-14 bg-indigo-950/40 text-indigo-300">
                  {pso}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cos.map((co) => {
              const row = matrix[co.id] || {};
              return (
                <tr key={co.id} className="border-b border-slate-800/80 hover:bg-slate-900/50 transition">
                  <td className="p-3 text-left font-bold text-white border-r border-slate-800 sticky left-0 bg-slate-950 flex flex-col">
                    <span className="text-indigo-400 font-mono">{co.id}</span>
                    <span className="text-[10px] text-slate-400 font-normal">Bloom L{co.bloom_level}</span>
                  </td>

                  {poList.map((po) => {
                    const cell = row[po];
                    const level = cell?.level;
                    const bgClass =
                      level === 3
                        ? 'bg-emerald-600/90 text-white font-extrabold hover:bg-emerald-500'
                        : level === 2
                        ? 'bg-teal-600/80 text-white font-bold hover:bg-teal-500'
                        : level === 1
                        ? 'bg-sky-600/70 text-white font-bold hover:bg-sky-500'
                        : 'text-slate-600 hover:bg-slate-900';

                    return (
                      <td
                        key={po}
                        title={cell?.justification || 'No correlation'}
                        onClick={() => handleOpenEdit(co.id, po, cell)}
                        className={`p-2 border-r border-slate-800/60 transition cursor-pointer select-none ${bgClass}`}
                      >
                        {level || '-'}
                      </td>
                    );
                  })}

                  {psoList.map((pso) => {
                    const cell = row[pso];
                    const level = cell?.level;
                    const bgClass =
                      level === 3
                        ? 'bg-emerald-600/90 text-white font-extrabold hover:bg-emerald-500'
                        : level === 2
                        ? 'bg-teal-600/80 text-white font-bold hover:bg-teal-500'
                        : level === 1
                        ? 'bg-sky-600/70 text-white font-bold hover:bg-sky-500'
                        : 'text-slate-600 hover:bg-slate-900';

                    return (
                      <td
                        key={pso}
                        title={cell?.justification || 'No correlation'}
                        onClick={() => handleOpenEdit(co.id, pso, cell)}
                        className={`p-2 border-r border-slate-800/60 transition cursor-pointer select-none ${bgClass}`}
                      >
                        {level || '-'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cell Editor Modal */}
      {activeCell && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <span>
                  Edit Mapping: {activeCell.coId} &rarr; {activeCell.targetId}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveCell(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCell} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Correlation Strength:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { val: 'none', label: 'None (-)' },
                    { val: '1', label: '1 (Mod)' },
                    { val: '2', label: '2 (Str)' },
                    { val: '3', label: '3 (V.Str)' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setEditLevel(opt.val as any)}
                      className={`p-2 text-xs font-semibold rounded-lg border transition ${
                        editLevel === opt.val
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {editLevel !== 'none' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Engineering Justification (One sentence):
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={editJustification}
                    onChange={(e) => setEditJustification(e.target.value)}
                    placeholder="e.g. Applies algorithmic formulation and systematic debugging to implement computational solutions."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveCell(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg"
                >
                  Save Mapping
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
