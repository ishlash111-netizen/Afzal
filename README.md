# UZUNITED AI

Universal intellektual chatbot va bepul internet qidiruviga ega aqlli assistent platformasi.

> **100% BEPUL VA HECH QANDAY API KEY TALAB QILINMAYDI!**  
> UZUNITED AI hech qanday pullik API yoki ro'yxatdan o'tish kalitisiz (Zero API Key) to'liq ishlaydi. Qidiruv tizimi ochiq Wikipedia, DuckDuckGo, Markaziy Bank valyuta kurslari va o'rnatilgan aqlli tahlil mexanizmi orqali ishlaydi.

---

## Vercel orqali publish (deploy) qilish

Loyiha Vercel ga 1 marta bosish orqali to'g'ridan-to'g'ri deploy bo'ladigan qilib sozlangan (`vercel.json` va Serverless Function `api/` marshrutlari to'liq tayyor).

### 1-usul: GitHub orqali Vercel ga ulash (Eng osoni)
1. Ushbu loyihani o'zingizning GitHub repozitoriyangizga push qiling.
2. [vercel.com](https://vercel.com) ga kiring va **"Add New Project"** tugmasini bosing.
3. GitHub repozitoriyangizni tanlang.
4. **Hech qanday Environment Variable (API KEY) kiritish shart emas!**
5. Shunchaki to'g'ridan-to'g'ri **"Deploy"** tugmasini bosing. Vercel avtomatik ravishda saytingizni ishga tushiradi.

### 2-usul: Vercel CLI orqali to'g'ridan-to'g'ri deploy qilish
Terminalda quyidagi buyruqni ishga tushiring:
```bash
npx vercel --prod
```

---

## Lokal ishga tushirish (Local Development)

Hech qanday maxfiy kalitsiz lokal kompyuterda ishga tushirish:

```bash
# Kutubxonalarni o'rnatish
npm install

# Dasturni ishga tushirish (Port 3000)
npm run dev

# Ishlab chiqarish (Production) build
npm run build
```

---

### Qo'shimcha imkoniyat (Ixtiyoriy)
Agar xohlasangiz, kelgusida qo'shimcha Google Gemini imkoniyatlarini ulash uchun `GEMINI_API_KEY` kiritishingiz mumkin, ammo bu **mutlaqo majburiy emas** — dastur usiz ham to'liq va uzluksiz ishlayveradi.
