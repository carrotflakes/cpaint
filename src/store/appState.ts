import { produce, WritableDraft } from 'immer';
import { create } from 'zustand';
import {
  startTouchBrush,
} from "../libs/touch/brush";
import { Op } from '../model/op';
import { StateContainer, StateContainerDo, StateContainerNew, StateContainerRedo, StateContainerUndo, StateContainerFromState, State } from '../model/state';
import { startTouchFill } from '../libs/touch/fill';
import { startTouchBucketFill } from '../libs/touch/bucketFill';
import { BlendMode } from "../model/blendMode";
import { Rect as TransformRect } from '../components/TransformRectHandles';
import { blur } from '../libs/imageFx';

type ToolType = "brush" | "fill" | "bucketFill" | "eyeDropper";

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
    canvasView: {
      angle: number
      scale: number
      pan: [number, number]
    }
  }
  mode: {
    type: "draw"
  } | {
    type: "layerTransform"
    layerIndex: number
    rect: TransformRect
  } | {
    type: "canvasResize"
    rendered: OffscreenCanvas
    size: [number, number]
    rect: TransformRect
  } | {
    type: "addImageAsLayer"
    image: OffscreenCanvas
    rect: TransformRect
  }
  stateContainer: StateContainer

  apply: (op: Op, transfer: ((ctx: OffscreenCanvasRenderingContext2D) => void) | null) => void
  new: (size: [number, number]) => void
  undo: () => void
  redo: () => void
  update: (update: (draft: WritableDraft<AppState>) => void) => void
  openAsNewFile: (image: HTMLImageElement) => void
  importAsLayer: (image: HTMLImageElement) => void
};

export const useAppState = create<AppState>()((set) => {
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
      canvasView: {
        angle: 0,
        scale: 1,
        pan: [0, 0],
      },
      layerTransform: null,
    },
    mode: {
      type: "draw",
    },
    stateContainer: StateContainerNew(400, 400),

    apply(op, transfer) {
      set(state => ({
        stateContainer: StateContainerDo(state.stateContainer, op, transfer && op.type !== "patch" ? {
          layerId: state.stateContainer.state.layers[op.layerIndex].id,
          apply: transfer
        } : null),
      }))
    },
    new(size: [number, number]) {
      set(() => ({
        imageMeta: {
          id: Date.now(),
          name: new Date().toISOString().split(".")[0].replace(/:/g, "-"),
          createdAt: Date.now(),
        },
        stateContainer: StateContainerNew(size[0], size[1]),
      }))
    },
    openAsNewFile(image: HTMLImageElement) {
      const { width, height } = image;
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      set(() => ({
        imageMeta: {
          id: Date.now(),
          name: "Imported Image",
          createdAt: Date.now(),
        },
        stateContainer: StateContainerFromState({
          layers: [
            {
              id: "0",
              canvas,
              visible: true,
              opacity: 1,
              blendMode: "source-over" as BlendMode,
            },
          ],
        }),
      }));
    },
    importAsLayer(image: HTMLImageElement) {
      const { width, height } = image;
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d")!;
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

    update(update) {
      set((state) => produce(state, update), true)
    },
  })
});

export function createOp(store: AppState): Op | null {
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
        imageData: canvas.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, canvas.width, canvas.height),
      });
    default:
      return null;
  }
}

export function applyEffect() {
  const store = useAppState.getState();
  const layerOrg =
    store.stateContainer.state.layers[store.uiState.layerIndex];
  const canvas = new OffscreenCanvas(
    layerOrg.canvas.width,
    layerOrg.canvas.height
  );
  blur(layerOrg.canvas, canvas, 5);
  const layer = {
    ...layerOrg,
    canvas,
  };
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
