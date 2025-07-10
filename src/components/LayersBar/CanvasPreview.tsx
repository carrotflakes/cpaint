import { ReactComponent as IconLock } from "@/assets/icons/lock.svg";
import { MCanvas, THUMBNAIL_SIZE } from "@/libs/MCanvas";
import { useAppState } from "@/store/appState";
import { useEffect, useRef } from "react";

interface CanvasPreviewProps {
  canvas: MCanvas;
  locked: boolean;
}

export function CanvasPreview({ canvas, locked }: CanvasPreviewProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  // Watch the stateContainer for changes to the canvas version
  useAppState((state) => state.stateContainer);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const thumbnail = canvas.getThumbnail();

    // Adjust the position of the thumbnail to center it in the canvas
    const maxSize = Math.max(thumbnail.width, thumbnail.height);
    const dx = Math.floor((maxSize - thumbnail.width) / 2);
    const dy = Math.floor((maxSize - thumbnail.height) / 2);

    const ctx = el.getContext("2d")!;
    ctx.clearRect(0, 0, el.width, el.height);
    ctx.globalAlpha = locked ? 0.5 : 1;
    ctx.drawImage(thumbnail, dx, dy);
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
