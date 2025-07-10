import { ReactComponent as IconLock } from "@/assets/icons/lock.svg";
import { MCanvas, THUMBNAIL_SIZE } from "@/libs/MCanvas";
import { useEffect, useRef } from "react";

interface CanvasPreviewProps {
  canvas: MCanvas;
  locked: boolean;
}

export function CanvasPreview({ canvas, locked }: CanvasPreviewProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const thumbnail = canvas.getThumbnail();

    const ctx = el.getContext("2d")!;
    ctx.clearRect(0, 0, el.width, el.height);
    ctx.globalAlpha = locked ? 0.5 : 1;
    ctx.drawImage(thumbnail, 0, 0);
  }, [canvas.getVersion(), locked]);

  return (
    <div className="w-8 h-8 grid place-items-center overflow-hidden">
      <canvas
        className="max-w-8 max-h-8"
        ref={ref}
        width={THUMBNAIL_SIZE}
        height={THUMBNAIL_SIZE}
      />
      {locked && (
        <IconLock width={16} height={16} className="absolute m-auto" />
      )}
    </div>
  );
}
