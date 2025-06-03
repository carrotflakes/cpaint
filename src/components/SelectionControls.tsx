import { Selection } from "../libs/selection";
import { State } from "../model/state";
import {
  SelectionOperation,
  SelectionTool,
  useAppState,
} from "../store/appState";

const SELECTION_TOOLS: {
  id: SelectionTool;
  label: string;
  title: string;
}[] = [
  { id: "rectangle", label: "□", title: "Rectangle Selection" },
  { id: "ellipse", label: "○", title: "Ellipse Selection" },
  { id: "lasso", label: "◊", title: "Lasso Selection" },
  { id: "magicWand", label: "✦", title: "Magic Wand" },
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
          <button
            className="px-2 py-1 text-xs rounded border bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={() => selectTest()}
            title="Test Selection"
          >
            Test
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

function selectAll() {
  const store = useAppState.getState();
  const firstCanvas = store.stateContainer.state.layers[0].canvas;
  const selection = new Selection(firstCanvas.width, firstCanvas.height, true);
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

function selectClear() {
  const store = useAppState.getState();
  store.apply(
    {
      type: "patch",
      patches: [
        {
          op: "replace",
          path: "/selection",
          value: null satisfies State["selection"],
        },
      ],
    },
    null
  );
}

function selectInvert() {
  const store = useAppState.getState();
  const firstCanvas = store.stateContainer.state.layers[0].canvas;
  const selection =
    store.stateContainer.state.selection?.clone() ??
    new Selection(firstCanvas.width, firstCanvas.height, false);
  selection.invert();
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

function selectTest() {
  const store = useAppState.getState();
  const firstCanvas = store.stateContainer.state.layers[0].canvas;
  const selection = new Selection(firstCanvas.width, firstCanvas.height, false);
  selection.setPixel(1, 1, true);
  selection.setPixel(2, 1, true);
  selection.setPixel(3, 1, true);
  selection.setPixel(4, 1, true);
  selection.setPixel(5, 1, true);
  selection.setPixel(5, 2, true);
  selection.setPixel(5, 3, true);
  selection.setPixel(5, 4, true);
  selection.setPixel(5, 5, true);
  selection.setPixel(4, 5, true);
  selection.setPixel(3, 5, true);
  selection.setPixel(3, 4, true);
  selection.setPixel(3, 3, true);
  selection.setPixel(1, 2, true);
  selection.setPixel(1, 3, true);
  selection.setPixel(1, 4, true);
  selection.setPixel(1, 5, true);
  selection.setPixel(1, 6, true);
  selection.setPixel(1, 7, true);
  selection.setPixel(1, 8, true);
  selection.setPixel(1, 9, true);
  selection.setPixel(2, 7, true);
  selection.setPixel(2, 9, true);
  selection.setPixel(3, 7, true);
  selection.setPixel(3, 8, true);
  selection.setPixel(3, 9, true);
  selection.setPixel(6, 6, true);
  selection.setPixel(5, 7, true);
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
