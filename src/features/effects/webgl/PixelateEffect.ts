import { EffectBase } from './EffectBase';
import { vertexShaderSource, pixelateFragmentShader } from './shaders';

export class PixelateEffect extends EffectBase {
  private pixelSizeLocation: WebGLUniformLocation | null = null;
  private resolutionLocation: WebGLUniformLocation | null = null;
  private textureLocation: WebGLUniformLocation | null = null;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.initShaders();
  }

  private initShaders(): void {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, pixelateFragmentShader);
    
    this.program = this.createProgram(vertexShader, fragmentShader);
    
    this.gl.deleteShader(vertexShader);
    this.gl.deleteShader(fragmentShader);

    this.pixelSizeLocation = this.gl.getUniformLocation(this.program, 'u_pixelSize');
    this.resolutionLocation = this.gl.getUniformLocation(this.program, 'u_resolution');
    this.textureLocation = this.gl.getUniformLocation(this.program, 'u_texture');
  }

  public apply(imageData: ImageData, params: { pixelSize: number } = { pixelSize: 8 }): ImageData {
    const { width, height } = imageData;
    
    this.setupFramebuffer(width, height);
    this.texture = this.loadImageToTexture(imageData);
    
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.viewport(0, 0, width, height);
    
    this.gl.useProgram(this.program);
    
    if (this.pixelSizeLocation) {
      this.gl.uniform1f(this.pixelSizeLocation, params.pixelSize);
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