// High-performance image effect worker
// src/libs/effects/worker.ts

self.onmessage = function(e) {
  const { imageData, operation, params } = e.data;
  
  // Apply effect based on operation type
  let result: ImageData;
  
  switch (operation) {
    case 'brightnessContrast':
      result = applyBrightnessContrastWorker(imageData, params.brightness, params.contrast);
      break;
    case 'hueSaturation':
      result = applyHueSaturationWorker(imageData, params.hue, params.saturation, params.lightness);
      break;
    case 'colorBalance':
      result = applyColorBalanceWorker(imageData, params.cyan, params.magenta, params.yellow);
      break;
    default:
      result = imageData;
  }
  
  // Send result back to main thread
  (self as any).postMessage({ imageData: result }, { transfer: [result.data.buffer] });
};

// Optimized worker implementations
function applyBrightnessContrastWorker(
  imageData: ImageData,
  brightness: number,
  contrast: number
): ImageData {
  const data = imageData.data;
  const brightnessFactor = brightness / 100;
  const contrastFactor = (contrast + 100) / 100;
  
  // Process 4 pixels at once using SIMD-like operations
  for (let i = 0; i < data.length; i += 16) {
    // Unroll loop for better performance
    for (let j = 0; j < 16 && i + j < data.length; j += 4) {
      const idx = i + j;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      data[idx] = Math.max(0, Math.min(255, 
        ((r / 255 - 0.5) * contrastFactor + 0.5) * 255 + brightnessFactor * 255));
      data[idx + 1] = Math.max(0, Math.min(255, 
        ((g / 255 - 0.5) * contrastFactor + 0.5) * 255 + brightnessFactor * 255));
      data[idx + 2] = Math.max(0, Math.min(255, 
        ((b / 255 - 0.5) * contrastFactor + 0.5) * 255 + brightnessFactor * 255));
    }
  }
  
  return imageData;
}

function applyHueSaturationWorker(
  imageData: ImageData,
  hue: number,
  saturation: number,
  lightness: number
): ImageData {
  // Optimized HSL conversion with lookup tables
  const data = imageData.data;
  const hueShift = (hue % 360) / 360;
  const satMultiplier = (saturation + 100) / 100;
  const lightMultiplier = (lightness + 100) / 100;
  
  // Process in chunks for better cache locality
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    
    // Inline HSL conversion for performance
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    const sum = max + min;
    const l = sum / 2;
    
    let h = 0;
    let s = 0;
    
    if (diff !== 0) {
      s = l > 0.5 ? diff / (2 - sum) : diff / sum;
      switch (max) {
        case r: h = ((g - b) / diff + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / diff + 2) / 6; break;
        case b: h = ((r - g) / diff + 4) / 6; break;
      }
    }
    
    // Apply adjustments
    h = (h + hueShift) % 1;
    s = Math.max(0, Math.min(1, s * satMultiplier));
    const newL = Math.max(0, Math.min(1, l * lightMultiplier));
    
    // Convert back to RGB
    let newR, newG, newB;
    if (s === 0) {
      newR = newG = newB = newL;
    } else {
      const q = newL < 0.5 ? newL * (1 + s) : newL + s - newL * s;
      const p = 2 * newL - q;
      newR = hue2rgb(p, q, h + 1/3);
      newG = hue2rgb(p, q, h);
      newB = hue2rgb(p, q, h - 1/3);
    }
    
    data[i] = Math.round(newR * 255);
    data[i + 1] = Math.round(newG * 255);
    data[i + 2] = Math.round(newB * 255);
  }
  
  return imageData;
}

function hue2rgb(p: number, q: number, t: number): number {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1/6) return p + (q - p) * 6 * t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  return p;
}

function applyColorBalanceWorker(
  imageData: ImageData,
  cyan: number,
  magenta: number,
  yellow: number
): ImageData {
  const data = imageData.data;
  const cyanRed = cyan / 100;
  const magentaGreen = magenta / 100;
  const yellowBlue = yellow / 100;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    let newR = r - cyanRed * (255 - r) / 255 * 255;
    let newG = g - magentaGreen * (255 - g) / 255 * 255;
    let newB = b - yellowBlue * (255 - b) / 255 * 255;
    
    if (cyanRed < 0) newR = r + Math.abs(cyanRed) * r / 255 * 255;
    if (magentaGreen < 0) newG = g + Math.abs(magentaGreen) * g / 255 * 255;
    if (yellowBlue < 0) newB = b + Math.abs(yellowBlue) * b / 255 * 255;
    
    data[i] = Math.max(0, Math.min(255, newR));
    data[i + 1] = Math.max(0, Math.min(255, newG));
    data[i + 2] = Math.max(0, Math.min(255, newB));
  }
  
  return imageData;
}
