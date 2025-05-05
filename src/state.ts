import { produce, WritableDraft } from 'immer';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StateContainer, StateContainerDo, StateContainerNew, StateContainerRedo, StateContainerUndo } from './model/state';
import { Op } from './model/op';

type ToolType = "pen" | "eraser" | "fill";

export type State = {
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
  apply: (op: Op, canvas: OffscreenCanvas) => void
  clearAll: () => void

  undo: () => void
  redo: () => void
  update: (update: (draft: WritableDraft<State>) => void) => void
};

// export type Op = {
//   type: "init";
//   layerCanvases: OffscreenCanvas[];
// } | {
//   type: "stroke";
//   erase: boolean;
//   strokeStyle: {
//     color: string
//     soft: boolean
//   };
//   opacity: number;
//   path: { pos: [number, number], size: number }[];
//   layerIndex: number;
// } | {
//   type: "fill";
//   fillColor: string;
//   opacity: number;
//   path: { pos: [number, number] }[];
//   layerIndex: number;
// // } | {
// //   type: "addLayer";
// // } | {
// //   type: "removeLayer";
// //   layerIndex: number;
// //   initial: OffscreenCanvas;
// //   canvas: OffscreenCanvas;
// // } | {
// //   type: "moveLayer";
// //   fromIndex: number;
// //   toIndex: number;
// };

export const useStore = create<State>()((set) => {
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
    apply(op, canvas) {
      set(state => ({
        stateContainer: StateContainerDo(state.stateContainer, op, {
          layerId: state.stateContainer.state.layers[op.layerIndex].id,
          apply: (ctx) => {
            ctx.save();
            if (op.type === "stroke" && op.erase)
              ctx.globalCompositeOperation = "destination-out";
            ctx.globalAlpha = op.opacity;
            ctx.drawImage(canvas, 0, 0);
            ctx.restore();
          }
        }),
      }))
      // set((state) => {
      //   if (op.type === "stroke" || op.type === "fill") {
      //     const layer = state.layers[op.layerIndex];
      //     const ctx = layer.canvas.getContext("2d")!;
      //     ctx.save();
      //     ctx.globalAlpha = state.uiState.opacity;
      //     if (state.uiState.tool === "eraser")
      //       ctx.globalCompositeOperation = "destination-out";
      //     ctx.drawImage(canvas, 0, 0);
      //     ctx.restore();
      //   }
      //   // else if (op.type === "addLayer") {
      //   //   const canvas = new OffscreenCanvas(
      //   //     state.layers[0].canvas.width,
      //   //     state.layers[0].canvas.height
      //   //   );
      //   //   const initial = new OffscreenCanvas(
      //   //     state.layers[0].canvas.width,
      //   //     state.layers[0].canvas.height
      //   //   );
      //   //   state.layers.push({ initial, canvas });
      //   // } else if (op.type === "removeLayer") {
      //   //   state.layers.splice(op.layerIndex, 1);
      //   //   if (state.layerIndex >= state.layers.length)
      //   //     state.layerIndex = state.layers.length - 1;
      //   // }
      //   const history = state.history.clone();
      //   history.push(op);
      //   return { history, updatedAt: new Date() }
      // })
    },
    updatedAt: new Date(),
    clearAll() {
      set(() => ({
        stateContainer: StateContainerNew(400, 400),
      }))
    },

    undo() {
      set((state) => {
        return {
          stateContainer: StateContainerUndo(state.stateContainer),
        }
      })
    },
    redo() {
      set((state) => {
        return {
          stateContainer: StateContainerRedo(state.stateContainer),
        }
      })
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
