import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `Du är en expert elinstallationsingenjör och byggkonsult. Du har tillgång till en PDF-ritning som användaren har laddat upp.

Svara på användarens frågor om ritningen. Du kan svara om:
- Tekniska detaljer och specifikationer
- Skallkrav och normer
- Komponentval och materialfrågor
- Installationsmetoder
- Kabeldimensionering
- Brandsäkerhet och nödbelysning
- Administrativa föreskrifter (om det framgår av dokumentet)
- Mängder och antal

Svara alltid på svenska. Var konkret och hänvisa till specifika delar av ritningen när det är möjligt.
Om du inte kan svara baserat på ritningen, säg det tydligt.`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your-gemini-api-key-here") {
      return NextResponse.json(
        { error: "GEMINI_API_KEY är inte konfigurerad" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const question = formData.get("question") as string | null;
    const pdfFile = formData.get("pdf") as File | null;
    const historyJson = formData.get("history") as string | null;

    if (!question) {
      return NextResponse.json({ error: "Ingen fråga angiven" }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

    parts.push({ text: SYSTEM_PROMPT });

    if (pdfFile) {
      const bytes = await pdfFile.arrayBuffer();
      const base64 = Buffer.from(bytes).toString("base64");
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: base64,
        },
      });
    }

    if (historyJson) {
      try {
        const history = JSON.parse(historyJson) as Array<{ role: string; content: string }>;
        const historyText = history
          .map((m) => `${m.role === "user" ? "Användare" : "Assistent"}: ${m.content}`)
          .join("\n\n");
        if (historyText) {
          parts.push({ text: `Tidigare konversation:\n${historyText}` });
        }
      } catch {
        // ignore bad history
      }
    }

    parts.push({ text: `Användarens fråga: ${question}` });

    const result = await model.generateContent(parts);
    const answer = result.response.text();

    return NextResponse.json({ answer });
  } catch (error: unknown) {
    console.error("Chat error:", error);
    const message = error instanceof Error ? error.message : "Okänt fel";
    return NextResponse.json({ error: `Chattfel: ${message}` }, { status: 500 });
  }
}
