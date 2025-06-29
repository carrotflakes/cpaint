export const vertexShaderSource = `#version 300 es
in vec2 a_position;
in vec2 a_texCoord;

out vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

export const fragmentShaderBase = `#version 300 es
precision mediump float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
`;

export const blurFragmentShader = `${fragmentShaderBase}
uniform float u_radius;

void main() {
  vec2 texelSize = 1.0 / u_resolution;
  vec4 color = vec4(0.0);
  float total = 0.0;
  
  int samples = int(u_radius * 2.0) + 1;
  float start = -u_radius;
  
  for (int x = 0; x < samples; x++) {
    for (int y = 0; y < samples; y++) {
      vec2 offset = vec2(start + float(x), start + float(y)) * texelSize;
      float weight = 1.0;
      color += texture(u_texture, v_texCoord + offset) * weight;
      total += weight;
    }
  }
  
  fragColor = color / total;
}
`;

export const brightnessContrastFragmentShader = `${fragmentShaderBase}
uniform float u_brightness;
uniform float u_contrast;

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  
  color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;
  color.rgb += u_brightness;
  
  fragColor = clamp(color, 0.0, 1.0);
}
`;

export const hueSaturationFragmentShader = `${fragmentShaderBase}
uniform float u_hue;
uniform float u_saturation;
uniform float u_lightness;

vec3 rgb2hsl(vec3 rgb) {
  float maxVal = max(max(rgb.r, rgb.g), rgb.b);
  float minVal = min(min(rgb.r, rgb.g), rgb.b);
  float delta = maxVal - minVal;
  
  float h = 0.0;
  float s = 0.0;
  float l = (maxVal + minVal) * 0.5;
  
  if (delta > 0.0) {
    s = l < 0.5 ? delta / (maxVal + minVal) : delta / (2.0 - maxVal - minVal);
    
    if (maxVal == rgb.r) {
      h = (rgb.g - rgb.b) / delta + (rgb.g < rgb.b ? 6.0 : 0.0);
    } else if (maxVal == rgb.g) {
      h = (rgb.b - rgb.r) / delta + 2.0;
    } else {
      h = (rgb.r - rgb.g) / delta + 4.0;
    }
    h /= 6.0;
  }
  
  return vec3(h, s, l);
}

float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}

vec3 hsl2rgb(vec3 hsl) {
  float h = hsl.x;
  float s = hsl.y;
  float l = hsl.z;
  
  if (s == 0.0) {
    return vec3(l);
  }
  
  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;
  
  return vec3(
    hue2rgb(p, q, h + 1.0/3.0),
    hue2rgb(p, q, h),
    hue2rgb(p, q, h - 1.0/3.0)
  );
}

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  
  vec3 hsl = rgb2hsl(color.rgb);
  
  // Apply hue shift (u_hue is already normalized 0-1)
  hsl.x = mod(hsl.x + u_hue, 1.0);
  
  // Apply saturation multiplier (u_saturation is 0-2 range)
  hsl.y = clamp(hsl.y * u_saturation, 0.0, 1.0);
  
  // Apply lightness multiplier (u_lightness is 0-2 range)
  hsl.z = clamp(hsl.z * u_lightness, 0.0, 1.0);
  
  color.rgb = hsl2rgb(hsl);
  
  fragColor = color;
}
`;

export const pixelateFragmentShader = `${fragmentShaderBase}
uniform float u_pixelSize;

void main() {
  vec2 pixelSize = vec2(u_pixelSize) / u_resolution;
  vec2 coord = floor(v_texCoord / pixelSize) * pixelSize + pixelSize * 0.5;
  
  fragColor = texture(u_texture, coord);
}
`;

export const colorBalanceFragmentShader = `${fragmentShaderBase}
uniform vec3 u_cmy;

void main() {
  vec4 color = texture(u_texture, v_texCoord);
  
  vec3 cyanRed = vec3(-u_cmy.x, 0.0, 0.0);
  vec3 magentaGreen = vec3(0.0, -u_cmy.y, 0.0);
  vec3 yellowBlue = vec3(0.0, 0.0, -u_cmy.z);
  
  vec3 adjustment = cyanRed + magentaGreen + yellowBlue;
  
  // Apply adjustment based on existing color values
  vec3 newColor = color.rgb;
  
  // Cyan-Red adjustment
  if (adjustment.r >= 0.0) {
    newColor.r = color.r - adjustment.r * (1.0 - color.r);
  } else {
    newColor.r = color.r + abs(adjustment.r) * color.r;
  }
  
  // Magenta-Green adjustment  
  if (adjustment.g >= 0.0) {
    newColor.g = color.g - adjustment.g * (1.0 - color.g);
  } else {
    newColor.g = color.g + abs(adjustment.g) * color.g;
  }
  
  // Yellow-Blue adjustment
  if (adjustment.b >= 0.0) {
    newColor.b = color.b - adjustment.b * (1.0 - color.b);
  } else {
    newColor.b = color.b + abs(adjustment.b) * color.b;
  }
  
  fragColor = vec4(clamp(newColor, 0.0, 1.0), color.a);
}
`;