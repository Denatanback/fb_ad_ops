import { kickOffImportProcessing } from "@/server/imports/processing";
import { inspectSupportedMetaAdsCsv } from "@/server/imports/meta-ads-format";
import {
  isCsvFileUpload,
  removeStoredImportFile,
  storeUploadedImportFile,
  type StoredImportFile
} from "@/server/imports/storage";
import {
  createImportRun,
  findImportRunByAdAccountAndFileHash,
  getImportRunSummary
} from "@/server/services/import-runs";

type AcceptCsvImportUploadInput = {
  file: File;
  adSetFile?: File | null;
  campaignFile?: File | null;
  uploadedById?: string | null;
  adAccountId?: string | null;
};

type AcceptedImportRunSnapshot = {
  id: string;
  sourceFilename: string;
  sourceType: string;
  sourceStorageKey: string | null;
  sourceByteSize: number | null;
  processingStatus: string;
  rawRowsCount: number;
  normalizedRowsCount: number;
  errorSummary: string | null;
  receivedAt: Date;
};

export type AcceptedCsvImportUpload = {
  importRun: AcceptedImportRunSnapshot;
  kickoff: Awaited<ReturnType<typeof kickOffImportProcessing>>;
};

type DuplicateImportRunSnapshot = AcceptedImportRunSnapshot & {
  sourceFileHash: string | null;
  sourceFormatKey: string | null;
  reportingWindowStart: Date | null;
  reportingWindowEnd: Date | null;
};

export class ImportUploadValidationError extends Error {}
export class DuplicateImportUploadError extends Error {
  existingImportRun: DuplicateImportRunSnapshot;

  constructor(message: string, existingImportRun: DuplicateImportRunSnapshot) {
    super(message);
    this.name = "DuplicateImportUploadError";
    this.existingImportRun = existingImportRun;
  }
}

function assertCsvUpload(file: File) {
  if (!file.size) {
    throw new ImportUploadValidationError("Загруженный CSV-файл пуст.");
  }

  if (!isCsvFileUpload(file)) {
    throw new ImportUploadValidationError("Поддерживаются только CSV-файлы.");
  }
}

function toImportRunSnapshot(
  importRun: {
    id: string;
    sourceFilename: string;
    sourceType: string;
    sourceStorageKey: string | null;
    sourceByteSize: number | null;
    processingStatus: string;
    rawRowsCount: number;
    normalizedRowsCount: number;
    errorSummary: string | null;
    receivedAt: Date;
  },
  fallback: {
    id: string;
    sourceFilename: string;
    sourceType: string;
    sourceStorageKey: string | null;
    sourceByteSize: number | null;
    processingStatus: string;
    rawRowsCount: number;
    normalizedRowsCount: number;
    errorSummary: string | null;
    receivedAt: Date;
  }
): AcceptedImportRunSnapshot {
  return {
    id: importRun.id ?? fallback.id,
    sourceFilename: importRun.sourceFilename ?? fallback.sourceFilename,
    sourceType: importRun.sourceType ?? fallback.sourceType,
    sourceStorageKey: importRun.sourceStorageKey ?? fallback.sourceStorageKey,
    sourceByteSize: importRun.sourceByteSize ?? fallback.sourceByteSize,
    processingStatus: importRun.processingStatus ?? fallback.processingStatus,
    rawRowsCount: importRun.rawRowsCount ?? fallback.rawRowsCount,
    normalizedRowsCount: importRun.normalizedRowsCount ?? fallback.normalizedRowsCount,
    errorSummary: importRun.errorSummary ?? fallback.errorSummary,
    receivedAt: importRun.receivedAt ?? fallback.receivedAt
  };
}

export async function acceptCsvImportUpload(input: AcceptCsvImportUploadInput): Promise<AcceptedCsvImportUpload> {
  assertCsvUpload(input.file);

  let storedFile: StoredImportFile | null = null;
  let storedAdSetFile: StoredImportFile | null = null;
  let storedCampaignFile: StoredImportFile | null = null;
  let importRunId: string | null = null;

  try {
    storedFile = await storeUploadedImportFile({ file: input.file });

    if (input.adSetFile) {
      assertCsvUpload(input.adSetFile);
      storedAdSetFile = await storeUploadedImportFile({ file: input.adSetFile });
    }

    if (input.campaignFile) {
      assertCsvUpload(input.campaignFile);
      storedCampaignFile = await storeUploadedImportFile({ file: input.campaignFile });
    }

    // Per-cabinet duplicate check: same cabinet + same file hash = duplicate.
    // (The global @@unique([sourceFileHash]) constraint has been removed in favour of this check.)
    if (storedFile.sha256) {
      const existingRun = await findImportRunByAdAccountAndFileHash(
        input.adAccountId ?? null,
        storedFile.sha256
      );

      if (existingRun) {
        throw new DuplicateImportUploadError(
          `Этот CSV уже был загружен ранее: совпал file hash. Повторный импорт, analyzer run и Telegram delivery не запускались.`,
          {
            ...existingRun,
            sourceFileHash: existingRun.sourceFileHash ?? storedFile.sha256,
            sourceFormatKey: existingRun.sourceFormatKey,
            reportingWindowStart: existingRun.reportingWindowStart,
            reportingWindowEnd: existingRun.reportingWindowEnd
          }
        );
      }
    }

    const inspectedImport = inspectSupportedMetaAdsCsv(storedFile.utf8Text);

    const importRun = await createImportRun({
      sourceFilename: storedFile.originalFilename,
      sourceStorageKey: storedFile.relativeStorageKey,
      sourceFileHash: storedFile.sha256,
      sourceFormatKey: inspectedImport.format.key,
      sourceContentType: storedFile.contentType,
      sourceByteSize: storedFile.byteSize,
      reportingWindowStart: inspectedImport.reportStart,
      reportingWindowEnd: inspectedImport.reportEnd,
      uploadedById: input.uploadedById ?? null,
      adAccountId: input.adAccountId ?? null,
      adSetFileStorageKey: storedAdSetFile?.relativeStorageKey ?? null,
      adSetFileHash: storedAdSetFile?.sha256 ?? null,
      campaignFileStorageKey: storedCampaignFile?.relativeStorageKey ?? null,
      campaignFileHash: storedCampaignFile?.sha256 ?? null
    });

    importRunId = importRun.id;

    const kickoff = await kickOffImportProcessing(importRun.id);
    const updatedImportRun = await getImportRunSummary(importRun.id);

    return {
      importRun: toImportRunSnapshot(updatedImportRun ?? importRun, importRun),
      kickoff
    };
  } catch (error) {
    if (!importRunId) {
      if (storedFile) await removeStoredImportFile(storedFile.relativeStorageKey).catch(() => undefined);
      if (storedAdSetFile) await removeStoredImportFile(storedAdSetFile.relativeStorageKey).catch(() => undefined);
      if (storedCampaignFile) await removeStoredImportFile(storedCampaignFile.relativeStorageKey).catch(() => undefined);
    }

    throw error;
  }
}
