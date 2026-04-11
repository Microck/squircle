"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Popover, PopoverTrigger, PopoverPopup } from "@/components/ui/popover";
import { UploadCloud, X, Sun, Moon } from "lucide-react";
import {
  ColorPicker,
  ColorPickerHue,
  ColorPickerSelection,
} from "@/components/ui/color-picker";

type ImageItem = {
  id: string;
  file: File;
  obj: HTMLImageElement;
  url: string;
};

const HEX_COLOR_RE = /^#?(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

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
  const [images, setImages] = useState<ImageItem[]>([]);
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  
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

  const hexToRgba = (hex: string, alpha: number) => {
    if (hex === "transparent") return "transparent";
    const h = hex.replace("#", "");
    const r = parseInt(h.length === 3 ? h[0]+h[0] : h.substring(0,2), 16) || 0;
    const g = parseInt(h.length === 3 ? h[1]+h[1] : h.substring(2,4), 16) || 0;
    const b = parseInt(h.length === 3 ? h[2]+h[2] : h.substring(4,6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha / 100})`;
  };

  const processFiles = useCallback((files: File[]) => {
    const validFiles = files.filter(f => f.type.startsWith("image/"));
    validFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.src = url;
      img.onload = () => {
        const id = Math.random().toString(36).substring(7);
        setImages(prev => {
          const newImages = [...prev, { id, file, obj: img, url }];
          if (prev.length === 0) {
            setActiveImageId(id);
          }
          return newImages;
        });
      };
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
    // reset input so same file can be selected again if needed
    e.target.value = '';
  }, [processFiles]);

  const activeImage = images.find(img => img.id === activeImageId)?.obj;

  const drawToCanvas = useCallback((
    canvas: HTMLCanvasElement,
    imageObj: HTMLImageElement
  ) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sOffsetX = hasShadow ? shadowOffsetX : 0;
    const sOffsetY = hasShadow ? shadowOffsetY : 0;
    const sBlur = hasShadow ? shadowBlur : 0;
    const outWidth = hasOutline ? outlineWidth : 0;

    // Calculate maximum shadow extent
    const shadowPadX = Math.max(Math.abs(sOffsetX) + sBlur * 1.5, outWidth) + 8;
    const shadowPadY = Math.max(Math.abs(sOffsetY) + sBlur * 1.5, outWidth) + 8;

    const outW = imageObj.width + shadowPadX * 2;
    const outH = imageObj.height + shadowPadY * 2;

    canvas.width = outW;
    canvas.height = outH;
    
    ctx.clearRect(0, 0, outW, outH);

    const drawW = imageObj.width;
    const drawH = imageObj.height;
    
    // Center it considering shadow padding
    const drawX = shadowPadX;
    const drawY = shadowPadY;

    const rPx = (radius / 100) * (Math.min(drawW, drawH) / 2);

    const drawShape = (context: CanvasRenderingContext2D) => {
      if (shape === "round") {
        context.beginPath();
        context.roundRect(drawX, drawY, drawW, drawH, rPx);
        context.closePath();
      } else {
        context.beginPath();
        context.moveTo(drawX + rPx, drawY);
        context.lineTo(drawX + drawW - rPx, drawY);
        context.quadraticCurveTo(drawX + drawW, drawY, drawX + drawW, drawY + rPx);
        context.lineTo(drawX + drawW, drawY + drawH - rPx);
        context.quadraticCurveTo(drawX + drawW, drawY + drawH, drawX + drawW - rPx, drawY + drawH);
        context.lineTo(drawX + rPx, drawY + drawH);
        context.quadraticCurveTo(drawX, drawY + drawH, drawX, drawY + drawH - rPx);
        context.lineTo(drawX, drawY + rPx);
        context.quadraticCurveTo(drawX, drawY, drawX + rPx, drawY);
        context.closePath();
      }
    };

    // Create offscreen layer for the exact squircle shape (including outline and image)
    const layerCanvas = document.createElement("canvas");
    layerCanvas.width = outW;
    layerCanvas.height = outH;
    const layerCtx = layerCanvas.getContext("2d");
    if (!layerCtx) return;

    // Draw outline
    if (hasOutline) {
      layerCtx.save();
      drawShape(layerCtx);
      layerCtx.lineWidth = outWidth * 2; // double since we clip inside
      layerCtx.strokeStyle = hexToRgba(outlineColor, outlineOpacity);
      layerCtx.stroke();
      
      // Erase inside so image can be drawn clean without overlapping outline inner-half
      layerCtx.globalCompositeOperation = 'destination-out';
      layerCtx.fillStyle = "black";
      layerCtx.fill();
      layerCtx.restore();
    }

    // Draw Image
    layerCtx.save();
    drawShape(layerCtx);
    layerCtx.clip();
    layerCtx.drawImage(imageObj, drawX, drawY, drawW, drawH);
    layerCtx.restore();

    // Draw layer onto main canvas with drop shadow
    ctx.save();
    if (hasShadow) {
      const hex = shadowColor.replace("#", "");
      const r = parseInt(hex.length === 3 ? hex[0]+hex[0] : hex.substring(0,2), 16) || 0;
      const g = parseInt(hex.length === 3 ? hex[1]+hex[1] : hex.substring(2,4), 16) || 0;
      const b = parseInt(hex.length === 3 ? hex[2]+hex[2] : hex.substring(4,6), 16) || 0;
      
      ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${shadowOpacity / 100})`;
      ctx.shadowBlur = sBlur;
      ctx.shadowOffsetX = sOffsetX;
      ctx.shadowOffsetY = sOffsetY;
    }
    ctx.drawImage(layerCanvas, 0, 0);
    ctx.restore();

  }, [shape, radius, hasShadow, shadowBlur, shadowOffsetX, shadowOffsetY, shadowOpacity, shadowColor, hasOutline, outlineWidth, outlineColor, outlineOpacity]);

  // Sync active image to main preview canvas
  useEffect(() => {
    if (canvasRef.current && activeImage) {
      drawToCanvas(canvasRef.current, activeImage);
    }
  }, [activeImage, drawToCanvas]);

  const handleDownload = async () => {
    if (images.length === 0) return;

    if (images.length === 1) {
      const canvas = document.createElement("canvas");
      drawToCanvas(canvas, images[0].obj);
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `export-${images[0].file.name.replace(/\.[^/.]+$/, "")}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      
      for (let i = 0; i < images.length; i++) {
        const canvas = document.createElement("canvas");
        drawToCanvas(canvas, images[i].obj);
        const dataUrl = canvas.toDataURL("image/png").split(',')[1];
        zip.file(`export-${i+1}-${images[i].file.name.replace(/\.[^/.]+$/, "")}.png`, dataUrl, {base64: true});
      }
      
      const content = await zip.generateAsync({type:"blob"});
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `squircle-batch-${images.length}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const removeImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setImages(prev => {
      const next = prev.filter(img => img.id !== id);
      if (activeImageId === id) {
        setActiveImageId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  };

  const clearAll = () => {
    setImages([]);
    setActiveImageId(null);
  };

  if (images.length === 0) {
    return (
      <div
        className="w-full max-w-2xl mx-auto aspect-video rounded-2xl border border-dashed border-border bg-card text-card-foreground flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => document.getElementById("file-upload")?.click()}
      >
        <UploadCloud className="w-10 h-10 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Drop images here</h3>
        <p className="text-sm text-muted-foreground mt-1">or click to select multiple files</p>
        <input
          id="file-upload"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  const checkerboardLight = "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSIjZmZmIi8+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZTBlMGUwIi8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNlMGUwZTAiLz48L3N2Zz4=')";

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-8">
      <div className="w-full flex items-center justify-between gap-4">
        <div className="flex gap-2 overflow-x-auto px-2 py-3 scrollbar-hide flex-1">
          {images.map(img => (
            <div 
              key={img.id} 
              className={`relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${activeImageId === img.id ? 'border-primary ring-2 ring-ring ring-offset-2 ring-offset-background' : 'border-transparent opacity-60 hover:opacity-100'}`} 
              onClick={() => setActiveImageId(img.id)}
            >
              <img alt="" src={img.url} className="w-full h-full object-cover" />
              <button 
                onClick={(e) => removeImage(img.id, e)}
                className="absolute top-0.5 right-0.5 bg-background/80 text-foreground rounded-full p-0.5 hover:bg-destructive hover:text-destructive-foreground transition-colors"
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
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground shrink-0">
          Clear All
        </Button>
      </div>

      <div 
        className={`w-full rounded-3xl border border-border p-6 shadow-sm flex items-center justify-center overflow-hidden aspect-square sm:aspect-video relative transition-colors ${previewBg === "dark" ? "preview-surface" : "bg-white"}`}
        style={previewBg === "light" ? { backgroundImage: checkerboardLight } : undefined}
      >
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full object-contain pointer-events-none"
        />
        
        <div className="absolute top-4 right-4 flex bg-background/80 backdrop-blur-md rounded-full p-1 border border-border">
          <button 
            className={`p-1.5 rounded-full transition-colors ${previewBg === "dark" ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            onClick={() => setPreviewBg("dark")}
          >
            <Moon className="w-4 h-4" />
          </button>
          <button 
            className={`p-1.5 rounded-full transition-colors ${previewBg === "light" ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            onClick={() => setPreviewBg("light")}
          >
            <Sun className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="w-full space-y-6 px-2">
        <Tabs value={shape} onValueChange={(v) => setShape(v as "round" | "squircle")}>
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
            value={[radius]}
            onValueChange={(v) => setRadius(Array.isArray(v) ? v[0] : v)}
            min={0}
            max={100}
            step={1}
            className="cursor-ew-resize"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setHasShadow(!hasShadow)}>
              <label className="text-sm font-semibold text-foreground tracking-wide cursor-pointer pointer-events-none">
                Drop Shadow
              </label>
              <Switch checked={hasShadow} onCheckedChange={setHasShadow} />
            </div>
            
            {hasShadow && (
              <div className="p-4 pt-0 space-y-5 border-t border-border/50 bg-muted/10">
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Blur</span>
                    <span className="text-xs">{shadowBlur}px</span>
                  </div>
                  <Slider value={[shadowBlur]} onValueChange={v => setShadowBlur(Array.isArray(v) ? v[0] : v)} min={0} max={100} step={1} />
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Opacity</span>
                    <span className="text-xs">{shadowOpacity}%</span>
                  </div>
                  <Slider value={[shadowOpacity]} onValueChange={v => setShadowOpacity(Array.isArray(v) ? v[0] : v)} min={0} max={100} step={1} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Offset X</span>
                      <span className="text-xs">{shadowOffsetX}px</span>
                    </div>
                    <Slider value={[shadowOffsetX]} onValueChange={v => setShadowOffsetX(Array.isArray(v) ? v[0] : v)} min={-100} max={100} step={1} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-xs text-muted-foreground">Offset Y</span>
                      <span className="text-xs">{shadowOffsetY}px</span>
                    </div>
                    <Slider value={[shadowOffsetY]} onValueChange={v => setShadowOffsetY(Array.isArray(v) ? v[0] : v)} min={-100} max={100} step={1} />
                  </div>
                </div>

                <ColorField label="Shadow Color" onChange={setShadowColor} value={shadowColor} />
              </div>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setHasOutline(!hasOutline)}>
              <label className="text-sm font-semibold text-foreground tracking-wide cursor-pointer pointer-events-none">
                Outer Outline
              </label>
              <Switch checked={hasOutline} onCheckedChange={setHasOutline} />
            </div>
            
            {hasOutline && (
              <div className="p-4 pt-0 space-y-5 border-t border-border/50 bg-muted/10">
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Width</span>
                    <span className="text-xs">{outlineWidth}px</span>
                  </div>
                  <Slider value={[outlineWidth]} onValueChange={v => setOutlineWidth(Array.isArray(v) ? v[0] : v)} min={1} max={50} step={1} />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">Opacity</span>
                    <span className="text-xs">{outlineOpacity}%</span>
                  </div>
                  <Slider value={[outlineOpacity]} onValueChange={v => setOutlineOpacity(Array.isArray(v) ? v[0] : v)} min={0} max={100} step={1} />
                </div>

                <ColorField label="Outline Color" onChange={setOutlineColor} value={outlineColor} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 flex flex-col items-center">
        <Button onClick={handleDownload} size="lg" className="rounded-xl px-12 font-medium shadow-sm active:scale-95 transition-transform h-11 text-lg sm:h-10 sm:text-base">
          Download {images.length > 1 ? `All (${images.length} Images)` : 'PNG'}
        </Button>
        {images.length > 1 && (
          <p className="text-xs text-muted-foreground mt-3">Batch download will be provided as a .zip file</p>
        )}
      </div>
    </div>
  );
}
