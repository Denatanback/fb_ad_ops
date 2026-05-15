import { NextResponse } from "next/server";
import { resolveGoogleDriveAccessToken } from "@/server/integrations/google-drive/service";

// ── Minimal ZIP builder (STORE method, no compression) ─────────────────────

function makeCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16LE(buf: Buffer, offset: number, value: number) {
  buf.writeUInt16LE(value, offset);
}

function writeUint32LE(buf: Buffer, offset: number, value: number) {
  buf.writeUInt32LE(value, offset);
}

function buildZip(files: Array<{ name: string; data: Buffer }>): Buffer {
  const encoder = new TextEncoder();
  const parts: Buffer[] = [];
  const centralDir: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = Buffer.from(encoder.encode(file.name));
    const data = file.data;
    const crc = crc32(new Uint8Array(data));
    const size = data.length;

    // Local file header
    const localHeader = Buffer.allocUnsafe(30 + nameBytes.length);
    writeUint32LE(localHeader, 0, 0x04034b50); // signature
    writeUint16LE(localHeader, 4, 20);          // version needed
    writeUint16LE(localHeader, 6, 0);           // flags
    writeUint16LE(localHeader, 8, 0);           // STORE compression
    writeUint16LE(localHeader, 10, 0);          // mod time
    writeUint16LE(localHeader, 12, 0);          // mod date
    writeUint32LE(localHeader, 14, crc);        // crc32
    writeUint32LE(localHeader, 18, size);       // compressed size
    writeUint32LE(localHeader, 22, size);       // uncompressed size
    writeUint16LE(localHeader, 26, nameBytes.length); // filename len
    writeUint16LE(localHeader, 28, 0);          // extra field len
    nameBytes.copy(localHeader, 30);

    parts.push(localHeader);
    parts.push(data);

    // Central directory entry
    const cdEntry = Buffer.allocUnsafe(46 + nameBytes.length);
    writeUint32LE(cdEntry, 0, 0x02014b50);      // signature
    writeUint16LE(cdEntry, 4, 20);              // version made by
    writeUint16LE(cdEntry, 6, 20);              // version needed
    writeUint16LE(cdEntry, 8, 0);               // flags
    writeUint16LE(cdEntry, 10, 0);              // STORE
    writeUint16LE(cdEntry, 12, 0);              // mod time
    writeUint16LE(cdEntry, 14, 0);              // mod date
    writeUint32LE(cdEntry, 16, crc);            // crc32
    writeUint32LE(cdEntry, 20, size);           // compressed size
    writeUint32LE(cdEntry, 24, size);           // uncompressed size
    writeUint16LE(cdEntry, 28, nameBytes.length); // filename len
    writeUint16LE(cdEntry, 30, 0);              // extra field len
    writeUint16LE(cdEntry, 32, 0);              // file comment len
    writeUint16LE(cdEntry, 34, 0);              // disk number start
    writeUint16LE(cdEntry, 36, 0);              // internal attrs
    writeUint32LE(cdEntry, 38, 0);              // external attrs
    writeUint32LE(cdEntry, 42, offset);         // relative offset of local header
    nameBytes.copy(cdEntry, 46);

    centralDir.push(cdEntry);
    offset += localHeader.length + data.length;
  }

  const cdStart = offset;
  const cdBuffer = Buffer.concat(centralDir);
  const cdSize = cdBuffer.length;

  // End of central directory record
  const eocd = Buffer.allocUnsafe(22);
  writeUint32LE(eocd, 0, 0x06054b50);           // signature
  writeUint16LE(eocd, 4, 0);                    // disk number
  writeUint16LE(eocd, 6, 0);                    // disk with CD start
  writeUint16LE(eocd, 8, files.length);          // entries on disk
  writeUint16LE(eocd, 10, files.length);         // total entries
  writeUint32LE(eocd, 12, cdSize);              // CD size
  writeUint32LE(eocd, 16, cdStart);             // CD offset
  writeUint16LE(eocd, 20, 0);                   // comment length

  return Buffer.concat([...parts, cdBuffer, eocd]);
}

// ── Route handler ───────────────────────────────────────────────────────────

type ZipRequestBody = {
  files: Array<{ id: string; name: string }>;
  archiveName?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ZipRequestBody;

    if (!Array.isArray(body.files) || body.files.length === 0) {
      return new NextResponse("No files specified", { status: 400 });
    }

    const { accessToken } = await resolveGoogleDriveAccessToken();

    const downloadedFiles: Array<{ name: string; data: Buffer }> = [];

    for (const file of body.files) {
      try {
        const driveUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`;
        const res = await fetch(driveUrl, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });

        if (!res.ok) continue;

        const arrayBuffer = await res.arrayBuffer();
        downloadedFiles.push({ name: file.name || `file-${file.id}`, data: Buffer.from(arrayBuffer) });
      } catch {
        // Skip individual failures
      }
    }

    if (downloadedFiles.length === 0) {
      return new NextResponse("No files could be downloaded", { status: 502 });
    }

    const zipBuffer = buildZip(downloadedFiles);
    const archiveName = (body.archiveName ?? "creatives").replace(/[^\w\s.\-()]/g, "_") + ".zip";

    return new NextResponse(zipBuffer.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(archiveName)}`,
        "Content-Length": String(zipBuffer.length),
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("ZIP download error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
