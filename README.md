# Ritningstolkaren — Automatisk Mängdning & Kalkylering

En webbapplikation som automatiserar mängdning och kostnadsberäkning från uppladdade PDF-ritningar (elritningar, planlösningar, installationsritningar) med hjälp av **Google Gemini 1.5 Pro**.

## Funktioner

- **PDF-uppladdning** — Dra och släpp eller välj PDF-filer (max 50 MB)
- **AI-driven analys** — Gemini 1.5 Pro identifierar alla elektriska symboler och komponenter
- **Automatisk mängdning** — Räknar och kategoriserar alla komponenter per typ
- **Kostnadsberäkning** — Matchar mot prisdatabas med material- och arbetskostnader
- **CSV-export** — Exportera mängdförteckning och kalkyl till CSV
- **Kategoriserad visning** — Komponenter grupperade per kategori (Belysning, Uttag, Kablar, etc.)

## Kom igång

### 1. Installera beroenden

```bash
npm install
```

### 2. Konfigurera API-nyckel

Skapa eller redigera `.env.local` och lägg till din Google Gemini API-nyckel:

```
GEMINI_API_KEY=din-api-nyckel-här
```

Skaffa en API-nyckel på [Google AI Studio](https://aistudio.google.com/app/apikey).

### 3. Starta utvecklingsservern

```bash
npm run dev
```

Öppna [http://localhost:3000](http://localhost:3000) i webbläsaren.

## Teknikstack

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Google Gemini 1.5 Pro** (PDF-analys)
- **Lucide React** (Ikoner)
- **react-dropzone** (Filuppladdning)

## Prisdatabas

Applikationen innehåller en inbyggd prisdatabas med standardpriser för vanliga elinstallationskomponenter:

| Kategori | Exempel |
|---|---|
| Belysning | Downlights, takarmaturer, nödbelysning |
| Uttag | Vägguttag, dubbeluttag, golvuttag, USB |
| Strömställare | Enkla, korsomkopplare, dimmers |
| Kablar | EKOM 3G1.5–5G10, Cat6 |
| Centraler | Gruppcentraler, automatsäkringar |
| Förläggning | Kabelstegar, rännor, installationsrör |
| Larm | Brandvarnare, brandlarmsdetektorer |
| Kommunikation | Datauttag RJ45, teleuttag |

Priserna är uppskattningar och kan justeras i `src/lib/prices.ts`.
