import { TAP_TIMEOUT } from "@/hooks/useGestureControl";
import { usePointer } from "@/hooks/usePointer";
import { useRef, useState } from "react";

export function useControl({
  getValue,
  setValue,
  sensitivity = 1,
}: {
  getValue: () => number;
  setValue: (value: number) => void;
  sensitivity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  const [temporalShow, setTemporalShow] = useState(false);

  usePointer<HTMLDivElement>({
    ref,
    onPointerDown(pos) {
      setTemporalShow(true);
      const initValue = getValue();
      let moved = false;
      const time = Date.now();

      return {
        onMove(pos_) {
          const dy = pos_[1] - pos[1];
          const value = initValue - dy * sensitivity;
          setValue(value);
          moved = true;
        },
        onUp() {
          setTemporalShow(false);
          // Toggle visibility if not moved
          // FIXME
          if (!moved || Date.now() - time < TAP_TIMEOUT) setShow((prev) => !prev);
        },
      };
    },
  });

  return {
    props: { ref },
    show: show || temporalShow,
    setShow,
  };
}
