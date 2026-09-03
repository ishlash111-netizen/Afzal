import React, { useState } from 'react';
import { 
  Database, 
  Layers, 
  MessageSquare, 
  Clock, 
  User, 
  Bot, 
  Globe, 
  Sparkles, 
  Trash2,
  Table,
  ArrowRight
} from 'lucide-react';
import { ChatMessage, ChatSession } from '../types';

interface MemoryInspectorProps {
  sessions: ChatSession[];
  currentSessionId: string;
  messages: ChatMessage[];
  onClearSession: () => void;
}

export const MemoryInspector: React.FC<MemoryInspectorProps> = ({
  sessions,
  currentSessionId,
  messages,
  onClearSession,
}) => {
  const [testQuery, setTestQuery] = useState('u qachon tug‘ilgan?');
  const [testResult, setTestResult] = useState('');

  const runTestResolution = () => {
    // Find last entity from messages
    let lastEntity = 'Sam Altman';
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        const cleaned = messages[i].content.replace(/haqida gapir|kim u|nima bu|\?|!/gi, '').trim();
        if (cleaned.length > 2 && cleaned.length < 50) {
          lastEntity = cleaned;
          break;
        }
      }
    }

    const resolved = `${lastEntity} ${testQuery}`;
    setTestResult(`Natija: «${testQuery}» ➔ «${resolved}» (Asosiy subyekt: «${lastEntity}»)`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold mb-2">
            <Database className="w-3.5 h-3.5" />
            <span>SQLite Xotira & Kontekst Menejeri</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white">
            Xotira va Suhbat Konteksti Tizimi
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            UZUNITED AI suhbat tarixini, token limitlarini va «u», «bu», «birinchisi» olmoshlarini qanday boshqaradi?
          </p>
        </div>

        <button
          onClick={onClearSession}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs sm:text-sm font-medium transition-all"
        >
          <Trash2 className="w-4 h-4" />
          <span>Suhbat tarixini tozalash</span>
        </button>
      </div>

      {/* Coreference Resolution Live Simulator */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
        <h3 className="text-base font-bold text-slate-200 mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          «U», «Bu», «Birinchisi» (Coreference Resolver) Sinov Maydoni
        </h3>
        <p className="text-xs text-slate-400 mb-3">
          Foydalanuvchi qisqa so‘z yoki olmosh ishlatganda, tizim oldingi suhbat subyektini avtomatik ulaydi:
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Masalan: 'u qayerda yashaydi?' yoki 'narxi qancha?'"
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={runTestResolution}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
          >
            <span>Kontekstni Tekshirish</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {testResult && (
          <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-blue-500/30 font-mono text-xs text-cyan-300">
            {testResult}
          </div>
        )}
      </div>

      {/* SQLite Tables & Active Session Messages */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Messages in SQLite */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
              <Table className="w-4 h-4 text-emerald-400" />
              <span>SQLite `messages` Jadvali ({messages.length} ta yozuv)</span>
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              db: uzunited_memory.db
            </span>
          </div>

          <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1 scrollbar-thin">
            {messages.map((m, idx) => (
              <div
                key={m.id || idx}
                className="p-3 bg-slate-950 rounded-xl border border-slate-800/90 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className={`font-bold ${m.role === 'user' ? 'text-blue-400' : 'text-emerald-400'}`}>
                    role: {m.role}
                  </span>
                  <span className="text-slate-500">{new Date(m.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className="text-slate-300 leading-relaxed line-clamp-3">
                  {m.content}
                </p>
                {m.resolvedQuery && (
                  <div className="text-[10px] text-cyan-400 font-mono">
                    ↳ resolved_query: "{m.resolvedQuery}"
                  </div>
                )}
                {m.sources && m.sources.length > 0 && (
                  <div className="text-[10px] text-amber-400 font-mono">
                    ↳ sources: {m.sources.length} ta manba saqlangan
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: SQLite Schema Explanation */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" />
            <span>SQLite Ma'lumotlar Bazasi Strukturasi</span>
          </h3>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-3">
            <div>
              <div className="text-blue-400 font-bold mb-1">-- 1. sessions jadvali</div>
              <div className="text-slate-400 text-[11px]">
                id TEXT PRIMARY KEY,<br />
                title TEXT,<br />
                created_at TEXT,<br />
                updated_at TEXT
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="text-emerald-400 font-bold mb-1">-- 2. messages jadvali</div>
              <div className="text-slate-400 text-[11px]">
                id INTEGER PRIMARY KEY,<br />
                session_id TEXT,<br />
                role TEXT,<br />
                content TEXT,<br />
                resolved_query TEXT,<br />
                sources TEXT (JSON),<br />
                timestamp TEXT
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
            <p>
              💡 <strong>Rolling Window texnologiyasi:</strong> Lokal LLM kontekst chegarasidan oshib ketmasligi uchun har bir so‘rovda faqat oxirgi 8-10 ta xabar yuboriladi.
            </p>
            <p>
              💡 <strong>Entity Tracker:</strong> Suhbatdagi asosiy ism va atamalar xotirada saqlanadi va yangi savollar paydo bo‘lganda avtomatik ulanadi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
