import React, { useState } from 'react';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Zap, 
  ArrowRight, 
  Check, 
  Cpu, 
  FileCheck,
  AlertCircle
} from 'lucide-react';

interface UploadSectionProps {
  onProcessFiles: (specFile: File | null, bpFile: File | null, inputId: string) => Promise<void>;
  onLoadSample: () => Promise<void>;
  loading: boolean;
  progressStep: string;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onProcessFiles,
  onLoadSample,
  loading,
  progressStep,
}) => {
  const [specFile, setSpecFile] = useState<File | null>(null);
  const [bpFile, setBpFile] = useState<File | null>(null);
  const [inputId, setInputId] = useState('SAMPLE');

  const handleSpecUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSpecFile(e.target.files[0]);
    }
  };

  const handleBpUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBpFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!specFile) return;
    onProcessFiles(specFile, bpFile, inputId);
  };

  const formatSize = (bytes: number) => {
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">Course Ingestion & Document Reader</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Level 1 Reader
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Accepts legacy university specifications and question-paper blueprints in .docx, .doc, .pdf, or .html
          </p>
        </div>

        <button
          type="button"
          onClick={onLoadSample}
          disabled={loading}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition shadow-md shadow-indigo-600/20 cursor-pointer shrink-0"
        >
          <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
          <span>Load Official Sample (CSD103B)</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Spec Upload Box (Required) */}
          <div className="border border-slate-800 hover:border-slate-700 bg-slate-950/60 rounded-xl p-5 flex flex-col justify-between transition">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  Course Specification
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Required
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Legacy curriculum spec with existing COs, credit structure, and teaching hours (.docx, .doc, .pdf, .html)
              </p>
            </div>

            <div className="mt-4">
              {specFile ? (
                <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-700 rounded-lg">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="truncate">
                      <p className="text-xs font-medium text-white truncate">{specFile.name}</p>
                      <p className="text-[10px] text-slate-400">{formatSize(specFile.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSpecFile(null)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-800 hover:border-indigo-500/60 bg-slate-900/30 hover:bg-slate-900/50 rounded-xl cursor-pointer transition">
                  <Upload className="w-6 h-6 text-indigo-400 mb-2" />
                  <span className="text-xs font-medium text-slate-300">Choose or drag course spec</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">.docx, .doc, .pdf, .html up to 25MB</span>
                  <input
                    type="file"
                    accept=".docx,.doc,.pdf,.html,.htm"
                    onChange={handleSpecUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Blueprint Upload Box (Optional) */}
          <div className="border border-slate-800 hover:border-slate-700 bg-slate-950/60 rounded-xl p-5 flex flex-col justify-between transition">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-400" />
                  Question-Paper Blueprint
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  Optional
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official question-paper blueprint (serves as Source of Truth for units and Course Outcomes)
              </p>
            </div>

            <div className="mt-4">
              {bpFile ? (
                <div className="flex items-center justify-between p-3 bg-slate-900 border border-slate-700 rounded-lg">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileCheck className="w-4 h-4 text-purple-400 shrink-0" />
                    <div className="truncate">
                      <p className="text-xs font-medium text-white truncate">{bpFile.name}</p>
                      <p className="text-[10px] text-slate-400">{formatSize(bpFile.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBpFile(null)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-800 hover:border-purple-500/60 bg-slate-900/30 hover:bg-slate-900/50 rounded-xl cursor-pointer transition">
                  <Upload className="w-6 h-6 text-purple-400 mb-2" />
                  <span className="text-xs font-medium text-slate-300">Choose or drag blueprint</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">.docx, .doc, .pdf, .html</span>
                  <input
                    type="file"
                    accept=".docx,.doc,.pdf,.html,.htm"
                    onChange={handleBpUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Input ID & Execution trigger */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label htmlFor="inputId" className="text-xs font-semibold text-slate-400 whitespace-nowrap">
              Input Pack ID:
            </label>
            <input
              id="inputId"
              type="text"
              value={inputId}
              onChange={(e) => setInputId(e.target.value)}
              placeholder="SAMPLE"
              className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 w-28"
            />
            <span className="text-[11px] text-slate-500">('SAMPLE' scores for official verify)</span>
          </div>

          <button
            type="submit"
            disabled={loading || !specFile}
            className="w-full sm:w-auto px-7 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{progressStep || 'Processing pipeline...'}</span>
              </>
            ) : (
              <>
                <span>Generate Corrected Spec</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
