import { NextResponse } from "next/server";
import { resolveGoogleDriveAccessToken } from "@/server/integrations/google-drive/service";
import { db } from "@/server/db/client";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const driveFileId = params.id;

    // Check if the preview is already in the database
    const creative = await db.creative.findFirst({
      where: { driveFileId },
      select: { previewData: true }
    });

    if (creative?.previewData) {
      // Return the cached base64 image from DB
      const imageBuffer = Buffer.from(creative.previewData, "base64");
      return new NextResponse(imageBuffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable"
        }
      });
    }

    // Not in DB, fetch from Google Drive
    const { accessToken } = await resolveGoogleDriveAccessToken();
    const metadataUrl = `https://www.googleapis.com/drive/v3/files/${driveFileId}?fields=thumbnailLink`;
    
    const metadataResponse = await fetch(metadataUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!metadataResponse.ok) {
      console.warn(`Drive metadata fetch failed for id ${driveFileId}: ${metadataResponse.status}`);
      return new NextResponse("Not found", { status: 404 });
    }

    const data = (await metadataResponse.json()) as { thumbnailLink?: string };
    
    if (!data.thumbnailLink) {
      return new NextResponse("Thumbnail not available", { status: 404 });
    }

    // The thumbnailLink usually ends in =s220. We can replace it with =s800 for better quality.
    let targetUrl = data.thumbnailLink;
    if (targetUrl.includes("=s220")) {
      targetUrl = targetUrl.replace("=s220", "=s800");
    }

    // Fetch the actual image data from Google's thumbnail link
    const imageResponse = await fetch(targetUrl);
    
    if (!imageResponse.ok) {
      return new NextResponse("Failed to download thumbnail", { status: 500 });
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");

    // Save to database asynchronously (don't block the response)
    // Wait, updating without await in Next.js might be canceled if the process isn't running long enough,
    // but typically it finishes. We'll await it to ensure it saves correctly since it's an API route.
    await db.creative.updateMany({
      where: { driveFileId },
      data: { previewData: base64Data }
    });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch (error) {
    console.error("Error fetching drive preview:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
