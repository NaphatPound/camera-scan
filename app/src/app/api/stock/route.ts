import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const STOCK_FILE = path.join(process.cwd(), "data", "stock.json");

interface StockItem {
  id: string;
  name: string;
  count: number;
  addedAt: string;
  imagePreview?: string;
  referenceImages?: string[];
}

async function ensureDataDir() {
  const dir = path.dirname(STOCK_FILE);
  await fs.mkdir(dir, { recursive: true });
}

async function readStock(): Promise<StockItem[]> {
  try {
    const data = await fs.readFile(STOCK_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeStock(items: StockItem[]) {
  await ensureDataDir();
  await fs.writeFile(STOCK_FILE, JSON.stringify(items, null, 2));
}

export async function GET() {
  const items = await readStock();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  try {
    const { name, count, imagePreview, addReferenceImage } = await request.json();

    if (!name || typeof count !== "number" || count < 1) {
      return NextResponse.json(
        { error: "Valid name and count are required" },
        { status: 400 }
      );
    }

    const items = await readStock();

    // Check if item already exists and update count
    const existingIndex = items.findIndex(
      (i) => i.name.toLowerCase() === name.toLowerCase()
    );

    if (existingIndex >= 0) {
      items[existingIndex].count += count;
      items[existingIndex].addedAt = new Date().toISOString();
      if (imagePreview) {
        items[existingIndex].imagePreview = imagePreview;
      }
      // Add reference image if provided
      if (addReferenceImage) {
        if (!items[existingIndex].referenceImages) {
          items[existingIndex].referenceImages = [];
        }
        items[existingIndex].referenceImages!.push(addReferenceImage);
      }
    } else {
      const refImages: string[] = [];
      if (addReferenceImage) refImages.push(addReferenceImage);
      else if (imagePreview) refImages.push(imagePreview);

      items.push({
        id: crypto.randomUUID(),
        name: name.toLowerCase(),
        count,
        addedAt: new Date().toISOString(),
        imagePreview,
        referenceImages: refImages.length > 0 ? refImages : undefined,
      });
    }

    await writeStock(items);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Stock POST error:", error);
    return NextResponse.json(
      { error: "Failed to update stock" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, referenceImage } = await request.json();

    if (!id || !referenceImage) {
      return NextResponse.json(
        { error: "Item id and referenceImage are required" },
        { status: 400 }
      );
    }

    const items = await readStock();
    const item = items.find((i) => i.id === id);

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (!item.referenceImages) {
      item.referenceImages = [];
    }
    item.referenceImages.push(referenceImage);

    await writeStock(items);
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Stock PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update stock item" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    const items = await readStock();
    const filtered = items.filter((i) => i.id !== id);
    await writeStock(filtered);
    return NextResponse.json({ items: filtered });
  } catch (error) {
    console.error("Stock DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete stock item" },
      { status: 500 }
    );
  }
}
