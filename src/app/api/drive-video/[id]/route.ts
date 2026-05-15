import { NextResponse } from "next/server";
import { resolveGoogleDriveAccessToken } from "@/server/integrations/google-drive/service";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { accessToken } = await resolveGoogleDriveAccessToken();
    const fileId = params.id;

    if (!accessToken) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const range = request.headers.get("range");
    const headers: Record<string, string> = {
      Authorization: `Bearer ${accessToken}`,
    };
    if (range) {
      headers.Range = range;
    }

    const driveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const driveResponse = await fetch(driveUrl, { headers });

    if (!driveResponse.ok) {
      return new NextResponse("Drive stream error", { status: driveResponse.status });
    }

    // Forward the Drive streaming response to the browser natively
    return new NextResponse(driveResponse.body, {
      status: driveResponse.status, // Often 206 Partial Content
      headers: {
        "Content-Type": driveResponse.headers.get("Content-Type") || "video/mp4",
        "Content-Length": driveResponse.headers.get("Content-Length") || "",
        "Content-Range": driveResponse.headers.get("Content-Range") || "",
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=604800, immutable"
      }
    });

  } catch (error) {
    console.error("Error connecting to drive stream proxy:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
