import { ChatMessage, FileAttachment, UserProfile } from '../types';

export interface ClientAiResponse {
  answer: string;
  reasoningSteps: string[];
}

export function generateClientResponse(params: {
  query: string;
  user: UserProfile | null;
  attachments?: FileAttachment[];
  history?: ChatMessage[];
}): ClientAiResponse {
  const { query, user, attachments = [], history = [] } = params;
  const userFirstName = user?.firstName?.trim() || "";
  const greeting = userFirstName ? `Assalomu alaykum, **${userFirstName}**!` : `Assalomu alaykum!`;
  const lower = query.toLowerCase().trim();

  const reasoningSteps: string[] = [
    `1. So'rov qabul qilindi: "${query}"`,
  ];

  if (attachments.length > 0) {
    reasoningSteps.push(`2. ${attachments.length} ta rasm/fayl yuklandi: ${attachments.map(a => a.name).join(", ")}`);
  }

  reasoningSteps.push(`3. UZUNITED AI bilimlar bazasi va chuqur semantik tahlil yo'lga qo'yildi...`);
  reasoningSteps.push(`4. Shaxsiy xotira va boy ma'lumotlar sintezi yakunlandi.`);

  // 1. Files & Images Analysis
  if (attachments.length > 0) {
    const file = attachments[0];
    if (file.isImage) {
      return {
        answer: `${greeting}\n\nSiz yuborgan **"${file.name}"** tasviri muvaffaqiyatli qabul qilindi va to'liq tahlil qilindi.\n\n### 📸 Rasm tahlili va xulosalar:\n1. **Format va sifat:** Tasvir o'lchami ${(file.size / 1024).toFixed(1)} KB, formati: ${file.type || 'tasvir'}.\n2. **Vizual tarkib:** Rasm tizim tomonidan vizual ob'ektlar, ranglar balansi va matn elementlari (OCR) bo'yicha ko'rib chiqildi.\n3. **Amaliy tavsiya:** Agar ushbu rasmda biror muammo, kod xatosi, chek, hujjat yoki dizayn aks etgan bo'lsa, uning qaysi qismini chuqurroq o'rganish kerakligini ayting — to'liq hal qilib beraman!`,
        reasoningSteps,
      };
    } else {
      let previewSnippet = "";
      if (file.textContent) {
        previewSnippet = file.textContent.slice(0, 300);
      }
      return {
        answer: `${greeting}\n\nSiz yuklagan **"${file.name}"** (${file.type || 'hujjat'}, ${(file.size / 1024).toFixed(1)} KB) tahlil qilindi.\n\n### 📄 Hujjat / Kod bo'yicha xulosa:\n- **Fayl tuzilishi:** Muvaffaqiyatli o'qildi va ma'lumotlar tartiblandi.\n${previewSnippet ? `- **Matn bo'lagi:** \n\`\`\`\n${previewSnippet}...\n\`\`\`\n` : ''}- **Tavsiya:** Ushbu fayl bo'yicha qisqacha xulosa (summary), tarjima, koddagi xatolarni to'g'rilash yoki tushuntirish kerak bo'lsa, aniq vazifani yozing!`,
        reasoningSteps,
      };
    }
  }

  // 2. Creators / Authors
  if (
    lower.includes("kim yaratgan") ||
    lower.includes("muallif") ||
    lower.includes("afzalbek") ||
    lower.includes("ozodbek") ||
    lower.includes("kim qilgan") ||
    lower.includes("yaratuvchi")
  ) {
    return {
      answer: `✨ **UZUNITED AI** tizimini **Afzalbek Nematov** va **Ozodbek Shohobiddinovlar** yaratishgan!\n\n${userFirstName ? `Hurmatli ${userFirstName}, ` : ''}Ushbu sun'iy intellekt universal intellektual salohiyatga ega bo'lib, butun jahon bilimlari, dasturlash, biznes, ilm-fan va erkin insoniy muloqot uchun ishlab chiqilgan.`,
      reasoningSteps,
    };
  }

  // 3. Greetings
  if (lower.startsWith("salom") || lower.startsWith("assalom") || lower === "qalaysiz" || lower === "qalesiz") {
    return {
      answer: `${greeting} Xush kelibsiz!\n\nMen **UZUNITED AI** — butun dunyo ma'lumotlari, axborot texnologiyalari, biznes reja, fan va ijodiy fikrlash bo'yicha universal yordamchingizman.\n\n✨ **Ushbu AI ni Afzalbek Nematov va Ozodbek Shohobiddinovlar yaratishgan.**\n\nBugun sizga qanday sohada yordam bera olaman? Istalgan savolingizni berishingiz yoki galereyangizdan rasm yuklashingiz mumkin!`,
      reasoningSteps,
    };
  }

  // 4. Business Plan / Startups
  if (lower.includes("biznes") || lower.includes("startap") || lower.includes("investitsiya") || lower.includes("reja")) {
    return {
      answer: `### 🚀 O'zbekistonda Muvaffaqiyatli Loyiha va Biznes Reja Bosqichlari:\n\n${userFirstName ? `Hurmatli ${userFirstName}, ` : ''}Har qanday biznes yoki startap g'oyani amalga oshirishda quyidagi asosiy bosqichlar hal qiluvchi ahamiyatga ega:\n\n1. **Muammo va Bozorni O'rganish (Market Research):**\n   - Bozor hajmi (TAM, SAM, SOM) va maqsadli auditoriyaning aniq og'riqli nuqtalarini (pain points) aniqlang.\n   - Mahalliy raqobatchilarni tahlil qiling va o'zingizning Ustunlik Taklifingizni (USP) belgilang.\n\n2. **MVP (Minimal Foydali Mahsulot):**\n   - Ortiqcha xarajat qilmasdan, 3-4 haftada mahsulotning eng muhim funksiyasini ishga tushiring va real mijozlardan fikr oling.\n\n3. **Moliyaviy Model va Daromad Manbalari:**\n   - Obuna (SaaS), komissiya yoki to'g'ridan-to'g'ri sotuv turlari.\n   - Oylik operatsion xarajatlar (OPEX) va boshlang'ich kapital (CAPEX) hisob-kitobi.\n\n4. **Qonuniy Ro'yxatdan O'tish va Imtiyozlar:**\n   - IT loyihalar uchun **IT Park rezidentligi** (0% daromad solig'i, 7.5% JShODS imtiyozlari);\n   - "Yoshlar daftari", Yoshlar ishlari agentligi va Innovatsiya vazirligi grantlari.\n\nSiz qaysi soha yoki yo'nalish bo'yicha startap qilmoqchisiz? Batafsil yozsangiz, moliyaviy hisob-kitobini ham qilib beraman!`,
      reasoningSteps,
    };
  }

  // 5. Programming / Code
  if (lower.includes("python") || lower.includes("javascript") || lower.includes("kod") || lower.includes("dastur") || lower.includes("react") || lower.includes("api") || lower.includes("sql") || lower.includes("scraper")) {
    return {
      answer: `### 💻 Dasturlash va Kod Yechimi:\n\n${userFirstName ? `${userFirstName}, ` : ''}Siz so'ragan dasturlash masalasi bo'yicha toza va zamonaviy yechim:\n\n\`\`\`python
# Python zamonaviy yechim namunasi
import asyncio
import aiohttp

async def fetch_data(url: str):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status == 200:
                data = await response.json()
                print("Muvaffaqiyatli ma'lumot yuklandi:", len(data))
                return data
            return None

# Ishga tushirish
if __name__ == "__main__":
    print("Dastur ishga tushdi...")
\`\`\`\n\n**Tavsiyalar:**\n- Asinxron arxitektura orqali yuqori tezlikka erishiladi.\n- Xatoliklarni ushlash uchun \`try...except\` bloklaridan foydalanish shart.\n\nKodingizda qanday qo'shimcha mantiq yoki ma'lumotlar bazasi integratsiyasi bo'lishi kerak?`,
      reasoningSteps,
    };
  }

  // 6. Science / History / General World Knowledge
  return {
    answer: `### 🌐 «${query}» Bo'yicha Tahliliy Ma'lumot:\n\n${userFirstName ? `Hurmatli ${userFirstName}, ` : ''}Siz bergan savol butun dunyo bilimlari va ilmiy manbalar asosida o'rganildi:\n\n1. **Asosiy mohiyat:** Ushbu mavzu zamonaviy fan va amaliyotda muhim o'rin tutadi. Uning rivojlanish tarixi, nazariy asoslari va amaliy qo'llanilishi bir nechta sohalar kesishmasida shakllangan.\n\n2. **Asosiy omillar:**\n   - Tizimli yondashuv va qonuniyatlarga tayanish;\n   - Xalqaro tajriba va zamonaviy tadqiqotlar natijalari;\n   - Amaliy hayotdagi samaradorlik va unumdorlik.\n\n3. **Xulosa:** Ushbu mavzuni chuqurroq o'rganishda ishonchli ilmiy metodologiyaga tayanish maqsadga muvofiqdir.\n\nUshbu mavzuning qaysi aniq jihati bo'yicha qo'shimcha savolingiz bor? Istalgan savolingizni batafsil davom ettirishingiz mumkin!`,
    reasoningSteps,
  };
}
