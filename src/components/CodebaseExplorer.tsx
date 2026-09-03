import React, { useState } from 'react';
import { 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  Layers, 
  Terminal, 
  Cpu, 
  Globe, 
  Database,
  ExternalLink,
  Code
} from 'lucide-react';
import { PYTHON_CODEBASE_FILES } from '../data/pythonCodebase';
import { PythonFileItem } from '../types';

export const CodebaseExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<PythonFileItem>(PYTHON_CODEBASE_FILES[0]);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'Backend': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'Agent Core': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'Web Search': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'Database': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Frontend': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold mb-2">
            <Code className="w-3.5 h-3.5" />
            <span>To‘liq Python + FastAPI MVP Loyihasi</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white">
            UZUNITED AI — Ishchi Kodlar To‘plami
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Har bir modul 100% mustaqil, toza va o‘zbek tilidagi izohlarga ega. Hech qanday tashqi pullik API talab qilmaydi.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs sm:text-sm shadow-md transition-all self-start md:self-auto"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Nusxalandi!' : `Nusxa olish (${selectedFile.filename})`}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Files List */}
        <div className="lg:col-span-4 space-y-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
            Loyiha Fayllari ({PYTHON_CODEBASE_FILES.length})
          </div>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
            {PYTHON_CODEBASE_FILES.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1.5 ${
                    isSelected
                      ? 'bg-slate-900 border-blue-500/50 shadow-md shadow-blue-500/5'
                      : 'bg-slate-950/60 hover:bg-slate-900/60 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-white">
                      <FileCode className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                      <span>{file.filename}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${getCategoryBadge(file.category)}`}>
                      {file.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">
                    {file.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Code Viewer */}
        <div className="lg:col-span-8 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {/* File Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950/90 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 font-mono text-sm font-bold text-slate-200">
                <span className="text-blue-400">📄</span>
                <span>{selectedFile.path}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedFile.description}
              </p>
            </div>

            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Kodni nusxalash"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          {/* Code content */}
          <div className="p-4 bg-slate-950 overflow-x-auto max-h-[600px] font-mono text-xs text-slate-200 leading-relaxed scrollbar-thin">
            <pre>
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
