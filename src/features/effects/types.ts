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
    // Brightness in range [-100, 100]
    brightness: number;
    // Contrast in range [-100, 100]
    contrast: number;
  }
  | {
    type: "hueSaturation";
    // Hue in degrees [0, 360)
    hue: number;
    // Saturation in range [-100, 100]
    saturation: number;
    // Lightness in range [-100, 100]
    lightness: number;
  }
  | {
    type: "colorBalance";
    // Cyan, Magenta, Yellow in range [-100, 100]
    cyan: number;
    magenta: number;
    yellow: number;
  }
