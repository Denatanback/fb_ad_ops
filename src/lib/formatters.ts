const dateTimeFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short"
});

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium"
});

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  return dateTimeFormatter.format(new Date(value));
}

export function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  return dateFormatter.format(new Date(value));
}

export function formatOptionalText(value: string | null | undefined, fallback = "-") {
  if (!value?.trim()) {
    return fallback;
  }

  return value.trim();
}

export function formatNumericValue(value: { toString(): string } | number | null | undefined, fallback = "-") {
  if (value === null || value === undefined) {
    return fallback;
  }

  return typeof value === "number" ? String(value) : value.toString();
}

export function toDateInputValue(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}

export function toNumber(value: { toString(): string } | number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const numericValue = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(numericValue) ? numericValue : null;
}

export function formatDecimalValue(
  value: { toString(): string } | number | null | undefined,
  digits = 2,
  fallback = "-"
) {
  const numericValue = toNumber(value);

  if (numericValue === null) {
    return fallback;
  }

  return numericValue.toFixed(digits);
}

export function formatPercentValue(
  value: { toString(): string } | number | null | undefined,
  digits = 2,
  fallback = "-"
) {
  const numericValue = toNumber(value);

  if (numericValue === null) {
    return fallback;
  }

  return `${numericValue.toFixed(digits)}%`;
}
