export type ParsedCsvDocument = {
  headers: string[];
  rows: string[][];
};

function shouldSkipRow(row: string[]) {
  return row.every((value) => !value.trim());
}

export function parseCsvDocument(sourceText: string): ParsedCsvDocument {
  const text = sourceText.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (inQuotes) {
      if (character === "\"") {
        if (text[index + 1] === "\"") {
          currentValue += "\"";
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentValue += character;
      }

      continue;
    }

    if (character === "\"") {
      inQuotes = true;
      continue;
    }

    if (character === ",") {
      currentRow.push(currentValue);
      currentValue = "";
      continue;
    }

    if (character === "\r" || character === "\n") {
      if (character === "\r" && text[index + 1] === "\n") {
        index += 1;
      }

      currentRow.push(currentValue);
      currentValue = "";

      if (!shouldSkipRow(currentRow)) {
        rows.push(currentRow);
      }

      currentRow = [];
      continue;
    }

    currentValue += character;
  }

  if (inQuotes) {
    throw new Error("CSV parsing failed because the file ends with an open quoted value.");
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);

    if (!shouldSkipRow(currentRow)) {
      rows.push(currentRow);
    }
  }

  if (!rows.length) {
    throw new Error("CSV parsing failed because the file does not contain any rows.");
  }

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((header) => header.trim());

  if (!headers.length || headers.every((header) => !header)) {
    throw new Error("CSV parsing failed because the header row is empty.");
  }

  return {
    headers,
    rows: dataRows
  };
}
