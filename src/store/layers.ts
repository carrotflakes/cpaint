import { MCanvas } from "../libs/MCanvas";
import { BlendMode } from "../model/blendMode";
import {
  DEFAULT_LAYER_PROPS,
  newLayerId,
  State
} from "../model/state";
import { AppState } from "../store/appState";

export function addLayer(store: AppState, layers: State["layers"]) {
  const canvasSize = store.canvasSize();
  const canvas = new MCanvas(canvasSize.width, canvasSize.height);

  store.apply(
    {
      type: "patch",
      name: "Add Layer",
      patches: [
        {
          op: "add",
          path: ["layers", layers.length],
          value: {
            ...DEFAULT_LAYER_PROPS,
            id: newLayerId(store.stateContainer.state),
            canvas,
          } satisfies State["layers"][number],
        },
        {
          op: "replace",
          path: ["nextLayerId"],
          value: (store.stateContainer.state.nextLayerId +
            1) satisfies State["nextLayerId"],
        },
      ],
    },
    null
  );
}

export function toggleVisibility(
  store: AppState,
  layers: State["layers"],
  index: number
) {
  const layer = layers[index];
  store.apply(
    {
      type: "patch",
      name: `Toggle Layer Visibility`,
      patches: [
        {
          op: "replace",
          path: ["layers", index, "visible"],
          value: !layer.visible satisfies State["layers"][number]["visible"],
        },
      ],
    },
    null
  );
}

export function moveLayer(store: AppState, from: number, to: number) {
  if (from === to) return;
  store.apply(
    {
      type: "patch",
      name: `Reorder Layer`,
      patches: [
        {
          op: "move",
          from: ["layers", from],
          to: ["layers", to],
        },
      ],
    },
    null
  );
}

export function updateOpacity(store: AppState, index: number, opacity: number) {
  store.apply(
    {
      type: "patch",
      name: "Update Layer Opacity",
      patches: [
        {
          op: "replace",
          path: ["layers", index, "opacity"],
          value: opacity satisfies State["layers"][number]["opacity"],
        },
      ],
    },
    null
  );
}

export function duplicateLayer(store: AppState, index: number) {
  const layer = store.stateContainer.state.layers[index];
  // Create a new canvas with the same content
  const newCanvas = new MCanvas(layer.canvas.width, layer.canvas.height);
  const newCtx = newCanvas.getContextWrite();
  newCtx.drawImage(layer.canvas.getCanvas(), 0, 0);

  store.apply(
    {
      type: "patch",
      name: "Duplicate Layer",
      patches: [
        {
          op: "add",
          path: ["layers", index + 1],
          value: {
            id: newLayerId(store.stateContainer.state),
            canvas: newCanvas,
            visible: true,
            opacity: layer.opacity,
            blendMode: layer.blendMode,
            locked: layer.locked,
          } satisfies State["layers"][number],
        },
        {
          op: "replace",
          path: ["nextLayerId"],
          value: (store.stateContainer.state.nextLayerId +
            1) satisfies State["nextLayerId"],
        },
      ],
    },
    null
  );
}

export function deleteLayer(store: AppState, index: number) {
  const layers = store.stateContainer.state.layers;
  if (layers.length <= 1) {
    alert("Cannot delete the last layer.");
    return;
  }
  store.apply(
    {
      type: "patch",
      name: "Delete Layer",
      patches: [
        {
          op: "remove",
          path: ["layers", index],
        },
      ],
    },
    null
  );

  // Update the current layer index if necessary
  store.update((draft) => {
    if (
      !draft.stateContainer.state.layers.find(
        (l) => l.id === draft.uiState.currentLayerId
      )
    ) {
      draft.uiState.currentLayerId =
        draft.stateContainer.state.layers[
          Math.min(index, draft.stateContainer.state.layers.length - 1)
        ].id;
    }
  });
}

export function mergeLayer(store: AppState, index: number) {
  const layers = store.stateContainer.state.layers;
  if (index === 0) {
    alert("Cannot merge the bottom layer.");
    return;
  }

  const currentLayer = layers[index];
  const belowLayer = layers[index - 1];

  const mergedCanvas = new MCanvas(
    belowLayer.canvas.width,
    belowLayer.canvas.height
  );
  const mergedCtx = mergedCanvas.getContextWrite();

  mergedCtx.drawImage(belowLayer.canvas.getCanvas(), 0, 0);

  mergedCtx.save();
  mergedCtx.globalAlpha = currentLayer.opacity;
  mergedCtx.globalCompositeOperation = currentLayer.blendMode;
  mergedCtx.drawImage(currentLayer.canvas.getCanvas(), 0, 0);
  mergedCtx.restore();

  const mergedLayer = {
    id: newLayerId(store.stateContainer.state),
    canvas: mergedCanvas,
    visible: belowLayer.visible,
    opacity: belowLayer.opacity,
    blendMode: belowLayer.blendMode,
    locked: belowLayer.locked,
  } satisfies State["layers"][number];

  store.apply(
    {
      type: "patch",
      name: "Merge Layer Down",
      patches: [
        {
          op: "remove",
          path: ["layers", index],
        },
        {
          op: "replace",
          path: ["layers", index - 1],
          value: mergedLayer,
        },
        {
          op: "replace",
          path: ["nextLayerId"],
          value: (store.stateContainer.state.nextLayerId +
            1) satisfies State["nextLayerId"],
        },
      ],
    },
    null
  );

  // Update the current layer index if necessary
  store.update((draft) => {
    if (
      !draft.stateContainer.state.layers.find(
        (l) => l.id === draft.uiState.currentLayerId
      )
    ) {
      draft.uiState.currentLayerId = mergedLayer.id;
    }
  });
}

export function updateBlendMode(
  store: AppState,
  layerIndex: number,
  blendMode: BlendMode
) {
  store.apply(
    {
      type: "patch",
      name: "Update Layer Blend Mode",
      patches: [
        {
          op: "replace",
          path: ["layers", layerIndex, "blendMode"],
          value: blendMode satisfies State["layers"][number]["blendMode"],
        },
      ],
    },
    null
  );
}

export function toggleLockLayer(store: AppState, layerIndex: number, locked: boolean) {
  store.apply(
    {
      type: "patch",
      name: locked ? "Unlock Layer" : "Lock Layer",
      patches: [
        {
          op: "replace",
          path: ["layers", layerIndex, "locked"],
          value: !locked satisfies State["layers"][number]["locked"],
        },
      ],
    },
    null
  );
}
