// Performance settings component for effect optimization
// src/components/PerformanceSettings.tsx

import { useState } from "react";
import { create } from "zustand";
import { useGlobalSettings } from "../store/globalSetting";
import { ModalDialog } from "./ModalDialog";
import { EffectBenchmark } from "../features/effects/benchmark";
import { MCanvas } from "../libs/MCanvas";
import { reinitializeEffects } from "../features/effects";

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
  const globalSettings = useGlobalSettings();
  const [settings, setSettings] = useState(globalSettings.effectPerformance);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState<any>(null);

  if (!dialog.show) return null;

  const handleSave = () => {
    useGlobalSettings.setState((state) => ({
      ...state,
      effectPerformance: settings,
    }));

    // Reinitialize effects with new settings
    reinitializeEffects();
    dialog.setShow(false);
  };

  const runBenchmark = async () => {
    setIsRunningBenchmark(true);
    try {
      // Create a test canvas
      const testCanvas = new MCanvas(1024, 1024);
      const ctx = testCanvas.getContextWrite();

      // Create test pattern
      const imageData = ctx.createImageData(1024, 1024);
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = Math.random() * 255; // R
        imageData.data[i + 1] = Math.random() * 255; // G
        imageData.data[i + 2] = Math.random() * 255; // B
        imageData.data[i + 3] = 255; // A
      }
      ctx.putImageData(imageData, 0, 0);

      const benchmark = new EffectBenchmark();
      const results = await benchmark.runComprehensiveBenchmark(testCanvas);
      setBenchmarkResults(results);
      benchmark.dispose();
    } catch (error) {
      console.error("Benchmark failed:", error);
    } finally {
      setIsRunningBenchmark(false);
    }
  };

  return (
    <ModalDialog onClickOutside={() => dialog.setShow(false)}>
      <div className="w-96 max-w-full">
        <h3 className="text-lg font-semibold mb-4">Performance Settings</h3>

        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              Prefer WebGL (GPU acceleration)
            </label>
            <input
              type="checkbox"
              checked={settings.preferWebGL}
              onChange={(e) =>
                setSettings({ ...settings, preferWebGL: e.target.checked })
              }
              className="rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              Use Web Workers (parallel processing)
            </label>
            <input
              type="checkbox"
              checked={settings.useWorker}
              onChange={(e) =>
                setSettings({ ...settings, useWorker: e.target.checked })
              }
              className="rounded"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">
              Enable SIMD optimizations
            </label>
            <input
              type="checkbox"
              checked={settings.enableSIMD}
              onChange={(e) =>
                setSettings({ ...settings, enableSIMD: e.target.checked })
              }
              className="rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Chunk Size: {settings.chunkSize?.toLocaleString() || "Default"}
            </label>
            <select
              value={settings.chunkSize}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  chunkSize: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
            >
              <option value={16384}>16KB (Small images)</option>
              <option value={32768}>32KB (Balanced)</option>
              <option value={65536}>64KB (Large images)</option>
              <option value={131072}>128KB (Very large images)</option>
            </select>
          </div>
        </div>

        {/* Benchmark Section */}
        <div className="border-t pt-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Performance Benchmark</h4>
            <button
              onClick={runBenchmark}
              disabled={isRunningBenchmark}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isRunningBenchmark ? "Running..." : "Run Benchmark"}
            </button>
          </div>

          {benchmarkResults && (
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <strong>Image Size:</strong>{" "}
                  {benchmarkResults.imageSize.width}x
                  {benchmarkResults.imageSize.height}
                </div>
                <div>
                  <strong>Pixels:</strong>{" "}
                  {benchmarkResults.imageSize.pixels.toLocaleString()}
                </div>
                <div>
                  <strong>WebGL Support:</strong>{" "}
                  {benchmarkResults.systemInfo.webGLSupported ? "Yes" : "No"}
                </div>
                <div>
                  <strong>Worker Support:</strong>{" "}
                  {benchmarkResults.systemInfo.workerSupported ? "Yes" : "No"}
                </div>
              </div>

              <div className="mt-3">
                <strong>Brightness/Contrast Performance:</strong>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  <div>
                    Original:{" "}
                    {benchmarkResults.brightnessContrast.original.toFixed(1)}ms
                  </div>
                  <div>
                    Optimized:{" "}
                    {benchmarkResults.brightnessContrast.optimized.toFixed(1)}ms
                  </div>
                  <div className="font-medium text-green-600">
                    Speedup:{" "}
                    {benchmarkResults.brightnessContrast.speedup.toFixed(1)}x
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-2 justify-end">
          <button
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
            onClick={() => dialog.setShow(false)}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={handleSave}
          >
            Save Settings
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
