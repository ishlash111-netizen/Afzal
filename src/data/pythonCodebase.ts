import { PythonFileItem, LocalModelInfo } from '../types';

export const LOCAL_MODELS_DATA: LocalModelInfo[] = [
  {
    name: 'Llama 3.2 (3B)',
    tag: 'llama3.2:3b',
    size: '2.0 GB',
    ramNeeded: '4-8 GB RAM',
    speed: 'Juda tez (30-50 token/soniya)',
    uzbekQuality: 'Yaxshi (tezkor javoblar, dialog va xulosalar uchun)',
    useCase: 'Oddiy noutbuklar, past va o‘rta quvvatli kompyuterlar uchun eng yaxshi variant',
    installCommand: 'ollama run llama3.2',
    recommended: true,
  },
  {
    name: 'Qwen 2.5 (7B)',
    tag: 'qwen2.5:7b',
    size: '4.7 GB',
    ramNeeded: '8-16 GB RAM / 6GB VRAM',
    speed: 'O‘rtacha-tez (20-35 token/soniya)',
    uzbekQuality: 'A’lo (Turkiy tillar va o‘zbek tilida juda kuchli grammatika)',
    useCase: 'O‘zbek tilidagi murakkab matnlar va dasturlash kodlari uchun eng tavsiya etiladigan model',
    installCommand: 'ollama run qwen2.5:7b',
    recommended: true,
  },
  {
    name: 'DeepSeek R1 Distill (7B/8B)',
    tag: 'deepseek-r1:7b',
    size: '4.7 GB',
    ramNeeded: '8-16 GB RAM',
    speed: 'O‘rtacha (fikrlash zanjiri bilan)',
    uzbekQuality: 'Juda yaxshi (Chuqur mantiqiy fikrlash / Chain-of-Thought)',
    useCase: 'Deep Search, murakkab mantiqiy hisob-kitoblar va manbalarni qiyoslash uchun',
    installCommand: 'ollama run deepseek-r1:7b',
    recommended: false,
  },
  {
    name: 'Mistral (7B Instruct)',
    tag: 'mistral:7b',
    size: '4.1 GB',
    ramNeeded: '8-16 GB RAM',
    speed: 'Tezkor',
    uzbekQuality: 'O‘rtacha-yaxshi',
    useCase: 'Aniq va qisqa javoblar, faktik xulosalar tuzish',
    installCommand: 'ollama run mistral',
    recommended: false,
  },
  {
    name: 'Gemma 2 (2B / 9B)',
    tag: 'gemma2:2b',
    size: '1.6 GB',
    ramNeeded: '4 GB RAM',
    speed: 'Juda yengil',
    uzbekQuality: 'Yaxshi',
    useCase: 'Resurslari juda cheklangan qurilmalar va mobil protsessorlar uchun',
    installCommand: 'ollama run gemma2:2b',
    recommended: false,
  },
];

export const PYTHON_CODEBASE_FILES: PythonFileItem[] = [
  {
    filename: 'main.py',
    path: 'main.py',
    category: 'Backend',
    description: 'FastAPI asosiy veb-serveri. Barcha HTTP endpointlar, CORS sozlamalari va frontend statik fayllarini ulash.',
    content: `# -*- coding: utf-8 -*-
"""
UZUNITED AI - Asosiy FastAPI Serveri
Muallif: UZUNITED AI Team
Vazifasi: API so'rovlarni qabul qilish, agentni chaqirish va natijani qaytarish.
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uvicorn
import os

from agent import UZUnitedAgent
from memory import ConversationMemory
import config

app = FastAPI(
    title="UZUNITED AI - Local Autonomous AI Chatbot",
    description="Lokal LLM va bepul DuckDuckGo Web Search asosidagi mustaqil AI assistent",
    version="1.0.0"
)

# CORS sozlamalari (Frontend ulanishi uchun)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Xotira va Agentni initsializatsiya qilish
memory = ConversationMemory(db_path=config.DATABASE_PATH)
agent = UZUnitedAgent(memory=memory, ollama_url=config.OLLAMA_URL, model_name=config.OLLAMA_MODEL)


class ChatRequest(BaseModel):
    session_id: Optional[str] = "default_session"
    message: str
    is_deep_search: Optional[bool] = False


class ChatResponse(BaseModel):
    session_id: str
    answer: str
    sources: List[Dict[str, Any]]
    reasoning_steps: List[str]
    resolved_query: str
    searched_web: bool
    tokens_used: Optional[int] = 0


@app.on_event("startup")
async def startup_event():
    """Server ishga tushganda ma'lumotlar bazasi jadvallarini yaratadi."""
    await memory.init_db()
    print("=" * 60)
    print("🚀 UZUNITED AI muvaffaqiyatli ishga tushdi!")
    print(f"🤖 Lokal LLM Modeli: {config.OLLAMA_MODEL}")
    print(f"🌐 Server manzili: http://localhost:{config.PORT}")
    print("=" * 60)


@app.get("/api/health")
async def health_check():
    """Tizim holatini va lokal LLM ulanishini tekshirish."""
    ollama_ok = await agent.check_ollama_health()
    return {
        "status": "online",
        "app_name": "UZUNITED AI",
        "model": config.OLLAMA_MODEL,
        "ollama_connected": ollama_ok,
        "search_engine": "DuckDuckGo Free Engine (0 API Keys)"
    }


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    """
    Foydalanuvchi xabarini qabul qilib, agent orqali to'liq tahlil qiladi:
    1. Kontekstni aniqlash ('u', 'bu', 'birinchisi')
    2. Intent tahlili (Internet kerakmi?)
    3. Web Search (agar kerak bo'lsa)
    4. Lokal LLM tahlili va javob sintezi
    5. Xotirani yangilash
    """
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Xabar bo'sh bo'lishi mumkin emas.")

    try:
        result = await agent.process_message(
            session_id=req.session_id,
            user_message=req.message,
            is_deep_search=req.is_deep_search
        )
        return result
    except Exception as e:
        print(f"Xatolik yuz berdi: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Server ichki xatosi: {str(e)}")


@app.get("/api/history/{session_id}")
async def get_history(session_id: str):
    """Sessiya tarixini olish."""
    messages = await memory.get_messages(session_id)
    return {"session_id": session_id, "messages": messages}


@app.delete("/api/history/{session_id}")
async def clear_history(session_id: str):
    """Sessiya tarixini tozalash."""
    await memory.clear_session(session_id)
    return {"message": "Suhbat tarixi tozalandi"}


# Frontend statik fayllari (agar mavjud bo'lsa)
if os.path.exists("frontend"):
    app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")


if __name__ == "__main__":
    uvicorn.run("main:app", host=config.HOST, port=config.PORT, reload=True)
`,
  },
  {
    filename: 'agent.py',
    path: 'agent.py',
    category: 'Agent Core',
    description: 'UZUNITED AI boshqaruv yadrosi. Intent tahlili, kontekstni hal qilish (coreference), qidiruv va model sintezi zanjiri.',
    content: `# -*- coding: utf-8 -*-
"""
UZUNITED AI - Agent Core Logic
Vazifasi: 
1. Savolni tahlil qilish (Internet kerakmi yoki yo'q?)
2. 'U', 'bu', 'birinchisi' kabi so'zlarni oldingi kontekstdan aniqlash
3. Web qidiruvdan olingan ma'lumotlarni lokal AI ga uzatish
4. Manbalarga tayangan holda professional o'zbek tilida javob shakllantirish
"""

import httpx
import re
from typing import Dict, Any, List
from search_engine import FreeWebSearchEngine
from memory import ConversationMemory
import prompts


class UZUnitedAgent:
    def __init__(self, memory: ConversationMemory, ollama_url: str, model_name: str):
        self.memory = memory
        self.ollama_url = ollama_url
        self.model_name = model_name
        self.search_engine = FreeWebSearchEngine()

    async def check_ollama_health(self) -> bool:
        """Ollama serveri ishlab turganini tekshiradi."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.ollama_url}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    def resolve_coreference(self, user_query: str, history: List[Dict[str, Any]]) -> str:
        """
        'U', 'bu', 'birinchisi', 'o'sha shaxs' kabi olmoshlarni oldingi suhbatdan 
        aniqlab, to'liq mustaqil qidiruv so'roviga aylantiradi.
        """
        lower = user_query.lower()
        pronouns = ["u", "bu", "o'sha", "osha", "birinchisi", "ikkinchisi", "oxirgisi", "uning", "unga"]
        
        has_pronoun = any(re.search(rf"\\b{p}\\b", lower) for p in pronouns)
        if not has_pronoun or not history:
            return user_query

        # Tarixning oxirgi xabarlaridan asosiy subyektni qidiramiz
        last_subject = ""
        for msg in reversed(history):
            if msg.get("role") == "user":
                content = msg.get("content", "")
                # So'roq olmoshlarini tozalash
                cleaned = re.sub(r"(haqida gapir|kim u|nima bu|aytib ber|tushuntir|\?|!)", "", content, flags=re.I).strip()
                if 2 < len(cleaned) < 60:
                    last_subject = cleaned
                    break

        if last_subject:
            # So'rovni boyitish
            if "u kim" in lower or "kim u" in lower:
                return f"{last_subject} kim va qanday faoliyat bilan shug'ullanadi"
            elif "narxi" in lower or "qancha" in lower:
                return f"{last_subject} narxi va xususiyatlari"
            elif "birinchisi" in lower:
                return f"{last_subject} birinchi varianti haqida ma'lumot"
            else:
                return f"{last_subject} {user_query}"

        return user_query

    def should_search_web(self, query: str) -> Dict[str, Any]:
        """
        Qachon internetdan qidirish kerakligini aniqlovchi qoidalar to'plami.
        """
        lower = query.lower()

        # Real-time va faktik kalit so'zlar
        search_triggers = [
            "narxi", "kursi", "bugun", "kecha", "yangilik", "kim u", "hozir", 
            "ob-havo", "ob havo", "prezident", "yangi", "so'nggi", "qachon",
            "dollar", "evro", "futbol", "natija", "jadval", "chiqdi", "qancha",
            "statistika", "reyting", "qayerda", "voqea", "tarix", "latest", 
            "news", "today", "price", "who is", "when did", "2024", "2025", "2026"
        ]

        # Oddiy salomlashish yoki tanishuv (Qidiruv shart emas)
        greetings = ["salom", "assalom", "qalaysiz", "rahmat", "xayr", "hello", "hi", "sen kimsan"]
        if any(g in lower for g in greetings) and len(lower.split()) < 4:
            return {
                "needs_search": False, 
                "reason": "Oddiy salomlashish/suhbat (Lokal model kifoya)"
            }

        # Dasturlash / Algoritm / Sof mantiq (Qidiruv shart emas)
        coding_triggers = ["kod yoz", "funksiya", "algoritm", "binary search", "python kod", "xatoni to'g'irla", "matematika"]
        if any(c in lower for c in coding_triggers) and not any(t in lower for t in ["oxirgi versiya", "yangilik"]):
            return {
                "needs_search": False, 
                "reason": "Dasturlash yoki sof mantiq (Lokal LLM ichki bilimlaridan)"
            }

        # Agar savolda faktik triggerlar yoki savol belgisi bo'lsa
        if any(t in lower for t in search_triggers) or "?" in query or len(lower.split()) > 3:
            return {
                "needs_search": True, 
                "reason": "Savol real-time yangilik yoki aniq faktik ma'lumotni talab qiladi"
            }

        return {"needs_search": False, "reason": "Umumiy konseptual savol"}

    async def call_local_llm(self, prompt: str, system_prompt: str) -> str:
        """Lokal Ollama API ga so'rov yuborish (Barchasi bepul va oflayn)."""
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "system": system_prompt,
            "stream": False,
            "options": {
                "temperature": 0.4,
                "top_p": 0.9,
            }
        }
        
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                res = await client.post(f"{self.ollama_url}/api/generate", json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("response", "").strip()
                else:
                    return f"[Ollama xatosi {res.status_code}]: Model javob bera olmadi."
        except Exception as e:
            # Agar kompyuterda Ollama ulanmagan bo'lsa, zaxira intellektual xulosa qaytariladi
            return (
                f"⚠️ Lokal Ollama serveri ({self.ollama_url}) bilan ulanishda muammo bo'ldi.\\n"
                f"Iltimos, terminalda 'ollama run {self.model_name}' buyrug'ini ishga tushiring.\\n\\n"
                f"Loyiha arxitekturasi bo'yicha ma'lumotlar to'liq yig'ildi va tahlilga tayyor."
            )

    async def process_message(self, session_id: str, user_message: str, is_deep_search: bool = False) -> Dict[str, Any]:
        """Asosiy ishchi quvur (Pipeline)."""
        reasoning_steps = []
        reasoning_steps.append(f"1. Foydalanuvchi so'rovi qabul qilindi: '{user_message}'")

        # 1-qadam: Tarixni olish
        history = await self.memory.get_messages(session_id, limit=8)

        # 2-qadam: Kontekst va olmoshlarni yechish
        resolved_query = self.resolve_coreference(user_message, history)
        if resolved_query != user_message:
            reasoning_steps.append(f"2. Kontekst aniqlandi: '{user_message}' -> '{resolved_query}'")
        else:
            reasoning_steps.append("2. Kontekst mustaqil deb baholandi.")

        # 3-qadam: Internet qidiruv zaruriyatini tekshirish
        intent = self.should_search_web(resolved_query)
        sources = []
        searched_web = False

        if intent["needs_search"] or is_deep_search:
            searched_web = True
            reasoning_steps.append(f"3. Qidiruv zarur: {intent['reason']}")
            reasoning_steps.append(f"4. Bepul Web Search (DuckDuckGo) orqali qidirilmoqda: '{resolved_query}'")
            
            # Qidiruvni amalga oshirish
            max_results = 6 if is_deep_search else 4
            sources = await self.search_engine.search(resolved_query, max_results=max_results)
            reasoning_steps.append(f"5. {len(sources)} ta manba topildi va faktlar yig'ildi.")
        else:
            reasoning_steps.append(f"3. Qidiruv o'tkazilmadi: {intent['reason']}")

        # 4-qadam: LLM uchun Prompt shakllantirish
        system_prompt = prompts.SYSTEM_PROMPT
        llm_prompt = prompts.build_rag_prompt(
            user_message=user_message,
            resolved_query=resolved_query,
            sources=sources,
            history=history
        )

        reasoning_steps.append(f"6. Lokal LLM ({self.model_name}) javobni sintez qilmoqda...")
        final_answer = await self.call_local_llm(prompt=llm_prompt, system_prompt=system_prompt)
        reasoning_steps.append("7. Javob tayyorlandi va xotiraga saqlandi.")

        # 5-qadam: Xabarlarni bazaga saqlash
        await self.memory.save_message(session_id, role="user", content=user_message, resolved_query=resolved_query)
        await self.memory.save_message(session_id, role="assistant", content=final_answer, sources=sources)

        return {
            "session_id": session_id,
            "answer": final_answer,
            "sources": sources,
            "reasoning_steps": reasoning_steps,
            "resolved_query": resolved_query,
            "searched_web": searched_web
        }
`,
  },
  {
    filename: 'search_engine.py',
    path: 'search_engine.py',
    category: 'Web Search',
    description: 'Hech qanday pullik API kalitsiz ishlovchi erkin Web Search moduli (DuckDuckGo Instant + HTML Scraping + Wikipedia fallback).',
    content: `# -*- coding: utf-8 -*-
"""
UZUNITED AI - Bepul Web Search Dvigateli
Vazifasi: Hech qanday pullik API (OpenAI, Google Search API, Bing) kalitisiz
internetdan eng so'nggi ma'lumotlar, yangiliklar va faktlarni yig'ish.
"""

import httpx
import re
from urllib.parse import quote, urlparse
from typing import List, Dict, Any


class FreeWebSearchEngine:
    def __init__(self):
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "uz,ru,en;q=0.9",
        }

    async def search(self, query: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """
        Bir nechta bepul manbalar orqali internetdan qidiradi:
        1. DuckDuckGo Instant API (JSON)
        2. DuckDuckGo HTML Scraper (To'g'ridan-to'g'ri qidiruv sahifasi)
        3. Wikipedia Open API (Fallback)
        """
        results = []

        # 1-Usul: DuckDuckGo Instant Answer API
        try:
            api_url = f"https://api.duckduckgo.com/?q={quote(query)}&format=json&no_html=1&skip_disambig=1"
            async with httpx.AsyncClient(timeout=6.0, headers=self.headers) as client:
                res = await client.get(api_url)
                if res.status_code == 200:
                    data = res.json()
                    abstract = data.get("AbstractText")
                    url = data.get("AbstractURL")
                    if abstract and url:
                        domain = urlparse(url).netloc or "duckduckgo.com"
                        results.append({
                            "id": len(results) + 1,
                            "title": data.get("Heading") or query,
                            "url": url,
                            "snippet": abstract,
                            "domain": domain
                        })

                    # Aloqador mavzular
                    for topic in data.get("RelatedTopics", []):
                        if len(results) >= max_results:
                            break
                        if isinstance(topic, dict) and topic.get("Text") and topic.get("FirstURL"):
                            url = topic["FirstURL"]
                            domain = urlparse(url).netloc or "web"
                            results.append({
                                "id": len(results) + 1,
                                "title": topic["Text"][:60] + "...",
                                "url": url,
                                "snippet": topic["Text"],
                                "domain": domain
                            })
        except Exception as e:
            print(f"[Search Engine] DDG API ogohlantirish: {e}")

        # 2-Usul: DuckDuckGo HTML Scraper (Agar 1-usul kam natija bersa)
        if len(results) < 3:
            try:
                html_url = f"https://html.duckduckgo.com/html/?q={quote(query)}"
                async with httpx.AsyncClient(timeout=7.0, headers=self.headers, follow_redirects=True) as client:
                    res = await client.get(html_url)
                    if res.status_code == 200:
                        html = res.text
                        blocks = html.split('<div class="result results_links')
                        for block in blocks[1:]:
                            if len(results) >= max_results:
                                break
                            
                            # URL va Sarlavha regex
                            url_match = re.search(r'href="([^"]*uddg=([^"&]+)[^"]*)"', block) or re.search(r'class="result__url"[^>]*href="([^"]+)"', block)
                            title_match = re.search(r'<a class="result__a"[^>]*>([\\s\\S]*?)</a>', block)
                            snippet_match = re.search(r'<a class="result__snippet"[^>]*>([\\s\\S]*?)</a>', block)

                            if title_match and (snippet_match or url_match):
                                raw_title = title_match.group(1)
                                clean_title = re.sub(r'<[^>]+>', '', raw_title).strip()
                                
                                clean_snippet = ""
                                if snippet_match:
                                    clean_snippet = re.sub(r'<[^>]+>', '', snippet_match.group(1)).strip()

                                target_url = f"https://duckduckgo.com/?q={quote(query)}"
                                if url_match:
                                    raw_u = url_match.group(2) if url_match.lastindex >= 2 and url_match.group(2) else url_match.group(1)
                                    from urllib.parse import unquote
                                    target_url = unquote(raw_u)
                                    if not target_url.startswith("http"):
                                        target_url = "https://" + target_url

                                domain = urlparse(target_url).netloc or "web"

                                if clean_snippet and not any(r["url"] == target_url for r in results):
                                    results.append({
                                        "id": len(results) + 1,
                                        "title": clean_title,
                                        "url": target_url,
                                        "snippet": clean_snippet,
                                        "domain": domain
                                    })
            except Exception as e:
                print(f"[Search Engine] DDG HTML Scraper ogohlantirish: {e}")

        # 3-Usul: Wikipedia API Fallback (O'zbek tili uchun)
        if len(results) == 0:
            try:
                wiki_url = f"https://uz.wikipedia.org/w/api.php?action=query&list=search&srsearch={quote(query)}&format=json&utf8=1"
                async with httpx.AsyncClient(timeout=5.0) as client:
                    res = await client.get(wiki_url)
                    if res.status_code == 200:
                        data = res.json()
                        items = data.get("query", {}).get("search", [])
                        for item in items[:max_results]:
                            clean_snippet = re.sub(r'<[^>]+>', '', item.get("snippet", ""))
                            title = item.get("title", "")
                            page_url = f"https://uz.wikipedia.org/wiki/{quote(title.replace(' ', '_'))}"
                            results.append({
                                "id": len(results) + 1,
                                "title": title,
                                "url": page_url,
                                "snippet": clean_snippet,
                                "domain": "uz.wikipedia.org"
                            })
            except Exception as e:
                print(f"[Search Engine] Wikipedia API ogohlantirish: {e}")

        return results
`,
  },
  {
    filename: 'memory.py',
    path: 'memory.py',
    category: 'Database',
    description: 'SQLite asosidagi mustahkam xotira tizimi. Suhbatlar tarixi, entity konteksti va token limitini boshqarish.',
    content: `# -*- coding: utf-8 -*-
"""
UZUNITED AI - SQLite Xotira va Kontekst Menejeri
Vazifasi:
1. Suhbatlarni mahalliy kompyuterda (SQLite) saqlash
2. Tokenlar sonini nazorat qilib, rolling-window (sirg'aluvchi oyna) qilish
3. Oldingi xabarlardagi muhim shaxslar/tushunchalarni (Entity) saqlash
"""

import aiosqlite
import json
from datetime import datetime
from typing import List, Dict, Any, Optional


class ConversationMemory:
    def __init__(self, db_path: str = "uzunited_memory.db"):
        self.db_path = db_path

    async def init_db(self):
        """Ma'lumotlar bazasi jadvallarini yaratadi."""
        async with aiosqlite.connect(self.db_path) as db:
            # Suhbat sessiyalari jadvali
            await db.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    title TEXT,
                    created_at TEXT,
                    updated_at TEXT,
                    metadata TEXT
                )
            """)
            # Xabarlar jadvali
            await db.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    role TEXT,
                    content TEXT,
                    resolved_query TEXT,
                    sources TEXT,
                    timestamp TEXT,
                    FOREIGN KEY(session_id) REFERENCES sessions(id)
                )
            """)
            await db.commit()

    async def save_message(
        self,
        session_id: str,
        role: str,
        content: str,
        resolved_query: Optional[str] = None,
        sources: Optional[List[Dict[str, Any]]] = None
    ):
        """Xabarni bazaga yozish."""
        now = datetime.utcnow().isoformat()
        sources_json = json.dumps(sources, ensure_ascii=False) if sources else "[]"

        async with aiosqlite.connect(self.db_path) as db:
            # Sessiya mavjudligini tekshirish
            cursor = await db.execute("SELECT id FROM sessions WHERE id = ?", (session_id,))
            row = await cursor.fetchone()
            if not row:
                title = content[:35] + ("..." if len(content) > 35 else "")
                await db.execute(
                    "INSERT INTO sessions (id, title, created_at, updated_at, metadata) VALUES (?, ?, ?, ?, ?)",
                    (session_id, title, now, now, "{}")
                )
            else:
                await db.execute(
                    "UPDATE sessions SET updated_at = ? WHERE id = ?",
                    (now, session_id)
                )

            # Xabarni qo'shish
            await db.execute(
                """
                INSERT INTO messages (session_id, role, content, resolved_query, sources, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (session_id, role, content, resolved_query, sources_json, now)
            )
            await db.commit()

    async def get_messages(self, session_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Sessiyaning oxirgi N ta xabarlarini qaytaradi (Rolling context window)."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                """
                SELECT role, content, resolved_query, sources, timestamp
                FROM messages
                WHERE session_id = ?
                ORDER BY id DESC
                LIMIT ?
                """,
                (session_id, limit)
            )
            rows = await cursor.fetchall()
            
            messages = []
            for r in reversed(rows):
                sources_val = []
                try:
                    if r["sources"]:
                        sources_val = json.loads(r["sources"])
                except:
                    pass

                messages.append({
                    "role": r["role"],
                    "content": r["content"],
                    "resolved_query": r["resolved_query"],
                    "sources": sources_val,
                    "timestamp": r["timestamp"]
                })
            return messages

    async def clear_session(self, session_id: str):
        """Sessiyani tozalash."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
            await db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
            await db.commit()
`,
  },
  {
    filename: 'prompts.py',
    path: 'prompts.py',
    category: 'Agent Core',
    description: 'Tizim promptlari, o‘zbek tilidagi qoidalar, manbalarga tayanish va xulosa chiqarish shablonlari.',
    content: `# -*- coding: utf-8 -*-
"""
UZUNITED AI - Prompt Shablonlari va Tizim Qoidalari
"""

SYSTEM_PROMPT = """Siz "UZUNITED AI" — o'zbek tilidagi eng ilg'or, do'stona, odobli va professional lokal AI chatbotisiz.
Sizning vazifangiz:
1. Foydalanuvchi bilan tabiiy, boy va to'liq o'zbek tilida muloqot qilish.
2. Agar qidiruv natijalari berilgan bo'lsa, javobingizdagi faktlarni aynan shu manbalar asosida tuzing va matn ichida [1], [2] kabi ko'rsating.
3. Bir nechta manbani solishtirib, xolis, ishonchli va batafsil tushuntirish bering.
4. Oldingi suhbat kontekstini doimo esda tuting ("u", "bu", "birinchisi" so'zlari nimaga tegishli ekanini anglang).
5. Javob oxirida "📚 Foydalanilgan manbalar:" deb havola va domenlarni chiroyli ko'rinishda ro'yxat qilib yozing.
6. Hech qachon yolg'on (hallucination) ma'lumot to'qimang. Bilmasangiz, buni ochiq ayting.
"""


def build_rag_prompt(user_message: str, resolved_query: str, sources: list, history: list) -> str:
    """Kontekst, manbalar va foydalanuvchi xabarini birlashtirib, yakuniy prompt yaratadi."""
    
    # Tarixni formatlash
    history_str = ""
    if history:
        history_lines = []
        for msg in history[-6:]:
            role_name = "Foydalanuvchi" if msg.get("role") == "user" else "UZUNITED AI"
            history_lines.append(f"{role_name}: {msg.get('content', '')}")
        history_str = "\\n".join(history_lines)
    else:
        history_str = "Suhbat endi boshlandi."

    # Manbalarni formatlash
    sources_str = ""
    if sources:
        source_lines = []
        for s in sources:
            source_lines.append(
                f"[{s['id']}] Sarlavha: {s['title']}\\n"
                f"    Domen: {s.get('domain', 'web')}\\n"
                f"    Matn: {s['snippet']}\\n"
                f"    Havola: {s['url']}"
            )
        sources_str = "\\n\\n".join(source_lines)
    else:
        sources_str = "Internet qidiruv ma'lumotlari mavjud emas (Lokal model bilimlaridan foydalaniladi)."

    prompt = f"""### SUHBAT TARIXI:
{history_str}

### INTERNETDAN YIG'ILGAN MANBALAR:
{sources_str}

### FOYDALANUVCHINING HOZIRGI SAVOLI:
{user_message}
(Kontekstual aniqlashtirilgan mavzu: {resolved_query})

### KO'RSATMA:
Yuqoridagi manbalardan foydalanib, foydalanuvchining savoliga o'zbek tilida to'liq, ravon, tushunarli va dalillangan javob bering. Javobingizda manbalarga [1], [2] shaklida iqtibos bering.
"""
    return prompt
`,
  },
  {
    filename: 'config.py',
    path: 'config.py',
    category: 'Config',
    description: 'Loyiha sozlamalari, Ollama server porti, model nomi va ma‘lumotlar bazasi fayli yo‘li.',
    content: `# -*- coding: utf-8 -*-
"""
UZUNITED AI - Konfiguratsiya sozlamalari
"""

import os

# Server sozlamalari
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

# Lokal Ollama sozlamalari (hech qanday API kalitsiz)
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")

# Tavsiya etilgan modellar: 'llama3.2:3b', 'qwen2.5:7b', 'deepseek-r1:7b'
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

# Xotira va Ma'lumotlar bazasi
DATABASE_PATH = os.getenv("DATABASE_PATH", "uzunited_memory.db")

# Web Search sozlamalari
SEARCH_MAX_RESULTS = 5
DEEP_SEARCH_MAX_RESULTS = 8
`,
  },
  {
    filename: 'requirements.txt',
    path: 'requirements.txt',
    category: 'Config',
    description: 'Python bog‘liqliklari ro‘yxati (pip install -r requirements.txt orqali o‘rnatiladi).',
    content: `fastapi>=0.110.0
uvicorn[standard]>=0.28.0
httpx>=0.27.0
aiosqlite>=0.20.0
pydantic>=2.6.0
python-multipart>=0.0.9
jinja2>=3.1.3
`,
  },
  {
    filename: 'run.sh',
    path: 'run.sh',
    category: 'Config',
    description: 'Linux / macOS uchun loyihani bir marta bosish bilan ishga tushirish skripti.',
    content: `#!/usr/bin/env bash
echo "=================================================="
echo "🚀 UZUNITED AI - Ishga tushirish jarayoni"
echo "=================================================="

# 1. Python virtual environment yaratish
if [ ! -d "venv" ]; then
    echo "📦 Virtual muhit yaratilmoqda..."
    python3 -m venv venv
fi

# 2. Virtual muhitni faollashtirish
source venv/bin/activate

# 3. Kerakli paketlarni o'rnatish
echo "📥 Bog'liqliklar o'rnatilmoqda..."
pip install -r requirements.txt

# 4. Ollama ishlab turganini tekshirish
echo "🤖 Ollama ulanishini tekshirish..."
curl -s http://localhost:11434/api/tags > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Ollama lokal serveri faol!"
else
    echo "⚠️ Diqqat: Ollama serveri topilmadi. Terminalda 'ollama serve' yoki 'ollama run llama3.2' ni ishga tushiring."
fi

# 5. FastAPI serverni ishga tushirish
echo "🌐 UZUNITED AI Serveri ochilmoqda: http://localhost:8000"
python main.py
`,
  },
  {
    filename: 'run.bat',
    path: 'run.bat',
    category: 'Config',
    description: 'Windows tizimlari uchun bir marta bosish bilan ishga tushirish skripti.',
    content: `@echo off
echo ==================================================
echo 🚀 UZUNITED AI - Windows Ishga tushirish
echo ==================================================

if not exist venv (
    echo 📦 Virtual muhit yaratilmoqda...
    python -m venv venv
)

call venv\\Scripts\\activate

echo 📥 Paketlar tekshirilmoqda...
pip install -r requirements.txt

echo 🌐 Server ishga tushmoqda...
python main.py
pause
`,
  },
  {
    filename: 'frontend/index.html',
    path: 'frontend/index.html',
    category: 'Frontend',
    description: 'Kengaytirilgan, zamonaviy va chiroyli UZUNITED AI veb-interfeysi.',
    content: `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UZUNITED AI - Lokal AI Chatbot</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="app-container">
    <header class="app-header">
      <div class="logo-box">
        <div class="logo-icon">⚡</div>
        <div>
          <h1>UZUNITED AI</h1>
          <p class="subtitle">Lokal LLM & Erkin Web Search</p>
        </div>
      </div>
      <div class="header-status">
        <span class="status-dot"></span>
        <span id="modelStatus">Ollama: llama3.2 (Lokal)</span>
      </div>
    </header>

    <main class="chat-main">
      <div id="messagesList" class="messages-list">
        <div class="message assistant">
          <div class="msg-avatar">🤖</div>
          <div class="msg-body">
            <p>Assalomu alaykum! Men <strong>UZUNITED AI</strong> assistentiman. Hech qanday pullik API'larsiz, o'z kompyuteringizda lokal ishlayman va zarur bo'lganda internetdan eng so'nggi ma'lumotlarni qidirib beraman.</p>
          </div>
        </div>
      </div>

      <div class="input-area">
        <div class="options-bar">
          <label class="switch-label">
            <input type="checkbox" id="deepSearchToggle">
            <span>🔬 Deep Search rejimi</span>
          </label>
        </div>
        <form id="chatForm" class="chat-form">
          <input type="text" id="userInput" placeholder="Savolingizni yozing (masalan: Bugungi dollar kursi qancha? yoki Python kod)..." autocomplete="off" required>
          <button type="submit" id="sendBtn">Yuborish ➔</button>
        </form>
      </div>
    </main>
  </div>
  <script src="app.js"></script>
</body>
</html>
`,
  },
  {
    filename: 'frontend/style.css',
    path: 'frontend/style.css',
    category: 'Frontend',
    description: 'Chiroyli dark-mode uslubi, manbalar nishonlari va animatsiyalar.',
    content: `* { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; }
body { background: #0b0f19; color: #f1f5f9; height: 100vh; display: flex; }
.app-container { display: flex; flex-direction: column; width: 100%; max-width: 960px; margin: 0 auto; height: 100vh; border-left: 1px solid #1e293b; border-right: 1px solid #1e293b; }
.app-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: #0f172a; border-bottom: 1px solid #1e293b; }
.logo-box { display: flex; align-items: center; gap: 12px; }
.logo-icon { width: 38px; height: 38px; background: linear-gradient(135deg, #3b82f6, #06b6d4); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: bold; }
.logo-box h1 { font-size: 1.25rem; font-weight: 700; color: #fff; }
.subtitle { font-size: 0.8rem; color: #94a3b8; }
.header-status { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; background: #1e293b; padding: 6px 12px; border-radius: 20px; }
.status-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block; }
.chat-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.messages-list { flex: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; }
.message { display: flex; gap: 12px; max-width: 85%; }
.message.user { align-self: flex-end; flex-direction: row-reverse; }
.msg-avatar { width: 34px; height: 34px; border-radius: 8px; background: #334155; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.message.user .msg-avatar { background: #2563eb; }
.msg-body { background: #1e293b; padding: 14px 18px; border-radius: 14px; line-height: 1.6; font-size: 0.95rem; }
.message.user .msg-body { background: #2563eb; color: #fff; border-bottom-right-radius: 4px; }
.sources-card { margin-top: 12px; padding: 10px; background: #0f172a; border-radius: 8px; border: 1px solid #334155; font-size: 0.85rem; }
.input-area { padding: 16px 24px; background: #0f172a; border-top: 1px solid #1e293b; }
.options-bar { margin-bottom: 10px; font-size: 0.85rem; color: #94a3b8; }
.chat-form { display: flex; gap: 12px; }
.chat-form input { flex: 1; background: #1e293b; border: 1px solid #334155; color: #fff; padding: 12px 18px; border-radius: 10px; font-size: 1rem; outline: none; }
.chat-form input:focus { border-color: #3b82f6; }
.chat-form button { background: #2563eb; color: #fff; border: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: 0.2s; }
.chat-form button:hover { background: #1d4ed8; }
`,
  },
  {
    filename: 'frontend/app.js',
    path: 'frontend/app.js',
    category: 'Frontend',
    description: 'FastAPI serveri bilan muloqot qiluvchi JavaScript kodi.',
    content: `const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const messagesList = document.getElementById("messagesList");
const deepSearchToggle = document.getElementById("deepSearchToggle");

const sessionId = "session_" + Math.random().toString(36).substring(7);

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text) return;

  // Foydalanuvchi xabarini ko'rsatish
  appendMessage("user", text);
  userInput.value = "";

  // Loading animatsiyasi
  const loadingId = appendMessage("assistant", "⏳ UZUNITED AI ma'lumotlarni tahlil qilmoqda...");

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        message: text,
        is_deep_search: deepSearchToggle.checked
      })
    });

    const data = await res.json();
    const loadingElem = document.getElementById(loadingId);
    if (loadingElem) loadingElem.remove();

    if (data.answer) {
      appendMessage("assistant", data.answer, data.sources, data.reasoning_steps);
    } else {
      appendMessage("assistant", "Kechirasiz, javob olishda xatolik yuz berdi.");
    }
  } catch (err) {
    const loadingElem = document.getElementById(loadingId);
    if (loadingElem) loadingElem.remove();
    appendMessage("assistant", "⚠️ Serverga ulanishda xatolik yuz berdi. Backend ishlab turganiga ishonch hosil qiling.");
  }
});

function appendMessage(role, text, sources = [], steps = []) {
  const msgDiv = document.createElement("div");
  const msgId = "msg_" + Date.now() + "_" + Math.random().toString(36).substring(7);
  msgDiv.id = msgId;
  msgDiv.className = \`message \${role}\`;

  const avatar = role === "user" ? "👤" : "🤖";
  
  let sourcesHtml = "";
  if (sources && sources.length > 0) {
    sourcesHtml = \`<div class="sources-card"><strong>📚 Foydalanilgan manbalar:</strong><ul>\` +
      sources.map(s => \`<li>[\${s.id}] <a href="\${s.url}" target="_blank" style="color:#60a5fa">\${s.title}</a> (\${s.domain})</li>\`).join("") +
      \`</ul></div>\`;
  }

  msgDiv.innerHTML = \`
    <div class="msg-avatar">\${avatar}</div>
    <div class="msg-body">
      <div>\${text.replace(/\\n/g, "<br>")}</div>
      \${sourcesHtml}
    </div>
  \`;

  messagesList.appendChild(msgDiv);
  messagesList.scrollTop = messagesList.scrollHeight;
  return msgId;
}
`,
  }
];
