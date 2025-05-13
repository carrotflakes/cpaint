import { produce, WritableDraft } from 'immer';
import { create } from 'zustand';
import {
  startTouchBrush,
} from "../libs/touch/brush";
import { Op } from '../model/op';
import { StateContainer, StateContainerDo, StateContainerNew, StateContainerRedo, StateContainerUndo } from '../model/state';
import { startTouchFill } from '../libs/touch/fill';
import { startTouchBucketFill } from '../libs/touch/bucketFill';

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
    canvasView: {
      angle: number
      scale: number
      pan: [number, number]
    }
  }
  stateContainer: StateContainer

  apply: (op: Op, transfer: ((ctx: OffscreenCanvasRenderingContext2D) => void) | null) => void
  new: (size: [number, number]) => void
  undo: () => void
  redo: () => void
  update: (update: (draft: WritableDraft<AppState>) => void) => void
};

export const useAppState = create<AppState>()((set) => {
  return ({
    imageMeta: null,
    uiState: {
      tool: "brush" as ToolType,
      color: "#000",
      erase: false,
      penSize: 5,
      opacity: 1,
      softPen: false,
      brushType: "soft",
      layerIndex: 0,
      canvasView: {
        angle: 0,
        scale: 1,
        pan: [0, 0],
      },
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

export function createTouch(store: AppState) {
  const canvas = store.stateContainer.state.layers[store.uiState.layerIndex].canvas;
  const canvasSize: [number, number] = [canvas.width, canvas.height];

  switch (store.uiState.tool) {
    case "fill":
      return startTouchFill({
        color: store.uiState.color,
        opacity: store.uiState.opacity,
        erace: store.uiState.erase,
      });
    case "brush":
      return startTouchBrush({
        brushType: store.uiState.brushType,
        width: store.uiState.penSize,
        color: store.uiState.color,
        opacity: store.uiState.opacity,
        erace: store.uiState.erase,
        canvasSize,
      });
    case "bucketFill":
      return startTouchBucketFill({
        color: store.uiState.color,
        opacity: store.uiState.opacity,
        erace: store.uiState.erase,
        imageData: canvas.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, canvas.width, canvas.height),
      });
    default:
      return null;
  }
}
