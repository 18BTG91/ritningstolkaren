export interface BoundingBox {
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ExtractedComponent {
  name: string;
  symbol: string;
  quantity: number;
  unit: string;
  location: string;
  category: string;
  bbox?: BoundingBox;
}

export interface CableItem {
  type: string;
  designation: string;
  lengthMeters: number;
  from: string;
  to: string;
  system: string;
  bbox?: BoundingBox;
  path?: { page: number; points: { x: number; y: number }[] };
}

export interface CostLineItem {
  name: string;
  symbol: string;
  eNumber: string;
  quantity: number;
  unit: string;
  location: string;
  category: string;
  materialCost: number;
  laborCost: number;
  totalCost: number;
  matched: boolean;
  bbox?: BoundingBox;
}

export interface AnalysisResult {
  drawingInfo: {
    title: string;
    drawingNumber: string;
    scale: string;
    date: string;
    designer: string;
    description: string;
  };
  components: ExtractedComponent[];
  cables: CableItem[];
  costItems: CostLineItem[];
  totalMaterial: number;
  totalLabor: number;
  grandTotal: number;
  summary: string;
}

export interface AnalysisState {
  status: "idle" | "uploading" | "analyzing" | "done" | "error";
  progress: string;
  result: AnalysisResult | null;
  error: string | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface AnalysisFeedback {
  id: string;
  drawingId: string;
  projectId: string;
  createdAt: string;
  originalResult: AnalysisResult;
  correctedResult: AnalysisResult;
  corrections: string[]; // human-readable list of what was changed
  drawingType: string; // e.g. "planritning", "elschema", "fasad"
}
