import { NextRequest, NextResponse } from "next/server";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const CHAT_MODEL = process.env.CHAT_MODEL || "minimax-m2.7:cloud";
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || "";

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const ollamaMessages = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role,
      content: msg.content,
    }));

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (OLLAMA_API_KEY) {
      headers["Authorization"] = `Bearer ${OLLAMA_API_KEY}`;
    }

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: ollamaMessages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Ollama chat error:", errorText);
      return NextResponse.json(
        { error: `Ollama API error: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      content: data.message?.content || "No response received.",
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to communicate with chat model", details: String(error) },
      { status: 500 }
    );
  }
}
