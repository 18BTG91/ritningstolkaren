export interface PriceEntry {
  id: string;
  name: string;
  unit: string;
  materialCost: number;
  laborCost: number;
  category: string;
}

export const defaultPriceDatabase: PriceEntry[] = [
  // Belysning
  { id: "downlight", name: "Downlight LED infälld", unit: "st", materialCost: 450, laborCost: 350, category: "Belysning" },
  { id: "takarmatur", name: "Takarmatur", unit: "st", materialCost: 800, laborCost: 400, category: "Belysning" },
  { id: "vaggarmatur", name: "Väggarmatur", unit: "st", materialCost: 600, laborCost: 350, category: "Belysning" },
  { id: "lysror", name: "Lysrörsarmatur LED", unit: "st", materialCost: 1200, laborCost: 450, category: "Belysning" },
  { id: "plafond", name: "Plafond", unit: "st", materialCost: 500, laborCost: 300, category: "Belysning" },
  { id: "spot", name: "Spotlight", unit: "st", materialCost: 350, laborCost: 300, category: "Belysning" },
  { id: "nodbelysning", name: "Nödbelysning", unit: "st", materialCost: 1500, laborCost: 500, category: "Belysning" },
  { id: "ledslinga", name: "LED-slinga", unit: "m", materialCost: 150, laborCost: 120, category: "Belysning" },

  // Uttag & Strömställare
  { id: "vagguttag", name: "Vägguttag enkel", unit: "st", materialCost: 120, laborCost: 280, category: "Uttag" },
  { id: "dubbeluttag", name: "Vägguttag dubbel", unit: "st", materialCost: 180, laborCost: 300, category: "Uttag" },
  { id: "jordatuttag", name: "Jordat uttag", unit: "st", materialCost: 150, laborCost: 290, category: "Uttag" },
  { id: "usb_uttag", name: "USB-uttag", unit: "st", materialCost: 250, laborCost: 300, category: "Uttag" },
  { id: "golvuttag", name: "Golvuttag", unit: "st", materialCost: 800, laborCost: 600, category: "Uttag" },
  { id: "stromstallare", name: "Strömställare enkel", unit: "st", materialCost: 100, laborCost: 250, category: "Strömställare" },
  { id: "korsomkopplare", name: "Korsomkopplare", unit: "st", materialCost: 180, laborCost: 300, category: "Strömställare" },
  { id: "dimmer", name: "Dimmer", unit: "st", materialCost: 400, laborCost: 320, category: "Strömställare" },
  { id: "rorelsedetektor", name: "Rörelsedetektor", unit: "st", materialCost: 600, laborCost: 350, category: "Strömställare" },

  // Kablar
  { id: "ekom3g15", name: "EKOM 3G1.5", unit: "m", materialCost: 15, laborCost: 25, category: "Kabel" },
  { id: "ekom3g25", name: "EKOM 3G2.5", unit: "m", materialCost: 22, laborCost: 28, category: "Kabel" },
  { id: "ekom5g25", name: "EKOM 5G2.5", unit: "m", materialCost: 35, laborCost: 32, category: "Kabel" },
  { id: "ekom5g6", name: "EKOM 5G6", unit: "m", materialCost: 75, laborCost: 45, category: "Kabel" },
  { id: "ekom5g10", name: "EKOM 5G10", unit: "m", materialCost: 120, laborCost: 55, category: "Kabel" },
  { id: "cat6", name: "Datakabel Cat6", unit: "m", materialCost: 12, laborCost: 20, category: "Kabel" },

  // Centraler & Apparater
  { id: "gruppcentral", name: "Gruppcentral", unit: "st", materialCost: 8000, laborCost: 4000, category: "Central" },
  { id: "undercentral", name: "Undercentral", unit: "st", materialCost: 15000, laborCost: 6000, category: "Central" },
  { id: "automatsäkring", name: "Automatsäkring", unit: "st", materialCost: 120, laborCost: 100, category: "Central" },
  { id: "jordfelsbrytare", name: "Jordfelsbrytare", unit: "st", materialCost: 800, laborCost: 200, category: "Central" },
  { id: "kontaktor", name: "Kontaktor", unit: "st", materialCost: 500, laborCost: 250, category: "Central" },

  // Förläggning
  { id: "kabelstege", name: "Kabelstege", unit: "m", materialCost: 250, laborCost: 180, category: "Förläggning" },
  { id: "kabelranna", name: "Kabelränna", unit: "m", materialCost: 150, laborCost: 120, category: "Förläggning" },
  { id: "installationsror", name: "Installationsrör", unit: "m", materialCost: 30, laborCost: 45, category: "Förläggning" },
  { id: "apparatdosa", name: "Apparatdosa", unit: "st", materialCost: 25, laborCost: 80, category: "Förläggning" },
  { id: "kopplingsbox", name: "Kopplingsbox", unit: "st", materialCost: 60, laborCost: 100, category: "Förläggning" },

  // Larm & Kommunikation
  { id: "brandvarnare", name: "Brandvarnare", unit: "st", materialCost: 300, laborCost: 250, category: "Larm" },
  { id: "brandlarm_detektor", name: "Brandlarmsdetektor", unit: "st", materialCost: 800, laborCost: 400, category: "Larm" },
  { id: "larmknapp", name: "Larmknapp", unit: "st", materialCost: 400, laborCost: 300, category: "Larm" },
  { id: "datauttag", name: "Datauttag RJ45", unit: "st", materialCost: 200, laborCost: 350, category: "Kommunikation" },
  { id: "teleuttag", name: "Teleuttag", unit: "st", materialCost: 150, laborCost: 300, category: "Kommunikation" },
];

export function findBestPriceMatch(componentName: string): PriceEntry | null {
  const normalized = componentName.toLowerCase();

  for (const entry of defaultPriceDatabase) {
    if (normalized.includes(entry.id) || normalized.includes(entry.name.toLowerCase())) {
      return entry;
    }
  }

  const keywords: Record<string, string> = {
    downlight: "downlight",
    "tak": "takarmatur",
    "vägg": "vaggarmatur",
    lysrör: "lysror",
    plafond: "plafond",
    spot: "spot",
    nöd: "nodbelysning",
    led: "ledslinga",
    "enkel.*uttag": "vagguttag",
    "dubbel.*uttag": "dubbeluttag",
    jordat: "jordatuttag",
    usb: "usb_uttag",
    golv: "golvuttag",
    "ström.*ställ": "stromstallare",
    kors: "korsomkopplare",
    dimm: "dimmer",
    rörelse: "rorelsedetektor",
    "3g1": "ekom3g15",
    "3g2": "ekom3g25",
    "5g2": "ekom5g25",
    "5g6": "ekom5g6",
    "5g10": "ekom5g10",
    cat6: "cat6",
    gruppcentral: "gruppcentral",
    undercentral: "undercentral",
    automat: "automatsäkring",
    jordfels: "jordfelsbrytare",
    kontaktor: "kontaktor",
    stege: "kabelstege",
    ränna: "kabelranna",
    "inst.*rör": "installationsror",
    "apparat.*dos": "apparatdosa",
    koppling: "kopplingsbox",
    brandvarn: "brandvarnare",
    brandlarm: "brandlarm_detektor",
    larmknapp: "larmknapp",
    "data.*uttag": "datauttag",
    rj45: "datauttag",
    "tele.*uttag": "teleuttag",
  };

  for (const [pattern, id] of Object.entries(keywords)) {
    try {
      if (new RegExp(pattern, "i").test(normalized)) {
        return defaultPriceDatabase.find((e) => e.id === id) || null;
      }
    } catch {
      if (normalized.includes(pattern)) {
        return defaultPriceDatabase.find((e) => e.id === id) || null;
      }
    }
  }

  return null;
}
