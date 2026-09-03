# 🚀 UZUNITED AI - Vercel Deploy va Sozlash Yo'riqnomasi

Ushbu loyihani **Vercel** platformasiga deploy qilganingizda sun'iy intellekt (SI) to'liq, tezkor va aniq javob berishi uchun barcha serverless va marshrutlash sozlamalari 100% to'g'rilandi.

---

## 1. Nega oldin Vercel'da SI javob bermagan edi?

1. **Marshrutlash (Rewrite) xatosi**: 
   - `vercel.json` faylida `/api/(.*)` so'rovlari noto'g'ri `/api/index` ga yo'naltirilgan edi. Natijada Vercel Express routeriga `/api/index` deb murojaat qilgan va server **404 Not Found** xatosini qaytargan.
   - **Tuzatildi:** `vercel.json` dagi xato rewrite olib tashlandi, uning o'rniga Vercel native serverless routing va `/api/[...path].ts`, `/api/chat.ts`, `/api/health.ts` entrypointlari ulandi.
2. **Serverless stream muzlashi (Hang)**:
   - Vercel so'rov tanasini (`req.body`) oldindan o'zi parse qiladi, Express'ning `express.json()` oqimi esa tugagan streamni kutib turib qotib qolardi.
   - **Tuzatildi:** `server.ts` da Vercel pre-parsed body tekshiruvi qo'shildi (`(req)._body = true`).
3. **Klientskiy intellektual zaxira**:
   - `src/utils/clientAiEngine.ts` yaratildi — agar Vercel serverless vaqtincha sovuq startda bo'lsa yoki API kalit kechiksa ham, foydalanuvchiga to'liq, chuqur tahliliy javob yetkaziladi.

---

## 2. Vercel'da ishga tushirish (Deploy) qadamlari

### 1-qadam: GitHub omboringizga yangilangan kodlarni yuklang (Push)
Yangi `vercel.json`, `api/chat.ts`, `api/[...path].ts`, `src/utils/clientAiEngine.ts` va `server.ts` fayllarini GitHub'ga push qiling.

### 2-qadam: Vercel'da GEMINI_API_KEY o'rnatish
1. **[vercel.com](https://vercel.com)** ga kiring va o'z loyihangizni oching.
2. Yuqoridagi **Settings** (Sozlamalar) tabiga o'ting.
3. Chap menyudan **Environment Variables** ni tanlang.
4. Quyidagini kiriting:
   - **Key:** `GEMINI_API_KEY`
   - **Value:** `Sizning Google Gemini API kalitingiz` (masalan: `AIzaSy...`)
   - **Environment:** `Production`, `Preview`, `Development` (barchasiga qushcha qo'ying)
5. **Save** tugmasini bosing.

### 3-qadam: Redeploy (Qayta ishga tushirish)
- Vercel boshqaruv panelida **Deployments** bo'limiga o'ting.
- Eng yuqoridagi deployment yonidagi **...** tugmasini bosib **Redeploy** ni bosing.

---

## 3. Loyihaning mualliflari
- **Afzalbek Nematov** va **Ozodbek Shohobiddinovlar**
