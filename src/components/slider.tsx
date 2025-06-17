import { useRef } from "react";
import { usePointer } from "../hooks/usePointer";

export function SliderH({
  className = "",
  value,
  onChange,
}: {
  className?: string;
  value: number;
  onChange?: (value: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  usePointer<HTMLDivElement>({
    ref,
    onPointerDown(pos, _event, el) {
      const bbox = el.getBoundingClientRect();
      const h = (pos: [number, number]) => {
        const x = Math.max(Math.min(pos[0] / bbox.width, 1), 0);
        onChange?.(x);
      };
      h(pos);
      return {
        onMove(pos) {
          h(pos);
        },
      };
    },
  });

  return (
    <div
      className={`relative rounded border-2 border-gray-600 ${className}`}
      ref={ref}
    >
      <div
        className="absolute left-0 h-full bg-blue-400"
        style={{ right: `${(1 - value) * 100}%` }}
      />
    </div>
  );
}
