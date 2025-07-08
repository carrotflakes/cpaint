import { ReactComponent as IconLock } from "@/assets/icons/lock.svg";
import { MCanvas } from "@/libs/MCanvas";

interface CanvasPreviewProps {
  canvas: MCanvas;
  locked: boolean;
}

export function CanvasPreview({ canvas, locked }: CanvasPreviewProps) {
  const thumbnail = canvas.getThumbnail();

  return (
    <div className="w-8 h-8 grid place-items-center overflow-hidden">
      <canvas
        className="max-w-8 max-h-8"
        ref={(ref) => {
          if (!ref) return;
          const ctx = ref.getContext("2d")!;
          ctx.clearRect(0, 0, ref.width, ref.height);
          if (locked) ctx.globalAlpha = 0.75;
          ctx.drawImage(thumbnail, 0, 0);
        }}
        width={thumbnail.width}
        height={thumbnail.height}
      />
      {locked && (
        <IconLock width={16} height={16} className="absolute m-auto" />
      )}
    </div>
  );
}
