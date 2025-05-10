import { produce, WritableDraft } from 'immer';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StateContainer, StateContainerDo, StateContainerNew, StateContainerRedo, StateContainerUndo } from './model/state';
import { Op } from './model/op';

type ToolType = "pen" | "eraser" | "fill";

export type AppState = {
  imageMeta: null | {
    id: number,
    name: string,
    createdAt: number,
  }
  uiState: {
    tool: ToolType
    color: string
    penSize: number
    opacity: number
    softPen: boolean
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
      color: "#000",
      penSize: 5,
      opacity: 1,
      softPen: false,
      layerIndex: 0,
      tool: "pen" as ToolType,
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
    updatedAt: new Date(),
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

export type GlobalSettings = {
  fingerOperations: boolean
  wheelZoom: boolean
}

export const useGlobalSettings = create<GlobalSettings>()(
  persist((_set) => ({
    fingerOperations: false,
    wheelZoom: false,
  }), {
    name: 'cpaint',
  }));
