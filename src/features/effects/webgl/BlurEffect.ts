import { EffectBase } from './EffectBase';
import { vertexShaderSource, blurFragmentShader } from './shaders';

export class BlurEffect extends EffectBase {
  private radiusLocation: WebGLUniformLocation | null = null;
  private resolutionLocation: WebGLUniformLocation | null = null;
  private textureLocation: WebGLUniformLocation | null = null;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.initShaders();
  }

  private initShaders(): void {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, blurFragmentShader);
    
    this.program = this.createProgram(vertexShader, fragmentShader);
    
    this.gl.deleteShader(vertexShader);
    this.gl.deleteShader(fragmentShader);

    this.radiusLocation = this.gl.getUniformLocation(this.program, 'u_radius');
    this.resolutionLocation = this.gl.getUniformLocation(this.program, 'u_resolution');
    this.textureLocation = this.gl.getUniformLocation(this.program, 'u_texture');
  }

  public apply(imageData: ImageData, params: { radius: number } = { radius: 5 }): ImageData {
    const { width, height } = imageData;
    
    this.setupFramebuffer(width, height);
    this.texture = this.loadImageToTexture(imageData);
    
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.viewport(0, 0, width, height);
    
    this.gl.useProgram(this.program);
    
    if (this.radiusLocation) {
      this.gl.uniform1f(this.radiusLocation, params.radius);
    }
    if (this.resolutionLocation) {
      this.gl.uniform2f(this.resolutionLocation, width, height);
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