import React, { useState } from 'react';
import { 
  Cpu, 
  Check, 
  Copy, 
  Terminal, 
  Zap, 
  Server, 
  ShieldAlert, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { LOCAL_MODELS_DATA } from '../data/pythonCodebase';
import { LocalModelInfo } from '../types';

export const LocalLLMComparison: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<{ connected: boolean; message?: string } | null>(null);

  const handleCopy = (cmd: string, index: number) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const checkLocalOllama = async () => {
    setTestingConnection(true);
    setOllamaStatus(null);
    try {
      const res = await fetch('/api/test-local-llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'http://localhost:11434' }),
      });
      const data = await res.json();
      setOllamaStatus(data);
    } catch (e: any) {
      setOllamaStatus({
        connected: false,
        message: 'Lokal server bilan aloqa o‘rnatilmadi (Ollama ni ishga tushiring).',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold mb-2">
            <Cpu className="w-3.5 h-3.5" />
            <span>100% Oflayn va Xavfsiz</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white">
            Lokal LLM Modellar va Dvigatellar Solishtiruvi
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Qaysi model sizning kompyuteringizga to‘g‘ri keladi va o‘zbek tilini eng yaxshi tushunadi?
          </p>
        </div>

        {/* Local Test Box */}
        <button
          onClick={checkLocalOllama}
          disabled={testingConnection}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-medium transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${testingConnection ? 'animate-spin text-blue-400' : ''}`} />
          <span>Lokal Ollama ni tekshirish</span>
        </button>
      </div>

      {/* Connection Status Toast */}
      {ollamaStatus && (
        <div className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 ${
          ollamaStatus.connected
            ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
            : 'bg-amber-950/40 border-amber-800 text-amber-300'
        }`}>
          {ollamaStatus.connected ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <div>
            <div className="font-bold mb-1">
              {ollamaStatus.connected ? 'Lokal Ollama Ulandi!' : 'Ollama topilmadi (Kutilgan holat)'}
            </div>
            <p className="text-xs text-slate-300">
              {ollamaStatus.message || (ollamaStatus.connected ? 'Kompyuteringizdagi modellar muvaffaqiyatli aniqlandi.' : '')}
            </p>
          </div>
        </div>
      )}

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {LOCAL_MODELS_DATA.map((model, idx) => (
          <div
            key={model.tag}
            className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
              model.recommended
                ? 'bg-slate-900 border-blue-500/40 shadow-lg shadow-blue-500/5'
                : 'bg-slate-950/80 border-slate-800/80'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-extrabold text-base text-white">{model.name}</h3>
                {model.recommended && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Tavsiya
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs text-slate-300 my-3">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Model hajmi:</span>
                  <span className="font-mono font-bold text-slate-200">{model.size}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Kerakli RAM:</span>
                  <span className="font-mono font-bold text-slate-200">{model.ramNeeded}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Tezligi:</span>
                  <span className="text-emerald-400">{model.speed}</span>
                </div>
                <div className="py-1">
                  <span className="text-slate-400 block mb-1">O‘zbek tili sifati:</span>
                  <span className="text-cyan-300 font-medium">{model.uzbekQuality}</span>
                </div>
                <div className="py-1">
                  <span className="text-slate-400 block mb-1">Eng yaxshi mosligi:</span>
                  <p className="text-[11px] text-slate-400">{model.useCase}</p>
                </div>
              </div>
            </div>

            {/* Install Button / Command */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="text-[10px] text-slate-400 font-mono mb-1">Yuklab olish buyrug‘i:</div>
              <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800 font-mono text-xs">
                <code className="text-cyan-300 select-all">{model.installCommand}</code>
                <button
                  onClick={() => handleCopy(model.installCommand, idx)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors ml-2"
                  title="Nusxalash"
                >
                  {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Engines comparison box */}
      <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
        <h3 className="text-base font-bold text-slate-200 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Lokal LLM Dvigatellari Taqqoslashi (Ollama vs llama.cpp vs vLLM)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <h4 className="font-bold text-emerald-400 mb-1">1. Ollama</h4>
            <p className="text-slate-400">
              Eng oson va qulay vosita. Modelni bitta buyruq bilan yuklaydi, fon rejimida server bo‘lib ishlaydi va REST API beradi. Yangi boshlovchilar va MVP uchun eng zo‘ri.
            </p>
          </div>
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <h4 className="font-bold text-blue-400 mb-1">2. llama.cpp</h4>
            <p className="text-slate-400">
              C/C++ da yozilgan eng tezkor dvigatel. Faqat oddiy CPU ga ega kompyuterlarda ham 4-bit/8-bit kvantlash (GGUF) orqali maksimal tezlik beradi.
            </p>
          </div>
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <h4 className="font-bold text-purple-400 mb-1">3. vLLM</h4>
            <p className="text-slate-400">
              Kuchli GPU (NVIDIA RTX 3090/4090/A100) ga ega serverlar uchun. PagedAttention orqali bir vaqtning o‘zida yuzlab foydalanuvchilar bilan ishlashga mo‘ljallangan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
