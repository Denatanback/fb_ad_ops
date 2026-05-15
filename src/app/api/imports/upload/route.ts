import { NextResponse } from "next/server";
import { authenticateInternalImportRequest } from "@/server/imports/auth";
import {
  acceptCsvImportUpload,
  DuplicateImportUploadError,
  ImportUploadValidationError
} from "@/server/imports/intake";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      error: message
    },
    {
      status
    }
  );
}

export async function POST(request: Request) {
  const authResult = authenticateInternalImportRequest(request);

  if (!authResult.ok) {
    return jsonError(
      authResult.reason === "missing_config"
        ? "Internal import upload is not configured."
        : "Invalid internal import API key.",
      authResult.status
    );
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return jsonError("Upload requests must use multipart/form-data with a `file` field.", 400);
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError("Failed to read multipart form data from the upload request.", 400);
  }

  // Support both legacy `file` field and new named fields `adFile`, `adSetFile`, `campaignFile`
  const adFile = formData.get("adFile") ?? formData.get("file");
  const adSetFile = formData.get("adSetFile");
  const campaignFile = formData.get("campaignFile");

  if (!(adFile instanceof File)) {
    return jsonError("CSV file is required. Use `adFile` (or `file`) for the ad-level CSV.", 400);
  }

  try {
    const acceptedImport = await acceptCsvImportUpload({
      file: adFile,
      adSetFile: adSetFile instanceof File ? adSetFile : null,
      campaignFile: campaignFile instanceof File ? campaignFile : null
    });

    return NextResponse.json(
      {
        ok: true,
        importRun: acceptedImport.importRun,
        kickoff: acceptedImport.kickoff
      },
      {
        status: 202
      }
    );
  } catch (error) {
    if (error instanceof DuplicateImportUploadError) {
      return NextResponse.json(
        {
          ok: false,
          duplicate: true,
          error: error.message,
          existingImportRun: error.existingImportRun
        },
        {
          status: 409
        }
      );
    }

    if (error instanceof ImportUploadValidationError) {
      return jsonError(error.message, 400);
    }

    return jsonError(error instanceof Error ? error.message : "Failed to accept CSV import upload.", 500);
  }
}
