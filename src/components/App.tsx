import Canvas from "./Canvas";
import { ToolBar } from "./ToolBar";

function App() {
  return (
    <div className="w-screen h-screen flex items-stretch">
      <div className="bg-gray-100">
        <ToolBar />
      </div>
      <div>
        <Canvas />
      </div>
    </div>
  );
}

export default App;
