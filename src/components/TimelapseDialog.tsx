import { useState } from "react";
import {
  TimelapseGenerator,
  TimelapseOptions,
  downloadBlob,
} from "../libs/timelapse";
import { useAppState } from "../store/appState";
import { ModalDialog } from "./ModalDialog";
import { pushToast } from "./Toasts";

interface TimelapseDialogProps {
  onClose: () => void;
}

export function TimelapseDialog({ onClose }: TimelapseDialogProps) {
  const stateContainer = useAppState((state) => state.stateContainer);
  const firstCanvas = stateContainer.state.layers[0].canvas;
  const [options, setOptions] = useState<TimelapseOptions>({
    fps: 10,
    width: firstCanvas.width,
    height: firstCanvas.height,
    format: "webm",
    quality: 0.9,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    if (stateContainer.backward.length === 0) {
      pushToast("No drawing history found to create timelapse", {
        type: "error",
      });
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      const generator = new TimelapseGenerator(options);

      // Generate frames
      setProgress(25);
      const frames = generator.generateFrames(stateContainer);

      if (frames.length === 0) {
        throw new Error("No frames generated");
      }

      setProgress(50);

      // Generate video
      const videoBlob = await generator.generateVideo(frames);

      setProgress(90);

      // Download the video
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-");
      const filename = `cpaint-timelapse-${timestamp}.${options.format}`;
      downloadBlob(videoBlob, filename);

      setProgress(100);
      pushToast(`Timelapse exported successfully: ${filename}`, {
        type: "success",
      });

      setTimeout(() => {
        onClose();
        setProgress(0);
      }, 1000);
    } catch (error) {
      console.error("Timelapse export error:", error);
      pushToast(`Failed to export timelapse: ${error}`, { type: "error" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <ModalDialog onClickOutside={isGenerating ? undefined : onClose}>
      <div className="w-96 max-w-[90vw]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Export Timelapse</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            disabled={isGenerating}
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Frame Rate (FPS)
            </label>
            <input
              type="number"
              min="1"
              max="60"
              value={options.fps}
              onChange={(e) =>
                setOptions((prev) => ({
                  ...prev,
                  fps: parseInt(e.target.value) || 10,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              disabled={isGenerating}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Video Size</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="100"
                max="1920"
                placeholder="Width"
                value={options.width}
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    width: parseInt(e.target.value) || 800,
                  }))
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
                disabled={isGenerating}
              />
              <span className="self-center">×</span>
              <input
                type="number"
                min="100"
                max="1080"
                placeholder="Height"
                value={options.height}
                onChange={(e) =>
                  setOptions((prev) => ({
                    ...prev,
                    height: parseInt(e.target.value) || 600,
                  }))
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
                disabled={isGenerating}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Format</label>
            <select
              value={options.format}
              onChange={(e) =>
                setOptions((prev) => ({
                  ...prev,
                  format: e.target.value as "webm" | "mp4",
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-700"
              disabled={isGenerating}
            >
              <option value="webm">WebM</option>
              <option value="mp4">MP4</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Quality</label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={options.quality}
              onChange={(e) =>
                setOptions((prev) => ({
                  ...prev,
                  quality: parseFloat(e.target.value),
                }))
              }
              className="w-full"
              disabled={isGenerating}
            />
            <div className="text-sm text-gray-500 mt-1">
              {Math.round(options.quality! * 100)}%
            </div>
          </div>

          {isGenerating && (
            <div>
              <div className="text-sm font-medium mb-2">
                Generating timelapse...
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {progress}% complete
              </div>
            </div>
          )}

          <div className="text-sm text-gray-600 dark:text-gray-400">
            History steps: {stateContainer.backward.length}
            {stateContainer.backward.length === 0 && (
              <div className="text-yellow-600 dark:text-yellow-400 mt-1">
                No drawing history found. Draw something first!
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded font-semibold text-gray-800 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors cursor-pointer"
            disabled={isGenerating}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-2 rounded font-semibold text-gray-800 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors cursor-pointer"
            disabled={isGenerating || stateContainer.backward.length === 0}
          >
            {isGenerating ? "Generating..." : "Export"}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
