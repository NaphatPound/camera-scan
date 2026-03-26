/**
 * Tests for /api/search endpoint (image search)
 */
import { promises as fs } from "fs";
import path from "path";

const STOCK_FILE = path.join(process.cwd(), "data", "stock.json");

describe("Search API", () => {
  const originalFetch = global.fetch;

  beforeEach(async () => {
    process.env.OLLAMA_BASE_URL = "http://localhost:11434";
    process.env.VISION_MODEL = "gemma3:27b-cloud";
    process.env.OLLAMA_API_KEY = "test-key";

    // Seed stock data for search tests
    const stockData = [
      { id: "1", name: "bottle", count: 10, addedAt: "2026-03-27T00:00:00Z", referenceImages: ["img1"] },
      { id: "2", name: "red apple", count: 5, addedAt: "2026-03-27T00:00:00Z" },
      { id: "3", name: "cardboard box", count: 3, addedAt: "2026-03-27T00:00:00Z" },
    ];
    await fs.mkdir(path.dirname(STOCK_FILE), { recursive: true });
    await fs.writeFile(STOCK_FILE, JSON.stringify(stockData));
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    try { await fs.unlink(STOCK_FILE); } catch {}
  });

  afterAll(async () => {
    try { await fs.rmdir(path.dirname(STOCK_FILE)); } catch {}
  });

  it("should return 400 when image is missing", async () => {
    const { POST } = await import("@/app/api/search/route");
    const request = new Request("http://localhost:3000/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("should return exact match when vision identifies existing item", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: '{"identified_item": "bottle", "confidence": 95, "description": "A plastic bottle"}',
        },
      }),
    });

    const { POST } = await import("@/app/api/search/route");
    const request = new Request("http://localhost:3000/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "base64data" }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.identified).toBe("bottle");
    expect(data.confidence).toBe(95);
    expect(data.totalMatches).toBe(1);
    expect(data.results[0].item.name).toBe("bottle");
    expect(data.results[0].matchScore).toBe(100);
  });

  it("should return partial match for similar items", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: '{"identified_item": "apple", "confidence": 80, "description": "A red apple"}',
        },
      }),
    });

    const { POST } = await import("@/app/api/search/route");
    const request = new Request("http://localhost:3000/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "base64data" }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.totalMatches).toBeGreaterThan(0);
    // "apple" should match "red apple" via contains
    const appleMatch = data.results.find((r: any) => r.item.name === "red apple");
    expect(appleMatch).toBeDefined();
    expect(appleMatch.matchScore).toBeGreaterThan(0);
  });

  it("should return empty results for unrecognized item", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: {
          content: '{"identified_item": "laptop", "confidence": 90, "description": "A silver laptop"}',
        },
      }),
    });

    const { POST } = await import("@/app/api/search/route");
    const request = new Request("http://localhost:3000/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "base64data" }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.identified).toBe("laptop");
    expect(data.totalMatches).toBe(0);
    expect(data.results).toEqual([]);
  });

  it("should handle vision API failure", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Server error",
    });

    const { POST } = await import("@/app/api/search/route");
    const request = new Request("http://localhost:3000/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: "base64data" }),
    });

    const response = await POST(request as any);
    expect(response.status).toBe(500);
  });
});
