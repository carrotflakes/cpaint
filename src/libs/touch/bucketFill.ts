import { CanvasContext, Touch } from ".";
import { bucketFill, bucketFillEstimate } from "../bucket";
import * as cc from "color-convert";

export function startTouchBucketFill({ color, opacity, erace, imageData }:
  { color: string, opacity: number, erace: boolean, imageData: ImageData }
): Touch {
  // TODO: I believe that this canvas is not needed.
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const imageDataDst = new ImageData(imageData.width, imageData.height);

  const rgb = cc.hex.rgb(color.slice(1));
  const rgba = {
    r: rgb[0],
    g: rgb[1],
    b: rgb[2],
    a: 255,
  };

  let pos: { x: number; y: number } | null = null;
  let finished = false;

  return {
    stroke(x: number, y: number) {
      pos = { x, y };
    },
    end() {
      finished = true;
    },
    transfer(ctx: CanvasContext) {
      for (let i = 0; i < imageDataDst.data.length; i += 4) {
        imageDataDst.data[i + 3] = 0;
      }

      if (finished) {
        bucketFill(imageData, imageDataDst, pos!.x, pos!.y, rgba);
      } else {
        bucketFillEstimate(imageData, imageDataDst, pos!.x, pos!.y, rgba);
      }

      {
        const ctx2 = canvas.getContext("2d")!;
        ctx2.putImageData(imageDataDst, 0, 0);
      }

      ctx.save();
      if (finished) {
        if (erace)
          ctx.globalCompositeOperation = "destination-out";
        ctx.globalAlpha = opacity;
      }
      ctx.drawImage(canvas, 0, 0);
      ctx.restore();
    },
  }
}
