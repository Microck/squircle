"use client";

import Color from "color";
import { logClientError } from "@/lib/client-log";
import { PipetteIcon } from "lucide-react";
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SliderPrimitive } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface ColorPickerContextValue {
  alpha: number;
  brightness: number;
  hue: number;
  mode: string;
  saturation: number;
  setAlpha: (alpha: number) => void;
  setBrightness: (brightness: number) => void;
  setHue: (hue: number) => void;
  setMode: (mode: string) => void;
  setSaturation: (saturation: number) => void;
}

const ColorPickerContext = createContext<ColorPickerContextValue | undefined>(undefined);

type ColorPickerState = {
  alpha: number;
  brightness: number;
  hue: number;
  saturation: number;
};

const FORMATS = ["hex", "rgb", "css", "hsl"] as const;
const COLOR_PICKER_SLIDER_CONTROL_CLASS =
  "flex touch-none select-none items-center data-disabled:pointer-events-none data-disabled:opacity-64 data-[orientation=horizontal]:w-full";
const COLOR_PICKER_SLIDER_THUMB_CLASS =
  "block size-4 shrink-0 rounded-full border border-primary/50 bg-background shadow-xs/5 outline-none transition-[box-shadow,scale] has-focus-visible:ring-[3px] has-focus-visible:ring-ring/24 data-dragging:scale-110 disabled:pointer-events-none disabled:opacity-50 dark:border-background";

const clampChannel = (value: number, fallback: number) =>
  Number.isFinite(value) ? value : fallback;

const getPickerState = (input: Parameters<typeof Color>[0], fallback: Parameters<typeof Color>[0]): ColorPickerState => {
  const color = Color(input ?? fallback);
  const [hue = 0, saturation = 0, brightness = 0] = color.hsv().array();

  return {
    alpha: clampChannel(color.alpha() * 100, 100),
    brightness: clampChannel(brightness, 0),
    hue: clampChannel(hue, 0),
    saturation: clampChannel(saturation, 0),
  };
};

export const useColorPicker = () => {
  const context = useContext(ColorPickerContext);
  if (!context) {
    throw new Error("useColorPicker must be used within a ColorPickerProvider");
  }

  return context;
};

export type ColorPickerProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> & {
  defaultValue?: Parameters<typeof Color>[0];
  onChange?: (value: ReturnType<typeof Color>) => void;
  value?: Parameters<typeof Color>[0];
};

export const ColorPicker = ({
  value,
  defaultValue = "#000000",
  onChange,
  className,
  children,
  ...props
}: ColorPickerProps) => {
  const [state, setState] = useState(() => getPickerState(value, defaultValue));
  const [mode, setMode] = useState<string>("hex");
  const resolvedState = value === undefined ? state : getPickerState(value, defaultValue);
  const stateRef = useRef(resolvedState);

  useEffect(() => {
    stateRef.current = resolvedState;
  }, [resolvedState]);

  const updateState = useCallback(
    (patch: Partial<ColorPickerState>) => {
      const nextState = { ...stateRef.current, ...patch };
      stateRef.current = nextState;
      if (value === undefined) {
        setState(nextState);
      }

      onChange?.(
        Color.hsv(nextState.hue, nextState.saturation, nextState.brightness).alpha(
          nextState.alpha / 100,
        ),
      );
    },
    [onChange, value],
  );

  const setHue = useCallback((nextHue: number) => updateState({ hue: nextHue }), [updateState]);
  const setSaturation = useCallback(
    (nextSaturation: number) => updateState({ saturation: nextSaturation }),
    [updateState],
  );
  const setBrightness = useCallback(
    (nextBrightness: number) => updateState({ brightness: nextBrightness }),
    [updateState],
  );
  const setAlpha = useCallback((nextAlpha: number) => updateState({ alpha: nextAlpha }), [updateState]);

  return (
    <ColorPickerContext.Provider
      value={{
        alpha: resolvedState.alpha,
        brightness: resolvedState.brightness,
        hue: resolvedState.hue,
        mode,
        saturation: resolvedState.saturation,
        setAlpha,
        setBrightness,
        setHue,
        setMode,
        setSaturation,
      }}
    >
      <div className={cn("flex size-full flex-col gap-4", className)} {...props}>
        {children}
      </div>
    </ColorPickerContext.Provider>
  );
};

export type ColorPickerSelectionProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerSelection = memo(({ className, ...props }: ColorPickerSelectionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const { hue, saturation, brightness, setSaturation, setBrightness } = useColorPicker();

  const backgroundGradient = useMemo(
    () =>
      `linear-gradient(0deg, rgba(0,0,0,1), rgba(0,0,0,0)),
       linear-gradient(90deg, rgba(255,255,255,1), rgba(255,255,255,0)),
       hsl(${hue}, 100%, 50%)`,
    [hue],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!(draggingRef.current && containerRef.current)) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

      setSaturation(x * 100);
      setBrightness((1 - y) * 100);
    },
    [setBrightness, setSaturation],
  );

  useEffect(() => {
    const handleWindowPointerUp = () => {
      draggingRef.current = false;
      setIsDragging(false);
    };

    if (!isDragging) {
      return;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
    };
  }, [handlePointerMove, isDragging]);

  return (
    <div
      className={cn("relative size-full cursor-crosshair rounded", className)}
      onPointerDown={(event) => {
        event.preventDefault();
        draggingRef.current = true;
        setIsDragging(true);
        handlePointerMove(event.nativeEvent);
      }}
      ref={containerRef}
      style={{ background: backgroundGradient }}
      {...props}
    >
      <div
        className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute h-4 w-4 rounded-full border-2 border-white"
        style={{
          boxShadow: "0 0 0 1px rgba(0,0,0,0.5)",
          left: `${saturation}%`,
          top: `${100 - brightness}%`,
        }}
      />
    </div>
  );
});

ColorPickerSelection.displayName = "ColorPickerSelection";

export type ColorPickerHueProps = SliderPrimitive.Root.Props<number>;

export const ColorPickerHue = ({ className, ...props }: ColorPickerHueProps) => {
  const { hue, setHue } = useColorPicker();

  return (
    <SliderPrimitive.Root
      className={cn("w-full", className)}
      max={360}
      min={0}
      onValueChange={setHue}
      orientation="horizontal"
      step={1}
      thumbAlignment="edge"
      value={hue}
      {...props}
    >
      <SliderPrimitive.Control
        className={COLOR_PICKER_SLIDER_CONTROL_CLASS}
        data-slot="color-picker-slider-control"
      >
        <SliderPrimitive.Track
          className="relative h-3 w-full grow rounded-full bg-[linear-gradient(90deg,#FF0000,#FFFF00,#00FF00,#00FFFF,#0000FF,#FF00FF,#FF0000)]"
          data-slot="color-picker-slider-track"
        >
          <SliderPrimitive.Indicator
            className="absolute inset-y-0 left-0 rounded-full bg-transparent"
            data-slot="color-picker-slider-indicator"
          />
          <SliderPrimitive.Thumb
            className={COLOR_PICKER_SLIDER_THUMB_CLASS}
            data-slot="color-picker-slider-thumb"
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
};

export type ColorPickerAlphaProps = SliderPrimitive.Root.Props<number>;

export const ColorPickerAlpha = ({ className, ...props }: ColorPickerAlphaProps) => {
  const { alpha, brightness, hue, saturation, setAlpha } = useColorPicker();
  const opaqueColor = Color.hsv(hue, saturation, brightness).alpha(1).rgb().string();
  const transparentColor = Color.hsv(hue, saturation, brightness).alpha(0).rgb().string();

  return (
    <SliderPrimitive.Root
      className={cn("w-full", className)}
      max={100}
      min={0}
      onValueChange={setAlpha}
      orientation="horizontal"
      step={1}
      thumbAlignment="edge"
      value={alpha}
      {...props}
    >
      <SliderPrimitive.Control
        className={COLOR_PICKER_SLIDER_CONTROL_CLASS}
        data-slot="color-picker-slider-control"
      >
        <SliderPrimitive.Track
          className="relative h-3 w-full grow rounded-full"
          data-slot="color-picker-slider-track"
          style={{
            background:
              'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==") left center',
          }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: `linear-gradient(90deg, ${transparentColor}, ${opaqueColor})` }}
          />
          <SliderPrimitive.Indicator
            className="absolute inset-y-0 left-0 rounded-full bg-transparent"
            data-slot="color-picker-slider-indicator"
          />
          <SliderPrimitive.Thumb
            className={COLOR_PICKER_SLIDER_THUMB_CLASS}
            data-slot="color-picker-slider-thumb"
          />
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
};

export type ColorPickerEyeDropperProps = ComponentProps<typeof Button>;

export const ColorPickerEyeDropper = ({ className, ...props }: ColorPickerEyeDropperProps) => {
  const { setHue, setSaturation, setBrightness, setAlpha } = useColorPicker();
  const isSupported = typeof window !== "undefined" && "EyeDropper" in window;

  const handleEyeDropper = async () => {
    if (!isSupported) {
      return;
    }

    try {
      // @ts-expect-error experimental browser API
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      const color = Color(result.sRGBHex);
      const [hue, saturation, brightness] = color.hsv().array();

      setHue(hue);
      setSaturation(saturation);
      setBrightness(brightness);
      setAlpha(100);
    } catch (error) {
      logClientError("EyeDropper failed", error);
    }
  };

  return (
    <Button
      className={cn("shrink-0 text-muted-foreground", className)}
      disabled={!isSupported}
      onClick={handleEyeDropper}
      size="icon"
      type="button"
      variant="outline"
      {...props}
    >
      <PipetteIcon size={16} />
    </Button>
  );
};

export type ColorPickerOutputProps = ComponentProps<typeof SelectTrigger>;

export const ColorPickerOutput = ({ className, ...props }: ColorPickerOutputProps) => {
  const { mode, setMode } = useColorPicker();

  return (
    <Select onValueChange={setMode} value={mode}>
      <SelectTrigger className={cn("h-8 w-20 shrink-0 text-xs", className)} {...props}>
        <SelectValue placeholder="Mode" />
      </SelectTrigger>
      <SelectContent>
        {FORMATS.map((format) => (
          <SelectItem className="text-xs" key={format} value={format}>
            {format.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

type PercentageInputProps = ComponentProps<typeof Input>;

const PercentageInput = ({ className, ...props }: PercentageInputProps) => {
  return (
    <div className="relative">
      <Input
        readOnly
        type="text"
        {...props}
        className={cn(
          "h-8 w-[3.25rem] rounded-l-none bg-secondary px-2 text-xs shadow-none",
          className,
        )}
      />
      <span className="-translate-y-1/2 absolute right-2 top-1/2 text-xs text-muted-foreground">
        %
      </span>
    </div>
  );
};

export type ColorPickerFormatProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerFormat = ({ className, ...props }: ColorPickerFormatProps) => {
  const { alpha, brightness, hue, mode, saturation } = useColorPicker();
  const color = Color.hsv(hue, saturation, brightness).alpha(alpha / 100);

  if (mode === "hex") {
    return (
      <div
        className={cn("-space-x-px relative flex w-full items-center rounded-md shadow-sm", className)}
        {...props}
      >
        <Input
          className="h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none"
          readOnly
          type="text"
          value={color.hex()}
        />
        <PercentageInput value={alpha} />
      </div>
    );
  }

  if (mode === "rgb") {
    const values = color.rgb().array().map((value) => Math.round(value));

    return (
      <div className={cn("-space-x-px flex items-center rounded-md shadow-sm", className)} {...props}>
        {values.map((value, index) => (
          <Input
            className={cn(
              "h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none",
              index > 0 && "rounded-l-none",
            )}
            key={index}
            readOnly
            type="text"
            value={value}
          />
        ))}
        <PercentageInput value={alpha} />
      </div>
    );
  }

  if (mode === "css") {
    const values = color.rgb().array().map((value) => Math.round(value));

    return (
      <div className={cn("w-full rounded-md shadow-sm", className)} {...props}>
        <Input
          className="h-8 w-full bg-secondary px-2 text-xs shadow-none"
          readOnly
          type="text"
          value={`rgba(${values.join(", ")}, ${alpha}%)`}
        />
      </div>
    );
  }

  const values = color.hsl().array().map((value) => Math.round(value));

  return (
    <div className={cn("-space-x-px flex items-center rounded-md shadow-sm", className)} {...props}>
      {values.map((value, index) => (
        <Input
          className={cn(
            "h-8 rounded-r-none bg-secondary px-2 text-xs shadow-none",
            index > 0 && "rounded-l-none",
          )}
          key={index}
          readOnly
          type="text"
          value={value}
        />
      ))}
      <PercentageInput value={alpha} />
    </div>
  );
};

export function Demo() {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-8">
      <ColorPicker defaultValue="#6366f1" className="h-auto w-64">
        <ColorPickerSelection className="h-40 rounded-lg" />
        <ColorPickerHue />
        <ColorPickerAlpha />
        <div className="flex items-center gap-2">
          <ColorPickerEyeDropper />
          <ColorPickerOutput />
          <ColorPickerFormat />
        </div>
      </ColorPicker>
    </div>
  );
}
