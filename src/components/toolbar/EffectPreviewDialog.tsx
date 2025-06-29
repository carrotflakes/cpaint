import { useState } from "react";
import { Effect, effectName } from "@/features/effects";
import { useAppState } from "@/store/appState";
import { SliderH } from "../slider";

interface EffectPreviewDialogProps {
  initialEffect: Effect;
}

export function EffectPreviewDialog({
  initialEffect,
}: EffectPreviewDialogProps) {
  const [effect, setEffect] = useState<Effect>(initialEffect);
  const { updateEffectPreview, applyEffectPreview } = useAppState();

  const handleParameterChange = async (newEffect: Effect) => {
    setEffect(newEffect);
    await updateEffectPreview(newEffect);
  };

  const handleApply = () => {
    applyEffectPreview();
  };

  const handleCancel = () => {
    useAppState.getState().update((draft) => {
      draft.mode = { type: "draw" };
    });
  };

  const renderParameterControls = () => {
    switch (effect.type) {
      case "blur":
      case "boxBlur":
        return (
          <div>
            <label className="block text-sm font-medium mb-2">
              Radius: {effect.radius}
            </label>
            <SliderH
              className="w-48 h-5"
              value={effect.radius / 100}
              onChange={(value) =>
                handleParameterChange({
                  ...effect,
                  radius: Math.max(1, Math.round(value * 100)),
                })
              }
            />
          </div>
        );

      case "pixelate":
        return (
          <div>
            <label className="block text-sm font-medium mb-2">
              Pixel Size: {effect.pixelSize}
            </label>
            <SliderH
              className="w-48 h-5"
              value={effect.pixelSize / 100}
              onChange={(value) =>
                handleParameterChange({
                  ...effect,
                  pixelSize: Math.max(1, Math.round(value * 100)),
                })
              }
            />
          </div>
        );

      case "brightnessContrast":
        return (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Brightness: {effect.brightness}
              </label>
              <SliderH
                className="w-48 h-5"
                value={(effect.brightness + 100) / 200}
                onChange={(value) =>
                  handleParameterChange({
                    ...effect,
                    brightness: Math.round(value * 200 - 100),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Contrast: {effect.contrast}
              </label>
              <SliderH
                className="w-48 h-5"
                value={(effect.contrast + 100) / 200}
                onChange={(value) =>
                  handleParameterChange({
                    ...effect,
                    contrast: Math.round(value * 200 - 100),
                  })
                }
              />
            </div>
          </div>
        );

      case "hueSaturation":
        return (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Hue: {effect.hue}°
              </label>
              <SliderH
                className="w-48 h-5"
                value={(effect.hue + 180) / 360}
                onChange={(value) =>
                  handleParameterChange({
                    ...effect,
                    hue: Math.round(value * 360 - 180),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Saturation: {effect.saturation}
              </label>
              <SliderH
                className="w-48 h-5"
                value={(effect.saturation + 100) / 200}
                onChange={(value) =>
                  handleParameterChange({
                    ...effect,
                    saturation: Math.round(value * 200 - 100),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Lightness: {effect.lightness}
              </label>
              <SliderH
                className="w-48 h-5"
                value={(effect.lightness + 100) / 200}
                onChange={(value) =>
                  handleParameterChange({
                    ...effect,
                    lightness: Math.round(value * 200 - 100),
                  })
                }
              />
            </div>
          </div>
        );

      case "colorBalance":
        return (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Cyan ↔ Red: {effect.cyan}
              </label>
              <SliderH
                className="w-48 h-5"
                value={(effect.cyan + 100) / 200}
                onChange={(value) =>
                  handleParameterChange({
                    ...effect,
                    cyan: Math.round(value * 200 - 100),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Magenta ↔ Green: {effect.magenta}
              </label>
              <SliderH
                className="w-48 h-5"
                value={(effect.magenta + 100) / 200}
                onChange={(value) =>
                  handleParameterChange({
                    ...effect,
                    magenta: Math.round(value * 200 - 100),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Yellow ↔ Blue: {effect.yellow}
              </label>
              <SliderH
                className="w-48 h-5"
                value={(effect.yellow + 100) / 200}
                onChange={(value) =>
                  handleParameterChange({
                    ...effect,
                    yellow: Math.round(value * 200 - 100),
                  })
                }
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 min-w-64 max-w-80">
      <h3 className="text-lg font-semibold mb-4">{effectName(effect)}</h3>

      <div className="mb-6">{renderParameterControls()}</div>

      <div className="flex gap-2 justify-end">
        <button
          className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
          onClick={handleCancel}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={handleApply}
        >
          Done
        </button>
      </div>
    </div>
  );
}
