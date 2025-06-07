import { useEffect } from "react";
import { useDisableScroll } from "../hooks/useDisableScroll";
import { useAppState } from "../store/appState";
import AddImageAsLayer from "./AddImageAsLayer";
import CanvasResize from "./CanvasResize";
import { Files } from "./Files";
import { Header } from "./Header";
import { ImageDropTarget } from "./ImageDropTarget";
import { LayersBar } from "./LayersBar";
import MainCanvasArea from "./MainCanvasArea";
import { SettingDialog } from "./SettingDialog";
import { pushToast, Toasts } from "./Toasts";
import { ToolBar } from "./ToolBar";
import Transform from "./Transform";

function App() {
  useDisableScroll();

  const store = useAppState();

  useEffect(() => {
    const keyDown = (e: KeyboardEvent) => {
      if (e.key === "p")
        useAppState.setState({ uiState: { ...store.uiState, tool: "brush" } });
      if (e.key === "e")
        useAppState.getState().update((draft) => {
          draft.uiState.erase = !draft.uiState.erase;
        });
      if (e.key === "f")
        useAppState.setState({ uiState: { ...store.uiState, tool: "fill" } });
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
    <div className="w-dvw h-dvh flex flex-col items-stretch overflow-hidden text-gray-800 dark:text-gray-100 relative">
      <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-300">
        <Header />
      </div>

      {store.imageMeta &&
        (store.mode.type === "layerTransform" ? (
          <div className="grow bg-gray-200 dark:bg-gray-800">
            <Transform />
          </div>
        ) : store.mode.type === "canvasResize" ? (
          <div className="grow bg-gray-200 dark:bg-gray-800">
            <CanvasResize />
          </div>
        ) : store.mode.type === "addImageAsLayer" ? (
          <div className="grow bg-gray-200 dark:bg-gray-800">
            <AddImageAsLayer />
          </div>
        ) : (
          <div className="relative grow flex items-stretch min-h-0">
            <div className="bg-gray-50 dark:bg-gray-800 border-r border-gray-300">
              <ToolBar />
            </div>
            <div className="grow bg-gray-200 dark:bg-gray-800">
              <MainCanvasArea />
            </div>
            <div className="absolute top-0 right-0">
              <LayersBar />
            </div>
          </div>
        ))}

      {!store.imageMeta && (
        <div className="grow flex items-stretch bg-gray-200 dark:bg-gray-800">
          <Files />
        </div>
      )}

      <Toasts />

      <SettingDialog />

      <ImageDropTarget />
    </div>
  );
}

export default App;
