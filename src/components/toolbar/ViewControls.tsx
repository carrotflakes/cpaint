import { useAppState } from "@/store/appState";

export function ViewControls() {
  const store = useAppState();

  return (
    <div className="space-y-2">
      <div>
        <div className="text-xs font-medium mb-1">View</div>
        <div className="flex flex-col gap-1">
          <button
            className="px-2 py-1 text-xs rounded border bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={() =>
              store.update((draft) => {
                draft.uiState.canvasView = {
                  ...draft.uiState.canvasView,
                  angle: 0,
                  scale: 1,
                  pan: [0, 0],
                };
              })
            }
            title="Reset view"
          >
            <div className="flex items-center gap-1">Reset View</div>
          </button>

          <button
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              store.uiState.canvasView.flipX
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
            onClick={() =>
              store.update((draft) => {
                draft.uiState.canvasView.flipX =
                  !draft.uiState.canvasView.flipX;
              })
            }
            title="Flip X"
          >
            Flip X
          </button>

          <button
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              store.uiState.canvasView.flipY
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
            onClick={() =>
              store.update((draft) => {
                draft.uiState.canvasView.flipY =
                  !draft.uiState.canvasView.flipY;
              })
            }
            title="Flip Y"
          >
            Flip Y
          </button>

          <div className="flex items-center gap-1">
            <button
              className="px-2 py-1 text-xs rounded border bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              onClick={() =>
                store.update((draft) => {
                  draft.uiState.canvasView.angle =
                    (draft.uiState.canvasView.angle - (Math.PI * 2) / 16) %
                    (Math.PI * 2);
                })
              }
              title="Rotate counterclockwise"
            >
              ↺
            </button>

            <div className="text-xs text-gray-600 dark:text-gray-400 min-w-8 text-center">
              {((store.uiState.canvasView.angle * 360) / (Math.PI * 2)).toFixed(
                0
              )}
              °
            </div>

            <button
              className="px-2 py-1 text-xs rounded border bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              onClick={() =>
                store.update((draft) => {
                  draft.uiState.canvasView.angle =
                    (draft.uiState.canvasView.angle + (Math.PI * 2) / 16) %
                    (Math.PI * 2);
                })
              }
              title="Rotate clockwise"
            >
              ↻
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
