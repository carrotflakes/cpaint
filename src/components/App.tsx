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
      if (e.key === "p") useStore.setState({ tool: "pen" });
      if (e.key === "e") useStore.setState({ tool: "eraser" });
      if (e.key === "f") useStore.setState({ tool: "fill" });
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
    <div className="w-dvw h-dvh flex flex-col items-stretch overflow-hidden touch-none">
      <div className="bg-gray-50 border-b border-gray-300">
        <Header />
      </div>
      {store.imageMeta && (
        <div className="grow flex items-stretch">
          <div className="bg-gray-50 border-r border-gray-300">
            <ToolBar />
          </div>
          <div className="grow bg-gray-200">
            <Canvas />
          </div>
        </div>
      )}
      {!store.imageMeta && (
        <div className="grow flex items-stretch bg-gray-200">
          <Files />
        </div>
      )}

      <Toasts />

      <SettingDialog />
    </div>
  );
}

export default App;
