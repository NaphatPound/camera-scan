import { NextRequest, NextResponse } from "next/server";

export const config = {
  api: { bodyParser: { sizeLimit: "20mb" } },
};

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const VISION_MODEL = process.env.VISION_MODEL || "kimi-k2.5:cloud";
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "Image (base64) is required" },
        { status: 400 }
      );
    }

    // Remove data URL prefix if present
    const base64Image = image.replace(/^data:image\/[a-zA-Z]+;base64,/, "");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (OLLAMA_API_KEY) {
      headers["Authorization"] = `Bearer ${OLLAMA_API_KEY}`;
    }

    const prompt = `You are an inventory scanning assistant. Analyze this image carefully.
Identify the main item(s) visible and count them precisely.
You MUST respond with ONLY a valid JSON object in this exact format, with no other text:
{"item": "item_name", "count": number}

For example: {"item": "bottle", "count": 5}

Be specific about the item name. Count every individual item visible in the image.`;

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
      console.error("Ollama vision error:", errorText);
      return NextResponse.json(
        { error: `Vision API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const content = data.message?.content || "";

    // Parse the JSON response from the vision model
    try {
      const result = JSON.parse(content);
      if (!result.item || typeof result.count !== "number") {
        throw new Error("Invalid format");
      }
      return NextResponse.json({
        item: result.item,
        count: result.count,
        raw: content,
      });
    } catch {
      // Try to extract JSON from the response text
      const jsonMatch = content.match(/\{[^}]*"item"\s*:\s*"[^"]*"\s*,\s*"count"\s*:\s*\d+[^}]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json({
          item: parsed.item,
          count: parsed.count,
          raw: content,
        });
      }

      console.error("Failed to parse vision response:", content);
      return NextResponse.json(
        {
          error: "Could not parse vision model response",
          raw: content,
        },
        { status: 422 }
      );
    }
  } catch (error) {
    console.error("Vision API error:", error);
    return NextResponse.json(
      { error: "Failed to communicate with vision model", details: String(error) },
      { status: 500 }
    );
  }
}
