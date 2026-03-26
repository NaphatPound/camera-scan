import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const VISION_MODEL = process.env.VISION_MODEL || "kimi-k2.5:cloud";
const CHAT_MODEL = process.env.CHAT_MODEL || "minimax-m2.7:cloud";
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || "";
const STOCK_FILE = path.join(process.cwd(), "data", "stock.json");

interface StockItem {
  id: string;
  name: string;
  count: number;
}

async function readStock(): Promise<StockItem[]> {
  try {
    const data = await fs.readFile(STOCK_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (OLLAMA_API_KEY) h["Authorization"] = `Bearer ${OLLAMA_API_KEY}`;
  return h;
}

// POST with image: identify food/ingredients from image
export async function POST(request: NextRequest) {
  try {
    const { image, query } = await request.json();

    const stockItems = await readStock();
    const stockList = stockItems.map((i) => `${i.name} (${i.count})`).join(", ");

    // If image provided: use vision model to identify food
    if (image) {
      const base64Image = image.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

      const visionPrompt = `You are a cooking assistant. Analyze this image carefully.

If you see a DISH/FOOD: Identify the dish name and list ALL ingredients needed to cook it with approximate amounts.
If you see RAW INGREDIENTS: Identify each ingredient and suggest dishes that can be made with them.

Current store inventory: [${stockList || "empty"}]

You MUST respond with ONLY valid JSON in this exact format:
{
  "type": "dish" or "ingredients",
  "dishName": "name of the dish or suggested dish",
  "description": "brief description of what you see",
  "ingredients": [
    {"name": "ingredient name", "amount": "quantity needed"}
  ],
  "instructions": "brief cooking steps (3-5 steps)"
}`;

      const visionRes = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          model: VISION_MODEL,
          messages: [{ role: "user", content: visionPrompt, images: [base64Image] }],
          stream: false,
        }),
      });

      if (!visionRes.ok) {
        const err = await visionRes.text();
        return NextResponse.json({ error: `Vision error: ${visionRes.status}`, details: err }, { status: visionRes.status });
      }

      const visionData = await visionRes.json();
      const content = visionData.message?.content || "";

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          try { parsed = JSON.parse(match[0]); } catch { /* fall through */ }
        }
      }

      if (!parsed || !parsed.ingredients) {
        return NextResponse.json({ error: "Could not analyze image", raw: content }, { status: 422 });
      }

      // Match ingredients against stock
      const ingredients = parsed.ingredients.map((ing: { name: string; amount: string }) => {
        const ingName = ing.name.toLowerCase();
        const stockMatch = stockItems.find((s) => {
          const sName = s.name.toLowerCase();
          return sName.includes(ingName) || ingName.includes(sName) ||
            sName.split(/\s+/).some((w: string) => ingName.includes(w)) ||
            ingName.split(/\s+/).some((w: string) => sName.includes(w));
        });
        return {
          name: ing.name,
          amount: ing.amount,
          inStock: !!stockMatch,
          stockCount: stockMatch?.count || 0,
        };
      });

      return NextResponse.json({
        dishName: parsed.dishName || "Unknown dish",
        type: parsed.type || "dish",
        description: parsed.description || "",
        ingredients,
        instructions: parsed.instructions || "",
        inStockCount: ingredients.filter((i: { inStock: boolean }) => i.inStock).length,
        totalIngredients: ingredients.length,
      });
    }

    // Text query: ask AI about recipe/cooking
    if (query) {
      const chatPrompt = `You are a helpful cooking assistant. The user is asking about food/recipes.

Current store inventory: [${stockList || "empty"}]

When suggesting recipes, check which ingredients are available in the store inventory.
Mark which ingredients are in stock and which are missing.
Be concise and helpful. Answer in the same language the user uses.`;

      const chatRes = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          model: CHAT_MODEL,
          messages: [
            { role: "system", content: chatPrompt },
            { role: "user", content: query },
          ],
          stream: false,
        }),
      });

      if (!chatRes.ok) {
        const err = await chatRes.text();
        return NextResponse.json({ error: `Chat error: ${chatRes.status}`, details: err }, { status: chatRes.status });
      }

      const chatData = await chatRes.json();
      return NextResponse.json({ reply: chatData.message?.content || "No response." });
    }

    return NextResponse.json({ error: "Image or query is required" }, { status: 400 });
  } catch (error) {
    console.error("Recipe API error:", error);
    return NextResponse.json({ error: "Failed to process", details: String(error) }, { status: 500 });
  }
}
