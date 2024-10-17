import { useEffect } from "react";

export function useDisableScroll() {
  useEffect(() => {
    const f = (e: TouchEvent) => e.preventDefault();
    document.body.addEventListener("touchmove", f, {
      passive: false,
    });
    return () => document.body.removeEventListener("touchmove", f);
  });
}
