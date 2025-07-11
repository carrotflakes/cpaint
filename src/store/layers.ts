import { Patch } from "@/libs/patch";
import { MCanvas } from "../libs/MCanvas";
import { BlendMode } from "../model/blendMode";
import {
  DEFAULT_LAYER_PROPS,
  findLayerByIndex,
  findLayerIndexById,
  getLayerByIndex,
  Layer,
  LayerGroup,
  newLayerId,
  State
} from "../model/state";
import { useAppState } from "../store/appState";

export function updateVisibility(
  index: number[],
  visible: boolean
) {
  const store = useAppState.getState();
  store.apply(
    {
      type: "patch",
      name: `Update Layer Visibility`,
      patches: [
        {
          op: "replace",
          path: [...indexToPath(index), 'visible'],
          value: visible satisfies State["layers"][number]["visible"],
        },
      ],
    },
    null
  );
}

export function updateOpacity(index: number[], opacity: number) {
  const store = useAppState.getState();
  store.apply(
    {
      type: "patch",
      name: "Update Layer Opacity",
      patches: [
        {
          op: "replace",
          path: [...indexToPath(index), 'opacity'],
          value: opacity satisfies State["layers"][number]["opacity"],
        },
      ],
    },
    null
  );
}

export function updateBlendMode(
  index: number[],
  blendMode: BlendMode
) {
  const store = useAppState.getState();
  store.apply(
    {
      type: "patch",
      name: "Update Layer Blend Mode",
      patches: [
        {
          op: "replace",
          path: [...indexToPath(index), 'blendMode'],
          value: blendMode satisfies State["layers"][number]["blendMode"],
        },
      ],
    },
    null
  );
}

export function updateLayerLock(index: number[], locked: boolean) {
  const store = useAppState.getState();
  store.apply(
    {
      type: "patch",
      name: locked ? "Lock Layer" : "Unlock Layer",
      patches: [
        {
          op: "replace",
          path: [...indexToPath(index), 'locked'],
          value: locked satisfies State["layers"][number]["locked"],
        },
      ],
    },
    null
  );
}

export function addLayer(index: number[]) {
  const store = useAppState.getState();
  const canvasSize = store.canvasSize();
  const canvas = new MCanvas(canvasSize.width, canvasSize.height);
  const layer: Layer = {
    ...DEFAULT_LAYER_PROPS,
    type: "layer",
    id: newLayerId(store.stateContainer.state),
    canvas,
  };

  store.apply(
    {
      type: "patch",
      name: "Add Layer",
      patches: [
        {
          op: "add",
          path: indexToPath(index),
          value: layer satisfies State["layers"][number],
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

export function deleteLayer(index: number[]) {
  const store = useAppState.getState();
  store.apply(
    {
      type: "patch",
      name: "Delete Layer",
      patches: [
        {
          op: "remove",
          path: indexToPath(index),
        },
      ],
    },
    null
  );

  // Update the current layer index if necessary
  store.update((draft) => {
    if (
      "" + findLayerIndexById(store.stateContainer.state.layers, store.uiState.currentLayerId) === "" + index
    ) {
      let layer = draft.stateContainer.state.layers.at(index[0]) ?? draft.stateContainer.state.layers.at(index[0] - 1);
      for (const i of index.slice(1)) {
        if (layer?.type === "group") {
          layer = layer.layers.at(i) ?? layer.layers.at(i - 1);
        } else {
          return;
        }
      }
      draft.uiState.currentLayerId = layer?.id ?? "";
    }
  });
}

export function moveLayer(from: number[], to: number[]) {
  if ("" + from === "" + to) return;

  const store = useAppState.getState();
  store.apply(
    {
      type: "patch",
      name: `Reorder Layer`,
      patches: [
        {
          op: "move",
          from: indexToPath(from),
          to: indexToPath(to),
        },
      ],
    },
    null
  );
}

export function duplicateLayer(index: number[]) {
  const store = useAppState.getState();
  const layer = getLayerByIndex(store.stateContainer.state.layers, index);
  if (layer.type !== "layer") return; // Can only duplicate actual layers, not groups

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
          path: indexToPath([...index.slice(0, -1), index.at(-1)! + 1]),
          value: {
            type: "layer",
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

export function mergeLayer(index: number[]) {
  const store = useAppState.getState();
  const layers = store.stateContainer.state.layers;
  if (index.at(-1) === 0) {
    alert("Cannot merge the bottom layer.");
    return;
  }

  const currentLayer = getLayerByIndex(layers, index);
  const belowLayer = getLayerByIndex(layers, [...index.slice(0, -1), index.at(-1)! - 1]);

  // Can only merge layers, not groups
  if (currentLayer.type !== "layer" || belowLayer.type !== "layer") {
    alert("Can only merge actual layers, not groups.");
    return;
  }

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
    type: "layer",
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
          path: indexToPath(index),
        },
        {
          op: "replace",
          path: indexToPath([...index.slice(0, -1), index.at(-1)! - 1]),
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

export function createGroup(layerIndex: number[]) {
  const store = useAppState.getState();
  const layer = getLayerByIndex(store.stateContainer.state.layers, layerIndex);
  if (!layer) return;

  const newGroupId = newLayerId(store.stateContainer.state).replace("layer", "group");
  const newGroup: LayerGroup = {
    type: "group",
    id: newGroupId,
    layers: [layer],
    ...DEFAULT_LAYER_PROPS,
  };

  store.apply(
    {
      type: "patch",
      name: "Create Group",
      patches: [
        {
          op: "replace",
          path: indexToPath(layerIndex),
          value: newGroup,
        },
        {
          op: "replace",
          path: ["nextLayerId"],
          value: (store.stateContainer.state.nextLayerId + 1) satisfies State["nextLayerId"],
        },
      ],
    },
    null
  );

  // Update the current layer to the group
  store.update((draft) => {
    draft.uiState.currentLayerId = newGroupId;
  });
}

export function ungroup(layerIndex: number[]) {
  const store = useAppState.getState();
  const group = findLayerByIndex(store.stateContainer.state, layerIndex);
  if (!group || !('type' in group) || group?.type !== "group") return;

  const patches: Patch[] = group.layers.map((_, i) => ({
    op: "move",
    from: indexToPath([...layerIndex, 0]),
    to: indexToPath([...layerIndex.slice(0, -1), layerIndex.at(-1)! + 1 + i]),
  }));

  patches.push({
    op: "remove",
    path: indexToPath(layerIndex),
  });

  store.apply(
    {
      type: "patch",
      name: "Ungroup Layers",
      patches,
    },
    null
  );

  // Update the current layer to the first layer of the ungrouped layers
  store.update((draft) => {
    draft.uiState.currentLayerId = group.layers.length > 0
      ? group.layers.at(-1)!.id
      : "";
  });
}

function indexToPath(index: number[]) {
  return index.flatMap((i) => ["layers", i]);
}
