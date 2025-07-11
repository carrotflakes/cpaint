import { useEffect, RefObject, useRef } from "react";
import { dist } from "../libs/geometry";
import { useAppState } from "../store/appState";

export const TAP_TIMEOUT = 300; // Maximum time between touch start and end for a tap
const TAP_DISTANCE = 5; // Maximum distance between start and end positions for a tap

export function useGestureControl(containerRef: RefObject<HTMLElement | null>) {
  const eventsRef = useRef<
    {
      identifier: number;
      pos: [number, number];
      time: number;
      end?: {
        pos: [number, number];
        time: number;
      };
    }[]
  >([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      const time = Date.now();
      for (const touch of e.changedTouches) {
        eventsRef.current.push({
          identifier: touch.identifier,
          pos: [touch.clientX, touch.clientY],
          time,
        });
      }
      eventsRef.current.splice(0, Math.max(eventsRef.current.length - 6, 0));
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const time = Date.now();
      for (const touch of e.changedTouches) {
        const startEvent = eventsRef.current.find(
          (event) => event.identifier === touch.identifier
        );

        if (startEvent) {
          startEvent.end = {
            pos: [touch.clientX, touch.clientY],
            time,
          };
        }
      }

      const eventsRecently = eventsRef.current.filter(
        (event) => time - event.time < TAP_TIMEOUT
      );
      if (
        eventsRecently.every(
          (event) => event.end && dist(event.pos, event.end.pos) < TAP_DISTANCE
        ) &&
        Math.max(...eventsRecently.map((e) => e.time)) <
          Math.min(...eventsRecently.map((e) => e.end!.time))
      ) {
        if (eventsRecently.length === 2) {
          // Handle two-finger tap
          useAppState.getState().undo();
          eventsRef.current = eventsRecently.filter(
            (e) => !eventsRecently.find((x) => x.identifier !== e.identifier)
          );
        }
        if (eventsRecently.length === 3) {
          // Handle three-finger tap
          useAppState.getState().redo();
          eventsRef.current = eventsRecently.filter(
            (e) => !eventsRecently.find((x) => x.identifier !== e.identifier)
          );
        }
      }
    };

    container.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    window.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [containerRef]);
}
