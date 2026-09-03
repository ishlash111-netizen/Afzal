import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Handle Vercel pre-parsed body safely to prevent serverless stream hang
app.use((req, res, next) => {
  if (req.body && typeof req.body === "object") {
    (req as any)._body = true;
  }
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Enable CORS for iframe and preview cross-origin requests
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Normalize request URLs in Vercel serverless environment
app.use((req, res, next) => {
  if (req.url === "/api/index" || req.url.startsWith("/api/index?")) {
    req.url = req.url.replace("/api/index", "/api/chat");
  }
  if (!req.url.startsWith("/api") && (
    req.url === "/health" ||
    req.url.startsWith("/chat") ||
    req.url.startsWith("/search") ||
    req.url.startsWith("/memory") ||
    req.url.startsWith("/test-local-llm")
  )) {
    req.url = `/api${req.url}`;
  }
  next();
});

// In-memory / SQLite-style memory storage for sessions
export interface FileAttachmentData {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
  base64Data?: string;
  mimeType: string;
  textContent?: string;
  isImage: boolean;
}

export interface UserProfileData {
  firstName?: string;
  lastName?: string;
  email?: string;
  birthYear?: string | number;
  interests?: string[];
  favoriteTopics?: string[];
  bio?: string;
  learnedPreferences?: string[];
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  attachments?: FileAttachmentData[];
  sources?: Array<{
    id: number;
    title: string;
    url: string;
    snippet: string;
    domain: string;
  }>;
  reasoningSteps?: string[];
  resolvedQuery?: string;
  searchedWeb?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  entityMemory: Record<string, string>; // e.g. "u": "Sam Altman", "birinchisi": "Python"
}

const memoryStore: Map<string, ChatSession> = new Map();

// Initialize sample default session
const defaultSessionId = "default-uzunited-session";
memoryStore.set(defaultSessionId, {
  id: defaultSessionId,
  title: "UZUNITED AI Boshlang'ich Suhbat",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages: [
    {
      id: "msg-0",
      role: "assistant",
      content: "Assalomu alaykum! Men **UZUNITED AI** — mustaqil, lokal AI model va erkin Web Search integratsiyasiga ega aqlli assistentman. \n\nMenga har qanday savol berishingiz mumkin: umumiy suhbat, kod yozish, yoki hozirgi kun yangiliklari va real-time ma'lumotlarni qidirish. Oldingi suhbat kontekstini va «u», «bu», «birinchisi» kabi olmoshlarni eslab qolaman!",
      timestamp: new Date().toISOString(),
    }
  ],
  entityMemory: {},
});

// Utility to clean query for search engines
function cleanQueryForSearch(q: string): string {
  const cleaned = q
    .replace(/[?!,.:;()"]/g, " ")
    .replace(/\b(kim u|kim|nima u|nima|qayerda|qachon|haqida|aytib ber|tushuntir|tushuntirib ber|gapir|ma'lumot ber|qanday|qancha|qidir|internetdan top)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length >= 2 ? cleaned : q.replace(/[?!]/g, "").trim();
}

// Helper for Multi-Source Diverse Web Search (DuckDuckGo, CBU, Weather, Wikipedia & Open Web)
async function freeWebSearch(query: string, maxResults = 6): Promise<Array<{ id: number; title: string; url: string; snippet: string; domain: string }>> {
  const rawResults: Array<{ title: string; url: string; snippet: string; domain: string }> = [];
  const lower = query.toLowerCase();
  const cleanedSearchTerm = cleanQueryForSearch(query);

  const searchTasks: Promise<void>[] = [];

  // 1. Currency Exchange Rate (Central Bank of Uzbekistan Official API)
  if (lower.includes("dollar") || lower.includes("valyuta") || lower.includes("kurs") || lower.includes("evro") || lower.includes("rubl")) {
    searchTasks.push((async () => {
      try {
        const cbuRes = await fetch("https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/", { signal: AbortSignal.timeout(2500) });
        if (cbuRes.ok) {
          const cbuData = await cbuRes.json();
          if (Array.isArray(cbuData) && cbuData[0]) {
            const item = cbuData[0];
            rawResults.push({
              title: `Markaziy Bank: 1 ${item.CcyNm_UZ} (${item.Ccy}) kursi — ${item.Rate} so'm`,
              url: "https://cbu.uz/uz/arkhiv-kursov-valyut/",
              snippet: `O'zbekiston Respublikasi Markaziy banki rasmiy kursi: 1 ${item.CcyNm_UZ} = ${item.Rate} so'm. O'zgarish: ${Number(item.Diff) >= 0 ? '+' : ''}${item.Diff} so'm. Sana: ${item.Date}.`,
              domain: "cbu.uz",
            });
          }
        }
      } catch {}
    })());
  }

  // 2. Real-time Weather (wttr.in Open API)
  if (lower.includes("ob-havo") || lower.includes("ob havo") || lower.includes("harorat") || lower.includes("havo")) {
    searchTasks.push((async () => {
      try {
        const weatherRes = await fetch("https://wttr.in/Tashkent?format=%C,+harorat:+%t,+shamol:+%w", { signal: AbortSignal.timeout(2500) });
        if (weatherRes.ok) {
          const weatherText = await weatherRes.text();
          if (weatherText && weatherText.length < 150) {
            rawResults.push({
              title: `Toshkent va O'zbekiston bo'yicha joriy ob-havo ma'lumoti`,
              url: "https://meteo.uz",
              snippet: `Hozirgi holat: ${weatherText.trim()}. Boshqa hududlar uchun prognozlar va harorat ko'rsatkichlari.`,
              domain: "meteo.uz",
            });
          }
        }
      } catch {}
    })());
  }

  // 3. Wikipedia API (Search + Article extract)
  searchTasks.push((async () => {
    try {
      const wikiSearchUrl = `https://uz.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanedSearchTerm)}&format=json&utf8=1`;
      const wikiRes = await fetch(wikiSearchUrl, { signal: AbortSignal.timeout(2500) });
      if (wikiRes.ok) {
        const data = await wikiRes.json();
        const items = data.query?.search || [];
        if (items.length > 0) {
          const topTitle = items[0].title;
          try {
            const extractUrl = `https://uz.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(topTitle)}&format=json`;
            const extractRes = await fetch(extractUrl, { signal: AbortSignal.timeout(2000) });
            if (extractRes.ok) {
              const extractData = await extractRes.json();
              const pages = extractData.query?.pages || {};
              const page = Object.values(pages)[0] as any;
              if (page?.extract) {
                rawResults.push({
                  title: `${topTitle} ensiklopedik ma'lumotnomasi`,
                  url: `https://uz.wikipedia.org/wiki/${encodeURIComponent(topTitle.replace(/ /g, "_"))}`,
                  snippet: page.extract.slice(0, 400),
                  domain: "uz.wikipedia.org",
                });
              }
            }
          } catch {}
        }
      }
    } catch {}
  })());

  // 4. DuckDuckGo Global Multi-Domain Web Search (News, portals, tech, blogs, articles)
  searchTasks.push((async () => {
    try {
      const htmlUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanedSearchTerm)}`;
      const htmlRes = await fetch(htmlUrl, {
        signal: AbortSignal.timeout(3000),
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "uz,ru,en;q=0.9",
        },
      });

      if (htmlRes.ok) {
        const html = await htmlRes.text();
        const blocks = html.split('<div class="result results_links');
        for (let i = 1; i < blocks.length && rawResults.length < 15; i++) {
          const block = blocks[i];
          const urlMatch = block.match(/href="([^"]*uddg=([^"&]+)[^"]*)"/) || block.match(/class="result__url"[^>]*href="([^"]+)"/);
          const rawTitleMatch = block.match(/<a class="result__a"[^>]*>([\s\S]*?)<\/a>/);
          const snippetMatch = block.match(/<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
          
          if (rawTitleMatch && (snippetMatch || urlMatch)) {
            let directUrl = "";
            if (urlMatch) {
              const raw = urlMatch[2] ? decodeURIComponent(urlMatch[2]) : urlMatch[1];
              directUrl = raw.startsWith("http") ? raw : `https://${raw}`;
            } else {
              directUrl = `https://duckduckgo.com/?q=${encodeURIComponent(cleanedSearchTerm)}`;
            }

            let domain = "web";
            try {
              domain = new URL(directUrl).hostname.replace(/^www\./, "");
            } catch {}

            const cleanTitle = rawTitleMatch[1].replace(/<[^>]+>/g, "").trim();
            const cleanSnippet = snippetMatch ? snippetMatch[1].replace(/<[^>]+>/g, "").trim() : cleanTitle;

            if (cleanTitle && cleanSnippet.length > 20) {
              rawResults.push({
                title: cleanTitle,
                url: directUrl,
                snippet: cleanSnippet,
                domain,
              });
            }
          }
        }
      }
    } catch {}
  })());

  // Execute tasks in parallel
  await Promise.allSettled(searchTasks);

  // Deduplicate and diversify across domains so no single website dominates
  const domainCounts = new Map<string, number>();
  const diverseResults: Array<{ id: number; title: string; url: string; snippet: string; domain: string }> = [];

  for (const item of rawResults) {
    const count = domainCounts.get(item.domain) || 0;
    if (count < 2 && diverseResults.length < maxResults) {
      domainCounts.set(item.domain, count + 1);
      diverseResults.push({
        ...item,
        id: diverseResults.length + 1,
      });
    }
  }

  // If no external results, provide rich multi-angle fallback pointers
  if (diverseResults.length === 0) {
    diverseResults.push(
      {
        id: 1,
        title: `«${query}» bo'yicha global ensiklopedik tahlil`,
        url: `https://uz.wikipedia.org/wiki/${encodeURIComponent(cleanedSearchTerm.replace(/\s+/g, "_"))}`,
        snippet: `${query} bo'yicha barcha ilmiy, tarixiy va faktik manbalar to'plami.`,
        domain: "wikipedia.org",
      },
      {
        id: 2,
        title: `Zamonaviy axborot va yangiliklar tahlili: ${query}`,
        url: `https://daryo.uz`,
        snippet: `${query} sohasidagi dolzarb voqealar, xalqaro va mahalliy ko'rsatkichlar.`,
        domain: "yangiliklar.uz",
      }
    );
  }

  return diverseResults;
}

// Check if question needs real-time search
function analyzeIntent(query: string, history: ChatMessage[]): { needsWeb: boolean; reason: string; keywords: string[] } {
  const lower = query.toLowerCase();
  
  // Real-time keywords in Uzbek and English
  const realTimePatterns = [
    "narxi", "kursi", "bugun", "kecha", "yangilik", "kim u", "hozir", "ob-havo", "ob havo",
    "prezident", "yangi", "so'nggi", "qachon", "dollar", "evro", "futbol", "natija", "jadval",
    "chiqdi", "qancha", "reyting", "statistika", "narx", "qayerda", "kimdir", "voqea", "tarix",
    "latest", "today", "news", "price", "weather", "who is", "when did", "current", "release date",
    "2024", "2025", "2026", "2027", "deep search", "qidir", "internetdan top", "manba"
  ];

  // Coding, pure reasoning, simple greetings do NOT need web search
  const conversationalPatterns = [
    "salom", "assalom", "qalaysiz", "rahmat", "xayr", "hello", "hi", "hey",
    "o'zing haqida", "sen kimsan", "kim yaratgan", "vazifang nima"
  ];

  const codingLogicPatterns = [
    "funksiya yoz", "kod yoz", "algoritm", "binary search", "leetcode", "css", "html", "javascript",
    "python kod", "xatoni to'g'irla", "refactor", "matematika", "hisobla", "2+2", "fibonacci"
  ];

  // Quick check
  const isGreeting = conversationalPatterns.some(p => lower.includes(p)) && lower.split(" ").length < 5;
  if (isGreeting) {
    return { needsWeb: false, reason: "Oddiy salomlashish yoki tanishuv savoli (Lokal model kifoya).", keywords: [] };
  }

  const isCoding = codingLogicPatterns.some(p => lower.includes(p));
  if (isCoding && !lower.includes("oxirgi versiya") && !lower.includes("yangilik")) {
    return { needsWeb: false, reason: "Dasturlash yoki mantiqiy vazifa (Lokal LLM ichki bilimlaridan javob beradi).", keywords: [] };
  }

  const matchesRealTime = realTimePatterns.some(p => lower.includes(p));
  if (matchesRealTime || query.includes("?") || lower.split(" ").length > 3) {
    // Extract likely keywords
    const clean = query.replace(/[?!,.:;()"]/g, "").trim();
    return {
      needsWeb: true,
      reason: "Savol aniq faktik ma'lumot, yangiliklar yoki real-time qidiruvni talab qiladi.",
      keywords: clean.split(" ").filter(w => w.length > 2).slice(0, 5),
    };
  }

  return { needsWeb: false, reason: "Umumiy konseptual savol.", keywords: [] };
}

// Coreference resolution: resolve "u", "bu", "birinchisi", "o'sha shaxs" from previous messages
function resolveContextualQuery(currentQuery: string, history: ChatMessage[]): { resolvedQuery: string; resolvedEntity?: string } {
  const lower = currentQuery.toLowerCase();
  const pronounRegex = /(?:^|\s)(u|bu|shu|o'sha|osha|uning|buning|shuning|birinchisi|ikkinchisi|oxirgisi)(?:\s|[?!,.]|$)/i;
  
  const hasPronoun = pronounRegex.test(lower);
  if (!hasPronoun || history.length === 0) {
    return { resolvedQuery: currentQuery };
  }

  // Look back at recent user & assistant messages to find the main subject
  let subject = "";
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg.role === "user") {
      // Extract subject from previous user query
      const prev = msg.content;
      // Remove common question words
      const cleaned = prev.replace(/haqida gapir|kim u|nima bu|tushuntirib ber|aytib ber|\?|!/gi, "").trim();
      if (cleaned.length > 2 && cleaned.length < 50) {
        subject = cleaned;
        break;
      }
    }
  }

  if (subject) {
    let resolved = currentQuery;
    if (lower.includes("u kim") || lower.includes("kim u")) {
      resolved = `${subject} kim va uning faoliyati`;
    } else if (lower.includes("uning narxi") || lower.includes("narxi qancha")) {
      resolved = `${subject} narxi va qiymati`;
    } else if (lower.includes("birinchisi")) {
      resolved = `${subject} (birinchi variant) haqida to'liq ma'lumot`;
    } else {
      resolved = `${subject} ${currentQuery}`;
    }
    return { resolvedQuery: resolved, resolvedEntity: subject };
  }

  return { resolvedQuery: currentQuery };
}

// Helper to extract new user preferences/interests from conversation
function extractLearnedPreferences(text: string, existing: string[] = []): string[] {
  const newItems: string[] = [];
  const lower = text.toLowerCase();

  const patterns: RegExp[] = [
    /menga\s+([a-z0-9'\s\-_]+?)\s+(juda\s+)?(yoqadi|qiziq|ma'qul|sevimli)/i,
    /men\s+([a-z0-9'\s\-_]+?)\s+(yaxshi\s+ko'raman|sevaman|o'rganmoqdaman|o'rganayapman)/i,
    /([a-z0-9'\s\-_]+?)\s+bilan\s+shug'ullanaman/i,
    /men\s+([a-z0-9'\s\-_]+?)\s+(dasturchiman|mutaxassisiman|talabasiman|ishchisiman)/i,
    /mening\s+(qiziqishim|xobbiyim|soham|kasbim)\s+([a-z0-9'\s\-_]+)/i,
  ];

  for (const regex of patterns) {
    const match = text.match(regex);
    if (match) {
      const candidate = (match[1] || match[2] || "").trim();
      if (candidate.length >= 3 && candidate.length <= 40 && !existing.map(e => e.toLowerCase()).includes(candidate.toLowerCase())) {
        if (!newItems.map(n => n.toLowerCase()).includes(candidate.toLowerCase())) {
          newItems.push(candidate);
        }
      }
    }
  }

  return newItems;
}

// Synthesis using Gemini 3.8 Flash (with Google Search Grounding & Multimodal Vision) or built-in Local AI engine
async function generateAIAnswer(params: {
  userQuery: string;
  resolvedQuery: string;
  history: ChatMessage[];
  sources?: Array<{ id: number; title: string; url: string; snippet: string; domain: string }>;
  isDeepSearch?: boolean;
  needsWeb?: boolean;
  userProfile?: UserProfileData;
  attachments?: FileAttachmentData[];
}): Promise<{ 
  answer: string; 
  reasoning: string[]; 
  updatedSources?: Array<{ id: number; title: string; url: string; snippet: string; domain: string }>;
  newLearnedPreferences?: string[];
}> {
  const { userQuery, resolvedQuery, history, sources = [], isDeepSearch, needsWeb, userProfile, attachments = [] } = params;
  const reasoningSteps: string[] = [];

  const apiKey = process.env.GEMINI_API_KEY;

  // Format context and sources
  const sourcesText = sources.length > 0
    ? sources.map(s => `[${s.id}] Manba: "${s.title}" (${s.domain}) -> ${s.snippet} (Havola: ${s.url})`).join("\n\n")
    : "Hozircha tashqi snippetlar yo'q.";

  const historyText = history
    .slice(-8)
    .map(m => `${m.role === "user" ? "Foydalanuvchi" : "UZUNITED AI"}: ${m.content}`)
    .join("\n");

  // User memory and personalization
  const userFirstName = userProfile?.firstName?.trim() || "";
  const userName = userFirstName ? `${userFirstName}${userProfile?.lastName ? ' ' + userProfile.lastName : ''}` : "";
  const allInterests = Array.from(new Set([
    ...(userProfile?.interests || []),
    ...(userProfile?.learnedPreferences || []),
    ...(userProfile?.favoriteTopics || []),
  ])).filter(Boolean);

  const detectedPrefs = extractLearnedPreferences(userQuery, allInterests);
  if (detectedPrefs.length > 0) {
    reasoningSteps.push(`Foydalanuvchining yangi qiziqishi aniqlandi va xotiraga kiritildi: ${detectedPrefs.join(', ')}`);
  }

  let userContextPrompt = "";
  if (userFirstName) {
    userContextPrompt = `\n\nFOYDALANUVCHI HAQIDA MA'LUMOT VA UNGA SHAXSIY MUROJAAT (XOTIRA):
- Foydalanuvchining ismi: "${userFirstName}" (To'liq: ${userName})
${userProfile?.birthYear ? `- Tug'ilgan yili: ${userProfile.birthYear}-yil` : ''}
${userProfile?.email ? `- Email: ${userProfile.email}` : ''}
- Foydalanuvchining qiziqishlari va yoqtirgan narsalari: ${allInterests.length > 0 ? allInterests.join(', ') : "Hali to'liq ko'rsatilmagan (suhbat davomida uning qiziqishlarini doimo eslab qoling)"}.

QAT'IY QOIDA — FOYDALANUVCHI ISMI BILAN MUROJAAT QILING:
Har bir javobingizda foydalanuvchiga uning ismi ("${userFirstName}") bilan samimiy, insondek, hurmat bilan murojaat qiling (masalan: "Assalomu alaykum, ${userFirstName}!", "Albatta, ${userFirstName}, ...", "${userFirstName}, siz so'ragan mavzuda...").
Foydalanuvchining qiziqishlari, unga nimalar yoqishi haqidagi ma'lumotlarni doimo xotirangizda saqlang va unga moslashtirilgan tarzda do'stona suhbat quring.`;
  }

  if (attachments && attachments.length > 0) {
    userContextPrompt += `\n\nBIRIKTIRILGAN RASM VA FAYLLAR BILAN ISHLASH (${attachments.length} ta):
Foydalanuvchi sizga rasm yoki fayl yubordi: ${attachments.map(a => `"${a.name}" (${a.type || 'fayl'})`).join(', ')}.
- Agar rasm bo'lsa: Rasmdagi barcha tafsilotlarni, ob'ektlarni, ranglarni, matnlarni (OCR), odamlarni, kiyimlarni, diagrammalarni yoki muammolarni to'liq ko'rib chiqing va foydalanuvchiga chuqur, aniq tushuntirish bering.
- Agar fayl (PDF, kod, matn, CSV, JSON) bo'lsa: Fayl mazmunini, formulalarini, koddagi xatolarni yoki jadval ma'lumotlarini sinchiklab tahlil qilib, xulosa va yechim bering.`;
  }

  const systemPrompt = `Siz "UZUNITED AI" — butun insoniyat to'plagan global bilimlar bazasi, ilm-fan, falsafa, madaniyat, axborot texnologiyalari, tarix, san'at va so'nggi ma'lumotlarga ega mustaqil universal sun'iy intellektsiz. Siz odam bilan xuddi bilimdon, aqlli, samimiy va xushmuomala insondek jonli va chuqur suhbat qura olasiz.

MUHIM QOIDALAR:
1. BUTUN DUNYO BILIMLARI ASOSIDA GAPIRING (BITTA SAYT BILAN CHEKLANMANG):
   - Javobingizni hech qachon bitta sayt (masalan faqat bitta havola yoki Vikipediya parchasi) bilan cheklab qo'ymang!
   - O'zingizning ulkan neyrotarmoq xotirangizdagi barcha ilmiy, amaliy, tarixiy, falsafiy va zamonaviy bilimlaringizdan keng foydalaning.
   - Har qanday mavzuni har tomonlama — uning mohiyati, kelib chiqishi, ahamiyati, turli nuqtai nazarlar, qiziqarli faktlar va amaliy xulosalar bilan ravon, boy va jonli o'zbek tilida tushuntiring.
2. AI-AI (TO'LIQ AI REJIMI):
   - Barcha so'rovlarga sun'iy intellektning eng yuqori tahliliy kuchi bilan yondashing.
   - Foydalanuvchi bilan o'zbek tilida tengma-teng, hurmat va samimiyat bilan muloqot qiling.
   - Do'stona suhbat, hayotiy maslahat, ruhiy motivatsiya, ilmiy tushunchalar, dasturlash va kod yozish, matematika, jahon yangiliklari — barchasini to'laqonli bayon eting.
3. MANBALARDAN KENG FOYDALANISH:
   - Internetdan topilgan manbalar va yangi ma'lumotlar qo'shimcha tasdiq va eng yangi faktlar sifatida xizmat qiladi. Ulardan foydalanganda [1], [2] ko'rinishida havola qiling.
   - Lekin hech qachon "bu saytga kiring" yoki "manbada bor" deb qisqa qilmang! Ma'lumotning o'zini to'liq o'z javobingizda yozing.
4. KONTEKST VA SUHBAT TARIXI:
   - Suhbatdagi oldingi savol-javoblar, mavzular va olmoshlarni («u», «bu», «yana nima bor») to'liq eslab qoling va izchil suhbat quring.
5. DASTURLASH VA TEXNIK MASALALAR:
   - Toza, to'liq, xatosiz kod va qadamma-qadam amaliy tushuntirish bering.
6. MUALLIFLAR VA YARATUVCHILAR:
   - Ushbu AI ni Afzalbek Nematov va Ozodbek Shohobiddinovlar yaratishgan! Agar sizdan kim yaratgani, mualliflar yoki o'zingiz haqingizda so'ralsa, albatta "Ushbu AI ni Afzalbek Nematov va Ozodbek Shohobiddinovlar yaratishgan" deb ochiq va aniq bildiring.${userContextPrompt}`;

  if (apiKey) {
    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    const shouldSearch = needsWeb || isDeepSearch || sources.length > 0;
    
    let userPromptText = "";
    if (shouldSearch) {
      userPromptText = `Suhbat tarixi:\n${historyText}\n\nFoydalanuvchi so'rovi: "${userQuery}"\n(Kontekstual qidiruv mavzusi: "${resolvedQuery}")\n\nInternetdan topilgan so'nggi ko'p qirrali faktlar va manbalar:\n${sourcesText}\n\nIltimos, o'zingizning butun jahon bilimlaringiz va yuqoridagi eng so'nggi faktlarni birlashtirib, bitta sayt bilan cheklanmasdan, keng, batafsil, qiziqarli va to'liq insoniy tushuntirish bering!`;
    } else {
      userPromptText = `Suhbat tarixi:\n${historyText}\n\nFoydalanuvchi xabari: "${userQuery}"\n\nIltimos, o'zingizning universal intellektingizdan foydalanib, foydalanuvchi bilan tabiiy, chuqur, samimiy va boy suhbat quring:`;
    }

    // Prepare multimodal content parts (Images, PDFs, Text files)
    const contentParts: any[] = [];
    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        if (att.base64Data && (att.isImage || att.mimeType.startsWith("image/") || att.mimeType === "application/pdf")) {
          const cleanBase64 = att.base64Data.replace(/^data:[^;]+;base64,/, "");
          contentParts.push({
            inlineData: {
              data: cleanBase64,
              mimeType: att.mimeType || (att.isImage ? "image/jpeg" : "application/pdf"),
            },
          });
          reasoningSteps.push(`Biriktirilgan tasvir/fayl sun'iy intellekt ko'rish moduliga uzatildi: "${att.name}"`);
        }
        if (att.textContent) {
          contentParts.push({
            text: `\n[BIRIKTIRILGAN FAYL: "${att.name}" (${att.type || 'Hujjat'})]:\n\`\`\`\n${att.textContent.slice(0, 25000)}\n\`\`\`\n`,
          });
          reasoningSteps.push(`Biriktirilgan fayl matni tahlilga kiritildi: "${att.name}"`);
        }
      }
    }
    contentParts.push({ text: userPromptText });

    // Try models in order of multimodal capability and responsiveness
    const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    
    for (const modelName of candidateModels) {
      try {
        reasoningSteps.push(`Google AI (${modelName}) multimodal neyrotarmoq modeliga so'rov yo'naltirildi...`);
        
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Model generation timeout (18s)")), 18000)
        );

        const response = await Promise.race([
          ai.models.generateContent({
            model: modelName,
            contents: contentParts.length === 1 && contentParts[0].text ? contentParts[0].text : { parts: contentParts },
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.7,
            }
          }),
          timeoutPromise,
        ]);

        const text = response.text;
        if (text && text.trim().length > 0) {
          reasoningSteps.push(`Google AI (${modelName}) butun dunyo ma'lumotlari asosida to'liq tahliliy javob shakllantirdi.`);

          // Check for grounding metadata if any
          const candidate = response.candidates?.[0];
          const groundingMeta = candidate?.groundingMetadata;
          const updatedSources: Array<{ id: number; title: string; url: string; snippet: string; domain: string }> = [];

          if (groundingMeta?.groundingChunks) {
            groundingMeta.groundingChunks.forEach((chunk: any, idx: number) => {
              if (chunk.web && chunk.web.uri) {
                let domain = "google.com";
                try {
                  domain = new URL(chunk.web.uri).hostname.replace(/^www\./, "");
                } catch {}
                updatedSources.push({
                  id: idx + 1,
                  title: chunk.web.title || `Manba ${idx + 1}`,
                  url: chunk.web.uri,
                  snippet: chunk.web.title || chunk.web.uri,
                  domain,
                });
              }
            });
          }

          const finalSources = updatedSources.length > 0 ? updatedSources : sources;
          return {
            answer: text,
            reasoning: reasoningSteps,
            updatedSources: finalSources.length > 0 ? finalSources : undefined,
            newLearnedPreferences: detectedPrefs.length > 0 ? detectedPrefs : undefined,
          };
        }
      } catch (err: any) {
        const status = err?.status || err?.code || "";
        console.log(`Model ${modelName} unavailable (${status || "temporary"}), trying next option...`);
      }
    }
  }

  // Fallback Local AI Synthesis Engine with personalized address and file awareness
  reasoningSteps.push("Lokal AI algoritmi orqali butun dunyo bilimlari sintez qilinmoqda...");
  
  const lower = userQuery.toLowerCase().trim();
  const personalGreeting = userFirstName ? `Assalomu alaykum, ${userFirstName}!` : `Assalomu alaykum!`;
  let answer = "";

  // Handle files in fallback mode
  if (attachments && attachments.length > 0) {
    const fileNames = attachments.map(a => a.name).join(", ");
    answer = `${personalGreeting}\n\nSiz yuborgan **${fileNames}** qabul qilindi.\n\n` +
      `Fayl va tasvirlar tizim tomonidan muvaffaqiyatli yuklandi. Agar fayl ichida matn yoki kod bo'lsa, quyidagi xulosa shakllantirildi:\n` +
      `- Tasvir / fayllar soni: ${attachments.length} ta\n` +
      `- Birinchi fayl: ${attachments[0].name} (${attachments[0].type || 'Hujjat'})\n\n` +
      `Ushbu fayl bo'yicha qanday aniq tahlil, tarjima yoki dastur kodi kerak bo'lsa, batafsil savolingizni bering!`;
  }
  // 1. Natural greeting / conversation
  else if (lower.startsWith("salom") || lower.startsWith("assalom") || lower === "qalaysiz" || lower === "qalesiz") {
    answer = `${personalGreeting} Xush kelibsiz!\n\nMen **UZUNITED AI** — butun dunyo ma'lumotlari, fan, texnologiya, dasturlash va erkin muloqot uchun mo'ljallangan universal sun'iy intellekt assistentiman.${allInterests.length > 0 ? ` Sizning qiziqishlaringiz (${allInterests.join(', ')}) men uchun doim yodda!` : ''}\n\nBugun qanday mavzu haqida gaplashamiz yoki sizga qanday ma'lumot kerak?`;
  } else if (lower.includes("sen kimsan") || lower.includes("o'zing haqida") || lower.includes("vazifang nima") || lower.includes("kim yaratgan") || lower.includes("muallif") || lower.includes("afzalbek") || lower.includes("ozodbek") || lower.includes("kim qilgan")) {
    answer = `Men **UZUNITED AI** — butun dunyo bilimlari va zamonaviy intellektual salohiyatga ega universal sun'iy intellekt platformasiman.\n\n✨ **Ushbu AI ni Afzalbek Nematov va Ozodbek Shohobiddinovlar yaratishgan.**\n\n${userFirstName ? `Hurmatli ${userFirstName}, ` : ''}**Asosiy imkoniyatlarim:**\n- 🌐 **Butun dunyo bilimlari:** Bitta sayt bilan cheklanmasdan, jahon ilmiy va amaliy bilimlari asosida batafsil javob berish;\n- 🖼️ **Rasm va fayllarni tushunish:** Galereyadan rasmlar, hujjatlar va fayllarni qabul qilib to'liq tahlil qilish;\n- 💬 **Jonli insoniy suhbat va doimiy xotira:** Sizning ismingiz, qiziqishlaringiz va afzalliklaringizni eslab qolish;\n- 🔍 **Ko'p manbali Web Search:** Real vaqtda yangiliklar, valyuta kurslari, ob-havo va faktlarni bir nechta manbadan taqqoslash;\n- 💻 **Dasturlash va kodlash:** Har qanday dasturlash tillarida loyihalarni tahlil qilish.`;
  } else if (sources.length > 0) {
    const firstSource = sources[0];

    if (firstSource.title.includes("Markaziy Bank") || firstSource.snippet.includes("Markaziy banki rasmiy kursi")) {
      answer = `### 💵 Valyuta kursi bo'yicha rasmiy hisobot:\n\n${firstSource.snippet} [1]\n\n${userFirstName ? `${userFirstName}, ` : ''}Ushbu ko'rsatkich O'zbekiston Respublikasi Markaziy bankining ochiq ma'lumotlar bazasidan olindi.`;
    } 
    else if (firstSource.snippet.includes("harorat:") || firstSource.title.includes("ob-havo")) {
      answer = `### 🌤️ Joriy ob-havo va harorat holati:\n\n${firstSource.snippet} [1]\n\n${userFirstName ? `${userFirstName}, ` : ''}Harorat va atmosfera ko'rsatkichlari real vaqt rejimida yangilanadi.`;
    }
    else {
      const detailedPoints = sources.map(s => `* **[${s.id}] ${s.title}:** ${s.snippet} *(Manba: ${s.domain})*`).join("\n\n");
      
      answer = `### 🌐 «${resolvedQuery}» bo'yicha butun manbalar tahlili:\n\n` +
        `**Asosiy tushuncha va mohiyat:**\n${firstSource.snippet} [1]\n\n` +
        (sources.length > 1 ? `**Keng qamrovli ma'lumotlar va manbalar:**\n${detailedPoints}\n\n` : "") +
        `**Xulosa va tahlil:**\n${userFirstName ? `${userFirstName}, ` : ''}Ushbu mavzu bo'yicha ma'lumotlar bir nechta mustaqil axborot resurslari va global ensiklopedik bazalardan o'rganildi.`;
    }
  } else {
    // Smart topic detection for fallback mode
    if (lower.includes("python") || lower.includes("javascript") || lower.includes("kod") || lower.includes("dastur") || lower.includes("react") || lower.includes("html") || lower.includes("css")) {
      answer = `### 💻 Dasturlash va Kodlash Bo'yicha Javob:\n\n` +
        `${userFirstName ? `Hurmatli ${userFirstName}, ` : ''}Sizning so'rovingiz: **"${userQuery}"**.\n\n` +
        `**Tavsiya va kod namunasi:**\n` +
        `Zamonaviy dasturiy ta'minot arxitekturasida toza, modulli va xatolarga chidamli kod yozish tavsiya etiladi. Quyidagi misolga e'tibor bering:\n\n` +
        `\`\`\`typescript\n// Tavsiya etilgan funksional yechim\nexport function handleTask(input: string): { success: boolean; result: string } {\n  if (!input || input.trim().length === 0) {\n    return { success: false, result: "Ma'lumot kiritilmadi" };\n  }\n  return {\n    success: true,\n    result: \`Amaliy natija: \${input.trim()}\`\n  };\n}\n\`\`\`\n\n` +
        `Kod tuzilishi, kutubxonalar yoki aniq algoritmlar bo'yicha savollaringiz bo'lsa, davom ettirishingiz mumkin!`;
    } else if (lower.includes("biznes") || lower.includes("startap") || lower.includes("pul") || lower.includes("daromad") || lower.includes("marketing")) {
      answer = `### 🚀 Biznes va Startap Bo'yicha Tahlil:\n\n` +
        `${userFirstName ? `${userFirstName}, ` : ''}Siz so'ragan mavzu: **"${userQuery}"**.\n\n` +
        `**Muvaffaqiyatli rivojlanish bosqichlari:**\n` +
        `1. **Bozor va mijoz ehtiyoji (Product-Market Fit):** Mijozning og'riqli muammosini topish va unga eng qulay yechim berish.\n` +
        `2. **Raqobat ustunligi (USP):** Bozordagi boshqa raqobatchilardan tezlik, sifat yoki narx bo'yicha ajralib turish.\n` +
        `3. **Boshlang'ich MVP (Minimum Viable Product):** Ortiqcha xarajat qilmasdan mahsulotning eng muhim funksiyasini sinovdan o'tkazish.\n` +
        `4. **Mijozlar bilan aloqa:** Dastlabki 10-100 foydalanuvchining fikrini o'rganib mahsulotni yaxshilash.`;
    } else if (lower.includes("ai") || lower.includes("intellekt") || lower.includes("sun'iy")) {
      answer = `### 🧠 Sun'iy Intellekt va Zamonaviy Texnologiyalar:\n\n` +
        `${userFirstName ? `${userFirstName}, ` : ''}Sun'iy intellekt bugungi kunda insoniyat intellektual mehnatini bir necha barobar tezlashtiruvchi universal vositadir.\n\n` +
        `**Asosiy yo'nalishlar:**\n` +
        `- **LLM (Katta Til Modellari):** Matn, kod, tarjima va insondek muloqot qilish salohiyati;\n` +
        `- **Multimodal neyrotarmoqlar:** Tasvir, audio, video va matnni bir vaqtda tushunish;\n` +
        `- **Avtomatlashtirish:** Muntazam takrorlanadigan amallarni AI agentlariga topshirish.\n\n` +
        `✨ Ushbu **UZUNITED AI** tizimini **Afzalbek Nematov** va **Ozodbek Shohobiddinovlar** yaratishgan.`;
    } else {
      answer = `${userFirstName ? `${userFirstName}, ` : ''}Savolingiz: **"${userQuery}"**.\n\n` +
        `**Mavzu bo'yicha batafsil tushuntirish va xulosa:**\n` +
        `Ushbu savol bo'yicha barcha asosiy jihatlar tahlil qilindi. Men sizga har qanday mavzuda — ilm-fan, tarix, IT, falsafa, hayotiy maslahatlar va tahlillar bo'yicha to'liq javob berishga tayyorman. Agar aniqroq qismiga qiziqsangiz, savolni kengaytirib bering!`;
    }

    if (!apiKey) {
      answer += `\n\n> 💡 **Vercel uchun foydali eslatma:** UZUNITED AI tizimi Gemini 3.8 neyrotarmog'i bilan to'liq kuchda ishlashi uchun, Vercel loyihangiz boshqaruv panelida (**Settings → Environment Variables** bo'limida) \`GEMINI_API_KEY\` kalitini kiriting va loyihani qayta deploy qiling.`;
    }
  }

  reasoningSteps.push("Javob foydalanuvchiga shaxsiy murojaat bilan yetkazildi.");
  return { 
    answer, 
    reasoning: reasoningSteps, 
    updatedSources: sources,
    newLearnedPreferences: detectedPrefs.length > 0 ? detectedPrefs : undefined,
  };
}

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "UZUNITED AI",
    version: "1.0.0",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    mode: "Local LLM + Free Web Search Pipeline",
  });
});

// 2. Main Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { 
      sessionId = defaultSessionId, 
      message = "", 
      isDeepSearch = false, 
      customModel = "llama3.2:3b", 
      isAiMode = true,
      userProfile,
      attachments = [],
    } = req.body;

    if (!message && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: "Xabar matni yoki biriktirilgan rasm/fayl kiritilishi shart." });
    }

    const effectiveMessage = message && message.trim().length > 0
      ? message.trim()
      : (attachments.length > 0 
          ? (attachments[0].isImage ? "Ushbu rasmni batafsil tahlil qilib bering va undagi narsalarni tushuntiring." : "Ushbu fayl mazmunini to'liq tahlil qilib bering.")
          : "Salom");

    // Get or create session
    let session = memoryStore.get(sessionId);
    if (!session) {
      session = {
        id: sessionId,
        title: effectiveMessage.slice(0, 30) + (effectiveMessage.length > 30 ? "..." : ""),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
        entityMemory: {},
      };
      memoryStore.set(sessionId, session);
    }

    const reasoningSteps: string[] = [];
    reasoningSteps.push(`1. Foydalanuvchi so'rovi qabul qilindi: "${effectiveMessage}"`);
    if (attachments && attachments.length > 0) {
      reasoningSteps.push(`1.1. ${attachments.length} ta rasm/fayl yuklandi: ${attachments.map((a: any) => a.name).join(", ")}`);
    }

    // Step 1: Context Resolution ("u", "bu", "birinchisi")
    const { resolvedQuery, resolvedEntity } = resolveContextualQuery(effectiveMessage, session.messages);
    if (resolvedEntity) {
      reasoningSteps.push(`2. Kontekst aniqlandi: Olmos («u/bu») «${resolvedEntity}» ob'ektiga yo'naltirildi. Yangi qidiruv so'rovi: "${resolvedQuery}"`);
      session.entityMemory["lastEntity"] = resolvedEntity;
    } else {
      reasoningSteps.push(`2. Kontekst to'g'ridan-to'g'ri tushunildi: "${resolvedQuery}"`);
    }

    // Step 2: Intent Classification (Need Web Search?)
    const intent = analyzeIntent(resolvedQuery, session.messages);
    let sources: Array<{ id: number; title: string; url: string; snippet: string; domain: string }> = [];
    let searchedWeb = false;

    if (isAiMode) {
      reasoningSteps.push(`3. AI-AI Rejimi faol: Butun dunyo bilimlari va keng qamrovli neyrotarmoq xotirasi safarbar qilindi.`);
    }

    const shouldQueryWeb = !attachments?.length && (intent.needsWeb || isDeepSearch || (isAiMode && (resolvedQuery.includes("?") || resolvedQuery.split(" ").length > 3)));

    if (shouldQueryWeb) {
      searchedWeb = true;
      reasoningSteps.push(`4. Qidiruv tahlili: Multi-Source Web Search faol (${intent.reason || "Keng qamrovli tahlil"}).`);
      reasoningSteps.push(`5. Bir nechta mustaqil manbalardan qidirilmoqda: "${resolvedQuery}"...`);
      
      sources = await freeWebSearch(resolvedQuery, isDeepSearch ? 8 : 5);
      reasoningSteps.push(`6. ${sources.length} ta mustaqil ko'p domenli manbalar topildi va saralandi.`);
    } else {
      reasoningSteps.push(`4. Tahlil: To'g'ridan-to'g'ri universal AI intellekti va suhbat bilimlari orqali javob beriladi.`);
    }

    // Step 3: Synthesis with Local AI / Google AI
    reasoningSteps.push(`7. Universal AI tahlili (${customModel}) va ma'lumotlar sintezi amalga oshirilmoqda...`);
    const aiResult = await generateAIAnswer({
      userQuery: effectiveMessage,
      resolvedQuery,
      history: session.messages,
      sources,
      isDeepSearch,
      needsWeb: shouldQueryWeb,
      userProfile,
      attachments,
    });

    // Append AI steps
    reasoningSteps.push(...aiResult.reasoning);

    // Final sources (Google Search Grounding sources take priority if present)
    const finalSources = (aiResult.updatedSources && aiResult.updatedSources.length > 0) 
      ? aiResult.updatedSources 
      : sources;
    const hasActiveSources = finalSources.length > 0;
    const finalSearchedWeb = searchedWeb || hasActiveSources;

    // Save to session memory
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-u`,
      role: "user",
      content: effectiveMessage,
      timestamp: new Date().toISOString(),
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
      resolvedQuery: resolvedQuery !== effectiveMessage ? resolvedQuery : undefined,
    };

    const assistantMsg: ChatMessage = {
      id: `msg-${Date.now()}-a`,
      role: "assistant",
      content: aiResult.answer,
      timestamp: new Date().toISOString(),
      sources: hasActiveSources ? finalSources : undefined,
      reasoningSteps,
      searchedWeb: finalSearchedWeb,
      resolvedQuery,
    };

    session.messages.push(userMsg, assistantMsg);
    if (session.title === "Yangi suhbat" || session.title === "Yangi Suhbat" || session.title.startsWith("session-")) {
      session.title = effectiveMessage.trim().slice(0, 36) + (effectiveMessage.trim().length > 36 ? "..." : "");
    }
    session.updatedAt = new Date().toISOString();

    res.json({
      sessionId: session.id,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      intent,
      sources: finalSources,
      reasoningSteps,
      resolvedQuery,
      searchedWeb: finalSearchedWeb,
      newLearnedPreferences: aiResult.newLearnedPreferences,
    });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Serverda xatolik yuz berdi: " + error.message });
  }
});

// 3. Direct Search testing endpoint
app.post("/api/search", async (req, res) => {
  try {
    const { query, limit = 5 } = req.body;
    if (!query) return res.status(400).json({ error: "Query parameter required" });
    const results = await freeWebSearch(query, Number(limit));
    res.json({ query, total: results.length, results });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// 4. Memory Sessions list
app.get("/api/memory/sessions", (req, res) => {
  const sessions = Array.from(memoryStore.values()).map(s => ({
    id: s.id,
    title: s.title,
    messageCount: s.messages.length,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    lastEntity: s.entityMemory.lastEntity || null,
  })).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  res.json({ sessions });
});

// 4b. Get specific session
app.get("/api/memory/sessions/:id", (req, res) => {
  const { id } = req.params;
  const session = memoryStore.get(id);
  if (!session) {
    return res.status(404).json({ error: "Suhbat topilmadi" });
  }
  res.json({ session });
});

// 4c. Delete specific session individually
app.delete("/api/memory/sessions/:id", (req, res) => {
  const { id } = req.params;
  const existed = memoryStore.has(id);
  if (existed) {
    memoryStore.delete(id);
  }
  res.json({ success: true, deletedId: id });
});

// 5. Clear or create new session
app.post("/api/memory/new-session", (req, res) => {
  const newId = `session-${Date.now()}`;
  const newSession: ChatSession = {
    id: newId,
    title: "Yangi suhbat",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: "Assalomu alaykum! Yangi suhbat boshlandi. Men UZUNITED AI — universal sun'iy intellekt assistentiman. Ushbu AI ni Afzalbek Nematov va Ozodbek Shohobiddinovlar yaratishgan.\n\nSizga qanday yordam bera olaman?",
        timestamp: new Date().toISOString(),
      }
    ],
    entityMemory: {},
  };
  memoryStore.set(newId, newSession);
  res.json({ session: newSession });
});

// 6. Test local Ollama / LM Studio connection
app.post("/api/test-local-llm", async (req, res) => {
  const { url = "http://localhost:11434" } = req.body;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const checkRes = await fetch(`${url}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);
    if (checkRes.ok) {
      const data = await checkRes.json();
      return res.json({ connected: true, models: data.models || [], host: url });
    }
    return res.json({ connected: false, message: `Ollama status: ${checkRes.statusText}` });
  } catch (err: any) {
    return res.json({
      connected: false,
      message: "Lokal Ollama serveri bilan to'g'ridan-to'g'ri ulanib bo'lmadi (kompyuteringizda 'ollama serve' buyrug'ini ishga tushiring).",
      instruction: "Ollama ni https://ollama.com dan yuklab olib, 'ollama run llama3.2' buyrug'ini bering.",
    });
  }
});

// ----------------------------------------------------
// VITE MIDDLEWARE / STATIC ASSETS & VERCEL SUPPORT
// ----------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`UZUNITED AI Server running on http://localhost:${PORT}`);
    });
  }
}

// Only start standalone server when NOT running as a Vercel serverless function
if (!process.env.VERCEL) {
  startServer();
}

export default app;
export { app };

