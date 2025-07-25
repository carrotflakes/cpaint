import { produce, WritableDraft } from 'immer';
import { create } from 'zustand';
import { Rect as TransformRect } from '../components/overlays/TransformRectHandles';
import { usePerformanceSettings } from '../components/PerformanceSettings';
import { pushToast } from '../components/Toasts';
import { applyEffect, Effect } from '../features/effects';
import { MCanvas } from '../libs/MCanvas';
import { Selection } from '../libs/Selection';
import { CanvasContext } from '../libs/touch';
import {
  startTouchBrush,
} from "../libs/touch/brush";
import { startTouchBucketFill } from '../libs/touch/bucketFill';
import { Op } from '../model/op';
import { findLayerById, State, StateNew } from '../model/state';
import { StateContainer, StateContainerDo, StateContainerFromState, StateContainerRedo, StateContainerUndo, } from '../model/stateContainer';
import { createUiStateSlice, UiStateSlice } from './uiStateSlice';

type Mode = {
  type: "draw"
} | {
  type: "layerTransform"
  layerId: string
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
} | {
  type: "effectPreview"
  effect: Effect
  originalCanvas: MCanvas
  previewCanvas: MCanvas
}

export type AppState = {
  imageMeta: null | {
    id: number,
    name: string,
    createdAt: number,
  }
  mode: Mode
  stateContainer: StateContainer
  savedState: State | null

  canvasSize: () => { width: number; height: number }
  apply: (op: Op, transfer: ((ctx: OffscreenCanvasRenderingContext2D) => void) | null) => void
  open: (imageMeta: { id: number; name: string; createdAt: number }, state: State, colorHistory?: string[]) => void
  undo: () => void
  redo: () => void
  update: (update: (draft: WritableDraft<AppState>) => void) => void
  importAsLayer: (image: HTMLImageElement) => void
  addColorToHistory: (color: string) => void
  hasUnsavedChanges: () => boolean
  startEffectPreview: (effect: Effect) => void
  updateEffectPreview: (effect: Effect) => void
  applyEffectPreview: () => void
} & UiStateSlice;

export const useAppState = create<AppState>()((set, get) => {
  return ({
    ...createUiStateSlice(),
    imageMeta: null,
    mode: {
      type: "draw",
    },
    stateContainer: StateContainerFromState(StateNew(400, 400, false)),
    savedState: null,

    canvasSize() {
      return this.stateContainer.state.size;
    },
    apply(op, transfer) {
      // Check if the operation affects a locked layer
      if ('layerId' in op && typeof op.layerId === 'string') {
        const layer = findLayerById(get().stateContainer.state.layers, op.layerId);
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
          layerId: op.layerId,
          apply: transfer
        } : null),
      }))
    },
    open(imageMeta, state, colorHistory = []) {
      const stateContainer = StateContainerFromState(state);
      set(() => ({
        imageMeta,
        stateContainer,
        savedState: stateContainer.state,
        uiState: {
          ...get().uiState,
          currentLayerId: stateContainer.state.layers.at(-1)?.id ?? "",
          colorHistory: colorHistory,
          canvasView: {
            angle: 0,
            scale: 1,
            pan: [0, 0] as const,
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
      const canvasSize = useAppState.getState().canvasSize();
      set(() => ({
        mode: {
          type: "addImageAsLayer", image: canvas,
          rect: {
            cx: canvasSize.width / 2,
            cy: canvasSize.height / 2,
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
      }));
      // TODO: Select the last layer after undo
      ensureCurrentLayerId();
    },
    redo() {
      set((state) => ({
        stateContainer: StateContainerRedo(state.stateContainer),
      }));
      // TODO: Select the last layer after redo
      ensureCurrentLayerId();
    },
    hasUnsavedChanges() {
      const state = get();
      return !!state.imageMeta &&
        state.savedState !== state.stateContainer.state;
    },

    update(update) {
      set((state) => produce(state, update), true)
    },

    async startEffectPreview(effect) {
      const store = get();
      const layer = findLayerById(store.stateContainer.state.layers, store.uiState.currentLayerId);
      if (layer?.type !== "layer" || layer.locked) return;

      const originalCanvas = new MCanvas(layer.canvas.width, layer.canvas.height);
      {
        const ctx = originalCanvas.getContextWrite();
        ctx.drawImage(layer.canvas.getCanvas(), 0, 0);
      }

      const previewCanvas = new MCanvas(layer.canvas.width, layer.canvas.height);
      const selection = store.stateContainer.state.selection;

      await applyEffectWithSelection(originalCanvas, previewCanvas, effect, selection);

      set(() => ({
        mode: {
          type: "effectPreview",
          effect,
          originalCanvas,
          previewCanvas,
        }
      }));
    },

    async updateEffectPreview(effect) {
      const store = get();
      if (store.mode.type !== "effectPreview") return;

      const originalCanvas = store.mode.originalCanvas;
      const previewCanvas = store.mode.previewCanvas;
      const selection = store.stateContainer.state.selection;

      await applyEffectWithSelection(originalCanvas, previewCanvas, effect, selection);

      set(() => ({
        mode: {
          type: "effectPreview",
          effect,
          originalCanvas,
          previewCanvas,
        }
      }));
    },

    applyEffectPreview() {
      const store = get();
      if (store.mode.type !== "effectPreview") return;

      const op: Op = {
        type: "applyEffect",
        layerId: store.uiState.currentLayerId,
        effect: store.mode.effect,
      };

      const previewCanvas = store.mode.previewCanvas;
      store.apply(op, (ctx) => {
        ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        ctx.drawImage(previewCanvas.getCanvas(), 0, 0);
      });

      set(() => ({
        mode: { type: "draw" }
      }));
    },
  })
});

function ensureCurrentLayerId() {
  const store = useAppState.getState();
  if (!findLayerById(store.stateContainer.state.layers, store.uiState.currentLayerId)) {
    const lastLayer = store.stateContainer.state.layers.at(-1);
    if (!lastLayer) return;
    store.update((draft) => {
      draft.uiState.currentLayerId = lastLayer.id;
    });
  }
}

export function ImageMetaNew(name?: string) {
  return {
    id: Date.now(),
    name: name ?? new Date().toISOString().split(".")[0].replace(/:/g, "-"),
    createdAt: Date.now(),
  };
}

export function isLayerLocked(store: AppState, layerId?: string): boolean {
  const targetLayerId = layerId ?? store.uiState.currentLayerId;
  const layer = findLayerById(store.stateContainer.state.layers, targetLayerId);
  return layer?.locked ?? false;
}

export function createOp(store: AppState): Op | null {
  // Check if the current layer is locked
  if (isLayerLocked(store)) {
    return null;
  }

  switch (store.uiState.tool) {
    case "brush":
      return {
        type: "stroke",
        layerId: store.uiState.currentLayerId,
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
        layerId: store.uiState.currentLayerId,
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

  const layer = findLayerById(store.stateContainer.state.layers, store.uiState.currentLayerId);
  if (layer?.type !== "layer") {
    return null;
  }
  const canvas = layer.canvas;
  const canvasSize: [number, number] = [canvas.width, canvas.height];

  switch (store.uiState.tool) {
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

async function applyEffectWithSelection(originalCanvas: MCanvas, previewCanvas: MCanvas, effect: Effect, selection: Selection | null) {
  if (!selection) {
    await applyEffect(originalCanvas, previewCanvas, effect, usePerformanceSettings.getState().useWebGL);
    return;
  }

  await applyEffect(originalCanvas, previewCanvas, effect, usePerformanceSettings.getState().useWebGL);
  const selectionInverted = selection.clone();
  selectionInverted.invert();
  const imageDataOrg = originalCanvas.getContextRead().getImageData(0, 0, originalCanvas.width, originalCanvas.height);
  const ctx = previewCanvas.getContextWrite();
  const imageData = ctx.getImageData(0, 0, previewCanvas.width, previewCanvas.height);
  selectionInverted.transferImageData(imageDataOrg, imageData);
  ctx.putImageData(imageData, 0, 0);
}
