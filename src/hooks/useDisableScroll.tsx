import { useEffect } from "react";

/**
 * Prevents scrolling on touch devices when the user is touching the screen.
 * This is useful for preventing scrolling when using a drawing app on a mobile device.
 * It allows scrolling only if the target element has the data-scroll attribute set to "true".
 */
export function useDisableScroll() {
  useEffect(() => {
    const f = (e: TouchEvent) => {
      let target = e.target as HTMLElement | null;
      while (target) {
        if (target.dataset.scroll === "true") {
          return;
        }
        target = target.parentElement;
      }
      e.preventDefault();
    };
    document.body.addEventListener("touchmove", f, {
      passive: false,
    });
    return () => document.body.removeEventListener("touchmove", f);
  });
}
