import { useEffect } from "react";
import { useStore } from "../state";
import Canvas from "./Canvas";
import { Toasts } from "./Toasts";
import { ToolBar } from "./ToolBar";
import { useDisableScroll } from "../hooks/useDisableScroll";

function App() {
  useDisableScroll();

  const store = useStore();

  useEffect(() => {
    const keyDown = (e: KeyboardEvent) => {
      if (e.key === "p") store.setTool("pen");
      if (e.key === "e") store.setTool("eraser");
      if (e.key === "f") store.setTool("fill");
    };
    window.addEventListener("keydown", keyDown);
    return () => window.removeEventListener("keydown", keyDown);
  }, [store]);

  return (
    <div className="w-dvw h-dvh flex items-stretch overflow-hidden">
      <div className="bg-gray-100">
        <ToolBar />
      </div>
      <div className="flex-grow bg-gray-200">
        <Canvas />
      </div>
      <Toasts />
    </div>
  );
}

export default App;
