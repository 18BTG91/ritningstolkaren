export interface ExtractedComponent {
  name: string;
  symbol: string;
  quantity: number;
  unit: string;
  location: string;
  category: string;
}

export interface CableItem {
  type: string;
  designation: string;
  lengthMeters: number;
  from: string;
  to: string;
  system: string;
}

export interface CostLineItem {
  name: string;
  symbol: string;
  quantity: number;
  unit: string;
  location: string;
  category: string;
  materialCost: number;
  laborCost: number;
  totalCost: number;
  matched: boolean;
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
