import { State, StateRender } from "@/model/state";
import { StateContainer, applyStateDiff } from "@/model/stateContainer";

// Deep clone utility for State objects
function deepCloneState(state: State): State {
  return {
    layers: state.layers.map(layer => ({
      ...layer,
      canvas: layer.canvas.clone(),
    })),
    selection: state.selection?.clone() ?? null,
    size: {
      ...state.size,
    },
    nextLayerId: state.nextLayerId,
  };
}

export interface TimelapseFrame {
  canvas: HTMLCanvasElement;
}

export interface TimelapseOptions {
  fps?: number;
  duration?: number; // in seconds, if specified, overrides fps
  width?: number;
  height?: number;
  format?: 'webm' | 'mp4';
  quality?: number; // 0.0 - 1.0
}

export class TimelapseGenerator {
  private options: Required<TimelapseOptions>;

  constructor(options: TimelapseOptions = {}) {
    this.options = {
      fps: options.fps ?? 10,
      duration: options.duration ?? 0,
      width: options.width ?? 800,
      height: options.height ?? 600,
      format: options.format ?? 'webm',
      quality: options.quality ?? 0.9,
    };
  }

  generateFrames(stateContainer: StateContainer): TimelapseFrame[] {
    const { state: finalState, backward } = stateContainer;

    const frames: TimelapseFrame[] = [];
    let currentState = deepCloneState(finalState);

    // Add current state
    frames.push(this.renderStateToFrame(currentState));

    // Now apply backward operations to reconstruct history
    for (const { diff } of backward.toReversed()) {
      const result = applyStateDiff(currentState, diff);
      currentState = result.state;
      frames.push(this.renderStateToFrame(currentState));
    }

    return frames.reverse();
  }


  private renderStateToFrame(state: State): TimelapseFrame {
    const canvas = document.createElement('canvas');
    canvas.width = this.options.width;
    canvas.height = this.options.height;

    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Scale the canvas to fit the render size
    if (state.layers.length > 0) {
      const sourceCanvas = state.layers[0].canvas.getCanvas();
      const scaleX = canvas.width / sourceCanvas.width;
      const scaleY = canvas.height / sourceCanvas.height;
      const scale = Math.min(scaleX, scaleY);

      const scaledWidth = sourceCanvas.width * scale;
      const scaledHeight = sourceCanvas.height * scale;
      const offsetX = (canvas.width - scaledWidth) / 2;
      const offsetY = (canvas.height - scaledHeight) / 2;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      StateRender(state, ctx, null);

      ctx.restore();
    }

    return {
      canvas,
    };
  }

  async generateVideo(frames: TimelapseFrame[]): Promise<Blob> {
    if (frames.length === 0) {
      throw new Error('No frames to render');
    }

    // Calculate timing
    let fps = this.options.fps;
    if (this.options.duration > 0) {
      fps = frames.length / this.options.duration;
    }

    const frameInterval = 1000 / fps; // milliseconds per frame

    // Create video using MediaRecorder
    const canvas = document.createElement('canvas');
    canvas.width = this.options.width;
    canvas.height = this.options.height;
    const ctx = canvas.getContext('2d')!;

    const stream = canvas.captureStream(fps);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: `video/${this.options.format}`,
      videoBitsPerSecond: 2500000, // 2.5 Mbps
    });

    const chunks: Blob[] = [];

    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: `video/${this.options.format}` });
        resolve(blob);
      };

      mediaRecorder.onerror = () => {
        reject(new Error('MediaRecorder error'));
      };

      mediaRecorder.start();

      // Render frames at the calculated interval
      let frameIndex = 0;
      const renderFrame = () => {
        if (frameIndex >= frames.length) {
          mediaRecorder.stop();
          return;
        }

        const frame = frames[frameIndex];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(frame.canvas, 0, 0);

        frameIndex++;
        setTimeout(renderFrame, frameInterval);
      };

      renderFrame();
    });
  }

  async exportTimelapse(stateContainer: StateContainer): Promise<Blob> {
    const frames = this.generateFrames(stateContainer);
    return await this.generateVideo(frames);
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
