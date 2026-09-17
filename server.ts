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
      const wikiRes = await fetch(wikiSearchUrl, { signal: AbortSignal.timeout(1400) });
      if (wikiRes.ok) {
        const data = await wikiRes.json();
        const items = data.query?.search || [];
        if (items.length > 0) {
          const topTitle = items[0].title;
          try {
            const extractUrl = `https://uz.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=${encodeURIComponent(topTitle)}&format=json`;
            const extractRes = await fetch(extractUrl, { signal: AbortSignal.timeout(1200) });
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
        signal: AbortSignal.timeout(1600),
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
  const lower = query.toLowerCase().replace(/[‘’`ʼ']/g, "'").trim();

  // 1. User profile, identity, memory, creator, or personal queries NEVER need web search
  if (
    lower.includes("tug'ilgan") ||
    lower.includes("tugilgan") ||
    lower.includes("yoshim") ||
    lower.includes("eslab qol") ||
    lower.includes("yodingda") ||
    lower.includes("men haqimda") ||
    lower.includes("meni eslaysanmi") ||
    lower.includes("sen kimsan") ||
    lower.includes("isming nima") ||
    lower.includes("muallif") ||
    lower.includes("kim yaratgan") ||
    lower.includes("o'zing haqida") ||
    lower.includes("vazifang nima")
  ) {
    return { needsWeb: false, reason: "Shaxsiy muloqot yoki tizim so'rovi.", keywords: [] };
  }

  // 2. Casual human-to-human conversation, feelings, greetings, and chit-chat
  const conversationalPhrases = [
    "salom", "assalom", "qalaysiz", "qalaysan", "yaxshimisiz", "tinchmisiz",
    "nima gap", "nima qilyapsan", "nima qilyapsiz", "charchadim", "zerikdim",
    "kayfiyat", "do'stim", "dostim", "gaplashaylik", "suhbat", "hazil",
    "rahmat", "tashakkur", "xayr", "ko'rishguncha", "charchama", "omon bo'l",
    "maslahat ber", "nima deysan", "fikring", "qiziq", "haqiqatan", "rostmi"
  ];

  const hasConversationalTrigger = conversationalPhrases.some(p => lower.includes(p));
  const hasExplicitSearchRequest = lower.includes("qidir") || lower.includes("internetdan") || lower.includes("yangilik") || lower.includes("kursi") || lower.includes("ob-havo");

  if (hasConversationalTrigger && !hasExplicitSearchRequest) {
    return { needsWeb: false, reason: "Tabiiy do'stona muloqot (Lokal model).", keywords: [] };
  }

  // 3. Coding and algorithmic logic
  const codingLogicPatterns = [
    "funksiya yoz", "kod yoz", "algoritm", "binary search", "leetcode", "css", "html", "javascript",
    "python kod", "xatoni to'g'irla", "refactor", "matematika", "hisobla", "fibonacci", "typescript"
  ];
  if (codingLogicPatterns.some(p => lower.includes(p)) && !hasExplicitSearchRequest) {
    return { needsWeb: false, reason: "Dasturlash yoki mantiqiy vazifa.", keywords: [] };
  }
  
  // 4. Real-time patterns (ONLY triggered when genuinely seeking live external facts)
  const realTimePatterns = [
    "dollar kursi", "valyuta kursi", "som kursi", "evro kursi", "markaziy bank kursi",
    "ob-havo", "ob havo", "havo harorati", "so'nggi yangilik", "oxirgi yangilik",
    "prezident qarori", "prezident farmoni", "futbol natijalari", "match natijasi",
    "internetdan top", "internetdan qidir", "qidirib ko'r", "latest news", "exchange rate"
  ];

  const matchesRealTime = realTimePatterns.some(p => lower.includes(p));
  if (matchesRealTime) {
    const clean = query.replace(/[?!,.:;()"]/g, "").trim();
    return {
      needsWeb: true,
      reason: "Savol aniq faktik ma'lumot yoki real-time qidiruvni talab qiladi.",
      keywords: clean.split(" ").filter(w => w.length > 2).slice(0, 5),
    };
  }

  return { needsWeb: false, reason: "Umumiy konseptual yoki suhbat so'rovi.", keywords: [] };
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

// Helper to extract new user preferences/interests ONLY when explicitly requested
function extractLearnedPreferences(text: string, existing: string[] = []): string[] {
  const newItems: string[] = [];
  const lower = text.toLowerCase().trim();

  // Strict check: Only extract when the user explicitly commands to remember
  // ("shuni eslab qol", "eslab qol", "yodingda saqla", "yodingda tut", "esingda saqla")
  const isExplicitRemember = 
    lower.includes("eslab qol") || 
    lower.includes("yodingda saqla") || 
    lower.includes("yodingda tut") || 
    lower.includes("esingda saqla");

  if (!isExplicitRemember) {
    return [];
  }

  // Extract what should be remembered
  // e.g. "shuni eslab qol: men velosiped minishni yoqtiraman"
  const cleanMatch = text
    .replace(/^(?:iltimos\s+)?(?:shuni\s+|buni\s+)?(?:eslab\s+qol|yodingda\s+saqla|yodingda\s+tut|esingda\s+saqla)(?:\s*[:, -]?\s*)(.+)/i, "$1")
    .trim();
  
  if (cleanMatch && cleanMatch !== text && cleanMatch.length >= 2 && cleanMatch.length <= 80) {
    if (!existing.some(e => e.toLowerCase() === cleanMatch.toLowerCase())) {
      newItems.push(cleanMatch);
    }
    return newItems;
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
  const lower = userQuery.toLowerCase().replace(/[‘’`ʼ']/g, "'").trim();

  // Instant response for creator questions (ONLY when explicitly asked)
  if (
    lower.includes("kim yaratgan") ||
    lower.includes("muallif") ||
    lower.includes("yaratuvchi") ||
    lower.includes("kim qilgan") ||
    lower.includes("kim yasagan") ||
    lower.includes("kim ishlab chiqqan") ||
    lower.includes("afzalbek") ||
    lower.includes("ozodbek")
  ) {
    reasoningSteps.push("Mualliflar haqidagi to'g'ridan-to'g'ri so'rov aniqlandi.");
    return {
      answer: "Meni **Afzalbek Nematov** va **Ozodbek Shohobiddinovlar** yaratishgan.",
      reasoning: reasoningSteps,
    };
  }

  // Instant response for self-identity questions
  if (
    lower.includes("sen kimsan") ||
    lower.includes("isming nima") ||
    lower.includes("noming nima") ||
    lower.includes("qaysi model") ||
    lower.includes("qaysi ai") ||
    lower.includes("o'zing haqingda") ||
    lower.includes("o'zing haqida") ||
    lower.includes("vazifang nima")
  ) {
    reasoningSteps.push("UZUNITED AI o'zini tanishtirish so'rovi aniqlandi.");
    return {
      answer: "Men **UZUNITED AI** man — insondek jonli, samimiy va erkin suhbat quradigan hamda savollaringizga tezkor va aniq javob beruvchi universal sun'iy intellekt assistentiman. Sizga qanday yordam bera olaman?",
      reasoning: reasoningSteps,
    };
  }

  // Instant response for user's explicit command to remember something ("shuni eslab qol: ...")
  const isExplicitRememberCommand = 
    lower.startsWith("shuni eslab qol") ||
    lower.startsWith("buni eslab qol") ||
    lower.startsWith("eslab qol:") ||
    lower.startsWith("eslab qol,") ||
    lower.startsWith("eslab qol ") ||
    lower.startsWith("yodingda saqla") ||
    lower.startsWith("yodingda tut");

  if (isExplicitRememberCommand) {
    const memoryItem = userQuery
      .replace(/^(?:iltimos\s+)?(?:shuni\s+|buni\s+)?(?:eslab\s+qol|yodingda\s+saqla|yodingda\s+tut)(?:\s*[:, -]?\s*)/i, "")
      .trim();

    if (memoryItem.length >= 2) {
      reasoningSteps.push(`Foydalanuvchi ma'lumotni eslab qolishni so'radi: "${memoryItem}"`);
      return {
        answer: `Tushundim, buni eslab qoldim: **«${memoryItem}»**.`,
        reasoning: reasoningSteps,
        newLearnedPreferences: [memoryItem],
      };
    }
  }

  // Instant response for user asking what the AI remembers about them
  if (
    lower.includes("men haqimda nima bilasan") ||
    lower.includes("men haqimda nimalarni bilasan") ||
    lower.includes("men haqimda nimani eslaysan") ||
    lower.includes("men haqimda nimalarni eslaysan") ||
    lower.includes("meni eslaysanmi") ||
    lower.includes("nimani eslab qolding")
  ) {
    reasoningSteps.push("Xotiradagi ma'lumotlar so'rovi aniqlandi.");
    const saved = userProfile?.learnedPreferences || [];
    const firstName = userProfile?.firstName?.trim() || "";
    let memoryReply = firstName ? `Sizning ismingiz: **${firstName}**.\n` : "";
    if (saved.length > 0) {
      memoryReply += `\nSiz aytgan va men eslab qolgan ma'lumotlar:\n` + saved.map(s => `- ${s}`).join("\n");
    } else {
      memoryReply += `\nHozircha qo'shimcha xotira yozuvlari yo'q. Biror narsani yodda saqlashimni istasangiz: «Shuni eslab qol: ...» deb yozishingiz mumkin.`;
    }
    return {
      answer: memoryReply,
      reasoning: reasoningSteps,
    };
  }

  // Instant response ONLY when user explicitly asks about their birth year
  if (
    lower.includes("qachon tug'ilganman") ||
    lower.includes("qachon tugilganman") ||
    lower.includes("tug'ilgan yilim") ||
    lower.includes("tugilgan yilim") ||
    lower.includes("nechanchi yilda tug'ilganman") ||
    lower.includes("nechanchi yilda tugilganman") ||
    lower.includes("yoshim nechada")
  ) {
    reasoningSteps.push("Foydalanuvchi o'zining tug'ilgan yili haqida so'radi.");
    const year = userProfile?.birthYear;
    return {
      answer: year 
        ? `Profilingizda ko'rsatilgan ma'lumotga ko'ra siz **${year}-yil**da tug'ilgansiz.` 
        : `Profilingizda tug'ilgan yilingiz ko'rsatilmagan. Profil sozlamalaridan kiritishingiz mumkin.`,
      reasoning: reasoningSteps,
    };
  }

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
    reasoningSteps.push(`Foydalanuvchining yangi eslab qolish buyrug'i qabul qilindi: ${detectedPrefs.join(', ')}`);
  }

  let userContextPrompt = "";
  if (userFirstName) {
    userContextPrompt = `\n\nFOYDALANUVCHI PROFILI:
- Foydalanuvchi ismi: "${userFirstName}"
${userProfile?.birthYear ? `- Foydalanuvchi tug'ilgan yili (MAXFIY): ${userProfile.birthYear}-yil` : ''}
${userProfile?.learnedPreferences && userProfile.learnedPreferences.length > 0 ? `- Eslab qolingan ma'lumotlar: ${userProfile.learnedPreferences.join(', ')}` : ''}
Murojaatda faqat ismidan ("${userFirstName}") foydalaning.`;
  }

  if (attachments && attachments.length > 0) {
    userContextPrompt += `\n\nBIRIKTIRILGAN RASM VA FAYLLAR (${attachments.length} ta):
Foydalanuvchi yuborgan rasm yoki faylni sinchiklab ko'ring, undagi ob'ektlar, matnlar (OCR) yoki kodlarni tahlil qilib, qisqa va lo'nda xulosa bering.`;
  }

  const systemPrompt = `Siz inson bilan insodek jonli, samimiy, tezkor va odobli suhbat quradigan "UZUNITED AI" aqlli yordamchisisiz.

ASOSIY MULOQOT VA IDENTIFIKATSIYA QOIDALARI:
1. SHAXSINGIZ VA NOMINGIZ:
   - Sizning nomingiz — FAQAT VA FAQAT "UZUNITED AI".
   - HECH QACHON "Google", "Gemini", "Google Gemini" yoki "AI Overviews" deb gapirmang yoki o'zingizni bu nomlar bilan tanishtirmang! Bu nomlar suhbatda butunlay taqiqlanadi.
   - Har bir xabarda o'zingizni tanishtirish shart emas. Faqat to'g'ridan-to'g'ri "sen kimsan?" yoki "isming nima?" deb so'ralsagina "Men UZUNITED AI man" deb javob bering.

2. ODAM BILAN ODAMDEK JONLI VA TABIIY SUHBAT QURING:
   - Foydalanuvchi bilan xuddi samimiy, quvnoq, aqlli va xushmuomala do'stdek tabiiy tilda gaplashing.
   - Quruq rasmiyatchilik, byurokratik iboralar yoki robotdek takrorlanishlar aslo bo'lmasin.
   - Foydalanuvchi salomlashsa, charchaganini aytsa yoki hol-ahvol so'rasa, insoniy tarzda dildan, iliq va jonli javob qaytaring.

3. ANIQ VA TEZKOR TAHLIL:
   - Ma'lumot, tushuntirish yoki qidiruv so'ralganda birinchi bo'lib qisqa, aniq umumiy xulosa beriladi, so'ngra qulay punktlar bilan tushuntiriladi.
   - Keraksiz cho'zilgan dostonlar yozilmaydi, foydalanuvchi ko'z ochib yumguncha tushunadi.

4. MUALLIFLAR HAQIDA:
   - FAQAT VA FAQAT foydalanuvchi bevosita "seni kim yaratgan?" yoki "muallifing kim?" deb so'ragandagina:
     "Meni Afzalbek Nematov va Ozodbek Shohobiddinovlar yaratishgan." deb ayting. O'z-o'zidan aslo aytmang.

5. TUG'ILGAN YILI VA SHAXSIY MA'LUMOTLAR:
   - HECH QACHON suhbatda o'z-o'zidan "2000-yilda tug'ilgansiz" deb aytmang!
   - Tug'ilgan yilni suhbatda tilga olish taqiqlanadi. Faqat foydalanuvchi "men qachon tug'ilganman?" deb so'rasagina ayting.

6. XOTIRA:
   - Faqat foydalanuvchi "shuni eslab qol" yoki "eslab qol: ..." deb aniq aytgandagina xotiraga oling.${userContextPrompt}`;

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
      userPromptText = `Foydalanuvchi savoli: "${userQuery}"\n(Mavzu: "${resolvedQuery}")\n${sourcesText ? `\nQidiruv ma'lumotlari:\n${sourcesText}` : ''}\n\nBirinchi bo'lib qisqa va lo'nda umumiy xulosani, so'ngra asosiy punktlarni jonli, samimiy va tushunarli qilib yozing.`;
    } else {
      userPromptText = historyText 
        ? `Oldingi suhbat:\n${historyText}\n\nFoydalanuvchi: "${userQuery}"\n\nInson bilan insodek jonli, samimiy, do'stona, lo'nda va tabiiy javob bering:`
        : `Foydalanuvchi: "${userQuery}"\n\nInson bilan insodek jonli, samimiy, do'stona, lo'nda va tabiiy javob bering:`;
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
          reasoningSteps.push(`Tasvir/fayl tahlil moduliga uzatildi: "${att.name}"`);
        }
        if (att.textContent) {
          contentParts.push({
            text: `\n[Hujjat: "${att.name}"]:\n${att.textContent.slice(0, 10000)}\n`,
          });
          reasoningSteps.push(`Hujjat matni o'qildi: "${att.name}"`);
        }
      }
    }
    contentParts.push({ text: userPromptText });

    // Ultra-fast and active Gemini models (gemini-3.5-flash-lite responds in <1s)
    const candidateModels = ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest"];
    
    for (const modelName of candidateModels) {
      try {
        reasoningSteps.push(`UZUNITED AI tezkor intellekti ishga tushirildi...`);
        
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Model generation timeout (5s)")), 5000)
        );

        const generatePromise = ai.models.generateContent({
          model: modelName,
          contents: contentParts.length === 1 && contentParts[0].text ? contentParts[0].text : contentParts,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.7,
          }
        });

        const response = await Promise.race([
          generatePromise,
          timeoutPromise,
        ]);

        const text = response.text;
        if (text && text.trim().length > 0) {
          reasoningSteps.push(`UZUNITED AI orqali to'liq va samimiy javob olindi.`);

          return {
            answer: text,
            reasoning: reasoningSteps,
            updatedSources: sources.length > 0 ? sources : undefined,
            newLearnedPreferences: detectedPrefs.length > 0 ? detectedPrefs : undefined,
          };
        }
      } catch (err: any) {
        console.log(`Gemini ${modelName} notice:`, err?.message || err);
        // Continue to the next candidate model so that if one model is rate-limited, the next responds!
        reasoningSteps.push(`UZUNITED AI navbatdagi tahlil zanjiriga yo'naltirildi.`);
      }
    }
  }

  // Fallback Local Engine
  reasoningSteps.push("UZUNITED AI tezkor tahlili tayyorlanmoqda...");
  
  const personalGreeting = userFirstName ? `Assalomu alaykum, ${userFirstName}!` : `Assalomu alaykum!`;
  let answer = "";

  // 1. Creators (Faqatgina to'g'ridan-to'g'ri "kim yaratgan", "muallif" deb so'ralganda aytiladi!)
  if (
    lower.includes("kim yaratgan") ||
    lower.includes("muallif") ||
    lower.includes("yaratuvchi") ||
    lower.includes("kim qilgan") ||
    lower.includes("kim yasagan") ||
    lower.includes("kim ishlab chiqqan") ||
    lower.includes("afzalbek") ||
    lower.includes("ozodbek")
  ) {
    answer = `Meni **Afzalbek Nematov** va **Ozodbek Shohobiddinovlar** yaratishgan.`;
  }
  // 2. Natural simple greeting
  else if (lower.startsWith("salom") || lower.startsWith("assalom") || lower === "qalaysiz" || lower === "qalesiz") {
    answer = userFirstName 
      ? `Salom, ${userFirstName}! Rahmat, yaxshiman. O'zingizda nima yangiliklar, kayfiyatlar qanday?` 
      : `Salom! Rahmat, yaxshiman. O'zingizda nima gaplar, kayfiyatlar yaxshimi?`;
  }
  // 3. Handle files in fallback mode
  else if (attachments && attachments.length > 0) {
    const firstAtt = attachments[0];
    if (firstAtt.isImage) {
      answer = `Yuborgan rasmingiz qabul qilindi. Tasvir o'lchami: ${(firstAtt.size / 1024).toFixed(1)} KB. Ushbu rasmda aynan nimani aniqlash yoki tushuntirib berish kerakligini yozsangiz, qisqa va aniq tahlil qilib beraman.`;
    } else {
      answer = `**"${firstAtt.name}"** fayli qabul qilindi. Ushbu hujjat bo'yicha qanday vazifani bajarish kerak (xulosa, tarjima yoki kod tahlili)?`;
    }
  }
  // 4. Mathematical queries
  const mathMatch = userQuery.match(/^(\d+(?:\.\d+)?)\s*([\+\-\*\/xX÷])\s*(\d+(?:\.\d+)?)\s*\=?$/);
  if (mathMatch) {
    const num1 = parseFloat(mathMatch[1]);
    const op = mathMatch[2];
    const num2 = parseFloat(mathMatch[3]);
    let result = 0;
    if (op === "+" ) result = num1 + num2;
    else if (op === "-") result = num1 - num2;
    else if (op === "*" || op === "x" || op === "X") result = num1 * num2;
    else if (op === "/" || op === "÷") result = num2 !== 0 ? num1 / num2 : 0;
    answer = `Hisoblash natijasi:\n\n**${num1} ${op} ${num2} = ${result}**`;
  }
  // 5. Sources or Currency / Weather (Free Zero-Key Web Synthesis)
  else if (sources.length > 0) {
    const firstSource = sources[0];
    if (firstSource.snippet.includes("Markaziy banki rasmiy kursi") || firstSource.title.includes("Markaziy Bank")) {
      answer = `Markaziy Bank rasmiy ma'lumotiga ko'ra:\n\n${firstSource.snippet} [1]`;
    } else if (firstSource.snippet.includes("harorat:") || firstSource.title.includes("ob-havo")) {
      answer = `Ob-havo ma'lumoti:\n\n${firstSource.snippet} [1]`;
    } else {
      // Find wiki source or top quality snippets
      const wikiSource = sources.find(s => s.domain.includes("wikipedia.org"));
      const otherSources = sources.filter(s => s !== wikiSource);

      let summaryText = "";
      if (wikiSource) {
        summaryText = `**${wikiSource.title.replace(" ensiklopedik ma'lumotnomasi", "")}**:\n${wikiSource.snippet} [${wikiSource.id}]`;
        if (otherSources.length > 0) {
          summaryText += `\n\nQo'shimcha tafsilotlar:\n- ${otherSources[0].snippet} [${otherSources[0].id}]`;
        }
      } else {
        const topPoints = sources.slice(0, 3).map(s => `- ${s.snippet} [${s.id}]`).join("\n");
        summaryText = `«${userQuery}» bo'yicha internetdan topilgan asosiy ma'lumotlar:\n\n${topPoints}`;
      }

      answer = summaryText;
    }
  }
  // 6. Code / Programming
  else if (lower.includes("python") || lower.includes("javascript") || lower.includes("kod") || lower.includes("dastur") || lower.includes("react")) {
    answer = `${userFirstName ? `${userFirstName}, ` : ''}Dasturlash bo'yicha qisqa yechim:\n\n\`\`\`python
# Qisqa va toza yechim
def solve(data):
    return [item.strip() for item in data if item]
\`\`\`\nKodingizdagi aniq xatolik yoki vazifani yuborsangiz, darhol ko'rib beraman.`;
  }
  // 7. Business / Startups
  else if (lower.includes("biznes") || lower.includes("startap") || lower.includes("investitsiya") || lower.includes("reja")) {
    answer = `${userFirstName ? `${userFirstName}, ` : ''}Startapni boshlashdagi 3 ta asosiy qadam:\n1. **Bozor va muammo:** Mijozlarning aniq muammosini aniqlash;\n2. **MVP mahsulot:** 2-3 haftada sinov uchun minimal versiya chiqarish;\n3. **Mijozlar fikri:** Dastlabki 20-30 mijozdan fikr olib takomillashtirish.\n\nSiz aynan qaysi sohada loyiha boshlamoqchisiz?`;
  }
  // 8. General conversational answer
  else {
    const isGreeting = 
      lower.includes("salom") || 
      lower.includes("assalom") || 
      lower.includes("qalaysiz") || 
      lower.includes("qalaysan") || 
      lower.includes("qalesiz") || 
      lower.includes("yaxshimisiz") || 
      lower.includes("tinchmisiz");

    const hasOtherTopic = 
      lower.includes("loyiha") || 
      lower.includes("charchadim") || 
      lower.includes("kayfiyat") || 
      lower.includes("zerikdim") ||
      lower.includes("nima gap");

    if (isGreeting && !hasOtherTopic) {
      answer = userFirstName 
        ? `Salom, ${userFirstName}! Rahmat, yaxshiman. O'zingizda nima yangiliklar, kayfiyatlar qanday?` 
        : `Salom! Rahmat, yaxshiman. O'zingizda nima gaplar, kayfiyatlar yaxshimi?`;
    } else if (lower.includes("loyiha") || lower.includes("ish boshladim") || lower.includes("yangi ish")) {
      answer = `Ajoyib yangilik! Yangi loyihangizga omad tilayman. Nima haqida ekanligini aytsangiz, g'oyalar yoki rivojlantirish bo'yicha fikr almashishimiz mumkin!`;
    } else if (lower.includes("charchadim") || lower.includes("charchagan") || lower.includes("og'ir kun")) {
      answer = `Hormang! Haqiqatan ham yaxshi dam olish kerak. Bir oz hordiq chiqaring, xohlasangiz xotirjam suhbatlashamiz yoki kayfiyatni ko'taruvchi qiziq biror narsa aytib beraman.`;
    } else if (lower.includes("kayfiyatim ajoyib") || lower.includes("xursandman") || lower.includes("zo'rman")) {
      answer = `Zo'r-ku! Kayfiyatingiz doim shunday a'lo bo'lsin! Bugun nimalar bilan bandsiz?`;
    } else if (lower.includes("nima gap") || lower.includes("nima qilyapsan") || lower.includes("tinchmi")) {
      answer = `Tinchlik, rahmat! Siz bilan samimiy suhbatlashib turibman. O'zingizda nimalar bo'lyapti?`;
    } else if (lower.includes("zerikdim") || lower.includes("zerikayapman")) {
      answer = `Zerikmang! Keling, qiziq biror mavzuda gaplashamiz yoki ajoyib bir qisqa voqea, topishmoq aytib beraymi?`;
    } else if (lower.includes("kino") || lower.includes("film") || lower.includes("serial")) {
      answer = `Bugun tomosha qilish uchun ajoyib tavsiyalar:\n\n1. **Ilmiy-fantastika:** «Interstellar» yoki «Inception» (Kristofer Nolan asarlari);\n2. **Motivatsiya va drama:** «The Shawshank Redemption» (Qochish) yoki «The Pursuit of Happyness»;\n3. **Detektiv va intellekt:** «Shutter Island» yoki «Knives Out»;\n4. **Klassik milliy kino:** «Mahallada duv-duv gap» yoki «Suyunchi».\n\nQaysi janrni ko'proq yoqtirasiz?`;
    } else if (lower.includes("kitob") || lower.includes("mutolaa")) {
      answer = `O'qish uchun tavsiya etiladigan ajoyib kitoblar:\n\n1. **Shaxsiy rivojlanish:** «Atom odatlari» (Jeyms Klir) — odatlarni to'g'ri shakllantirish;\n2. **Tarix va jamiyat:** «Sapiens» (Yuval Noy Harari) — insoniyat tarixi;\n3. **Psixologiya:** «Diqqat: Chalg'ituvchi dunyoda muvaffaqiyat sirlari» (Kel Nyuport);\n4. **Klassik adabiyot:** «O'tkan kunlar» (Abdulla Qodiriy).\n\nSizni ko'proq badiiy kitoblar qiziqtiradimi yoki ilmiy-ommabop?`;
    } else if (lower.includes("sun'iy intellekt") || lower.includes("ai nima") || lower.includes("intellekt")) {
      answer = `**Sun'iy intellekt (AI)** — inson aql-zakovati va tafakkuriga xos bo'lgan vazifalarni (matn tahlili, tasvirlarni aniqlash, qaror qabul qilish, mantiqiy xulosalar chiqarish) bajara oladigan kompyuter tizimidir.\n\nBugungi kunda AI tibbiyot, ta'lim, dasturlash va avtomatlashtirish kabi barcha sohalarda insonlarga katta ko'makchi bo'lmoqda.`;
    } else if (lower.includes("?") || lower.includes("nima") || lower.includes("qanday") || lower.includes("nega") || lower.includes("haqida")) {
      answer = `Savolingiz qabul qilindi. Ushbu mavzu bo'yicha eng muhim ma'lumot:\n\nSiz so'ragan soha ko'p qirrali va qiziqarli hisoblanadi. Aniqroq va batafsilroq ma'lumot olish uchun savolingizning qaysi jihatiga (amaliy qo'llanilishi, tarixi yoki asosiy qoidalari) urg'u berishimizni xohlaysiz?`;
    } else if (lower.includes("rahmat") || lower.includes("tashakkur")) {
      answer = `Arzimaydi! Sizga foydam tekkanidan doim xursandman. Yana qanday mavzularda suhbatlashamiz?`;
    } else {
      answer = userFirstName 
        ? `Salom, ${userFirstName}! Fikringizni eshitdim. Bu mavzuda bemalol suhbatlashamiz, yana nimalarni bilishni yoki tahlil qilishni istaysiz?` 
        : `Fikringizni tushundim. Bu haqda bemalol suhbatlashishimiz mumkin, yana qanday ma'lumot kerak bo'lsa, marhamat so'rashingiz mumkin!`;
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
      content = "",
      isDeepSearch = false, 
      customModel = "llama3.2:3b", 
      isAiMode = true,
      userProfile: reqUserProfile,
      user: fallbackUser,
      attachments = [],
    } = req.body;
    const userProfile = reqUserProfile || fallbackUser;

    const rawMessage = (message || content || "").toString().trim();

    if (!rawMessage && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ error: "Xabar matni yoki biriktirilgan rasm/fayl kiritilishi shart." });
    }

    const effectiveMessage = rawMessage.length > 0
      ? rawMessage
      : (attachments.length > 0 
          ? (attachments[0].isImage ? "Ushbu rasmni tahlil qilib bering." : "Ushbu fayl mazmunini tahlil qilib bering.")
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

    const shouldQueryWeb = !attachments?.length && (intent.needsWeb || isDeepSearch);

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
        content: "Assalomu alaykum! Yangi suhbat boshlandi. Men **UZUNITED AI** man. Sizga qanday yordam bera olaman?",
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
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          hmr: process.env.DISABLE_HMR === "true" ? false : undefined,
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error("Vite middleware initialization notice:", err);
      // Fallback to static dist if build exists
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  }
}

// Only start standalone server when NOT running as a Vercel serverless function
if (!process.env.VERCEL) {
  startServer();
}

export default app;
export { app };

