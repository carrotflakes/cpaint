import { useRef } from "react";
import { usePointer } from "../../hooks/usePointer";

export function SliderV({
  value,
  onChange,
}: {
  value: number;
  onChange?: (value: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  usePointer<HTMLDivElement>({
    ref,
    onPointerDown(pos, _event, el) {
      const bbox = el.getBoundingClientRect();
      const h = (pos: [number, number]) => {
        const y = Math.max(Math.min(1 - pos[1] / bbox.height, 1), 0);
        onChange?.(y);
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
      className="relative w-4 h-32 rounded border-2 border-gray-300"
      ref={ref}
    >
      <div
        className="absolute w-3 h-px bg-gray-400"
        style={{ top: `${(1 - value) * 100}%` }}
      />
    </div>
  );
}
