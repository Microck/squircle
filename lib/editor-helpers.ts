const HEX_COLOR_RE = /^#?(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const MAX_IMAGE_DIMENSION = 8192;
// Truncation length for file names shown in error messages.  64 chars
// keeps messages readable and avoids overflowing common filesystem path
// limits (e.g. Linux PATH_MAX = 4096).
const MAX_ERROR_FILE_NAME_LENGTH = 64;
const IPV4_HOST_RE = /^\d{1,3}(?:\.\d{1,3}){3}$/;

export function normalizeHexColor(value: string) {
  const trimmed = value.trim();
  if (!HEX_COLOR_RE.test(trimmed)) {
    return null;
  }

  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (prefixed.length === 4) {
    return `#${prefixed[1]}${prefixed[1]}${prefixed[2]}${prefixed[2]}${prefixed[3]}${prefixed[3]}`.toLowerCase();
  }

  return prefixed.toLowerCase();
}

export function isHexColorInputValid(value: string) {
  return value.trim() === "" || HEX_COLOR_RE.test(value.trim());
}

export function isGifFile(file: File) {
  return file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif");
}

export function getFileStem(name: string) {
  return name.replace(/\.[^/.]+$/, "");
}

/**
 * Returns a hostname-derived suffix for exported file names.
 *
 * Embedding the hostname in export file names (e.g. `photo_example.com.png`)
 * prevents name collisions when a user downloads from multiple Squircle
 * instances (localhost, staging, production) in the same browser session.
 *
 * Raw IPv4 addresses (e.g. 192.168.1.1) are excluded because they look
 * like version strings in file names and rarely provide meaningful
 * disambiguation.
 */
export function getExportHostSuffix(hostname?: string) {
  const candidateHostname =
    hostname ?? (typeof window === "undefined" ? "" : window.location.hostname);
  const trimmedHostname = candidateHostname.trim().toLowerCase();
  if (!trimmedHostname || IPV4_HOST_RE.test(trimmedHostname)) {
    return "";
  }

  const sanitizedHostname = trimmedHostname
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return sanitizedHostname ? `_${sanitizedHostname}` : "";
}

export function getExportFileName(stem: string, extension: string, index?: number) {
  const prefix = typeof index === "number" ? `export-${index + 1}-${stem}` : `export-${stem}`;
  return `${prefix}${getExportHostSuffix()}.${extension}`;
}

export function getExportArchiveName(count: number) {
  return `squircle-batch-${count}${getExportHostSuffix()}.zip`;
}

export function hexToRgba(hex: string, alpha: number) {
  if (hex === "transparent") return "transparent";

  const normalizedHex = normalizeHexColor(hex);
  if (!normalizedHex) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const sanitized = normalizedHex.slice(1);
  const red = parseInt(sanitized.substring(0, 2), 16);
  const green = parseInt(sanitized.substring(2, 4), 16);
  const blue = parseInt(sanitized.substring(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha / 100})`;
}

export function sanitizeFileName(name: string) {
  const sanitized = name.replace(/[<>\u0000-\u001F\u007F]/g, "").trim();
  return (sanitized || "file").slice(0, MAX_ERROR_FILE_NAME_LENGTH);
}

export function getFileErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Couldn't read that file.";
  }

  const message = error.message.trim();
  if (!message) {
    return "Couldn't read that file.";
  }

  return message.replace(/[<>\u0000-\u001F\u007F]/g, "").slice(0, 140);
}

export function assertSupportedImageDimensions(width: number, height: number) {
  if (width < 1 || height < 1) {
    throw new Error("Image dimensions are invalid. SVG files need intrinsic width and height.");
  }

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    throw new Error(`Images must stay within ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION}.`);
  }
}

export function getUploadProgressValue(uploadProgress: { total: number; completed: number } | null) {
  if (!uploadProgress) {
    return 0;
  }

  // The 0.35 offset is a UX smoothing constant: while a file is being
  // decoded in-flight (between `completed` increments) the bar sits at
  // ~35 % of the *current file's* segment so the user sees continuous
  // movement instead of a stalled bar.
  const inFlightOffset = uploadProgress.completed < uploadProgress.total ? 0.35 : 0;
  return Math.min(100, Math.round(((uploadProgress.completed + inFlightOffset) / uploadProgress.total) * 100));
}
