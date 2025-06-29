import { EffectBase } from './EffectBase';
import { vertexShaderSource, hueSaturationFragmentShader } from './shaders';

export class HueSaturationEffect extends EffectBase {
  private hueLocation: WebGLUniformLocation | null = null;
  private saturationLocation: WebGLUniformLocation | null = null;
  private lightnessLocation: WebGLUniformLocation | null = null;
  private textureLocation: WebGLUniformLocation | null = null;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.initShaders();
  }

  private initShaders(): void {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, hueSaturationFragmentShader);
    
    this.program = this.createProgram(vertexShader, fragmentShader);
    
    this.gl.deleteShader(vertexShader);
    this.gl.deleteShader(fragmentShader);

    this.hueLocation = this.gl.getUniformLocation(this.program, 'u_hue');
    this.saturationLocation = this.gl.getUniformLocation(this.program, 'u_saturation');
    this.lightnessLocation = this.gl.getUniformLocation(this.program, 'u_lightness');
    this.textureLocation = this.gl.getUniformLocation(this.program, 'u_texture');
  }

  public apply(imageData: ImageData, params: { hue: number; saturation: number; lightness: number } = { hue: 0, saturation: 0, lightness: 0 }): ImageData {
    const { width, height } = imageData;
    
    this.setupFramebuffer(width, height);
    this.texture = this.loadImageToTexture(imageData);
    
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.viewport(0, 0, width, height);
    
    this.gl.useProgram(this.program);
    
    if (this.hueLocation) {
      this.gl.uniform1f(this.hueLocation, (params.hue % 360) / 360);
    }
    if (this.saturationLocation) {
      this.gl.uniform1f(this.saturationLocation, (params.saturation + 100) / 100);
    }
    if (this.lightnessLocation) {
      this.gl.uniform1f(this.lightnessLocation, (params.lightness + 100) / 100);
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