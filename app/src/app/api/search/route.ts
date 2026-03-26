import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const config = {
  api: { bodyParser: { sizeLimit: "20mb" } },
};

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const VISION_MODEL = process.env.VISION_MODEL || "kimi-k2.5:cloud";
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || "";
const STOCK_FILE = path.join(process.cwd(), "data", "stock.json");

interface StockItem {
  id: string;
  name: string;
  count: number;
  addedAt: string;
  imagePreview?: string;
  referenceImages?: string[];
}

async function readStock(): Promise<StockItem[]> {
  try {
    const data = await fs.readFile(STOCK_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "Image (base64) is required" },
        { status: 400 }
      );
    }

    const base64Image = image.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (OLLAMA_API_KEY) {
      headers["Authorization"] = `Bearer ${OLLAMA_API_KEY}`;
    }

    // Get current stock items for context
    const stockItems = await readStock();
    const stockNames = stockItems.map((i) => i.name).join(", ");

    const prompt = `You are an inventory search assistant. Analyze this image and identify what item it shows.

Current store inventory contains these items: [${stockNames}]

You MUST respond with ONLY a valid JSON object in this exact format:
{"identified_item": "item_name", "confidence": number_between_0_and_100, "description": "brief description of what you see"}

If the item matches something in the store inventory, use the EXACT same name from the inventory list.
If it doesn't match any inventory item, provide your best identification of the item.
Be specific and accurate.`;

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: "user",
            content: prompt,
            images: [base64Image],
          },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Vision search error:", errorText);
      return NextResponse.json(
        { error: `Vision API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.message?.content || "";

    let identified: { identified_item: string; confidence: number; description: string };

    try {
      identified = JSON.parse(content);
      if (!identified.identified_item) throw new Error("Missing identified_item");
    } catch {
      // Fallback: try regex
      const jsonMatch = content.match(/\{[^}]*"identified_item"\s*:\s*"[^"]*"[^}]*\}/);
      if (jsonMatch) {
        identified = JSON.parse(jsonMatch[0]);
      } else {
        return NextResponse.json(
          { error: "Could not identify item in image", raw: content },
          { status: 422 }
        );
      }
    }

    // Match against stock - fuzzy match by name similarity
    const searchTerm = identified.identified_item.toLowerCase();
    const results = stockItems
      .map((item) => {
        const itemName = item.name.toLowerCase();
        let score = 0;

        // Exact match
        if (itemName === searchTerm) {
          score = 100;
        }
        // Contains match
        else if (itemName.includes(searchTerm) || searchTerm.includes(itemName)) {
          score = 80;
        }
        // Word overlap match
        else {
          const searchWords = searchTerm.split(/\s+/);
          const itemWords = itemName.split(/\s+/);
          const overlap = searchWords.filter((w) =>
            itemWords.some((iw) => iw.includes(w) || w.includes(iw))
          );
          if (overlap.length > 0) {
            score = Math.round((overlap.length / Math.max(searchWords.length, itemWords.length)) * 70);
          }
        }

        return { item, matchScore: score };
      })
      .filter((r) => r.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({
      identified: identified.identified_item,
      confidence: identified.confidence || 0,
      description: identified.description || "",
      results: results.map((r) => ({
        item: r.item,
        matchScore: r.matchScore,
        matchedBy: identified.identified_item,
      })),
      totalMatches: results.length,
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Failed to search", details: String(error) },
      { status: 500 }
    );
  }
}
