import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
  try {
    const { image, prefix } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: "Image (base64) is required" },
        { status: 400 }
      );
    }

    await ensureUploadDir();

    // Extract base64 data and mime type
    const match = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json(
        { error: "Invalid base64 image format" },
        { status: 400 }
      );
    }

    const ext = match[1] === "jpeg" ? "jpg" : match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, "base64");

    // Generate filename: prefix_timestamp_random.ext
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const filename = `${prefix || "img"}_${timestamp}_${random}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    await fs.writeFile(filePath, buffer);

    // Return the public URL path
    const url = `/uploads/${filename}`;

    return NextResponse.json({ url, filename });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image", details: String(error) },
      { status: 500 }
    );
  }
}
