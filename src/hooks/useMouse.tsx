import { useEffect, useRef } from "react";

export type MyMouseEvent = {
  preventDefault: () => void;
  target: EventTarget | Element | null;
};

export function useMouse<T extends HTMLElement>({
  ref,
  onMouseDown,
}: {
  ref: { current: T | null };
  onMouseDown: (
    pos: [number, number],
    event: MyMouseEvent,
    el: T
  ) => null | {
    onMouseMove?: (pos: [number, number], event: MyMouseEvent) => void;
    onMouseUp?: (event: MyMouseEvent) => void;
  };
}) {
  const handlers = useRef(
    null as null | {
      onMouseMove?: (pos: [number, number], event: MyMouseEvent) => void;
      onMouseUp?: (event: MyMouseEvent) => void;
    }
  );

  useEffect(() => {
    const onMouseDown_ = (e: MouseEvent) => {
      if (!ref.current) return;
      const bbox = ref.current.getBoundingClientRect();
      const pos = [e.clientX - bbox.left, e.clientY - bbox.top] as [
        number,
        number
      ];
      const r = onMouseDown(pos, e, ref.current);
      if (!r) return;
      handlers.current = r;
      e.preventDefault();
    };
    const onTouchStart_ = (e: TouchEvent) => {
      if (!ref.current) return;
      const bbox = ref.current.getBoundingClientRect();
      const pos = [
        e.touches[0].clientX - bbox.left,
        e.touches[0].clientY - bbox.top,
      ] as [number, number];
      const r = onMouseDown(pos, e, ref.current);
      if (!r) return;
      handlers.current = r;
      e.preventDefault();
    };

    ref.current?.addEventListener("mousedown", onMouseDown_);
    ref.current?.addEventListener("touchstart", onTouchStart_, {
      passive: false,
    });

    return () => {
      ref.current?.removeEventListener("mousedown", onMouseDown_);
      ref.current?.removeEventListener("touchstart", onTouchStart_);
    };
  }, [onMouseDown]);

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
    const onTouchMove = (e: TouchEvent) => {
      if (!ref.current) return;
      const bbox = ref.current.getBoundingClientRect();
      const pos = [
        e.touches[0].clientX - bbox.left,
        e.touches[0].clientY - bbox.top,
      ] as [number, number];
      handlers.current?.onMouseMove?.(pos, e);
    };
    const onTouchEnd = (e: TouchEvent) => {
      handlers.current?.onMouseUp?.(e);
      handlers.current = null;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: false });

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);
}
