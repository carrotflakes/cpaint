import { useEffect, useRef } from "react";

export type MyPointerEvent = {
  preventDefault: () => void;
  target: EventTarget | Element | null;
  pressure: number | null;
};

export function usePointer<T extends HTMLElement>({
  ref,
  containerRef,
  onPointerDown,
}: {
  ref: { current: T | null };
  containerRef?: { current: HTMLElement | null };
  onPointerDown: (
    pos: [number, number],
    event: MyPointerEvent,
    el: T
  ) => null | {
    onMove?: (pos: [number, number], event: MyPointerEvent) => void;
    onUp?: (event: MyPointerEvent) => void;
  };
}) {
  containerRef = containerRef ?? ref;

  const handlers = useRef(
    null as null | {
      pointerId: number;
      onMove?: (pos: [number, number], event: MyPointerEvent) => void;
      onUp?: (event: MyPointerEvent) => void;
    }
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onPointerDown_ = (e: PointerEvent) => {
      if (!ref.current) return;
      const bbox = ref.current.getBoundingClientRect();
      const pos = [e.clientX - bbox.left, e.clientY - bbox.top] as [
        number,
        number
      ];
      const ev = {
        preventDefault: () => e.preventDefault(),
        target: e.target,
        pressure: e.pressure,
      };
      const r = onPointerDown(pos, ev, ref.current);
      if (!r) return;
      handlers.current = { pointerId: e.pointerId, ...r };
      e.preventDefault();
    };

    // Prevent default touch behavior to avoid scrolling
    const onTouchStart_ = (e: TouchEvent) => {
      if (!ref.current) return;
      e.preventDefault();
    };

    container.addEventListener("pointerdown", onPointerDown_);
    container.addEventListener("touchstart", onTouchStart_, {
      passive: false,
    });

    return () => {
      container.removeEventListener("pointerdown", onPointerDown_);
      container.removeEventListener("touchstart", onTouchStart_);
    };
  }, [onPointerDown]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!ref.current || handlers.current?.pointerId !== e.pointerId) return;
      const bbox = ref.current.getBoundingClientRect();
      const pos = [e.clientX - bbox.left, e.clientY - bbox.top] as [
        number,
        number
      ];
      const ev = {
        preventDefault: () => e.preventDefault(),
        target: e.target,
        pressure: e.pressure,
      };
      handlers.current?.onMove?.(pos, ev);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (handlers.current?.pointerId !== e.pointerId) return;
      const ev = {
        preventDefault: () => e.preventDefault(),
        target: e.target,
        pressure: null,
      };
      handlers.current?.onUp?.(ev);
      handlers.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);
}
