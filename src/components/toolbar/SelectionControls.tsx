import { ReactComponent as IconLasso } from "@/assets/icons/lasso.svg";
import { ReactComponent as IconMagicWand } from "@/assets/icons/magic-wand.svg";
import {
  SelectionOperation,
  SelectionTool,
  useAppState,
} from "@/store/appState";
import { selectAll, selectClear, selectInvert } from "@/store/selection";
import { ReactNode } from "react";

const SELECTION_TOOLS: {
  id: SelectionTool;
  label: ReactNode;
  title: string;
}[] = [
  { id: "rectangle", label: "□", title: "Rectangle Selection" },
  { id: "ellipse", label: "○", title: "Ellipse Selection" },
  { id: "lasso", label: <IconLasso />, title: "Lasso Selection" },
  { id: "magicWand", label: <IconMagicWand />, title: "Magic Wand" },
];

const SELECTION_OPERATIONS: {
  id: SelectionOperation;
  label: string;
  title: string;
}[] = [
  { id: "new", label: "New", title: "New Selection" },
  { id: "add", label: "Add", title: "Add to Selection" },
  { id: "subtract", label: "Sub", title: "Subtract from Selection" },
  { id: "intersect", label: "Int", title: "Intersect with Selection" },
];

export function SelectionControls() {
  const store = useAppState();
  const { uiState } = store;

  return (
    <div className="space-y-2">
      {/* Selection Tool Type */}
      <div>
        <div className="text-xs font-medium mb-1">Tool</div>
        <div className="flex gap-1">
          {SELECTION_TOOLS.map((tool) => (
            <button
              key={tool.id}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                uiState.selectionTool === tool.id
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              onClick={() => {
                store.update((draft) => {
                  draft.uiState.selectionTool = tool.id;
                });
              }}
              title={tool.title}
            >
              {tool.label}
            </button>
          ))}
        </div>
      </div>

      {/* Selection Operation */}
      <div>
        <div className="text-xs font-medium mb-1">Operation</div>
        <div className="flex gap-1">
          {SELECTION_OPERATIONS.map((operation) => (
            <button
              key={operation.id}
              className={`px-2 py-1 text-xs rounded border transition-colors ${
                uiState.selectionOperation === operation.id
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              onClick={() => {
                store.update((draft) => {
                  draft.uiState.selectionOperation = operation.id;
                });
              }}
              title={operation.title}
            >
              {operation.label}
            </button>
          ))}
        </div>
      </div>

      {/* Magic Wand Tolerance */}
      {uiState.selectionTool === "magicWand" && (
        <div>
          <div className="text-xs font-medium mb-1">Tolerance</div>
          <input
            type="range"
            min="0"
            max="255"
            value={uiState.selectionTolerance}
            onChange={(e) => {
              store.update((draft) => {
                draft.uiState.selectionTolerance = parseInt(e.target.value);
              });
            }}
            className="w-full"
          />
          <div className="text-xs text-gray-500 mt-1">
            {uiState.selectionTolerance}
          </div>
        </div>
      )}

      {/* Selection Actions */}
      <div>
        <div className="text-xs font-medium mb-1">Actions</div>
        <div className="flex gap-1">
          <button
            className="px-2 py-1 text-xs rounded border bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={() => selectAll()}
            title="Select All"
          >
            All
          </button>
          <button
            className="px-2 py-1 text-xs rounded border bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={() => selectClear()}
            title="Clear Selection"
          >
            Clear
          </button>
          <button
            className="px-2 py-1 text-xs rounded border bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={() => selectInvert()}
            title="Invert Selection"
          >
            Invert
          </button>
        </div>
      </div>

      {/* Edit Selection */}
      <div>
        <div className="text-xs font-medium mb-1">Edit</div>
        <div className="flex gap-1">
          <button
            className="px-2 py-1 text-xs rounded border bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={() => fillSelection()}
            title="Fill Selection"
          >
            Fill
          </button>
          <button
            className="px-2 py-1 text-xs rounded border bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={() => deleteSelection()}
            title="Delete Selection"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Selection Info */}
      {store.stateContainer.state.selection && (
        <div className="text-xs text-gray-500">
          <div>Selection active</div>
          {(() => {
            const bounds = store.stateContainer.state.selection?.getBounds();
            if (bounds) {
              return (
                <div>
                  {bounds.width}x{bounds.height} at ({bounds.x},{bounds.y})
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}
    </div>
  );
}

function fillSelection() {
  const store = useAppState.getState();
  const selection = store.stateContainer.state.selection;

  const currentLayer =
    store.stateContainer.state.layers[store.uiState.layerIndex];
  if (!currentLayer) return;

  const op = {
    type: "selectionFill",
    fillColor: store.uiState.color,
    opacity: store.uiState.opacity,
    layerIndex: store.uiState.layerIndex,
  } as const;

  const transfer = (ctx: OffscreenCanvasRenderingContext2D) => {
    ctx.save();
    selection?.setCanvasClip(ctx);
    ctx.fillStyle = store.uiState.color;
    ctx.globalAlpha = store.uiState.opacity;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  };

  store.apply(op, transfer);
}

function deleteSelection() {
  const store = useAppState.getState();
  const selection = store.stateContainer.state.selection;

  if (!selection) return;

  const currentLayer =
    store.stateContainer.state.layers[store.uiState.layerIndex];
  if (!currentLayer) return;

  const op = {
    type: "selectionDelete",
    layerIndex: store.uiState.layerIndex,
  } as const;

  const transfer = (ctx: OffscreenCanvasRenderingContext2D) => {
    ctx.save();
    selection?.setCanvasClip(ctx);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  };

  store.apply(op, transfer);
}
