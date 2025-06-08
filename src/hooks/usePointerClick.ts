import { useEffect } from "react";

/**
 * Custom hook to handle pointer events for click interactions.
 * It listens for pointer down events and triggers a click on the target element
 * when the pointer up event occurs, ensuring it only works with pen input.
 */
export function usePointerClick() {
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "pen") return;
      const el = lookupClickableElement(e.target);
      if (!el) return;
      const pointerId = e.pointerId;

      const onPointerUp = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;

        if (e.type === "pointerup") {
          const el_ = lookupClickableElement(e.target);
          if (el === el_)
            el.click();
        }
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
      }
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    }

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);
}

function lookupClickableElement(el: any): HTMLElement | null {
  if (!(el instanceof Element)) return null;
  if (el instanceof HTMLElement && "onclick" in el) return el;
  return lookupClickableElement(el.parentElement);
}
