export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  image?: string; // base64 encoded image
  timestamp: Date;
}

export interface StockItem {
  id: string;
  name: string;
  count: number;
  addedAt: Date;
  imagePreview?: string;
  referenceImages?: string[]; // multiple reference images for search
}

export interface SearchResult {
  item: StockItem;
  matchScore: number; // 0-100 similarity
  matchedBy: string; // what the AI identified in the search image
}

export interface VisionResult {
  item: string;
  count: number;
  confidence?: number;
}

export interface ApprovalData {
  visionResult: VisionResult;
  imagePreview: string;
}

export interface RecipeIngredient {
  name: string;
  amount: string;
  inStock: boolean;
  stockCount?: number;
}

export interface RecipeResult {
  dishName: string;
  ingredients: RecipeIngredient[];
  instructions: string;
  imageUrl?: string;
}
