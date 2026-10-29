import React from 'react';
import { 
  FileCheck2, 
  Settings as SettingsIcon, 
  ShieldCheck, 
  UserCheck, 
  UserPlus, 
  Award,
  Terminal,
  Activity,
  Download
} from 'lucide-react';
import type { WorkflowRole } from '../types';

interface HeaderProps {
  serverHealth: string;
  role: WorkflowRole;
  onRoleChange: (r: WorkflowRole) => void;
  onOpenSettings: () => void;
  onOpenArena: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  serverHealth,
  role,
  onRoleChange,
  onOpenSettings,
  onOpenArena,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4" style={{ backgroundColor: '#000000' }}>
        {/* Logo and Server Status */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-md shadow-indigo-600/30">
              <FileCheck2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-white tracking-tight">SpecForge</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  L0–L5 Baseline
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Course Specification & Quality Audit Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300">
            <span
              className={`w-2 h-2 rounded-full ${
                serverHealth === 'up'
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <span className="font-mono">Server: {serverHealth}</span>
          </div>
        </div>

        {/* Center: Role Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 px-2 uppercase tracking-wider hidden lg:inline">
            Active Role:
          </span>
          <button
            type="button"
            onClick={() => onRoleChange('Author')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              role === 'Author'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Author</span>
          </button>

          <button
            type="button"
            onClick={() => onRoleChange('Reviewer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              role === 'Reviewer'
                ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Reviewer</span>
          </button>

          <button
            type="button"
            onClick={() => onRoleChange('HOD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              role === 'HOD'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>HOD</span>
          </button>
        </div>

        {/* Right action buttons */}
        <div className="flex items-center gap-2">
          <a
            href="/api/v1/export/zip"
            download="specforge.zip"
            className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download ZIP</span>
          </a>

          <button
            type="button"
            onClick={onOpenArena}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Scorer Verification</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 hover:text-white transition cursor-pointer"
            title="AI Key Settings"
            aria-label="Settings"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
