/**
 * Tests for /api/vision endpoint
 */

describe("Vision API", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.OLLAMA_BASE_URL = "http://localhost:11434";
    process.env.VISION_MODEL = "gemma3:27b-cloud";
    process.env.OLLAMA_API_KEY = "test-key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should return 400 when image is missing", async () => {
    const { POST } = await import("@/app/api/vision/route");
    const request = new Request("http://localhost:3000/api/vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Image (base64) is required");
  });

  it("should parse valid JSON response from vision model", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: '{"item": "bottle", "count": 5}' },
      }),
    });

    const { POST } = await import("@/app/api/vision/route");
    const request = new Request("http://localhost:3000/api/vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "data:image/png;base64,iVBORw0KGgo=" }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.item).toBe("bottle");
    expect(data.count).toBe(5);
  });

  it("should strip data URL prefix from base64 image", async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: '{"item": "box", "count": 3}' },
      }),
    });
    global.fetch = mockFetch;

    const { POST } = await import("@/app/api/vision/route");
    const request = new Request("http://localhost:3000/api/vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "data:image/jpeg;base64,/9j/4AAQ" }),
    });

    await POST(request as any);

    const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(callBody.messages[0].images[0]).toBe("/9j/4AAQ");
  });

  it("should handle unparseable vision response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: { content: "I see some items in the image but cannot count them." },
      }),
    });

    const { POST } = await import("@/app/api/vision/route");
    const request = new Request("http://localhost:3000/api/vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "base64data" }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toContain("Could not parse");
  });

  it("should extract JSON from mixed text response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content:
            'I can see items in the photo. Here is my analysis: {"item": "apple", "count": 12} These are fresh apples.',
        },
      }),
    });

    const { POST } = await import("@/app/api/vision/route");
    const request = new Request("http://localhost:3000/api/vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "base64data" }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.item).toBe("apple");
    expect(data.count).toBe(12);
  });

  it("should handle vision API errors", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => "Service unavailable",
    });

    const { POST } = await import("@/app/api/vision/route");
    const request = new Request("http://localhost:3000/api/vision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "base64data" }),
    });

    const response = await POST(request as any);
    expect(response.status).toBe(503);
  });
});
