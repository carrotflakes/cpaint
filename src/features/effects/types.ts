export type Effect =
  | {
    type: "blur";
    radius: number;
  }
  | {
    type: "boxBlur";
    radius: number;
  }
  | {
    type: "pixelate";
    pixelSize: number;
  }
  | {
    type: "brightnessContrast";
    brightness: number;
    contrast: number;
  }
  | {
    type: "hueSaturation";
    hue: number;
    saturation: number;
    lightness: number;
  }
  | {
    type: "colorBalance";
    cyan: number;
    magenta: number;
    yellow: number;
  }
