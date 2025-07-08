import { computePos } from "@/components/CanvasArea";
import { LassoPath } from "@/components/overlays/LassoPath";
import { SelectionRect } from "@/components/overlays/SelectionRect";
import { LayerMod } from "@/model/StateRenderer";
import { useAppState } from "@/store/appState";
import { selectLasso, selectMagicWand, selectRect } from "@/store/selection";
import { JSX } from "react";
import { listenPointer } from ".";

export function startSelection(
  container: HTMLDivElement,
  e: PointerEvent,
  lockRef: React.RefObject<boolean>,
  drawOrPanningRef: { current: "draw" | "panning" | null },
  setRet: (ret: { layerMod?: LayerMod; overlay?: JSX.Element }) => void
) {
  const startPos = computePos(e, container);
  const store = useAppState.getState();

  // Handle magic wand selection
  if (store.uiState.selectionTool === "magicWand") {
    const pos = computePos(e, container);
    selectMagicWand(Math.round(pos[0]), Math.round(pos[1]));
    return;
  }

  // Handle lasso selection
  if (store.uiState.selectionTool === "lasso") {
    const lassoPath: { x: number; y: number }[] = [
      { x: startPos[0], y: startPos[1] },
    ];

    const onPointerMove = (e: PointerEvent) => {
      const pos = computePos(e, container);

      const lastPoint = lassoPath.at(-1)!;
      const distance = Math.sqrt(
        Math.pow(pos[0] - lastPoint.x, 2) + Math.pow(pos[1] - lastPoint.y, 2)
      );

      if (distance > 2) {
        lassoPath.push({ x: pos[0], y: pos[1] });

        setRet({
          overlay: <LassoPath path={[...lassoPath]} />,
        });
      }
    };

    const onPointerUp = () => {
      // Close the path by connecting back to start if needed
      if (lassoPath.length > 2) {
        const firstPoint = lassoPath[0];
        const lastPoint = lassoPath.at(-1)!;
        const distance = Math.sqrt(
          Math.pow(lastPoint.x - firstPoint.x, 2) +
            Math.pow(lastPoint.y - firstPoint.y, 2)
        );

        // Only add closing point if the path isn't already closed
        if (distance > 5) {
          lassoPath.push({ x: firstPoint.x, y: firstPoint.y });
        }

        // Apply lasso selection
        selectLasso(lassoPath);
      }
    };

    listenPointer(
      e,
      lockRef,
      drawOrPanningRef,
      setRet,
      onPointerMove,
      onPointerUp
    );
    return;
  }

  // Handle rectangular and elliptical selection
  const onPointerMove = (e: PointerEvent) => {
    const pos = computePos(e, container);
    setRet({
      overlay: (
        <SelectionRect
          rect={{
            x: Math.min(startPos[0], pos[0]),
            y: Math.min(startPos[1], pos[1]),
            width: Math.abs(pos[0] - startPos[0]),
            height: Math.abs(pos[1] - startPos[1]),
          }}
          ellipse={store.uiState.selectionTool === "ellipse"}
        />
      ),
    });
  };
  const onPointerUp = (e: PointerEvent) => {
    const pos = computePos(e, container);

    selectRect(startPos, pos);
  };

  listenPointer(
    e,
    lockRef,
    drawOrPanningRef,
    setRet,
    onPointerMove,
    onPointerUp
  );
}
