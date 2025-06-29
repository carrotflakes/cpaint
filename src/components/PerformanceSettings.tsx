// Performance settings component for effect optimization
// src/components/PerformanceSettings.tsx

import { create } from "zustand";
import { ModalDialog } from "./ModalDialog";
import { Toggle } from "./Toggle";
import { isWebGLSupported } from "../features/effects/webgl";

export const usePerformanceSettings = create<{
  useWebGL: boolean;
  setUseWebGL(useWebGL: boolean): void;
}>()((set) => ({
  useWebGL: true,
  setUseWebGL(useWebGL: boolean) {
    set({ useWebGL });
  },
}));

export const usePerformanceSettingsDialog = create<{
  show: boolean;
  setShow(show: boolean): void;
}>()((set) => ({
  show: false,
  setShow(show: boolean) {
    set({ show });
  },
}));

export function PerformanceSettingsDialog() {
  const dialog = usePerformanceSettingsDialog();
  const performanceSettings = usePerformanceSettings();
  const webglSupported = isWebGLSupported();

  if (!dialog.show) return null;

  return (
    <ModalDialog onClickOutside={() => dialog.setShow(false)}>
      <div className="w-96 max-w-full">
        <h3 className="text-lg font-semibold mb-4">Performance Settings</h3>
        
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">WebGL Acceleration</label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Use WebGL for faster effect processing
              </p>
            </div>
            <Toggle
              checked={performanceSettings.useWebGL && webglSupported}
              disabled={!webglSupported}
              onChange={(checked) => performanceSettings.setUseWebGL(checked)}
            />
          </div>
          
          {!webglSupported && (
            <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
              WebGL2 is not supported in your browser
            </div>
          )}
          
          <div className="text-xs text-gray-500 dark:text-gray-400">
            WebGL acceleration provides significant performance improvements for image effects, 
            especially on larger images. Falls back to CPU processing if WebGL fails.
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
            onClick={() => dialog.setShow(false)}
          >
            Close
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
