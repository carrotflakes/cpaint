import { produce, WritableDraft } from 'immer';
import { create } from 'zustand';
import { Rect as TransformRect } from '../components/overlays/TransformRectHandles';
import { pushToast } from '../components/Toasts';
import { applyEffect, Effect } from '../features/effects';
import { MCanvas } from '../libs/MCanvas';
import { Selection } from '../libs/Selection';
import { CanvasContext } from '../libs/touch';
import {
  startTouchBrush,
} from "../libs/touch/brush";
import { startTouchBucketFill } from '../libs/touch/bucketFill';
import { startTouchFill } from '../libs/touch/fill';
import { Op } from '../model/op';
import { State, StateContainer, StateContainerDo, StateContainerFromState, StateContainerRedo, StateContainerUndo, StateNew } from '../model/state';

export type ToolType = "brush" | "fill" | "bucketFill" | "eyeDropper" | "selection";
export type SelectionOperation = 'new' | 'add' | 'subtract' | 'intersect';
export type SelectionTool = 'rectangle' | 'ellipse' | 'lasso' | 'magicWand' | 'paint';

export type AppState = {
  imageMeta: null | {
    id: number,
    name: string,
    createdAt: number,
  }
  uiState: {
    tool: ToolType
    color: string
    erase: boolean
    penSize: number
    opacity: number
    brushType: string
    layerIndex: number
    bucketFillTolerance: number
    alphaLock: boolean
    selectionTool: SelectionTool
    selectionOperation: SelectionOperation
    selectionTolerance: number
    canvasView: {
      angle: number
      scale: number
      pan: [number, number]
      flipX: boolean
      flipY: boolean
    }
    colorHistory: string[]
  }
  mode: {
    type: "draw"
  } | {
    type: "layerTransform"
    layerIndex: number
    rect: TransformRect
  } | {
    type: "canvasResize"
    rendered: MCanvas
    size: [number, number]
    rect: TransformRect
  } | {
    type: "addImageAsLayer"
    image: MCanvas
    rect: TransformRect
  }
  stateContainer: StateContainer
  savedState: State | null

  canvasSize: () => { width: number; height: number }
  apply: (op: Op, transfer: ((ctx: OffscreenCanvasRenderingContext2D) => void) | null) => void
  open: (imageMeta: { id: number; name: string; createdAt: number }, state: State) => void
  undo: () => void
  redo: () => void
  update: (update: (draft: WritableDraft<AppState>) => void) => void
  importAsLayer: (image: HTMLImageElement) => void
  addColorToHistory: (color: string) => void
  hasUnsavedChanges: () => boolean
};

export const useAppState = create<AppState>()((set, get) => {
  return ({
    imageMeta: null,
    uiState: {
      tool: "brush" as ToolType,
      color: "#000",
      erase: false,
      penSize: 10,
      opacity: 1,
      softPen: false,
      brushType: "particle1",
      layerIndex: 0,
      bucketFillTolerance: 0,
      alphaLock: false,
      selectionTool: "rectangle" as SelectionTool,
      selectionOperation: "new" as SelectionOperation,
      selectionTolerance: 0,
      canvasView: {
        angle: 0,
        scale: 1,
        pan: [0, 0],
        flipX: false,
        flipY: false,
      },
      colorHistory: [],
    },
    mode: {
      type: "draw",
    },
    stateContainer: StateContainerFromState(StateNew(400, 400, false)),
    savedState: null,

    canvasSize() {
      return this.stateContainer.state.layers[0].canvas;
    },
    apply(op, transfer) {
      // Check if the operation affects a locked layer
      if ('layerIndex' in op && typeof op.layerIndex === 'number') {
        const layer = get().stateContainer.state.layers[op.layerIndex];
        if (layer?.locked) {
          // Don't apply operations to locked layers
          pushToast("Cannot apply operation to a locked layer!", {
            type: "error",
          });
          return;
        }
      }

      set(state => ({
        stateContainer: StateContainerDo(state.stateContainer, op, transfer && op.type !== "patch" ? {
          layerId: state.stateContainer.state.layers[op.layerIndex].id,
          apply: transfer
        } : null),
      }))
    },
    open(imageMeta, state) {
      const stateContainer = StateContainerFromState(state);
      set(() => ({
        imageMeta,
        stateContainer,
        savedState: stateContainer.state,
        uiState: {
          ...get().uiState,
          layerIndex: stateContainer.state.layers.length - 1,
          canvasView: {
            angle: 0,
            scale: 1,
            pan: [0, 0],
            flipX: false,
            flipY: false,
          },
        },
      }));
    },
    importAsLayer(image: HTMLImageElement) {
      const { width, height } = image;
      const canvas = new MCanvas(width, height);
      const ctx = canvas.getContextWrite();
      ctx.drawImage(image, 0, 0);
      const firstCanvas = useAppState.getState().stateContainer.state.layers[0].canvas;
      set(() => ({
        mode: {
          type: "addImageAsLayer", image: canvas,
          rect: {
            cx: firstCanvas.width / 2,
            cy: firstCanvas.height / 2,
            hw: width / 2,
            hh: height / 2,
            angle: 0,
          },
        },
      }));
    },
    addColorToHistory(color: string) {
      set((state) =>
        produce(state, (draft) => {
          const history = draft.uiState.colorHistory.filter(c => c !== color);
          if (history.length >= 20) {
            history.pop();
          }
          history.unshift(color);
          draft.uiState.colorHistory = history;
        })
      );
    },
    undo() {
      set((state) => ({
        stateContainer: StateContainerUndo(state.stateContainer),
      })
      )
    },
    redo() {
      set((state) => ({
        stateContainer: StateContainerRedo(state.stateContainer),
      })
      )
    },
    hasUnsavedChanges() {
      const state = get();
      return !!state.imageMeta &&
        state.savedState !== state.stateContainer.state;
    },

    update(update) {
      set((state) => produce(state, update), true)
    },
  })
});

export function ImageMetaNew(name?: string) {
  return {
    id: Date.now(),
    name: name ?? new Date().toISOString().split(".")[0].replace(/:/g, "-"),
    createdAt: Date.now(),
  };
}

export function isLayerLocked(store: AppState, layerIndex: number = store.uiState.layerIndex): boolean {
  const layer = store.stateContainer.state.layers[layerIndex];
  return layer?.locked ?? false;
}

export function createOp(store: AppState): Op | null {
  // Check if the current layer is locked
  if (isLayerLocked(store)) {
    return null;
  }

  switch (store.uiState.tool) {
    case "fill":
      return {
        type: "fill",
        fillColor: store.uiState.color,
        opacity: store.uiState.opacity,
        erase: store.uiState.erase,
        path: [],
        layerIndex: store.uiState.layerIndex,
      };
    case "brush":
      return {
        type: "stroke",
        layerIndex: store.uiState.layerIndex,
        strokeStyle: {
          color: store.uiState.color,
          width: store.uiState.penSize,
          brushType: store.uiState.brushType,
        },
        opacity: store.uiState.opacity,
        erase: store.uiState.erase,
        path: [],
        alphaLock: store.uiState.alphaLock,
      };
    case "bucketFill":
      return {
        type: "bucketFill",
        fillColor: store.uiState.color,
        opacity: store.uiState.opacity,
        erase: store.uiState.erase,
        tolerance: store.uiState.bucketFillTolerance,
        pos: [0, 0], // Placeholder, will be set later
        layerIndex: store.uiState.layerIndex,
      };
    default:
      return null;
  }
}

export function createTouch(store: AppState) {
  // Check if the current layer is locked
  if (isLayerLocked(store)) {
    return null;
  }

  const canvas = store.stateContainer.state.layers[store.uiState.layerIndex].canvas;
  const canvasSize: [number, number] = [canvas.width, canvas.height];

  switch (store.uiState.tool) {
    case "fill":
      return startTouchFill({
        color: store.uiState.color,
        opacity: store.uiState.opacity,
        erase: store.uiState.erase,
      });
    case "brush":
      return startTouchBrush({
        brushType: store.uiState.brushType,
        width: store.uiState.penSize,
        color: store.uiState.color,
        opacity: store.uiState.opacity,
        erase: store.uiState.erase,
        alphaLock: store.uiState.alphaLock,
        canvasSize,
      });
    case "bucketFill":
      return startTouchBucketFill({
        color: store.uiState.color,
        opacity: store.uiState.opacity,
        erase: store.uiState.erase,
        tolerance: store.uiState.bucketFillTolerance,
        imageData: canvas.getContextRead().getImageData(0, 0, canvas.width, canvas.height),
      });
    default:
      return null;
  }
}

export function wrapTransferWithClip(
  transfer: (ctx: CanvasContext) => void,
  selection: Selection | null,
): (ctx: CanvasContext) => void {
  if (!selection)
    return transfer;
  return (ctx) => {
    ctx.save();
    selection.setCanvasClip(ctx);
    transfer(ctx);
    ctx.restore();
  };
}

export async function appApplyEffect(effect: Effect) {
  const store = useAppState.getState();
  const layerOrg =
    store.stateContainer.state.layers[store.uiState.layerIndex];
  if (!layerOrg)
    return;

  // Check if the layer is locked
  if (layerOrg.locked) {
    return;
  }
  const canvas = new MCanvas(
    layerOrg.canvas.width,
    layerOrg.canvas.height
  );

  const selection = store.stateContainer.state.selection;
  if (selection) {
    await applyEffect(layerOrg.canvas, canvas, effect);
    const selectionInverted = selection.clone();
    selectionInverted.invert();
    const imageDataOrg = layerOrg.canvas.getContextRead().getImageData(0, 0, canvas.width, canvas.height);
    const ctx = canvas.getContextWrite();
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    selectionInverted.transferImageData(imageDataOrg, imageData);
    ctx.putImageData(imageData, 0, 0);
  } else {
    await applyEffect(layerOrg.canvas, canvas, effect);
  }

  const layer = {
    ...layerOrg,
    canvas,
  };
  // TODO: Do not use patch op.
  const op: Op = {
    type: "patch",
    patches: [
      {
        op: "replace",
        path: `/layers/${store.uiState.layerIndex}`,
        value: layer satisfies State["layers"][number],
      },
    ],
  };
  store.apply(op, null);
}

export function patchSelection(selection: Selection | null) {
  // If the selection is empty, set it to null
  if (selection?.getBounds() === null) selection = null;

  const store = useAppState.getState();
  store.apply(
    {
      type: "patch",
      patches: [
        {
          op: "replace",
          path: "/selection",
          value: selection satisfies State["selection"],
        },
      ],
    },
    null
  );
}
