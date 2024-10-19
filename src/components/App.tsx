import { useEffect } from "react";
import { useDisableScroll } from "../hooks/useDisableScroll";
import { useStore } from "../state";
import Canvas from "./Canvas";
import { Header } from "./Header";
import { SettingDialog } from "./SettingDialog";
import { Toasts } from "./Toasts";
import { ToolBar } from "./ToolBar";

function App() {
  useDisableScroll();

  const store = useStore();

  useEffect(() => {
    const keyDown = (e: KeyboardEvent) => {
      if (e.key === "p") store.setTool("pen");
      if (e.key === "e") store.setTool("eraser");
      if (e.key === "f") store.setTool("fill");
      if (e.ctrlKey && e.key === "z") store.undo();
      if (e.ctrlKey && e.key === "Z") store.redo();
    };
    window.addEventListener("keydown", keyDown);
    return () => window.removeEventListener("keydown", keyDown);
  }, [store]);

  return (
    <div className="w-dvw h-dvh flex flex-col items-stretch overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-300">
        <Header />
      </div>
      <div className="grow flex items-stretch">
        <div className="bg-gray-50 border-r border-gray-300">
          <ToolBar />
        </div>
        <div className="grow bg-gray-200">
          <Canvas />
        </div>
      </div>

      <Toasts />

      <SettingDialog />
    </div>
  );
}

export default App;
