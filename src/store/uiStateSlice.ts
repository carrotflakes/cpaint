export type ToolType = "brush" | "fill" | "bucketFill" | "eyeDropper" | "selection";
export type SelectionOperation = 'new' | 'add' | 'subtract' | 'intersect';
export type SelectionTool = 'rectangle' | 'ellipse' | 'lasso' | 'magicWand' | 'paint';

export type UiStateSlice = {
  uiState: {
    tool: ToolType;
    color: string;
    erase: boolean;
    penSize: number;
    opacity: number;
    brushType: string;
    currentLayerId: string;
    bucketFillTolerance: number;
    alphaLock: boolean;
    selectionTool: SelectionTool;
    selectionOperation: SelectionOperation;
    selectionTolerance: number;
    canvasView: {
      angle: number;
      scale: number;
      pan: [number, number];
      flipX: boolean;
      flipY: boolean;
    };
    colorHistory: string[];
  };
};

export const createUiStateSlice = () => ({
  uiState: {
    tool: "brush" as ToolType,
    color: "#000",
    erase: false,
    penSize: 10,
    opacity: 1,
    softPen: false,
    brushType: "particle1",
    currentLayerId: "", // Will be set when opening a file
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
} as UiStateSlice);
