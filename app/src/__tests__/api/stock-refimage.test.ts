/**
 * Tests for stock reference images (PATCH endpoint)
 */
import { promises as fs } from "fs";
import path from "path";

const STOCK_FILE = path.join(process.cwd(), "data", "stock.json");

describe("Stock Reference Images", () => {
  beforeEach(async () => {
    // Seed with a stock item
    const stockData = [
      { id: "item-1", name: "bottle", count: 5, addedAt: "2026-03-27T00:00:00Z" },
    ];
    await fs.mkdir(path.dirname(STOCK_FILE), { recursive: true });
    await fs.writeFile(STOCK_FILE, JSON.stringify(stockData));
  });

  afterEach(async () => {
    try { await fs.unlink(STOCK_FILE); } catch {}
  });

  afterAll(async () => {
    try { await fs.rmdir(path.dirname(STOCK_FILE)); } catch {}
  });

  it("should add a reference image via PATCH", async () => {
    const { PATCH } = await import("@/app/api/stock/route");
    const request = new Request("http://localhost:3000/api/stock", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "item-1", referenceImage: "data:image/png;base64,abc123" }),
    });

    const response = await PATCH(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items[0].referenceImages).toHaveLength(1);
    expect(data.items[0].referenceImages[0]).toBe("data:image/png;base64,abc123");
  });

  it("should append multiple reference images", async () => {
    const { PATCH } = await import("@/app/api/stock/route");

    // Add first image
    const req1 = new Request("http://localhost:3000/api/stock", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "item-1", referenceImage: "img1" }),
    });
    await PATCH(req1 as any);

    // Add second image
    const req2 = new Request("http://localhost:3000/api/stock", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "item-1", referenceImage: "img2" }),
    });
    const response = await PATCH(req2 as any);
    const data = await response.json();

    expect(data.items[0].referenceImages).toHaveLength(2);
    expect(data.items[0].referenceImages).toEqual(["img1", "img2"]);
  });

  it("should return 400 when id or image missing", async () => {
    const { PATCH } = await import("@/app/api/stock/route");
    const request = new Request("http://localhost:3000/api/stock", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "item-1" }),
    });

    const response = await PATCH(request as any);
    expect(response.status).toBe(400);
  });

  it("should return 404 for non-existent item", async () => {
    const { PATCH } = await import("@/app/api/stock/route");
    const request = new Request("http://localhost:3000/api/stock", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "nonexistent", referenceImage: "img" }),
    });

    const response = await PATCH(request as any);
    expect(response.status).toBe(404);
  });

  it("should save reference image when adding new stock via POST", async () => {
    const { POST } = await import("@/app/api/stock/route");
    const request = new Request("http://localhost:3000/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "apple",
        count: 3,
        imagePreview: "preview-img",
        addReferenceImage: "ref-img",
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    const apple = data.items.find((i: any) => i.name === "apple");
    expect(apple.referenceImages).toContain("ref-img");
  });
});
