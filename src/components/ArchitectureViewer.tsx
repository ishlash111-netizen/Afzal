import React, { useState } from 'react';
import { 
  Workflow, 
  FolderTree, 
  Cpu, 
  Globe, 
  BrainCircuit, 
  Database, 
  Layers, 
  Terminal, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Code2,
  FileCode,
  Sparkles,
  HelpCircle
} from 'lucide-react';

export const ArchitectureViewer: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState<number>(0);

  const sections = [
    {
      id: 0,
      title: "1. To'liq Tizim Arxitekturasi",
      icon: Workflow,
      content: (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
            <h3 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">
              <Workflow className="w-5 h-5" />
              UZUNITED AI Tizimining IshlashSxemasi (Data Flow)
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              Loyiha butunlay lokal kompyuterda ishlaydi va <strong>hech qanday pullik API kalitsiz</strong> (OpenAI, Gemini yoki Bing API’siz) internetdan ma’lumot qidirib, foydalanuvchiga tabiiy o‘zbek tilida javob beradi.
            </p>

            {/* Visual Flow Diagram */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800 text-slate-200">
                <span className="font-bold text-blue-400">1. Foydalanuvchi</span>
                <span className="text-slate-400">Savol yozadi: «Bugun ob-havo qanday?» yoki «U kim?»</span>
              </div>

              <div className="flex justify-center text-blue-500 font-bold">↓ (HTTP POST /api/chat)</div>

              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                <div className="font-bold text-indigo-400 flex items-center gap-2">
                  <span>2. UZUNITED AI Agent Yadrosi (agent.py)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300 pl-2">
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <strong className="text-cyan-400">A. Kontekst Resolver:</strong> Oldingi xabarlardan «u», «bu», «birinchisi» olmoshlarini asl shaxs yoki tushunchaga almashtiradi.
                  </div>
                  <div className="bg-slate-950 p-2 rounded border border-slate-800">
                    <strong className="text-amber-400">B. Intent Classifier:</strong> Savolga javob berish uchun internet qidiruv kerakmi yoki lokal bilim kifoyami?
                  </div>
                </div>
              </div>

              <div className="flex justify-center text-indigo-500 font-bold">↓ (Shartli Yo‘naltirish)</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-900/90 rounded-lg border border-emerald-900/40">
                  <div className="font-bold text-emerald-400 mb-1">Yo‘q (Lokal LLM Kifoya)</div>
                  <p className="text-[11px] text-slate-300">
                    Salomlashish, dasturlash kodlari, mantiqiy masalalar to‘g‘ridan-to‘g‘ri lokal modelga (Ollama/llama.cpp) yuboriladi.
                  </p>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-lg border border-cyan-900/40">
                  <div className="font-bold text-cyan-400 mb-1">Ha (Web Search Zarur)</div>
                  <p className="text-[11px] text-slate-300">
                    DuckDuckGo / Open Scraper orqali real-time 4-6 ta mustaqil manba qidiriladi va snippetlar yig‘iladi.
                  </p>
                </div>
              </div>

              <div className="flex justify-center text-cyan-500 font-bold">↓ (Prompt Injection / RAG)</div>

              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-slate-200">
                <div className="font-bold text-purple-400">3. Lokal LLM Tahlili (Ollama: Llama-3.2 / Qwen-2.5)</div>
                <p className="text-[11px] text-slate-300 mt-1">
                  Yig‘ilgan manbalarni solishtiradi, o‘zaro tekshiradi, iqtiboslarni [1], [2] bilan belgilab, ravon o‘zbek tilida xulosa chiqaradi.
                </p>
              </div>

              <div className="flex justify-center text-purple-500 font-bold">↓ (Database Save)</div>

              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-slate-200">
                <div className="font-bold text-emerald-400">4. SQLite Xotira (memory.py)</div>
                <p className="text-[11px] text-slate-300 mt-1">
                  Suhbat xabarlari, manbalar va kontekst entitylar mahalliy SQLite bazasiga yoziladi.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 1,
      title: "2. Papkalar va Fayllar Strukturasi",
      icon: FolderTree,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
            <h3 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">
              <FolderTree className="w-5 h-5" />
              Loyiha Papka Strukturasi va Fayllar Vazifasi
            </h3>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 leading-relaxed mb-4">
              <pre>{`uzunited-ai/
│
├── main.py              # FastAPI server, barcha API endpointlar
├── agent.py             # Asosiy AI agent va RAG boshqaruv mexanizmi
├── search_engine.py     # Bepul DuckDuckGo va Web Search qidiruv moduli
├── memory.py            # SQLite asosidagi uzoq muddatli xotira
├── prompts.py           # Tizim promptlari va o'zbekcha qoidalar
├── config.py            # Model nomi, port va parametrlar
├── requirements.txt     # Python paketlar ro'yxati
├── run.sh / run.bat     # Bir marta bosish bilan ishga tushirish
│
└── frontend/            # Chiroyli veb interfeys
    ├── index.html       # HTML tuzilishi
    ├── style.css        # Zamonaviy Dark Theme uslubi
    └── app.js           # API bilan bog'lovchi mantiq`}</pre>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <span className="font-mono text-cyan-400 font-bold">1. main.py:</span> HTTP so‘rovlarni qabul qiladi, CORS xavfsizligini ta’minlaydi va frontend bilan bog‘laydi.
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <span className="font-mono text-indigo-400 font-bold">2. agent.py:</span> Butun tizimning «miyasi». Savolni ko‘rib, internetga murojaat qilish yoki to‘g‘ridan-to‘g‘ri modeldan javob olishni hal qiladi.
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <span className="font-mono text-amber-400 font-bold">3. search_engine.py:</span> Hech qanday Google yoki Bing API kalitisiz bepul DuckDuckGo va Wikipedia orqali qidiradi.
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <span className="font-mono text-emerald-400 font-bold">4. memory.py:</span> SQLite da ma’lumotlarni saqlaydi, <code>uzunited_memory.db</code> faylida suhbatlar tarixini ushlab turadi.
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "3. Lokal AI Modellar Solishtiruvi",
      icon: Cpu,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
            <h3 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              Lokal LLM Dvigatellari va Modellar Taqqoslashi
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-sm font-bold text-emerald-400 mb-2">🏆 Ollama (Tavsiya etiladi)</div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Eng oson va barqaror tizim. Bitta buyruq bilan (<code>ollama run llama3.2</code>) modelni yuklab oladi va <code>http://localhost:11434</code> portida bepul REST API yaratadi.
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-sm font-bold text-blue-400 mb-2">⚡ llama.cpp (GGUF)</div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  C++ da yozilgan eng tezkor dvigatel. Faqat CPU bo‘lgan oddiy kompyuterlarda ham 4-bit kvantlash orqali yuqori tezlik beradi.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border border-slate-800 rounded-xl overflow-hidden">
                <thead className="bg-slate-950 text-slate-300 font-mono">
                  <tr>
                    <th className="p-3 border-b border-slate-800">Model</th>
                    <th className="p-3 border-b border-slate-800">Hajmi</th>
                    <th className="p-3 border-b border-slate-800">Kerakli RAM</th>
                    <th className="p-3 border-b border-slate-800">O‘zbek Tili Sifati</th>
                    <th className="p-3 border-b border-slate-800">Tavsiya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans text-slate-300">
                  <tr className="bg-blue-950/20">
                    <td className="p-3 font-bold font-mono text-blue-400">Llama 3.2 (3B)</td>
                    <td className="p-3 font-mono">2.0 GB</td>
                    <td className="p-3 font-mono">4-8 GB RAM</td>
                    <td className="p-3 text-emerald-400 font-medium">Yaxshi (juda tez)</td>
                    <td className="p-3 font-bold text-emerald-400">Eng optimal (MVP uchun)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold font-mono text-indigo-400">Qwen 2.5 (7B)</td>
                    <td className="p-3 font-mono">4.7 GB</td>
                    <td className="p-3 font-mono">8-16 GB RAM</td>
                    <td className="p-3 text-emerald-400 font-medium">A’lo (Grammatika kuchli)</td>
                    <td className="p-3">O‘zbekcha murakkab matnlarga</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold font-mono text-purple-400">DeepSeek R1 (7B)</td>
                    <td className="p-3 font-mono">4.7 GB</td>
                    <td className="p-3 font-mono">8-16 GB RAM</td>
                    <td className="p-3 text-amber-400">Yaxshi (Chuqur fikrlash)</td>
                    <td className="p-3">Deep Search rejimiga</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "4. Web Search va Intent Tahlili (0 API Keys)",
      icon: Globe,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
            <h3 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              API Kalitsiz Web Search Qanday Ishlaydi?
            </h3>

            <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <h4 className="font-bold text-cyan-400 mb-1">1. DuckDuckGo Instant & HTML Scraper</h4>
                <p>
                  Ko‘pgina qidiruv tizimlari (Google Custom Search, Bing) oyiga 100 tadan keyin pullik hisoblanadi. UZUNITED AI esa DuckDuckGo ning ochiq qidiruv qatlamidan va Wikipedia API dan foydalanadi. Bu butunlay <strong>bepul, cheklovlarsiz va kalitsiz</strong> ishlaydi.
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <h4 className="font-bold text-indigo-400 mb-1">2. AI Qachon Qidirishini Qanday Biladi? (Intent Detection)</h4>
                <p className="mb-2">
                  Biz savolni 3 toifaga ajratamiz:
                </p>
                <ul className="list-disc pl-5 space-y-1 font-mono text-xs">
                  <li><strong className="text-emerald-400">Salomlashish:</strong> «Salom», «Qalaysiz» → Qidiruv shart emas.</li>
                  <li><strong className="text-emerald-400">Dasturlash / Mantiq:</strong> «Python da quicksort yoz» → Lokal LLM bilimlaridan olinadi.</li>
                  <li><strong className="text-amber-400">Real-time / Faktlar:</strong> «Bugun dollar kursi qancha?», «Sam Altman kim?», «Ob-havo» → Avtomatik DuckDuckGo orqali qidiriladi.</li>
                </ul>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <h4 className="font-bold text-purple-400 mb-1">3. «U», «Bu», «Birinchisi» (Coreference Resolution)</h4>
                <p>
                  Foydalanuvchi: <em>«Sam Altman kim?»</em> deb so‘raganidan keyin, <em>«U qayerda tug‘ilgan?»</em> desa, agent suhbat tarixidagi subyektni topib, qidiruv so‘rovini <strong>«Sam Altman qayerda tug‘ilgan»</strong> deb to‘g‘rilaydi.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: "5. Bosqichma-bosqich O'rnatish va Ishga Tushirish",
      icon: Terminal,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl">
            <h3 className="text-lg font-bold text-blue-400 mb-3 flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              O'z Kompyuteringizda 0 dan Ishga Tushirish (3 Qadam)
            </h3>

            <div className="space-y-4 text-xs sm:text-sm">
              {/* Step 1 */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">1</span>
                  <span>Ollama ni O'rnatish va Modelni Yuklab Olish</span>
                </div>
                <p className="text-slate-300 text-xs mb-2">
                  <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-blue-400 underline">ollama.com</a> saytidan Ollama dasturini yuklab oling va terminalda quyidagi buyruqni bering:
                </p>
                <div className="bg-slate-900 p-2.5 rounded-lg font-mono text-cyan-300 text-xs flex items-center justify-between">
                  <code>ollama run llama3.2</code>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-indigo-400 font-bold mb-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs">2</span>
                  <span>Python Muhitini Tayyorlash</span>
                </div>
                <p className="text-slate-300 text-xs mb-2">
                  Loyiha papkasida terminalni ochib, paketlarni o‘rnating:
                </p>
                <div className="bg-slate-900 p-2.5 rounded-lg font-mono text-slate-300 text-xs space-y-1">
                  <div>pip install fastapi uvicorn httpx aiosqlite pydantic</div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-blue-400 font-bold mb-2">
                  <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs">3</span>
                  <span>Serverni Ishga Tushirish</span>
                </div>
                <p className="text-slate-300 text-xs mb-2">
                  Serverni ishga tushiring va brauzerda oching:
                </p>
                <div className="bg-slate-900 p-2.5 rounded-lg font-mono text-emerald-300 text-xs">
                  python main.py
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  Brauzerda <code>http://localhost:8000</code> manziliga kiring — UZUNITED AI tayyor!
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Hero card */}
      <div className="mb-6 p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>0 dan Professional AI Platformasi</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              UZUNITED AI — Arxitektura & Qo‘llanma
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Hech qanday tashqi pullik API kalitlarisiz lokal model, erkin Web Search va doimiy xotira asosida ishlovchi tizim qo‘llanmasi.
            </p>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex overflow-x-auto gap-2 pb-3 mb-6 scrollbar-thin">
        {sections.map((sec) => {
          const Icon = sec.icon;
          const isActive = selectedSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setSelectedSection(sec.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 border border-blue-500/40'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{sec.title}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="transition-all">
        {sections[selectedSection].content}
      </div>
    </div>
  );
};
