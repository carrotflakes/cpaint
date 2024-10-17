import { useEffect, useRef } from "react";

export type MyMouseEvent = {
  preventDefault: () => void;
  target: EventTarget | Element | null;
  force: number | null;
};

export function useMouse<T extends HTMLElement>({
  ref,
  containerRef,
  onMouseDown,
}: {
  ref: { current: T | null };
  containerRef?: { current: HTMLElement | null };
  onMouseDown: (
    pos: [number, number],
    event: MyMouseEvent,
    el: T
  ) => null | {
    onMouseMove?: (pos: [number, number], event: MyMouseEvent) => void;
    onMouseUp?: (event: MyMouseEvent) => void;
  };
}) {
  containerRef = containerRef ?? ref;

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
      const ev = {
        preventDefault: () => e.preventDefault(),
        target: e.target,
        force: null,
      };
      const r = onMouseDown(pos, ev, ref.current);
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
      const ev = {
        preventDefault: () => e.preventDefault(),
        target: e.target,
        force: e.touches[0].force,
      };
      const r = onMouseDown(pos, ev, ref.current);
      if (!r) return;
      handlers.current = r;
      e.preventDefault();
    };

    containerRef.current?.addEventListener("mousedown", onMouseDown_);
    containerRef.current?.addEventListener("touchstart", onTouchStart_, {
      passive: false,
    });

    return () => {
      containerRef.current?.removeEventListener("mousedown", onMouseDown_);
      containerRef.current?.removeEventListener("touchstart", onTouchStart_);
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
      const ev = {
        preventDefault: () => e.preventDefault(),
        target: e.target,
        force: null,
      };
      handlers.current?.onMouseMove?.(pos, ev);
    };
    const onMouseUp = (e: MouseEvent) => {
      const ev = {
        preventDefault: () => e.preventDefault(),
        target: e.target,
        force: null,
      };
      handlers.current?.onMouseUp?.(ev);
      handlers.current = null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!ref.current) return;
      const bbox = ref.current.getBoundingClientRect();
      const pos = [
        e.touches[0].clientX - bbox.left,
        e.touches[0].clientY - bbox.top,
      ] as [number, number];
      const ev = {
        preventDefault: () => e.preventDefault(),
        target: e.target,
        force: e.touches[0].force,
      };
      handlers.current?.onMouseMove?.(pos, ev);
    };
    const onTouchEnd = (e: TouchEvent) => {
      const ev = {
        preventDefault: () => e.preventDefault(),
        target: e.target,
        force: null,
      };
      handlers.current?.onMouseUp?.(ev);
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
