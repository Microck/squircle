export function createMediaId() {
  return crypto.randomUUID();
}

export function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Couldn't decode that image."));
    image.src = url;
  });
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png") {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(`Failed to create ${type} blob`));
        return;
      }

      resolve(blob);
    }, type);
  });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Delay revocation so the browser has time to start the download before
  // the blob URL is invalidated.  Some browsers (especially Firefox) will
  // silently cancel the download if the URL is revoked too early.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Yield to the browser so the progress-bar repaints between iterations of
// batch export / upload loops.  Without this pause the UI appears frozen.
export function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}
