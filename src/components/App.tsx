import { useEffect } from "react";
import { useDisableScroll } from "../hooks/useDisableScroll";
import { useStore } from "../state";
import Canvas from "./Canvas";
import { Files } from "./Files";
import { Header } from "./Header";
import { SettingDialog } from "./SettingDialog";
import { pushToast, Toasts } from "./Toasts";
import { ToolBar } from "./ToolBar";

function App() {
  useDisableScroll();

  const store = useStore();

  useEffect(() => {
    const keyDown = (e: KeyboardEvent) => {
      if (e.key === "p") useStore.setState({ uiState: { ...store.uiState, tool: "pen" } });
      if (e.key === "e") useStore.setState({ uiState: { ...store.uiState, tool: "eraser" } });
      if (e.key === "f") useStore.setState({ uiState: { ...store.uiState, tool: "fill" } });
      if (e.ctrlKey && e.key === "z") store.undo();
      if (e.ctrlKey && e.key === "Z") store.redo();
    };
    window.addEventListener("keydown", keyDown);
    return () => window.removeEventListener("keydown", keyDown);
  }, [store]);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      pushToast("Uncaught error occurred: " + event.error.message);
    };
    window.addEventListener("error", onError);
    return () => window.removeEventListener("error", onError);
  }, []);

  return (
    <div className="w-dvw h-dvh flex flex-col items-stretch overflow-hidden touch-none text-gray-800 dark:text-gray-100">
      <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-300">
        <Header />
      </div>
      {store.imageMeta && (
        <div className="relative grow flex items-stretch">
          <div className="bg-gray-50 dark:bg-gray-800 border-r border-gray-300">
            <ToolBar />
          </div>
          <div className="grow bg-gray-200 dark:bg-gray-800">
            <Canvas />
          </div>
          <div className="absolute top-0 right-0">
            <LayersBar />
          </div>
        </div>
      )}
      {!store.imageMeta && (
        <div className="grow flex items-stretch bg-gray-200 dark:bg-gray-800">
          <Files />
        </div>
      )}

      <Toasts />

      <SettingDialog />
    </div>
  );
}

export default App;

function LayersBar() {
  const store = useStore();

  const addLayer = () => {
    const layers = store.stateContainer.state.layers;
    const firstLayer = layers[0];
    const canvas = new OffscreenCanvas(
      firstLayer.canvas.width,
      firstLayer.canvas.height
    );
    store.apply({
      type: "patch",
      patches: [
        {
          op: "add",
          path: `/layers/${layers.length}`,
          value: {
            id: `${Date.now()}`,
            canvas,
          },
        }
      ]
    }, null);
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border-r border-gray-300">
      <div className="flex flex-col items-stretch">
        <div className="p-2 border-b border-gray-300">Layers</div>
        <div className="flex-grow overflow-y-auto">
          {store.stateContainer.state.layers.map((layer, i) => (
            <div
              key={i}
              className={`p-2 cursor-pointer ${
                i === store.uiState.layerIndex ? "bg-gray-100 dark:bg-gray-700" : ""
              }`}
              onClick={() => {
                store.update((draft) => {
                  draft.uiState.layerIndex = i;
                });
              }}
            >
              Layer {i}
            </div>
          ))}
          <div className="p-2 cursor-pointer" onClick={addLayer}>
            New Layer
          </div>
        </div>
      </div>
    </div>
  );
}
