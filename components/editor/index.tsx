"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Progress, ProgressIndicator, ProgressLabel, ProgressTrack } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { Moon, Sun, UploadCloud, X } from "lucide-react";
import {
  ColorPicker,
  ColorPickerHue,
  ColorPickerSelection,
} from "@/components/ui/color-picker";
import {
  clampCropState,
  CROP_ZOOM_MIN,
  DEFAULT_CROP_STATE,
  getCropSourceRect,
  getCropStateAfterDrag,
  type CropState,
} from "@/lib/crop";
import { applyExportDeband } from "@/lib/export-deband";
import { decodeGifFile, encodeGifFrames, type DecodedGifFrame } from "@/lib/gif";

type BaseMediaItem = {
  id: string;
  file: File;
  url: string;
  width: number;
  height: number;
  crop: CropState;
};

type ImageItem = BaseMediaItem & {
  kind: "image";
  source: HTMLImageElement;
};

type GifItem = BaseMediaItem & {
  kind: "gif";
  frames: DecodedGifFrame[];
};

type MediaItem = ImageItem | GifItem;

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startCrop: CropState;
};

type UploadProgressState = {
  total: number;
  completed: number;
  currentFileName: string;
};

const HEX_COLOR_RE = /^#?(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const CHECKERBOARD_LIGHT = "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjZmZmIi8+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZTBlMGUwIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNlMGUwZTAiLz48L3N2Zz4=')";

function normalizeHexColor(value: string) {
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

function isGifFile(file: File) {
  return file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif");
}

function getFileStem(name: string) {
  return name.replace(/\.[^/.]+$/, "");
}

function getExportHostSuffix() {
  if (typeof window === "undefined") {
    return "";
  }

  const sanitizedHostname = window.location.hostname
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return sanitizedHostname ? `_${sanitizedHostname}` : "";
}

function getExportFileName(stem: string, extension: string, index?: number) {
  const prefix = typeof index === "number" ? `export-${index + 1}-${stem}` : `export-${stem}`;
  return `${prefix}${getExportHostSuffix()}.${extension}`;
}

function getExportArchiveName(count: number) {
  return `squircle-batch-${count}${getExportHostSuffix()}.zip`;
}

function hexToRgba(hex: string, alpha: number) {
  if (hex === "transparent") return "transparent";
  const sanitized = hex.replace("#", "");
  const red = parseInt(sanitized.length === 3 ? sanitized[0] + sanitized[0] : sanitized.substring(0, 2), 16) || 0;
  const green = parseInt(sanitized.length === 3 ? sanitized[1] + sanitized[1] : sanitized.substring(2, 4), 16) || 0;
  const blue = parseInt(sanitized.length === 3 ? sanitized[2] + sanitized[2] : sanitized.substring(4, 6), 16) || 0;
  return `rgba(${red}, ${green}, ${blue}, ${alpha / 100})`;
}

function createMediaId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png") {
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

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

function getUploadProgressValue(uploadProgress: UploadProgressState | null) {
  if (!uploadProgress) {
    return 0;
  }

  const inFlightOffset = uploadProgress.completed < uploadProgress.total ? 0.35 : 0;
  return Math.min(100, Math.round(((uploadProgress.completed + inFlightOffset) / uploadProgress.total) * 100));
}

type ColorFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function ColorField({ label, value, onChange }: ColorFieldProps) {
  const normalizedValue = normalizeHexColor(value) ?? "#000000";
  const [draft, setDraft] = useState(normalizedValue.toUpperCase());
  const isDraftValid = draft.trim() === "" || HEX_COLOR_RE.test(draft.trim());

  useEffect(() => {
    setDraft(normalizedValue.toUpperCase());
  }, [normalizedValue]);

  const commitDraft = useCallback(() => {
    const nextValue = normalizeHexColor(draft);
    if (nextValue) {
      onChange(nextValue);
      setDraft(nextValue.toUpperCase());
      return;
    }

    setDraft(normalizedValue.toUpperCase());
  }, [draft, normalizedValue, onChange]);

  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="text-xs text-muted-foreground flex-1">{label}</span>
      <Popover>
        <PopoverTrigger
          aria-label={`Pick ${label.toLowerCase()}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-card p-1 shadow-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          type="button"
        >
          <span
            className="block h-full w-full rounded-[calc(var(--radius-sm)-1px)] border border-black/10"
            style={{ backgroundColor: normalizedValue }}
          />
        </PopoverTrigger>
        <PopoverPopup className="w-[22rem] p-0" sideOffset={10}>
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-md border border-border shadow-sm"
                style={{ backgroundColor: normalizedValue }}
              />
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{normalizedValue.toUpperCase()}</p>
              </div>
            </div>
            <ColorPicker
              className="h-auto w-full"
              onChange={(color) => onChange(color.hex().toLowerCase())}
              value={normalizedValue}
            >
              <ColorPickerSelection className="h-44 rounded-lg" />
              <ColorPickerHue />
            </ColorPicker>
          </div>
        </PopoverPopup>
      </Popover>
      <Input
        aria-label={`${label} hex value`}
        className={`h-10 w-28 font-mono text-xs uppercase ${isDraftValid ? "" : "border-destructive focus-visible:ring-destructive/30"}`}
        maxLength={7}
        onBlur={commitDraft}
        onChange={(event) => setDraft(event.target.value.toUpperCase())}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
        spellCheck={false}
        value={draft}
      />
    </div>
  );
}

export function SquircleEditor() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [activeGifFrameIndex, setActiveGifFrameIndex] = useState(0);
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [shape, setShape] = useState<"round" | "squircle">("squircle");
  const [radius, setRadius] = useState<number>(15);

  const [hasShadow, setHasShadow] = useState<boolean>(false);
  const [shadowBlur, setShadowBlur] = useState<number>(20);
  const [shadowOffsetX, setShadowOffsetX] = useState<number>(0);
  const [shadowOffsetY, setShadowOffsetY] = useState<number>(10);
  const [shadowColor, setShadowColor] = useState<string>("#000000");
  const [shadowOpacity, setShadowOpacity] = useState<number>(45);

  const [hasOutline, setHasOutline] = useState<boolean>(false);
  const [outlineWidth, setOutlineWidth] = useState<number>(4);
  const [outlineColor, setOutlineColor] = useState<string>("#ffffff");
  const [outlineOpacity, setOutlineOpacity] = useState<number>(100);

  const [previewBg, setPreviewBg] = useState<"dark" | "light">("dark");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const mediaItemsRef = useRef<MediaItem[]>([]);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewDrawFrameRef = useRef<number | null>(null);

  useEffect(() => {
    mediaItemsRef.current = mediaItems;
  }, [mediaItems]);

  useEffect(() => {
    return () => {
      if (previewDrawFrameRef.current !== null) {
        cancelAnimationFrame(previewDrawFrameRef.current);
      }
      mediaItemsRef.current.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, []);

  const activeItem = mediaItems.find((item) => item.id === activeMediaId) ?? null;
  const activeGifFrame =
    activeItem?.kind === "gif"
      ? activeItem.frames[activeGifFrameIndex % activeItem.frames.length]
      : null;
  const activeSource = activeItem
    ? activeItem.kind === "gif"
      ? activeGifFrame?.canvas ?? null
      : activeItem.source
    : null;
  const activeCrop = activeItem?.crop ?? DEFAULT_CROP_STATE;
  const canDragActiveCrop = activeCrop.zoom > CROP_ZOOM_MIN;
  const uploadProgressValue = getUploadProgressValue(uploadProgress);

  const drawToCanvas = useCallback((
    canvas: HTMLCanvasElement,
    source: CanvasImageSource,
    mediaWidth: number,
    mediaHeight: number,
    crop: CropState,
  ) => {
    const context = canvas.getContext("2d");
    if (!context) return;

    const normalizedCrop = clampCropState(crop);
    const { sx, sy, sw, sh } = getCropSourceRect(mediaWidth, mediaHeight, normalizedCrop);

    const shadowOffsetXValue = hasShadow ? shadowOffsetX : 0;
    const shadowOffsetYValue = hasShadow ? shadowOffsetY : 0;
    const shadowBlurValue = hasShadow ? shadowBlur : 0;
    const outlineWidthValue = hasOutline ? outlineWidth : 0;

    const shadowPadX = Math.max(Math.abs(shadowOffsetXValue) + shadowBlurValue * 1.5, outlineWidthValue) + 8;
    const shadowPadY = Math.max(Math.abs(shadowOffsetYValue) + shadowBlurValue * 1.5, outlineWidthValue) + 8;
    const outputWidth = mediaWidth + shadowPadX * 2;
    const outputHeight = mediaHeight + shadowPadY * 2;
    const drawX = shadowPadX;
    const drawY = shadowPadY;
    const radiusPx = (radius / 100) * (Math.min(mediaWidth, mediaHeight) / 2);

    canvas.width = outputWidth;
    canvas.height = outputHeight;
    context.clearRect(0, 0, outputWidth, outputHeight);

    const drawShape = (shapeContext: CanvasRenderingContext2D) => {
      if (shape === "round") {
        shapeContext.beginPath();
        shapeContext.roundRect(drawX, drawY, mediaWidth, mediaHeight, radiusPx);
        shapeContext.closePath();
        return;
      }

      shapeContext.beginPath();
      shapeContext.moveTo(drawX + radiusPx, drawY);
      shapeContext.lineTo(drawX + mediaWidth - radiusPx, drawY);
      shapeContext.quadraticCurveTo(drawX + mediaWidth, drawY, drawX + mediaWidth, drawY + radiusPx);
      shapeContext.lineTo(drawX + mediaWidth, drawY + mediaHeight - radiusPx);
      shapeContext.quadraticCurveTo(drawX + mediaWidth, drawY + mediaHeight, drawX + mediaWidth - radiusPx, drawY + mediaHeight);
      shapeContext.lineTo(drawX + radiusPx, drawY + mediaHeight);
      shapeContext.quadraticCurveTo(drawX, drawY + mediaHeight, drawX, drawY + mediaHeight - radiusPx);
      shapeContext.lineTo(drawX, drawY + radiusPx);
      shapeContext.quadraticCurveTo(drawX, drawY, drawX + radiusPx, drawY);
      shapeContext.closePath();
    };

    const layerCanvas = offscreenCanvasRef.current ?? document.createElement("canvas");
    offscreenCanvasRef.current = layerCanvas;
    layerCanvas.width = outputWidth;
    layerCanvas.height = outputHeight;
    const layerContext = layerCanvas.getContext("2d");
    if (!layerContext) return;
    layerContext.clearRect(0, 0, outputWidth, outputHeight);

    if (hasOutline) {
      layerContext.save();
      drawShape(layerContext);
      layerContext.lineWidth = outlineWidthValue * 2;
      layerContext.strokeStyle = hexToRgba(outlineColor, outlineOpacity);
      layerContext.stroke();
      layerContext.globalCompositeOperation = "destination-out";
      layerContext.fillStyle = "black";
      layerContext.fill();
      layerContext.restore();
    }

    layerContext.save();
    drawShape(layerContext);
    layerContext.clip();
    layerContext.drawImage(source, sx, sy, sw, sh, drawX, drawY, mediaWidth, mediaHeight);
    layerContext.restore();

    context.save();
    if (hasShadow) {
      const sanitized = shadowColor.replace("#", "");
      const red = parseInt(sanitized.length === 3 ? sanitized[0] + sanitized[0] : sanitized.substring(0, 2), 16) || 0;
      const green = parseInt(sanitized.length === 3 ? sanitized[1] + sanitized[1] : sanitized.substring(2, 4), 16) || 0;
      const blue = parseInt(sanitized.length === 3 ? sanitized[2] + sanitized[2] : sanitized.substring(4, 6), 16) || 0;

      context.shadowColor = `rgba(${red}, ${green}, ${blue}, ${shadowOpacity / 100})`;
      context.shadowBlur = shadowBlurValue;
      context.shadowOffsetX = shadowOffsetXValue;
      context.shadowOffsetY = shadowOffsetYValue;
    }
    context.drawImage(layerCanvas, 0, 0);
    context.restore();
  }, [
    hasOutline,
    hasShadow,
    outlineColor,
    outlineOpacity,
    outlineWidth,
    radius,
    shadowBlur,
    shadowColor,
    shadowOffsetX,
    shadowOffsetY,
    shadowOpacity,
    shape,
  ]);

  const prepareCanvasForExport = useCallback((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext("2d");
    if (!context) return;

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    applyExportDeband(imageData.data, canvas.width, canvas.height);
    context.putImageData(imageData, 0, 0);
  }, []);

  const updateActiveCrop = useCallback((updateCrop: (crop: CropState) => CropState) => {
    if (!activeMediaId) {
      return;
    }

    setMediaItems((currentItems) =>
      currentItems.map((item) =>
        item.id === activeMediaId
          ? { ...item, crop: clampCropState(updateCrop(item.crop)) }
          : item,
      ),
    );
  }, [activeMediaId]);

  const createMediaItem = useCallback(async (file: File): Promise<MediaItem> => {
    const url = URL.createObjectURL(file);

    try {
      if (isGifFile(file)) {
        const decodedGif = await decodeGifFile(file);

        return {
          id: createMediaId(),
          kind: "gif",
          file,
          url,
          width: decodedGif.width,
          height: decodedGif.height,
          crop: DEFAULT_CROP_STATE,
          frames: decodedGif.frames,
        };
      }

      const image = await loadImage(url);

      return {
        id: createMediaId(),
        kind: "image",
        file,
        url,
        width: image.naturalWidth || image.width,
        height: image.naturalHeight || image.height,
        crop: DEFAULT_CROP_STATE,
        source: image,
      };
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }, []);

  const processFiles = useCallback((files: File[]) => {
    if (uploadProgress) {
      return;
    }

    const validFiles = files.filter((file) => file.type.startsWith("image/"));

    if (validFiles.length === 0) {
      return;
    }

    setUploadError(null);
    setUploadProgress({
      total: validFiles.length,
      completed: 0,
      currentFileName: validFiles[0]?.name ?? "image",
    });

    void (async () => {
      const nextItems: MediaItem[] = [];
      let failedCount = 0;
      let lastFailedFileName: string | null = null;

      for (let index = 0; index < validFiles.length; index += 1) {
        const file = validFiles[index];

        setUploadProgress({
          total: validFiles.length,
          completed: index,
          currentFileName: file.name,
        });
        await waitForNextPaint();

        try {
          nextItems.push(await createMediaItem(file));
        } catch (error) {
          failedCount += 1;
          lastFailedFileName = file.name;
          console.error(error);
        }

        setUploadProgress({
          total: validFiles.length,
          completed: index + 1,
          currentFileName: file.name,
        });
        await waitForNextPaint();
      }

      if (nextItems.length > 0) {
        setMediaItems((currentItems) => [...currentItems, ...nextItems]);
        setActiveMediaId((currentActiveMediaId) => currentActiveMediaId ?? nextItems[0].id);
      }

      if (failedCount > 0) {
        setUploadError(
          failedCount === 1 && lastFailedFileName
            ? `Couldn't process ${lastFailedFileName}. Try a smaller or shorter GIF.`
            : `Couldn't process ${failedCount} files. Try smaller images or GIFs.`,
        );
      }

      setUploadProgress(null);
    })();
  }, [createMediaItem, uploadProgress]);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files.length > 0) {
      processFiles(Array.from(event.dataTransfer.files));
    }
  }, [processFiles]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      processFiles(Array.from(event.target.files));
    }
    event.target.value = "";
  }, [processFiles]);

  const renderItemToCanvas = useCallback((item: MediaItem, source: CanvasImageSource) => {
    const canvas = document.createElement("canvas");
    drawToCanvas(canvas, source, item.width, item.height, item.crop);
    return canvas;
  }, [drawToCanvas]);

  const renderStillItemToBlob = useCallback(async (item: ImageItem) => {
    const canvas = renderItemToCanvas(item, item.source);
    prepareCanvasForExport(canvas);
    return canvasToBlob(canvas, "image/png");
  }, [prepareCanvasForExport, renderItemToCanvas]);

  const renderGifItemToBlob = useCallback(async (item: GifItem) => {
    const renderedFrames = item.frames.map((frame) => {
      const canvas = renderItemToCanvas(item, frame.canvas);
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("2D canvas context is required for GIF export");
      }

      return {
        delay: frame.delay,
        imageData: context.getImageData(0, 0, canvas.width, canvas.height),
      };
    });

    const firstFrame = renderedFrames[0];
    if (!firstFrame) {
      throw new Error("Animated GIF export requires at least one frame");
    }

    return encodeGifFrames(firstFrame.imageData.width, firstFrame.imageData.height, renderedFrames);
  }, [renderItemToCanvas]);

  useEffect(() => {
    setActiveGifFrameIndex(0);
  }, [activeMediaId]);

  useEffect(() => {
    if (!activeItem || activeItem.kind !== "gif" || activeItem.frames.length < 2) {
      return;
    }

    const activeFrame = activeItem.frames[activeGifFrameIndex % activeItem.frames.length];
    const timer = window.setTimeout(() => {
      setActiveGifFrameIndex((currentIndex) => (currentIndex + 1) % activeItem.frames.length);
    }, Math.max(20, activeFrame?.delay ?? 100));

    return () => window.clearTimeout(timer);
  }, [activeGifFrameIndex, activeItem]);

  useEffect(() => {
    if (!canvasRef.current || !activeItem || !activeSource) {
      return;
    }

    if (previewDrawFrameRef.current !== null) {
      cancelAnimationFrame(previewDrawFrameRef.current);
    }

    previewDrawFrameRef.current = requestAnimationFrame(() => {
      if (!canvasRef.current) {
        return;
      }

      drawToCanvas(canvasRef.current, activeSource, activeItem.width, activeItem.height, activeItem.crop);
      previewDrawFrameRef.current = null;
    });

    return () => {
      if (previewDrawFrameRef.current !== null) {
        cancelAnimationFrame(previewDrawFrameRef.current);
        previewDrawFrameRef.current = null;
      }
    };
  }, [activeItem, activeSource, drawToCanvas]);

  const handleDownload = useCallback(async () => {
    if (mediaItems.length === 0) {
      return;
    }

    if (mediaItems.length === 1) {
      const item = mediaItems[0];

      if (item.kind === "gif") {
        const blob = await renderGifItemToBlob(item);
        downloadBlob(blob, getExportFileName(getFileStem(item.file.name), "gif"));
        return;
      }

      const blob = await renderStillItemToBlob(item);
      downloadBlob(blob, getExportFileName(getFileStem(item.file.name), "png"));
      return;
    }

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    for (let index = 0; index < mediaItems.length; index += 1) {
      const item = mediaItems[index];

      if (item.kind === "gif") {
        const blob = await renderGifItemToBlob(item);
        zip.file(
          getExportFileName(getFileStem(item.file.name), "gif", index),
          await blob.arrayBuffer(),
        );
        continue;
      }

      const blob = await renderStillItemToBlob(item);
      zip.file(
        getExportFileName(getFileStem(item.file.name), "png", index),
        await blob.arrayBuffer(),
      );
    }

    const content = await zip.generateAsync({ type: "blob" });
    downloadBlob(content, getExportArchiveName(mediaItems.length));
  }, [mediaItems, renderGifItemToBlob, renderStillItemToBlob]);

  const removeMediaItem = useCallback((id: string, event: React.MouseEvent) => {
    event.stopPropagation();

    setMediaItems((currentItems) => {
      const nextItems = currentItems.filter((item) => item.id !== id);
      const removedItem = currentItems.find((item) => item.id === id);

      if (removedItem) {
        URL.revokeObjectURL(removedItem.url);
      }

      setActiveMediaId((currentActiveMediaId) => {
        if (currentActiveMediaId !== id) {
          return currentActiveMediaId;
        }

        return nextItems[0]?.id ?? null;
      });

      return nextItems;
    });
  }, []);

  const clearAll = useCallback(() => {
    setMediaItems((currentItems) => {
      currentItems.forEach((item) => URL.revokeObjectURL(item.url));
      return [];
    });
    setActiveMediaId(null);
  }, []);

  const handlePreviewPointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeItem || !canDragActiveCrop || event.button !== 0 || !canvasRef.current) {
      return;
    }

    canvasRef.current.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startCrop: activeItem.crop,
    };
    setIsDraggingCrop(true);
  }, [activeItem, canDragActiveCrop]);

  const handlePreviewPointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const dragState = dragStateRef.current;
    const canvas = canvasRef.current;

    if (!dragState || !canvas || dragState.pointerId !== event.pointerId) {
      return;
    }

    const rect = canvas.getBoundingClientRect();

    updateActiveCrop(() =>
      getCropStateAfterDrag(
        dragState.startCrop,
        rect.width,
        rect.height,
        event.clientX - dragState.startX,
        event.clientY - dragState.startY,
      ),
    );
  }, [updateActiveCrop]);

  const finishCropDrag = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const dragState = dragStateRef.current;

    if (!dragState || dragState.pointerId !== event.pointerId || !canvasRef.current) {
      return;
    }

    if (canvasRef.current.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }

    dragStateRef.current = null;
    setIsDraggingCrop(false);
  }, []);

  const uploadProgressPanel = uploadProgress ? (
    <div className="w-full rounded-2xl border border-border bg-card p-4 shadow-sm">
        <Progress aria-label="Upload progress" className="gap-3" max={100} value={uploadProgressValue}>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Spinner className="h-4 w-4 text-primary" />
              <ProgressLabel className="text-sm font-semibold text-foreground">Processing upload</ProgressLabel>
            </div>
            <p className="truncate text-xs text-muted-foreground">{uploadProgress.currentFileName}</p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">{uploadProgressValue}%</span>
        </div>
        <ProgressTrack>
          <ProgressIndicator />
        </ProgressTrack>
      </Progress>
    </div>
  ) : null;

  if (mediaItems.length === 0) {
    return (
      <div
        className={`w-full max-w-2xl mx-auto aspect-video rounded-2xl border border-dashed border-border bg-card text-card-foreground flex flex-col items-center justify-center transition-colors ${uploadProgress ? "cursor-progress" : "cursor-pointer hover:bg-muted/50"}`}
        onClick={() => {
          if (!uploadProgress) {
            document.getElementById("file-upload")?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {uploadProgress ? (
          <div className="w-full max-w-md px-6">
            {uploadProgressPanel}
          </div>
        ) : (
          <>
            <UploadCloud className="w-10 h-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Drop images or GIFs here</h3>
            <p className="text-sm text-muted-foreground mt-1">or click to select multiple files</p>
          </>
        )}
        {uploadError ? (
          <p className="mt-4 px-6 text-center text-sm text-destructive">{uploadError}</p>
        ) : null}
        <input
          id="file-upload"
          accept="image/*"
          className="hidden"
          multiple
          onChange={handleFileChange}
          type="file"
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-8">
      <div className="w-full flex items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto px-2 py-3 scrollbar-hide flex-1">
          {mediaItems.map((item) => (
            <div
              key={item.id}
              className={`relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${activeMediaId === item.id ? "border-primary ring-2 ring-ring ring-offset-2 ring-offset-background" : "border-transparent opacity-60 hover:opacity-100"}`}
              onClick={() => setActiveMediaId(item.id)}
            >
              {/* Blob URLs and animated GIF thumbnails need the native image element here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" className="w-full h-full object-cover" src={item.url} />
              {item.kind === "gif" ? (
                <span className="absolute left-1 top-1 rounded bg-background/80 px-1 py-0.5 text-[10px] font-medium text-foreground">
                  GIF
                </span>
              ) : null}
              <button
                className="absolute top-0.5 right-0.5 bg-background/80 text-foreground rounded-full p-0.5 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                onClick={(event) => removeMediaItem(item.id, event)}
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <div
            className="shrink-0 w-14 h-14 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => document.getElementById("file-upload-add")?.click()}
          >
            <UploadCloud className="w-5 h-5 text-muted-foreground" />
            <input
              id="file-upload-add"
              accept="image/*"
              className="hidden"
              multiple
              onChange={handleFileChange}
              type="file"
            />
          </div>
        </div>
        <Button className="text-muted-foreground shrink-0" onClick={clearAll} size="sm" variant="ghost">
          Clear All
        </Button>
      </div>

      {uploadProgressPanel}
      {uploadError ? <p className="w-full px-2 text-sm text-destructive">{uploadError}</p> : null}

      <div
        className={`w-full rounded-3xl border border-border p-6 shadow-sm flex items-center justify-center overflow-hidden aspect-square sm:aspect-video relative transition-colors ${previewBg === "dark" ? "preview-surface" : "bg-white"}`}
        style={previewBg === "light" ? { backgroundImage: CHECKERBOARD_LIGHT } : undefined}
      >
        <canvas
          ref={canvasRef}
          className={`max-w-full max-h-full object-contain ${canDragActiveCrop ? (isDraggingCrop ? "cursor-grabbing" : "cursor-grab") : "cursor-default"}`}
          onPointerCancel={finishCropDrag}
          onPointerDown={handlePreviewPointerDown}
          onPointerMove={handlePreviewPointerMove}
          onPointerUp={finishCropDrag}
          style={{ touchAction: canDragActiveCrop ? "none" : "auto" }}
        />

        <div className="absolute top-4 right-4 flex bg-background/80 backdrop-blur-md rounded-full p-1 border border-border">
          <button
            className={`p-1.5 rounded-full transition-colors ${previewBg === "dark" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            onClick={() => setPreviewBg("dark")}
          >
            <Moon className="w-4 h-4" />
          </button>
          <button
            className={`p-1.5 rounded-full transition-colors ${previewBg === "light" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            onClick={() => setPreviewBg("light")}
          >
            <Sun className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="w-full space-y-6 px-2">
        <Tabs onValueChange={(value) => setShape(value as "round" | "squircle")} value={shape}>
          <TabsList className="grid w-full grid-cols-2 p-1">
            <TabsTrigger value="squircle">Squircle</TabsTrigger>
            <TabsTrigger value="round">Rounded Corners</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-foreground tracking-wide">
              Corner Radius: <span className="font-normal text-muted-foreground">{radius}%</span>
            </label>
          </div>
          <Slider
            className="cursor-ew-resize"
            max={100}
            min={0}
            onValueChange={(value) => setRadius(Array.isArray(value) ? value[0] : value)}
            step={1}
            value={[radius]}
          />
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center gap-4">
            <label className="text-sm font-semibold text-foreground tracking-wide">
              Crop / Zoom:{" "}
              <span className="font-normal text-muted-foreground">{Math.round(activeCrop.zoom * 100)}%</span>
            </label>
          </div>
          <Slider
            className="cursor-ew-resize"
            max={300}
            min={100}
            onValueChange={(value) => {
              const nextZoom = (Array.isArray(value) ? value[0] : value) / 100;
              updateActiveCrop((crop) => ({
                ...crop,
                zoom: nextZoom,
                panX: nextZoom <= CROP_ZOOM_MIN ? 0 : crop.panX,
                panY: nextZoom <= CROP_ZOOM_MIN ? 0 : crop.panY,
              }));
            }}
            step={1}
            value={[Math.round(activeCrop.zoom * 100)]}
          />
          <p className="text-xs text-muted-foreground">
            {canDragActiveCrop
              ? "Drag the preview to reposition the crop."
              : "Increase zoom to reposition the crop by dragging the preview."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setHasShadow(!hasShadow)}
            >
              <label className="text-sm font-semibold text-foreground tracking-wide cursor-pointer pointer-events-none">
                Drop Shadow
              </label>
              <Switch checked={hasShadow} onCheckedChange={setHasShadow} />
            </div>

            {hasShadow ? (
              <div className="p-4 pt-0 space-y-5 border-t border-border/50 bg-muted/10">
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Blur</span>
                    <span className="text-xs">{shadowBlur}px</span>
                  </div>
                  <Slider max={100} min={0} onValueChange={(value) => setShadowBlur(Array.isArray(value) ? value[0] : value)} step={1} value={[shadowBlur]} />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Opacity</span>
                    <span className="text-xs">{shadowOpacity}%</span>
                  </div>
                  <Slider max={100} min={0} onValueChange={(value) => setShadowOpacity(Array.isArray(value) ? value[0] : value)} step={1} value={[shadowOpacity]} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Offset X</span>
                      <span className="text-xs">{shadowOffsetX}px</span>
                    </div>
                    <Slider max={100} min={-100} onValueChange={(value) => setShadowOffsetX(Array.isArray(value) ? value[0] : value)} step={1} value={[shadowOffsetX]} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Offset Y</span>
                      <span className="text-xs">{shadowOffsetY}px</span>
                    </div>
                    <Slider max={100} min={-100} onValueChange={(value) => setShadowOffsetY(Array.isArray(value) ? value[0] : value)} step={1} value={[shadowOffsetY]} />
                  </div>
                </div>

                <ColorField label="Shadow Color" onChange={setShadowColor} value={shadowColor} />
              </div>
            ) : null}
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setHasOutline(!hasOutline)}
            >
              <label className="text-sm font-semibold text-foreground tracking-wide cursor-pointer pointer-events-none">
                Outer Outline
              </label>
              <Switch checked={hasOutline} onCheckedChange={setHasOutline} />
            </div>

            {hasOutline ? (
              <div className="p-4 pt-0 space-y-5 border-t border-border/50 bg-muted/10">
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Width</span>
                    <span className="text-xs">{outlineWidth}px</span>
                  </div>
                  <Slider max={50} min={1} onValueChange={(value) => setOutlineWidth(Array.isArray(value) ? value[0] : value)} step={1} value={[outlineWidth]} />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Opacity</span>
                    <span className="text-xs">{outlineOpacity}%</span>
                  </div>
                  <Slider max={100} min={0} onValueChange={(value) => setOutlineOpacity(Array.isArray(value) ? value[0] : value)} step={1} value={[outlineOpacity]} />
                </div>

                <ColorField label="Outline Color" onChange={setOutlineColor} value={outlineColor} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="pt-4 flex flex-col items-center">
        <Button
          className="rounded-xl px-12 font-medium shadow-sm active:scale-95 transition-transform h-11 text-lg sm:h-10 sm:text-base"
          onClick={() => {
            void handleDownload();
          }}
          size="lg"
        >
          Download {mediaItems.length > 1 ? `All (${mediaItems.length})` : activeItem?.kind === "gif" ? "GIF" : "PNG"}
        </Button>
        {mediaItems.length > 1 ? (
          <p className="text-xs text-muted-foreground mt-3">
            Batch download will be provided as a .zip with PNG and GIF exports.
          </p>
        ) : null}
      </div>
    </div>
  );
}
