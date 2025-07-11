import { useEffect } from "react";
import { UnsavedChangesDialog } from "../features/unsaved-changes";
import { useBeforeUnload } from "../hooks/useBeforeUnload";
import { useAppState } from "../store/appState";
import { useGlobalSettings } from "../store/globalSetting";
import AddImageAsLayer from "./AddImageAsLayer";
import CanvasResize from "./CanvasResize";
import EffectPreview from "./EffectPreview";
import { Files } from "./Files";
import { Header } from "./Header";
import { ImageDropTarget } from "./ImageDropTarget";
import { LayersBar } from "./LayersBar";
import MainCanvasArea from "./MainCanvasArea";
import { OpHistory } from "./OpHistory";
import { PenPressureDialog } from "./PenPressureDialog";
import { PerformanceSettingsDialog } from "./PerformanceSettings";
import { SettingDialog } from "./SettingDialog";
import { pushToast, Toasts } from "./Toasts";
import { ToolBar } from "./toolbar/ToolBar";
import Transform from "./Transform";

function App() {
  useBeforeUnload();
  useReportUncaughtError();

  const imageMeta = useAppState((s) => s.imageMeta);
  const mode = useAppState((s) => s.mode);
  const showOpHistory = useGlobalSettings((s) => s.showOpHistory);

  return (
    <div
      data-testid="app"
      className="w-dvw h-dvh flex flex-col items-stretch overflow-hidden text-gray-800 dark:text-gray-100 relative"
    >
      <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-300">
        <Header />
      </div>

      {imageMeta &&
        (mode.type === "layerTransform" ? (
          <div className="grow bg-gray-200 dark:bg-gray-800">
            <Transform />
          </div>
        ) : mode.type === "canvasResize" ? (
          <div className="grow bg-gray-200 dark:bg-gray-800">
            <CanvasResize />
          </div>
        ) : mode.type === "addImageAsLayer" ? (
          <div className="grow bg-gray-200 dark:bg-gray-800">
            <AddImageAsLayer />
          </div>
        ) : mode.type === "effectPreview" ? (
          <div className="grow bg-gray-200 dark:bg-gray-800">
            <EffectPreview />
          </div>
        ) : (
          <div className="relative grow flex items-stretch min-h-0">
            <div className="bg-gray-50 dark:bg-gray-800 border-r border-gray-300">
              <ToolBar />
            </div>
            <div className="grow bg-gray-200 dark:bg-gray-800">
              <MainCanvasArea />
            </div>
            <div className="absolute top-0 right-0 bottom-0 pointer-events-none [&>*]:pointer-events-auto">
              <LayersBar />
              {showOpHistory && <OpHistory />}
            </div>
          </div>
        ))}

      {!imageMeta && (
        <div
          className="grow min-h-0 flex items-stretch bg-gray-200 dark:bg-gray-800 overflow-y-auto"
          data-scroll
        >
          <Files />
        </div>
      )}

      <Toasts />
      <SettingDialog />
      <PenPressureDialog />
      <PerformanceSettingsDialog />
      <ImageDropTarget />
      <UnsavedChangesDialog />
    </div>
  );
}

export default App;

function useReportUncaughtError() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      pushToast("Uncaught error occurred: " + event.error.message, {
        type: "error",
      });
    };
    window.addEventListener("error", onError);
    return () => window.removeEventListener("error", onError);
  }, []);
}
