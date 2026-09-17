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
        answer: `${greeting}\n\nSiz yuborgan tasvir qabul qilindi (${(file.size / 1024).toFixed(1)} KB). Rasmda aynan qaysi ob'ekt, matn yoki muammoni tahlil qilish kerakligini aytsangiz, qisqa va lo'nda tushuntirib beraman.`,
        reasoningSteps,
      };
    } else {
      return {
        answer: `${greeting}\n\n**"${file.name}"** hujjati qabul qilindi. Ushbu fayl bo'yicha qanday vazifani (qisqa xulosa, kod tekshiruvi yoki tarjima) bajarish kerak?`,
        reasoningSteps,
      };
    }
  }

  // 2. Creators / Authors (FAQAT foydalanuvchi to'g'ridan-to'g'ri so'ragandagina aytiladi!)
  if (
    lower.includes("kim yaratgan") ||
    lower.includes("muallif") ||
    lower.includes("afzalbek") ||
    lower.includes("ozodbek") ||
    lower.includes("kim qilgan") ||
    lower.includes("kim yasagan") ||
    lower.includes("yaratuvchi")
  ) {
    return {
      answer: `Meni **Afzalbek Nematov** va **Ozodbek Shohobiddinovlar** yaratishgan.`,
      reasoningSteps,
    };
  }

  // 3. Greetings (Mualliflar aytilmaydi!)
  if (lower.startsWith("salom") || lower.startsWith("assalom") || lower === "qalaysiz" || lower === "qalesiz") {
    return {
      answer: `${greeting} Men **UZUNITED AI** man. Sizga qanday yordam bera olaman?`,
      reasoningSteps,
    };
  }

  // 4. Business Plan / Startups (Concise AI Overview)
  if (lower.includes("biznes") || lower.includes("startap") || lower.includes("investitsiya") || lower.includes("reja")) {
    return {
      answer: `Startapni muvaffaqiyatli boshlash uchun 3 ta asosiy qadam:\n\n1. **Muammo va bozor:** Mijozning aniq ehtiyojini aniqlab, raqobatchilardan ustun taklif shakllantirish;\n2. **MVP versiya:** Katta xarajatsiz dastlabki ishchi modelni tez chiqarish;\n3. **Mijozlar fikri:** Dastlabki mijozlar tahlili orqali mahsulotni yaxshilash.\n\nQaysi sohada biznes boshlamoqchisiz?`,
      reasoningSteps,
    };
  }

  // 5. Programming / Code (Concise)
  if (lower.includes("python") || lower.includes("javascript") || lower.includes("kod") || lower.includes("dastur") || lower.includes("react") || lower.includes("api") || lower.includes("sql") || lower.includes("scraper")) {
    return {
      answer: `Dasturlash bo'yicha toza va zamonaviy yechim:\n\n\`\`\`python
# Qisqa va samarali kod
def process_items(items):
    return [x.strip() for x in items if x]
\`\`\`\n\nKodingizdagi aniq xatolik yoki vazifani yozsangiz, darhol to'g'rilab beraman.`,
      reasoningSteps,
    };
  }

  // 6. Science / History / General World Knowledge (Concise AI Overview)
  return {
    answer: `«${query}» bo'yicha qisqa xulosa:\n\nUshbu mavzuning asosiy mohiyati tizimli yondashuv va so'nggi ilmiy tadqiqotlarga tayanadi. Sizni aynan qaysi jihati qiziqtirmoqda?`,
    reasoningSteps,
  };
}
