import { EffectBase } from './EffectBase';
import { vertexShaderSource, colorBalanceFragmentShader } from './shaders';

export class ColorBalanceEffect extends EffectBase {
  private cmyLocation: WebGLUniformLocation | null = null;
  private textureLocation: WebGLUniformLocation | null = null;

  constructor(canvas: HTMLCanvasElement) {
    super(canvas);
    this.initShaders();
  }

  private initShaders(): void {
    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, colorBalanceFragmentShader);
    
    this.program = this.createProgram(vertexShader, fragmentShader);
    
    this.gl.deleteShader(vertexShader);
    this.gl.deleteShader(fragmentShader);

    this.cmyLocation = this.gl.getUniformLocation(this.program, 'u_cmy');
    this.textureLocation = this.gl.getUniformLocation(this.program, 'u_texture');
  }

  public apply(imageData: ImageData, params: { 
    cyan: number; 
    magenta: number; 
    yellow: number;
  } = { 
    cyan: 0, magenta: 0, yellow: 0
  }): ImageData {
    const { width, height } = imageData;
    
    this.setupFramebuffer(width, height);
    this.texture = this.loadImageToTexture(imageData);
    
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
    this.gl.viewport(0, 0, width, height);
    
    this.gl.useProgram(this.program);
    
    if (this.cmyLocation) {
      this.gl.uniform3f(this.cmyLocation, 
        params.cyan / 100, 
        params.magenta / 100, 
        params.yellow / 100
      );
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