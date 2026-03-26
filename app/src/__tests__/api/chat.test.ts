/**
 * Tests for /api/chat endpoint
 */

describe("Chat API", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.OLLAMA_BASE_URL = "http://localhost:11434";
    process.env.CHAT_MODEL = "minimax-m2.7:cloud";
    process.env.OLLAMA_API_KEY = "test-key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should return 400 when messages array is missing", async () => {
    const { POST } = await import("@/app/api/chat/route");
    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Messages array is required");
  });

  it("should return 400 when messages is not an array", async () => {
    const { POST } = await import("@/app/api/chat/route");
    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: "not-array" }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Messages array is required");
  });

  it("should call Ollama API with correct parameters", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: { content: "Hello from AI" } }),
    });
    global.fetch = mockFetch;

    const { POST } = await import("@/app/api/chat/route");
    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(data.content).toBe("Hello from AI");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:11434/api/chat",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-key",
        }),
      })
    );
  });

  it("should handle Ollama API errors", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    });

    const { POST } = await import("@/app/api/chat/route");
    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const response = await POST(request as any);
    expect(response.status).toBe(500);
  });

  it("should handle network errors gracefully", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

    const { POST } = await import("@/app/api/chat/route");
    const request = new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "Hello" }],
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain("Failed to communicate");
  });
});
