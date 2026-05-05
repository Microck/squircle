/**
 * WebGL-powered pixel-snow background effect.
 *
 * Why WebGL / Three.js instead of CSS animation or Canvas 2D?
 *  – CSS `@keyframes` can't do per-pixel ray-marching; the snowflake SDF
 *    and depth traversal require a fragment shader.
 *  – Canvas 2D is CPU-bound and can't hit a stable 30 fps at high
 *    resolutions without dropping frames.
 *  – A full-screen quad with a fragment shader gives pixel-perfect
 *    control at variable resolution and keeps the main thread free.
 *
 * Based on the ReactBits PixelSnow component (MIT-licensed).
 * See: https://www.reactbits.dev/backgrounds/pixel-snow
 */

"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { logClientError } from "@/lib/client-log";
import {
  Color,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";

const SNOW_TARGET_FPS = 30;
const SNOW_FRAME_INTERVAL_MS = 1000 / SNOW_TARGET_FPS;

const vertexShader = `
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
precision mediump float;

uniform float uTime;
uniform vec2 uResolution;
uniform float uFlakeSize;
uniform float uMinFlakeSize;
uniform float uPixelResolution;
uniform float uSpeed;
uniform float uDepthFade;
uniform float uFarPlane;
uniform vec3 uColor;
uniform float uBrightness;
uniform float uGamma;
uniform float uDensity;
uniform float uVariant;
uniform float uDirection;

#define PI 3.14159265
#define PI_OVER_6 0.5235988
#define PI_OVER_3 1.0471976
#define M1 1597334677U
#define M2 3812015801U
#define M3 3299493293U
#define F0 2.3283064e-10

#define hash(n) (n * (n ^ (n >> 15)))
#define coord3(p) (uvec3(p).x * M1 ^ uvec3(p).y * M2 ^ uvec3(p).z * M3)

const vec3 camK = vec3(0.57735027, 0.57735027, 0.57735027);
const vec3 camI = vec3(0.70710678, 0.0, -0.70710678);
const vec3 camJ = vec3(-0.40824829, 0.81649658, -0.40824829);
const vec2 b1d = vec2(0.574, 0.819);

vec3 hash3(uint n) {
  uvec3 hashed = hash(n) * uvec3(1U, 511U, 262143U);
  return vec3(hashed) * F0;
}

float snowflakeDist(vec2 p) {
  float r = length(p);
  float a = atan(p.y, p.x);
  a = abs(mod(a + PI_OVER_6, PI_OVER_3) - PI_OVER_6);
  vec2 q = r * vec2(cos(a), sin(a));
  float dMain = max(abs(q.y), max(-q.x, q.x - 1.0));
  float b1t = clamp(dot(q - vec2(0.4, 0.0), b1d), 0.0, 0.4);
  float dB1 = length(q - vec2(0.4, 0.0) - b1t * b1d);
  float b2t = clamp(dot(q - vec2(0.7, 0.0), b1d), 0.0, 0.25);
  float dB2 = length(q - vec2(0.7, 0.0) - b2t * b1d);
  return min(dMain, min(dB1, dB2)) * 10.0;
}

void main() {
  float invPixelRes = 1.0 / uPixelResolution;
  float pixelSize = max(1.0, floor(0.5 + uResolution.x * invPixelRes));
  float invPixelSize = 1.0 / pixelSize;
  
  vec2 fragCoord = floor(gl_FragCoord.xy * invPixelSize);
  vec2 res = uResolution * invPixelSize;
  float invResX = 1.0 / res.x;

  vec3 ray = normalize(vec3((fragCoord - res * 0.5) * invResX, 1.0));
  ray = ray.x * camI + ray.y * camJ + ray.z * camK;

  float timeSpeed = uTime * uSpeed;
  float windX = cos(uDirection) * 0.4;
  float windY = sin(uDirection) * 0.4;
  vec3 camPos = (windX * camI + windY * camJ + 0.1 * camK) * timeSpeed;
  vec3 pos = camPos;

  vec3 absRay = max(abs(ray), vec3(0.001));
  vec3 strides = 1.0 / absRay;
  vec3 raySign = step(ray, vec3(0.0));
  vec3 phase = fract(pos) * strides;
  phase = mix(strides - phase, phase, raySign);

  float rayDotCamK = dot(ray, camK);
  float invRayDotCamK = 1.0 / rayDotCamK;
  float invDepthFade = 1.0 / uDepthFade;
  float halfInvResX = 0.5 * invResX;
  vec3 timeAnim = timeSpeed * 0.1 * vec3(7.0, 8.0, 5.0);

  float t = 0.0;
  for (int i = 0; i < 128; i++) {
    if (t >= uFarPlane) break;
    
    vec3 fpos = floor(pos);
    uint cellCoord = coord3(fpos);
    float cellHash = hash3(cellCoord).x;

    if (cellHash < uDensity) {
      vec3 h = hash3(cellCoord);
      vec3 sinArg1 = fpos.yzx * 0.073;
      vec3 sinArg2 = fpos.zxy * 0.27;
      vec3 flakePos = 0.5 - 0.5 * cos(4.0 * sin(sinArg1) + 4.0 * sin(sinArg2) + 2.0 * h + timeAnim);
      flakePos = flakePos * 0.8 + 0.1 + fpos;

      float toIntersection = dot(flakePos - pos, camK) * invRayDotCamK;
      
      if (toIntersection > 0.0) {
        vec3 testPos = pos + ray * toIntersection - flakePos;
        float testX = dot(testPos, camI);
        float testY = dot(testPos, camJ);
        vec2 testUV = abs(vec2(testX, testY));
        
        float depth = dot(flakePos - camPos, camK);
        float flakeSize = max(uFlakeSize, uMinFlakeSize * depth * halfInvResX);
        
        float dist;
        if (uVariant < 0.5) {
          dist = max(testUV.x, testUV.y);
        } else if (uVariant < 1.5) {
          dist = length(testUV);
        } else {
          float invFlakeSize = 1.0 / flakeSize;
          dist = snowflakeDist(vec2(testX, testY) * invFlakeSize) * flakeSize;
        }

        if (dist < flakeSize) {
          float flakeSizeRatio = uFlakeSize / flakeSize;
          float intensity = exp2(-(t + toIntersection) * invDepthFade) *
                           min(1.0, flakeSizeRatio * flakeSizeRatio) * uBrightness;
          gl_FragColor = vec4(uColor * pow(vec3(intensity), vec3(uGamma)), 1.0);
          return;
        }
      }
    }

    float nextStep = min(min(phase.x, phase.y), phase.z);
    vec3 sel = step(phase, vec3(nextStep));
    phase = phase - nextStep + strides * sel;
    t += nextStep;
    pos = mix(pos + ray * nextStep, floor(pos + ray * nextStep + 0.5), sel);
  }

  gl_FragColor = vec4(0.0);
}
`;

interface PixelSnowProps {
  brightness?: number;
  className?: string;
  color?: string;
  density?: number;
  depthFade?: number;
  direction?: number;
  farPlane?: number;
  flakeSize?: number;
  gamma?: number;
  minFlakeSize?: number;
  pixelResolution?: number;
  speed?: number;
  style?: React.CSSProperties;
  variant?: "square" | "round" | "snowflake";
}

function PixelSnow({
  color = "#ffffff",
  flakeSize = 0.01,
  minFlakeSize = 1.25,
  pixelResolution = 200,
  speed = 1.25,
  depthFade = 8,
  farPlane = 20,
  brightness = 1,
  gamma = 0.4545,
  density = 0.3,
  variant = "square",
  direction = 125,
  className = "",
  style = {},
}: PixelSnowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const isVisibleRef = useRef(true);
  const isPageVisibleRef = useRef(true);
  const lastRenderTimeRef = useRef(0);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const materialRef = useRef<ShaderMaterial | null>(null);
  const resizeTimeoutRef = useRef<number | null>(null);

  const variantValue = useMemo(() => {
    return variant === "round" ? 1 : variant === "snowflake" ? 2 : 0;
  }, [variant]);

  const colorVector = useMemo(() => {
    const threeColor = new Color(color);
    return new Vector3(threeColor.r, threeColor.g, threeColor.b);
  }, [color]);

  const handleResize = useCallback(() => {
    if (resizeTimeoutRef.current) {
      clearTimeout(resizeTimeoutRef.current);
    }

    resizeTimeoutRef.current = window.setTimeout(() => {
      const container = containerRef.current;
      const renderer = rendererRef.current;
      const material = materialRef.current;
      if (!container || !renderer || !material) {
        return;
      }

      const width = container.offsetWidth;
      const height = container.offsetHeight;
      renderer.setSize(width, height);
      material.uniforms.uResolution.value.set(width, height);
    }, 100);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      isPageVisibleRef.current = !document.hidden;
    };

    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let scene: Scene | null = null;
    let camera: OrthographicCamera | null = null;
    let renderer: WebGLRenderer | null = null;
    let material: ShaderMaterial | null = null;
    let geometry: PlaneGeometry | null = null;

    try {
      scene = new Scene();
      camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
      renderer = new WebGLRenderer({
        alpha: true,
        antialias: false,
        depth: false,
        powerPreference: "high-performance",
        premultipliedAlpha: false,
        stencil: false,
      });

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(container.offsetWidth, container.offsetHeight);
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      material = new ShaderMaterial({
        fragmentShader,
        uniforms: {
          uBrightness: { value: brightness },
          uColor: { value: colorVector.clone() },
          uDensity: { value: density },
          uDepthFade: { value: depthFade },
          uDirection: { value: (direction * Math.PI) / 180 },
          uFarPlane: { value: farPlane },
          uFlakeSize: { value: flakeSize },
          uGamma: { value: gamma },
          uMinFlakeSize: { value: minFlakeSize },
          uPixelResolution: { value: pixelResolution },
          uResolution: { value: new Vector2(container.offsetWidth, container.offsetHeight) },
          uSpeed: { value: speed },
          uTime: { value: 0 },
          uVariant: { value: variantValue },
        },
        transparent: true,
        vertexShader,
      });
      materialRef.current = material;

      geometry = new PlaneGeometry(2, 2);
      scene.add(new Mesh(geometry, material));
    } catch (error) {
      logClientError("PixelSnow init failed", error);
      return;
    }

    window.addEventListener("resize", handleResize);

    const startTime = performance.now();
    lastRenderTimeRef.current = 0;

    const animate = (now: number) => {
      animationRef.current = requestAnimationFrame(animate);

      if (!isVisibleRef.current || !isPageVisibleRef.current || !renderer || !material || !camera) {
        return;
      }

      if (lastRenderTimeRef.current !== 0 && now - lastRenderTimeRef.current < SNOW_FRAME_INTERVAL_MS) {
        return;
      }

      lastRenderTimeRef.current = now;
      material.uniforms.uTime.value = (now - startTime) * 0.001;
      renderer.render(scene, camera);
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      renderer.forceContextLoss();
      geometry?.dispose();
      material?.dispose();
      rendererRef.current = null;
      materialRef.current = null;
    };
    // Upstream ReactBits component initializes the scene once, then updates uniforms separately.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleResize]);

  useEffect(() => {
    const material = materialRef.current;
    if (!material) {
      return;
    }

    material.uniforms.uFlakeSize.value = flakeSize;
    material.uniforms.uMinFlakeSize.value = minFlakeSize;
    material.uniforms.uPixelResolution.value = pixelResolution;
    material.uniforms.uSpeed.value = speed;
    material.uniforms.uDepthFade.value = depthFade;
    material.uniforms.uFarPlane.value = farPlane;
    material.uniforms.uBrightness.value = brightness;
    material.uniforms.uGamma.value = gamma;
    material.uniforms.uDensity.value = density;
    material.uniforms.uVariant.value = variantValue;
    material.uniforms.uDirection.value = (direction * Math.PI) / 180;
    material.uniforms.uColor.value.copy(colorVector);
  }, [brightness, colorVector, density, depthFade, direction, farPlane, flakeSize, gamma, minFlakeSize, pixelResolution, speed, variantValue]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 transform-gpu [backface-visibility:hidden] [will-change:transform] ${className}`}
      style={style}
    />
  );
}

export function PixelSnowBackground() {
  return (
    <PixelSnow
      className="pointer-events-none z-0"
      color="#AD4F48"
      variant="round"
    />
  );
}
