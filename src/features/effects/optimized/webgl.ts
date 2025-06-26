// WebGL-based high-performance image effects
// src/libs/effects/webgl.ts

export class WebGLEffects {
  private gl: WebGL2RenderingContext;
  private canvas: OffscreenCanvas;
  private programs: Map<string, WebGLProgram> = new Map();
  private vertexBuffer!: WebGLBuffer;
  private textureFramebuffer!: WebGLFramebuffer;
  
  constructor(width: number, height: number) {
    this.canvas = new OffscreenCanvas(width, height);
    const gl = this.canvas.getContext('webgl2');
    if (!gl) {
      throw new Error('WebGL2 not supported');
    }
    this.gl = gl;
    
    this.initializeWebGL();
  }
  
  private initializeWebGL() {
    const gl = this.gl;
    
    // Create vertex buffer for full-screen quad
    const vertices = new Float32Array([
      -1, -1, 0, 0,
       1, -1, 1, 0,
      -1,  1, 0, 1,
       1,  1, 1, 1
    ]);
    
    this.vertexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
    // Create framebuffer for rendering
    this.textureFramebuffer = gl.createFramebuffer()!;
    
    // Initialize shaders
    this.initializeShaders();
  }
  
  private initializeShaders() {
    // Vertex shader (same for all effects)
    const vertexShaderSource = `#version 300 es
      in vec2 a_position;
      in vec2 a_texCoord;
      out vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;
    
    // Brightness/Contrast fragment shader
    const brightnessContrastFragmentShader = `#version 300 es
      precision mediump float;
      
      uniform sampler2D u_texture;
      uniform float u_brightness;
      uniform float u_contrast;
      
      in vec2 v_texCoord;
      out vec4 fragColor;
      
      void main() {
        vec4 color = texture(u_texture, v_texCoord);
        
        // Apply brightness and contrast
        color.rgb = ((color.rgb - 0.5) * u_contrast + 0.5) + u_brightness;
        color.rgb = clamp(color.rgb, 0.0, 1.0);
        
        fragColor = color;
      }
    `;
    
    // HSL adjustment fragment shader
    const hslFragmentShader = `#version 300 es
      precision mediump float;
      
      uniform sampler2D u_texture;
      uniform float u_hueShift;
      uniform float u_satMultiplier;
      uniform float u_lightMultiplier;
      
      in vec2 v_texCoord;
      out vec4 fragColor;
      
      vec3 rgb2hsl(vec3 c) {
        float maxVal = max(c.r, max(c.g, c.b));
        float minVal = min(c.r, min(c.g, c.b));
        float diff = maxVal - minVal;
        float sum = maxVal + minVal;
        float l = sum * 0.5;
        
        float h = 0.0;
        float s = 0.0;
        
        if (diff > 0.0) {
          s = l > 0.5 ? diff / (2.0 - sum) : diff / sum;
          
          if (maxVal == c.r) {
            h = ((c.g - c.b) / diff + (c.g < c.b ? 6.0 : 0.0)) / 6.0;
          } else if (maxVal == c.g) {
            h = ((c.b - c.r) / diff + 2.0) / 6.0;
          } else {
            h = ((c.r - c.g) / diff + 4.0) / 6.0;
          }
        }
        
        return vec3(h, s, l);
      }
      
      float hue2rgb(float p, float q, float t) {
        if (t < 0.0) t += 1.0;
        if (t > 1.0) t -= 1.0;
        if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
        if (t < 0.5) return q;
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
        
        // Apply adjustments
        hsl.x = mod(hsl.x + u_hueShift, 1.0);
        hsl.y = clamp(hsl.y * u_satMultiplier, 0.0, 1.0);
        hsl.z = clamp(hsl.z * u_lightMultiplier, 0.0, 1.0);
        
        color.rgb = hsl2rgb(hsl);
        fragColor = color;
      }
    `;
    
    // Box blur fragment shader
    const boxBlurFragmentShader = `#version 300 es
      precision mediump float;
      
      uniform sampler2D u_texture;
      uniform vec2 u_resolution;
      uniform float u_radius;
      uniform vec2 u_direction; // (1,0) for horizontal, (0,1) for vertical
      
      in vec2 v_texCoord;
      out vec4 fragColor;
      
      void main() {
        vec2 texelSize = 1.0 / u_resolution;
        vec4 sum = vec4(0.0);
        int samples = 0;
        
        for (float i = -u_radius; i <= u_radius; i += 1.0) {
          vec2 offset = i * u_direction * texelSize;
          vec4 sample = texture(u_texture, v_texCoord + offset);
          sum += sample * sample.a; // Premultiply alpha
          samples++;
        }
        
        fragColor = sum / float(samples);
      }
    `;
    
    // Create and compile programs
    this.programs.set('brightnessContrast', this.createProgram(vertexShaderSource, brightnessContrastFragmentShader));
    this.programs.set('hsl', this.createProgram(vertexShaderSource, hslFragmentShader));
    this.programs.set('boxBlur', this.createProgram(vertexShaderSource, boxBlurFragmentShader));
  }
  
  private createProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
    const gl = this.gl;
    
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Program link error: ' + gl.getProgramInfoLog(program));
    }
    
    return program;
  }
  
  private compileShader(type: number, source: string): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error('Shader compile error: ' + gl.getShaderInfoLog(shader));
    }
    
    return shader;
  }
  
  public applyBrightnessContrast(
    sourceTexture: WebGLTexture,
    brightness: number,
    contrast: number
  ): WebGLTexture {
    const program = this.programs.get('brightnessContrast')!;
    return this.applyEffect(program, sourceTexture, {
      u_brightness: brightness / 100,
      u_contrast: (contrast + 100) / 100
    });
  }
  
  public applyHSL(
    sourceTexture: WebGLTexture,
    hue: number,
    saturation: number,
    lightness: number
  ): WebGLTexture {
    const program = this.programs.get('hsl')!;
    return this.applyEffect(program, sourceTexture, {
      u_hueShift: (hue % 360) / 360,
      u_satMultiplier: (saturation + 100) / 100,
      u_lightMultiplier: (lightness + 100) / 100
    });
  }
  
  public applyBoxBlur(sourceTexture: WebGLTexture, radius: number): WebGLTexture {
    const program = this.programs.get('boxBlur')!;
    
    // Two-pass blur: horizontal then vertical
    const tempTexture = this.applyEffect(program, sourceTexture, {
      u_radius: radius,
      u_direction: [1, 0],
      u_resolution: [this.canvas.width, this.canvas.height]
    });
    
    return this.applyEffect(program, tempTexture, {
      u_radius: radius,
      u_direction: [0, 1],
      u_resolution: [this.canvas.width, this.canvas.height]
    });
  }
  
  private applyEffect(
    program: WebGLProgram,
    sourceTexture: WebGLTexture,
    uniforms: Record<string, number | number[]>
  ): WebGLTexture {
    const gl = this.gl;
    
    // Create output texture
    const outputTexture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, outputTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.canvas.width, this.canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    
    // Set up framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.textureFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outputTexture, 0);
    
    // Use program
    gl.useProgram(program);
    
    // Set up vertex attributes
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(texCoordLocation);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);
    
    // Set uniforms
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.uniform1i(gl.getUniformLocation(program, 'u_texture'), 0);
    
    for (const [name, value] of Object.entries(uniforms)) {
      const location = gl.getUniformLocation(program, name);
      if (Array.isArray(value)) {
        if (value.length === 2) {
          gl.uniform2fv(location, value);
        } else {
          gl.uniform1fv(location, value);
        }
      } else {
        gl.uniform1f(location, value);
      }
    }
    
    // Render
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    return outputTexture;
  }
  
  public getSize(): { width: number; height: number } {
    return { width: this.canvas.width, height: this.canvas.height };
  }
  
  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public createTextureFromImageData(imageData: ImageData): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return texture;
  }
  
  public readTextureToImageData(texture: WebGLTexture): ImageData {
    const gl = this.gl;
    
    // Bind texture to framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.textureFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    
    // Read pixels
    const pixels = new Uint8Array(this.canvas.width * this.canvas.height * 4);
    gl.readPixels(0, 0, this.canvas.width, this.canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    
    return new ImageData(new Uint8ClampedArray(pixels), this.canvas.width, this.canvas.height);
  }
}
