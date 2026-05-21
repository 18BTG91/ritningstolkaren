export interface PriceEntry {
  id: string;
  eNumber: string;
  name: string;
  unit: string;
  materialCost: number;
  laborCost: number;
  category: string;
}

export const defaultPriceDatabase: PriceEntry[] = [
  // Belysning
  { id: "downlight", eNumber: "58 440 48", name: "Downlight LED infälld", unit: "st", materialCost: 450, laborCost: 350, category: "Belysning" },
  { id: "takarmatur", eNumber: "58 310 20", name: "Takarmatur", unit: "st", materialCost: 800, laborCost: 400, category: "Belysning" },
  { id: "vaggarmatur", eNumber: "58 320 10", name: "Väggarmatur", unit: "st", materialCost: 600, laborCost: 350, category: "Belysning" },
  { id: "lysror", eNumber: "58 200 15", name: "Lysrörsarmatur LED", unit: "st", materialCost: 1200, laborCost: 450, category: "Belysning" },
  { id: "plafond", eNumber: "58 350 30", name: "Plafond", unit: "st", materialCost: 500, laborCost: 300, category: "Belysning" },
  { id: "spot", eNumber: "58 440 25", name: "Spotlight", unit: "st", materialCost: 350, laborCost: 300, category: "Belysning" },
  { id: "nodbelysning", eNumber: "49 810 05", name: "Nödbelysning", unit: "st", materialCost: 1500, laborCost: 500, category: "Belysning" },
  { id: "ledslinga", eNumber: "58 500 10", name: "LED-slinga", unit: "m", materialCost: 150, laborCost: 120, category: "Belysning" },

  // Uttag & Strömställare
  { id: "vagguttag", eNumber: "18 301 00", name: "Vägguttag enkel", unit: "st", materialCost: 120, laborCost: 280, category: "Uttag" },
  { id: "dubbeluttag", eNumber: "18 304 00", name: "Vägguttag dubbel", unit: "st", materialCost: 180, laborCost: 300, category: "Uttag" },
  { id: "jordatuttag", eNumber: "18 303 00", name: "Jordat uttag", unit: "st", materialCost: 150, laborCost: 290, category: "Uttag" },
  { id: "usb_uttag", eNumber: "18 360 00", name: "USB-uttag", unit: "st", materialCost: 250, laborCost: 300, category: "Uttag" },
  { id: "golvuttag", eNumber: "18 900 10", name: "Golvuttag", unit: "st", materialCost: 800, laborCost: 600, category: "Uttag" },
  { id: "stromstallare", eNumber: "18 201 00", name: "Strömställare enkel", unit: "st", materialCost: 100, laborCost: 250, category: "Strömställare" },
  { id: "korsomkopplare", eNumber: "18 206 00", name: "Korsomkopplare", unit: "st", materialCost: 180, laborCost: 300, category: "Strömställare" },
  { id: "dimmer", eNumber: "18 215 00", name: "Dimmer", unit: "st", materialCost: 400, laborCost: 320, category: "Strömställare" },
  { id: "rorelsedetektor", eNumber: "49 420 10", name: "Rörelsedetektor", unit: "st", materialCost: 600, laborCost: 350, category: "Strömställare" },

  // Kablar (EQLQ — halogenfri installationskabel)
  { id: "eqlq3g15", eNumber: "41 410 15", name: "EQLQ 3G1.5", unit: "m", materialCost: 18, laborCost: 25, category: "Kabel" },
  { id: "eqlq3g25", eNumber: "41 410 25", name: "EQLQ 3G2.5", unit: "m", materialCost: 26, laborCost: 28, category: "Kabel" },
  { id: "eqlq5g15", eNumber: "41 412 15", name: "EQLQ 5G1.5", unit: "m", materialCost: 28, laborCost: 30, category: "Kabel" },
  { id: "eqlq5g25", eNumber: "41 412 25", name: "EQLQ 5G2.5", unit: "m", materialCost: 42, laborCost: 32, category: "Kabel" },
  { id: "eqlq5g6", eNumber: "41 412 60", name: "EQLQ 5G6", unit: "m", materialCost: 85, laborCost: 45, category: "Kabel" },
  { id: "eqlq5g10", eNumber: "41 413 10", name: "EQLQ 5G10", unit: "m", materialCost: 135, laborCost: 55, category: "Kabel" },
  { id: "eqlq5g16", eNumber: "41 413 16", name: "EQLQ 5G16", unit: "m", materialCost: 195, laborCost: 65, category: "Kabel" },
  { id: "eqlq7g15", eNumber: "41 414 15", name: "EQLQ 7G1.5", unit: "m", materialCost: 38, laborCost: 35, category: "Kabel" },
  { id: "cat6", eNumber: "46 410 06", name: "Datakabel Cat6", unit: "m", materialCost: 12, laborCost: 20, category: "Kabel" },
  { id: "fq2x15", eNumber: "41 210 15", name: "FQ 2x1.5", unit: "m", materialCost: 12, laborCost: 22, category: "Kabel" },
  { id: "ekkj5g25", eNumber: "41 310 25", name: "EKKJ 5G2.5", unit: "m", materialCost: 55, laborCost: 35, category: "Kabel" },

  // Centraler & Apparater
  { id: "gruppcentral", eNumber: "43 510 12", name: "Gruppcentral", unit: "st", materialCost: 8000, laborCost: 4000, category: "Central" },
  { id: "undercentral", eNumber: "43 520 24", name: "Undercentral", unit: "st", materialCost: 15000, laborCost: 6000, category: "Central" },
  { id: "automatsäkring", eNumber: "44 110 16", name: "Automatsäkring", unit: "st", materialCost: 120, laborCost: 100, category: "Central" },
  { id: "jordfelsbrytare", eNumber: "44 210 30", name: "Jordfelsbrytare", unit: "st", materialCost: 800, laborCost: 200, category: "Central" },
  { id: "kontaktor", eNumber: "44 310 25", name: "Kontaktor", unit: "st", materialCost: 500, laborCost: 250, category: "Central" },

  // Förläggning
  { id: "kabelstege", eNumber: "47 110 30", name: "Kabelstege", unit: "m", materialCost: 250, laborCost: 180, category: "Förläggning" },
  { id: "kabelranna", eNumber: "47 210 20", name: "Kabelränna", unit: "m", materialCost: 150, laborCost: 120, category: "Förläggning" },
  { id: "installationsror", eNumber: "47 310 16", name: "Installationsrör", unit: "m", materialCost: 30, laborCost: 45, category: "Förläggning" },
  { id: "apparatdosa", eNumber: "47 410 01", name: "Apparatdosa", unit: "st", materialCost: 25, laborCost: 80, category: "Förläggning" },
  { id: "kopplingsbox", eNumber: "47 420 10", name: "Kopplingsbox", unit: "st", materialCost: 60, laborCost: 100, category: "Förläggning" },

  // Larm & Kommunikation
  { id: "brandvarnare", eNumber: "49 110 05", name: "Brandvarnare", unit: "st", materialCost: 300, laborCost: 250, category: "Larm" },
  { id: "brandlarm_detektor", eNumber: "49 120 10", name: "Brandlarmsdetektor", unit: "st", materialCost: 800, laborCost: 400, category: "Larm" },
  { id: "larmknapp", eNumber: "49 130 05", name: "Larmknapp", unit: "st", materialCost: 400, laborCost: 300, category: "Larm" },
  { id: "datauttag", eNumber: "46 310 06", name: "Datauttag RJ45", unit: "st", materialCost: 200, laborCost: 350, category: "Kommunikation" },
  { id: "teleuttag", eNumber: "46 320 04", name: "Teleuttag", unit: "st", materialCost: 150, laborCost: 300, category: "Kommunikation" },
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
    "eqlq.*3g1": "eqlq3g15",
    "eqlq.*3g2": "eqlq3g25",
    "eqlq.*5g1": "eqlq5g15",
    "eqlq.*5g2": "eqlq5g25",
    "eqlq.*5g6": "eqlq5g6",
    "eqlq.*5g10": "eqlq5g10",
    "eqlq.*5g16": "eqlq5g16",
    "eqlq.*7g1": "eqlq7g15",
    "3g1\\.5": "eqlq3g15",
    "3g2\\.5": "eqlq3g25",
    "5g2\\.5": "eqlq5g25",
    "5g6": "eqlq5g6",
    "5g10": "eqlq5g10",
    "5g16": "eqlq5g16",
    "fq.*2x1": "fq2x15",
    "ekkj": "ekkj5g25",
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
