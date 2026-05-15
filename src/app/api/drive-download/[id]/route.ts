import { NextResponse } from "next/server";
import { resolveGoogleDriveAccessToken, getDriveFileMetadata } from "@/server/integrations/google-drive/service";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { accessToken } = await resolveGoogleDriveAccessToken();
    const fileId = params.id;

    const url = new URL(request.url);
    const filenameParam = url.searchParams.get("filename") ?? undefined;

    // Get metadata for content-type and filename
    const metadata = await getDriveFileMetadata(fileId);
    const filename = filenameParam ?? metadata?.name ?? `creative-${fileId}`;
    const mimeType = metadata?.mimeType ?? "application/octet-stream";

    const driveUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;
    const driveResponse = await fetch(driveUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!driveResponse.ok) {
      return new NextResponse("File not found in Drive", { status: driveResponse.status });
    }

    const safeFilename = encodeURIComponent(filename.replace(/[^\w\s.\-()]/g, "_"));

    return new NextResponse(driveResponse.body, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename*=UTF-8''${safeFilename}`,
        "Content-Length": driveResponse.headers.get("Content-Length") ?? "",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("Drive download error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
