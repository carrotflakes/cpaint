import { useRef, useMemo, useEffect } from "react";

export type MyMouseEvent = {
  preventDefault: () => void;
  target: EventTarget | Element | null;
};

export function useMouse<T extends Element>({
  onMouseDown,
}: {
  onMouseDown: (
    pos: [number, number],
    event: MyMouseEvent,
    el: T
  ) => null | {
    onMouseMove?: (pos: [number, number], event: MyMouseEvent) => void;
    onMouseUp?: (event: MyMouseEvent) => void;
  };
}) {
  const ref = useRef(null as null | T);
  const handlers = useRef(
    null as null | {
      onMouseMove?: (pos: [number, number], event: MyMouseEvent) => void;
      onMouseUp?: (event: MyMouseEvent) => void;
    }
  );

  const onMouseDown_ = useMemo(
    () => (e: React.MouseEvent) => {
      if (!ref.current) return;
      const bbox = ref.current.getBoundingClientRect();
      const pos = [e.clientX - bbox.left, e.clientY - bbox.top] as [
        number,
        number
      ];
      const r = onMouseDown(pos, e.nativeEvent, ref.current);
      if (!r) return;
      handlers.current = r;
      e.preventDefault();
    },
    [onMouseDown]
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!ref.current) return;
      const bbox = ref.current.getBoundingClientRect();
      const pos = [e.clientX - bbox.left, e.clientY - bbox.top] as [
        number,
        number
      ];
      handlers.current?.onMouseMove?.(pos, e);
    };
    const onMouseUp = (e: MouseEvent) => {
      handlers.current?.onMouseUp?.(e);
      handlers.current = null;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return {
    props: {
      ref,
      onMouseDown: onMouseDown_,
    },
  };
}
