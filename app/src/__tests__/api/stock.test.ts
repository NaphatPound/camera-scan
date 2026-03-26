/**
 * Tests for /api/stock endpoint
 */
import { promises as fs } from "fs";
import path from "path";

const STOCK_FILE = path.join(process.cwd(), "data", "stock.json");

describe("Stock API", () => {
  beforeEach(async () => {
    // Clean up test data
    try {
      await fs.unlink(STOCK_FILE);
    } catch {
      // File may not exist
    }
  });

  afterAll(async () => {
    try {
      await fs.unlink(STOCK_FILE);
      await fs.rmdir(path.dirname(STOCK_FILE));
    } catch {
      // Cleanup
    }
  });

  it("should return empty items array when no stock exists", async () => {
    const { GET } = await import("@/app/api/stock/route");
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toEqual([]);
  });

  it("should add a new stock item", async () => {
    const { POST } = await import("@/app/api/stock/route");
    const request = new Request("http://localhost:3000/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Bottle", count: 5 }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.items).toHaveLength(1);
    expect(data.items[0].name).toBe("bottle");
    expect(data.items[0].count).toBe(5);
  });

  it("should merge duplicate items by incrementing count", async () => {
    const { POST } = await import("@/app/api/stock/route");

    // Add first batch
    const request1 = new Request("http://localhost:3000/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Apple", count: 3 }),
    });
    await POST(request1 as any);

    // Add second batch of same item
    const request2 = new Request("http://localhost:3000/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "apple", count: 7 }),
    });
    const response = await POST(request2 as any);
    const data = await response.json();

    expect(data.items).toHaveLength(1);
    expect(data.items[0].count).toBe(10);
  });

  it("should return 400 for invalid stock data", async () => {
    const { POST } = await import("@/app/api/stock/route");

    const request = new Request("http://localhost:3000/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "", count: 0 }),
    });

    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("should delete a stock item", async () => {
    const { POST, DELETE } = await import("@/app/api/stock/route");

    // Add an item first
    const addRequest = new Request("http://localhost:3000/api/stock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Box", count: 2 }),
    });
    const addResponse = await POST(addRequest as any);
    const addData = await addResponse.json();
    const itemId = addData.items[0].id;

    // Delete it
    const deleteRequest = new Request("http://localhost:3000/api/stock", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: itemId }),
    });
    const response = await DELETE(deleteRequest as any);
    const data = await response.json();

    expect(data.items).toHaveLength(0);
  });
});
