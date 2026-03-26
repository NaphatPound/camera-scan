import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const CHAT_MODEL = process.env.CHAT_MODEL || "minimax-m2.7:cloud";
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
    const { query, history } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const stockItems = await readStock();
    const stockList = stockItems.length > 0
      ? stockItems.map((i) => `- ${i.name} (quantity: ${i.count})`).join("\n")
      : "No items in stock yet.";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (OLLAMA_API_KEY) {
      headers["Authorization"] = `Bearer ${OLLAMA_API_KEY}`;
    }

    const systemPrompt = `You are a store inventory search assistant. You help customers find products in the store.

Current store inventory:
${stockList}

Instructions:
- When the user asks about a product, check if it exists in the inventory above.
- If found, tell them the item name, quantity available, and be helpful.
- If not found, tell them it's not currently in stock.
- Be friendly, concise, and helpful.
- You can also answer general questions about the store inventory.
- If the user asks to search or find something, always check the inventory list.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history || []),
      { role: "user", content: query },
    ];

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Chat API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.message?.content || "No response.";

    // Also do direct text matching against stock
    const searchTerm = query.toLowerCase();
    const matches = stockItems
      .map((item) => {
        const itemName = item.name.toLowerCase();
        let score = 0;
        if (itemName === searchTerm) score = 100;
        else if (itemName.includes(searchTerm) || searchTerm.includes(itemName)) score = 80;
        else {
          const words = searchTerm.split(/\s+/);
          const itemWords = itemName.split(/\s+/);
          const overlap = words.filter((w) =>
            itemWords.some((iw) => iw.includes(w) || w.includes(iw))
          );
          if (overlap.length > 0) {
            score = Math.round((overlap.length / Math.max(words.length, itemWords.length)) * 70);
          }
        }
        return { item, matchScore: score, matchedBy: query };
      })
      .filter((r) => r.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({
      reply: content,
      results: matches,
      totalMatches: matches.length,
    });
  } catch (error) {
    console.error("Text search error:", error);
    return NextResponse.json(
      { error: "Search failed", details: String(error) },
      { status: 500 }
    );
  }
}
