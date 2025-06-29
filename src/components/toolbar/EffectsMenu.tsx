import { useAppState } from "@/store/appState";

export function EffectsMenu({
  onEffectSelect,
}: {
  onEffectSelect: () => void;
}) {
  const { startEffectPreview } = useAppState();

  const handleEffectStart = async (effect: any) => {
    await startEffectPreview(effect);
    onEffectSelect();
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        className="p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded"
        onClick={() =>
          handleEffectStart({
            type: "brightnessContrast",
            brightness: 0,
            contrast: 0,
          })
        }
      >
        Brightness/Contrast
      </button>

      <button
        className="p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded"
        onClick={() =>
          handleEffectStart({
            type: "hueSaturation",
            hue: 0,
            saturation: 0,
            lightness: 0,
          })
        }
      >
        Hue/Saturation
      </button>

      <button
        className="p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded"
        onClick={() =>
          handleEffectStart({
            type: "colorBalance",
            cyan: 0,
            magenta: 0,
            yellow: 0,
          })
        }
      >
        Color Balance
      </button>

      <hr className="border-gray-300 dark:border-gray-600" />

      <button
        className="p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded"
        onClick={() => handleEffectStart({ type: "blur", radius: 5 })}
      >
        Blur
      </button>

      <button
        className="p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded"
        onClick={() => handleEffectStart({ type: "boxBlur", radius: 5 })}
      >
        Box Blur
      </button>

      <button
        className="p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded"
        onClick={() => handleEffectStart({ type: "pixelate", pixelSize: 5 })}
      >
        Pixelate
      </button>
    </div>
  );
}
