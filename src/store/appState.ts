import { produce, WritableDraft } from 'immer';
import { create } from 'zustand';
import {
  startTouchBrush,
} from "../libs/touch/brush";
import { Op } from '../model/op';
import { StateContainer, StateContainerDo, StateContainerNew, StateContainerRedo, StateContainerUndo } from '../model/state';
import { startTouchFill } from '../libs/touch/fill';

type ToolType = "brush" | "fill";

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
  clearAll: () => void

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
    clearAll() {
      set(() => ({
        stateContainer: StateContainerNew(400, 400),
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
  const firstCanvas = store.stateContainer.state.layers[0].canvas;
  const canvasSize: [number, number] = [firstCanvas.width, firstCanvas.height];

  if (store.uiState.tool === "fill") {
    return startTouchFill({
      color: store.uiState.color,
      opacity: store.uiState.opacity,
      erace: store.uiState.erase,
    });
  } else if (store.uiState.tool === "brush") {
    return startTouchBrush({
      brushType: store.uiState.brushType,
      width: store.uiState.penSize,
      color: store.uiState.color,
      opacity: store.uiState.opacity,
      erace: store.uiState.erase,
      canvasSize,
    });
  }
  return null;
}
