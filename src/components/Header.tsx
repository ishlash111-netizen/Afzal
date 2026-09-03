import React, { useState } from 'react';
import { 
  Menu, 
  ChevronDown, 
  SquarePen, 
  Sparkles, 
  Box, 
  Cpu, 
  Check, 
  ShieldCheck, 
  User 
} from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  onOpenMenu: () => void;
  onNewChat: () => void;
  onOpenProfile: () => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  user: UserProfile | null;
  tokenCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMenu,
  onNewChat,
  onOpenProfile,
  selectedModel,
  onSelectModel,
  user,
  tokenCount = 842,
}) => {
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  const models = [
    { id: 'UzLLM v3.5 Pro', label: 'UzLLM v3.5 Pro', desc: 'Eng yuqori aniqlikdagi o‘zbek modeli' },
    { id: 'UZUNITED Fast 3B', label: 'UZUNITED Fast 3B', desc: 'Tezkor lokal javoblar' },
    { id: 'DeepSeek R1 Hybrid', label: 'DeepSeek R1 Hybrid', desc: 'Mantiqiy chuqur fikrlash' },
    { id: 'Llama 3.2 3B Local', label: 'Llama 3.2 3B Local', desc: 'Oflayn / Lokal AI' },
  ];

  return (
    <div className="w-full bg-white border-b border-slate-200 sticky top-0 z-30 select-none shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      {/* Top Bar matching screenshot */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between">
        
        {/* Left: 3-line hamburger menu */}
        <div className="flex items-center">
          <button
            id="btn-open-sidebar-menu"
            onClick={onOpenMenu}
            title="Chat tarixi va menyu"
            className="p-2 rounded-xl text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors"
          >
            <Menu className="w-6 h-6 stroke-[2.2]" />
          </button>
        </div>

        {/* Center: Model Selector Dropdown ("UzLLM v3.5 Pro ⌄") */}
        <div className="relative">
          <button
            id="btn-model-dropdown-trigger"
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors text-slate-900 font-semibold text-sm sm:text-base tracking-tight"
          >
            <span>{selectedModel}</span>
            <ChevronDown className="w-4 h-4 text-slate-500 stroke-[2.5]" />
          </button>

          {/* Dropdown Menu */}
          {modelDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setModelDropdownOpen(false)}
              />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider font-bold text-slate-400 border-b border-slate-100">
                  AI Modelini tanlang
                </div>
                {models.map((m) => {
                  const isSel = selectedModel === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        onSelectModel(m.id);
                        setModelDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors ${
                        isSel ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{m.label}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{m.desc}</div>
                      </div>
                      {isSel && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Right: New Chat / Edit button + User Avatar */}
        <div className="flex items-center gap-2">
          {/* New Chat Edit Square Button */}
          <button
            id="btn-header-new-chat"
            onClick={onNewChat}
            title="Yangi chat yaratish"
            className="p-2 rounded-xl text-slate-800 hover:bg-slate-100 active:bg-slate-200 transition-colors"
          >
            <SquarePen className="w-5 h-5 stroke-[2]" />
          </button>

          {/* Profile / Pro Avatar */}
          <button
            id="btn-header-profile"
            onClick={onOpenProfile}
            title={user ? `${user.firstName} ${user.lastName}` : "Profil"}
            className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center font-bold text-xs shadow-sm hover:ring-2 hover:ring-emerald-400/50 transition-all"
          >
            {user?.firstName ? (
              user.firstName.charAt(0).toUpperCase()
            ) : (
              <span className="text-[11px] font-bold">Pro</span>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
          </button>
        </div>

      </div>

      {/* Sub-header status bar matching screenshot */}
      <div className="border-t border-slate-100 bg-slate-50/80 px-3 sm:px-4 py-1.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-xs">
          
          {/* Left status indicator: ● Uzbek Context Engine v3.5 • Jonli */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
            <span className="font-semibold text-slate-800 text-[11px] sm:text-xs tracking-tight">
              Uzbek Context Engine v3.5
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 text-[11px] sm:text-xs">Jonli</span>
          </div>

          {/* Right token badge: 842 / 4k token */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 text-[10px] sm:text-[11px] font-semibold">
            <Box className="w-3 h-3 text-purple-600" />
            <span>{tokenCount} / 4k token</span>
          </div>

        </div>
      </div>
    </div>
  );
};
