import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { findBestPriceMatch } from "@/lib/prices";
import type { ExtractedComponent, CableItem, CostLineItem, AnalysisResult } from "@/lib/types";

const GEMINI_PROMPT = `Du är en expert elinstallationsingenjör och mängdningsspecialist. Analysera denna PDF-ritning/elritning noggrant.

UPPGIFT: Identifiera och räkna ALLA elektriska komponenter, symboler, kablar och installationer som syns på ritningen.

Svara EXAKT i följande JSON-format (inga extra tecken utanför JSON):

{
  "drawingInfo": {
    "title": "Ritningens titel",
    "drawingNumber": "Ritningsnummer om det finns",
    "scale": "Skala om angiven",
    "date": "Datum om angivet",
    "designer": "Konstruktör/projektör om angiven",
    "description": "Kort beskrivning av vad ritningen visar"
  },
  "components": [
    {
      "name": "Komponentens fullständiga namn på svenska",
      "symbol": "Symbolbeteckning på ritningen (t.ex. E1, L1, etc.)",
      "quantity": 5,
      "unit": "st eller m",
      "location": "Var på ritningen (t.ex. rum, plan, sektion)",
      "category": "En av: Belysning, Uttag, Strömställare, Kabel, Central, Förläggning, Larm, Kommunikation, Övrigt",
      "bbox": { "page": 1, "x": 150, "y": 200, "w": 80, "h": 40 }
    }
  ],
  "cables": [
    {
      "type": "Kabeltyp (t.ex. EQLQ 3G1.5, EQLQ 5G2.5, EKKJ 5G2.5, FQ 2x1.5, etc.)",
      "designation": "Kabelbeteckning från ritningen (t.ex. W1, W2, etc.)",
      "lengthMeters": 12.5,
      "from": "Var kabeln börjar (t.ex. gruppcentral GC1)",
      "to": "Var kabeln slutar (t.ex. uttag i rum 201)",
      "system": "System (t.ex. Belysning, Kraft, Data, Brandlarm)",
      "bbox": { "page": 1, "x": 100, "y": 300, "w": 200, "h": 30 }
    }
  ],
  "summary": "En sammanfattande text om ritningens innehåll och de viktigaste installationerna"
}

REGLER:
- Räkna varje synlig symbol/komponent noggrant
- Identifiera ALLA kabeldragningar: typ, beteckning, uppskattad längd baserat på ritningens skala
- Gruppera likadana komponenter men specificera placering
- Om du inte kan identifiera en symbol exakt, beskriv den som du ser den
- Inkludera ALLA typer: belysning, uttag, strömställare, kablar, centraler, larm, data, brandlarm, etc.
- Ange alltid enhet (st för stycken, m för meter)
- Var noggrann med antal — räkna varje instans
- Om ritningen innehåller en symbolförteckning/beteckningslista, använd den
- Identifiera kanalisation: kabelstegar, kabelrännor, installationsrör
- Identifiera förläggningssätt om det framgår
- VIKTIGT: För varje komponent och kabel, ange "bbox" med ungefärlig position på ritningen i pixelkoordinater (baserat på en sida som är 1000x1000 pixlar). "page" anger sidnummer (1-indexerat), "x" och "y" är övre vänstra hörnet, "w" och "h" är bredd och höjd. Uppskatta så gott du kan var på ritningen elementet finns.`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your-gemini-api-key-here") {
      return NextResponse.json(
        { error: "GEMINI_API_KEY är inte konfigurerad. Lägg till din API-nyckel i .env.local" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("pdf") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Ingen PDF-fil uppladdad" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Filen måste vara en PDF" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      { text: GEMINI_PROMPT },
      {
        inlineData: {
          mimeType: "application/pdf",
          data: base64,
        },
      },
    ]);

    const response = result.response;
    const text = response.text();

    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Inget JSON-svar hittades i modellens svar");
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Parse error:", parseError);
      console.error("Raw response:", text);
      return NextResponse.json(
        { error: "Kunde inte tolka AI-svaret. Försök igen.", rawResponse: text },
        { status: 500 }
      );
    }

    const components: ExtractedComponent[] = parsed.components || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cables: CableItem[] = (parsed.cables || []).map((c: any) => ({
      type: c.type || "",
      designation: c.designation || "",
      lengthMeters: c.lengthMeters || 0,
      from: c.from || "",
      to: c.to || "",
      system: c.system || "",
      bbox: c.bbox ? { page: c.bbox.page || 1, x: c.bbox.x || 0, y: c.bbox.y || 0, w: c.bbox.w || 0, h: c.bbox.h || 0 } : undefined,
    }));

    let totalMaterial = 0;
    let totalLabor = 0;

    const costItems: CostLineItem[] = components.map((comp: ExtractedComponent) => {
      const priceMatch = findBestPriceMatch(comp.name);
      const qty = comp.quantity || 1;

      let materialCost = 0;
      let laborCost = 0;
      let matched = false;

      if (priceMatch) {
        materialCost = priceMatch.materialCost * qty;
        laborCost = priceMatch.laborCost * qty;
        matched = true;
      }

      totalMaterial += materialCost;
      totalLabor += laborCost;

      return {
        name: comp.name,
        symbol: comp.symbol || "",
        eNumber: priceMatch ? priceMatch.eNumber : "",
        quantity: qty,
        unit: comp.unit || "st",
        location: comp.location || "",
        category: comp.category || "Övrigt",
        materialCost,
        laborCost,
        totalCost: materialCost + laborCost,
        matched,
        bbox: comp.bbox ? { page: comp.bbox.page || 1, x: comp.bbox.x || 0, y: comp.bbox.y || 0, w: comp.bbox.w || 0, h: comp.bbox.h || 0 } : undefined,
      };
    });

    const analysisResult: AnalysisResult = {
      drawingInfo: parsed.drawingInfo || {
        title: "Okänd ritning",
        drawingNumber: "",
        scale: "",
        date: "",
        designer: "",
        description: "",
      },
      components,
      cables,
      costItems,
      totalMaterial,
      totalLabor,
      grandTotal: totalMaterial + totalLabor,
      summary: parsed.summary || "",
    };

    return NextResponse.json(analysisResult);
  } catch (error: unknown) {
    console.error("Analysis error:", error);
    const message = error instanceof Error ? error.message : "Okänt fel";
    return NextResponse.json({ error: `Analysfel: ${message}` }, { status: 500 });
  }
}
