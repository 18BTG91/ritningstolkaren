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
    "scale": "Skala (t.ex. 1:50, 1:100) — LÄS AV DENNA FÖRST, den behövs för längdberäkning",
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
      "lengthMeters": 12.5,  // Beräknad verklig längd baserat på ritningens skala
      "from": "Var kabeln börjar (t.ex. gruppcentral GC1)",
      "to": "Var kabeln slutar (t.ex. uttag i rum 201)",
      "system": "System (t.ex. Belysning, Kraft, Data, Brandlarm)",
      "bbox": { "page": 1, "x": 100, "y": 300, "w": 200, "h": 30 },
      "path": { "page": 1, "points": [{"x": 100, "y": 315}, {"x": 300, "y": 315}, {"x": 300, "y": 500}, {"x": 450, "y": 500}] }
    }
  ],
  "summary": "En sammanfattande text om ritningens innehåll och de viktigaste installationerna"
}

REGLER:
- Räkna varje synlig symbol/komponent noggrant
- Identifiera ALLA kabeldragningar: typ, beteckning, och BERÄKNA verklig längd i meter
- KRITISKT FÖR KABELLÄNGD: Läs av ritningens skala (t.ex. 1:50, 1:100) från skalstrecket/skalindikationen som vanligtvis finns i namnrutan eller nedre delen av ritningen. Mät sedan kabelns längd på ritningen och multiplicera med skalfaktorn. Exempel: om skalan är 1:50 och kabeln är ca 5 cm lång på ritningen = 5 × 50 = 250 cm = 2.5 m verklig längd. Tänk på att: (1) Mät hela kabeldragningen inklusive vertikala och horisontella sträckor, (2) Lägg till ~10% för skarvar och böjar, (3) Om skalan inte hittas, ange detta i drawingInfo.scale som "Ej angiven" och uppskatta baserat på rummens typiska storlek
- Gruppera likadana komponenter men specificera placering
- Om du inte kan identifiera en symbol exakt, beskriv den som du ser den
- Inkludera ALLA typer: belysning, uttag, strömställare, kablar, centraler, larm, data, brandlarm, etc.
- Ange alltid enhet (st för stycken, m för meter)
- Var noggrann med antal — räkna varje instans
- Om ritningen innehåller en symbolförteckning/beteckningslista, använd den
- Identifiera kanalisation: kabelstegar, kabelrännor, installationsrör
- Identifiera förläggningssätt om det framgår
- VIKTIGT: För varje komponent, ange "bbox" med ungefärlig position på ritningen i pixelkoordinater (baserat på en sida som är 1000x1000 pixlar). "page" anger sidnummer (1-indexerat), "x" och "y" är övre vänstra hörnet, "w" och "h" är bredd och höjd.
- EXTREMT VIKTIGT FÖR KABLAR: Ange "path" med kabelns HELA dragning från startpunkt (elcentral/gruppcentral) till slutpunkt (uttag/armatur/etc). Ange minst 4-8 punkter längs den synliga kabellinjen i pixelkoordinater (0-1000). Inkludera: (1) startpunkten vid elcentralen, (2) varje hörn/sväng där kabeln byter riktning, (3) slutpunkten vid uttaget/armaturen. Texten "5G25", "3G1.5" etc sitter på linjen — följ den linjen hela vägen. path.page = sidnummer, path.points = [{x,y}] från start till slut. Ju fler punkter desto bättre — speciellt vid svängar.`;

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
    const feedbackJson = formData.get("feedback") as string | null;
    const drawingType = (formData.get("drawingType") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "Ingen PDF-fil uppladdad" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Filen måste vara en PDF" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    // Build few-shot prompt from past feedback
    let finalPrompt = GEMINI_PROMPT;
    if (feedbackJson) {
      try {
        const feedbackList = JSON.parse(feedbackJson) as { corrections: string[]; correctedResult: { summary: string; cables: unknown[]; components: unknown[] } }[];
        if (feedbackList.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const examples = feedbackList.slice(0, 3).map((fb, idx) => {
            const comps = fb.correctedResult.components as any[];
            const cables = fb.correctedResult.cables as any[];
            const compExample = comps?.[0];
            const cableExample = cables?.[0];
            return `EXEMPEL ${idx + 1} (korrigerad analys):
- Komponentexempel: ${compExample ? `${compExample.name} (symbol: ${compExample.symbol || "-"}, kvantitet: ${compExample.quantity})` : "-"}
- Kabelexempel: ${cableExample ? `${cableExample.type} (beteckning: ${cableExample.designation || "-"}, längd: ${cableExample.lengthMeters}m, från: ${cableExample.from}, till: ${cableExample.to})` : "-"}
- Korrigeringar som gjordes: ${fb.corrections.join("; ")}`;
          }).join("\n\n");

          finalPrompt = `VIKTIGT: Nedan följer ${feedbackList.length} tidigare korrigerade analyser. Använd dessa som vägledning för att undvika liknande misstag. Var extra uppmärksam på de korrigeringar som nämns.\n\n${examples}\n\n---\n\n${GEMINI_PROMPT}`;
        }
      } catch {
        // ignore invalid feedback JSON
      }
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      { text: finalPrompt },
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
      path: c.path && Array.isArray(c.path.points) && c.path.points.length >= 2
        ? { page: c.path.page || 1, points: c.path.points.map((p: any) => ({ x: p.x || 0, y: p.y || 0 })) }
        : undefined,
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
