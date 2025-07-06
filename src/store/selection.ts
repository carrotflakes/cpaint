import { Selection } from "@/libs/Selection";
import { useAppState } from "./appState";
import { State, getLayerById } from "@/model/state";

function patchSelection(selection: Selection | null) {
  // If the selection is empty, set it to null
  if (selection?.getBounds() === null) selection = null;

  const store = useAppState.getState();
  store.apply(
    {
      type: "patch",
      name: "Update Selection",
      patches: [
        {
          op: "replace",
          path: ["selection"],
          value: selection satisfies State["selection"],
        },
      ],
    },
    null
  );
}

export function selectAll() {
  const store = useAppState.getState();
  const canvasSize = store.canvasSize();
  const selection = new Selection(canvasSize.width, canvasSize.height, true);
  patchSelection(selection);
}

export function selectClear() {
  patchSelection(null);
}

export function selectInvert() {
  const store = useAppState.getState();
  const canvasSize = store.canvasSize();
  const selection =
    store.stateContainer.state.selection?.clone() ??
    new Selection(canvasSize.width, canvasSize.height, false);
  selection.invert();
  patchSelection(selection);
}

export function selectRect(startPos: [number, number], endPos: [number, number]) {
  const store = useAppState.getState();
  const canvasSize = store.canvasSize();
  const selection =
    store.stateContainer.state.selection?.clone() ??
    new Selection(canvasSize.width, canvasSize.height, false);
  if (store.uiState.selectionTool === "ellipse") {
    selection.addEllipse(
      (startPos[0] + endPos[0]) / 2,
      (startPos[1] + endPos[1]) / 2,
      Math.abs(endPos[0] - startPos[0]) / 2,
      Math.abs(endPos[1] - startPos[1]) / 2,
      store.uiState.selectionOperation
    );
  } else {
    selection.addRect(
      Math.round(Math.min(startPos[0], endPos[0])),
      Math.round(Math.min(startPos[1], endPos[1])),
      Math.round(Math.abs(endPos[0] - startPos[0])),
      Math.round(Math.abs(endPos[1] - startPos[1])),
      store.uiState.selectionOperation
    );
  }
  patchSelection(selection);
}

export function selectLasso(path: { x: number; y: number }[]) {
  const store = useAppState.getState();
  const canvasSize = store.canvasSize();
  const selection =
    store.stateContainer.state.selection?.clone() ??
    new Selection(canvasSize.width, canvasSize.height, false);

  selection.addLasso(path, store.uiState.selectionOperation);
  patchSelection(selection);
}

export function selectMagicWand(x: number, y: number) {
  const store = useAppState.getState();
  const canvasSize = store.canvasSize();
  const selection =
    store.stateContainer.state.selection?.clone() ??
    new Selection(canvasSize.width, canvasSize.height, false);

  const currentLayer = getLayerById(store.stateContainer.state.layers, store.uiState.currentLayerId);
  if (!currentLayer) return;

  selection.addMagicWand(
    currentLayer.canvas.getCanvas(),
    x,
    y,
    store.uiState.selectionTolerance
  );
  patchSelection(selection);
}
