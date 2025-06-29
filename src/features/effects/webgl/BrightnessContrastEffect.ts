import { EffectBase } from './EffectBase';
import { vertexShaderSource, brightnessContrastFragmentShader } from './shaders';

export class BrightnessContrastEffect extends EffectBase {
  private brightnessLocation: WebGLUniformLocation | null = null;
  private contrastLocation: WebGLUniformLocation | null = null;
  private textureLocation: WebGLUniformLocation | null = null;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.initShaders();
  }

  private initShaders(): void {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, brightnessContrastFragmentShader);
    
    this.program = this.createProgram(vertexShader, fragmentShader);
    
    this.gl.deleteShader(vertexShader);
    this.gl.deleteShader(fragmentShader);

    this.brightnessLocation = this.gl.getUniformLocation(this.program, 'u_brightness');
    this.contrastLocation = this.gl.getUniformLocation(this.program, 'u_contrast');
    this.textureLocation = this.gl.getUniformLocation(this.program, 'u_texture');
  }

  public apply(imageData: ImageData, params: { brightness: number; contrast: number } = { brightness: 0, contrast: 1 }): ImageData {
    const { width, height } = imageData;
    
    this.setupFramebuffer(width, height);
    this.texture = this.loadImageToTexture(imageData);
    
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.viewport(0, 0, width, height);
    
    this.gl.useProgram(this.program);
    
    if (this.brightnessLocation) {
      this.gl.uniform1f(this.brightnessLocation, params.brightness / 100);
    }
    if (this.contrastLocation) {
      this.gl.uniform1f(this.contrastLocation, (params.contrast + 100) / 100);
    }
    if (this.textureLocation) {
      this.gl.uniform1i(this.textureLocation, 0);
    }
    
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
    
    this.renderQuad();
    
    const result = this.readPixels(width, height);
    
    if (this.texture) {
      this.gl.deleteTexture(this.texture);
      this.texture = null;
    }
    
    return result;
  }
}