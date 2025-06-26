import { useState } from "react";
import { appApplyEffect } from "../../store/appState";
import { ModalDialog } from "../ModalDialog";
import { SliderH } from "../slider";

function BrightnessContrastDialog({
  onApply,
  onClose,
}: {
  onApply: (brightness: number, contrast: number) => void;
  onClose: () => void;
}) {
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);

  return (
    <ModalDialog onClickOutside={onClose}>
      <h3 className="text-lg font-semibold mb-4">Brightness/Contrast</h3>

      <div className="flex flex-col gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Brightness: {brightness}
          </label>
          <SliderH
            className="w-48 h-5"
            value={(brightness + 100) / 200}
            onChange={(value) => setBrightness(Math.round(value * 200 - 100))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Contrast: {contrast}
          </label>
          <SliderH
            className="w-48 h-5"
            value={(contrast + 100) / 200}
            onChange={(value) => setContrast(Math.round(value * 200 - 100))}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => {
            onApply(brightness, contrast);
            onClose();
          }}
        >
          Apply
        </button>
      </div>
    </ModalDialog>
  );
}

function HueSaturationDialog({
  onApply,
  onClose,
}: {
  onApply: (hue: number, saturation: number, lightness: number) => void;
  onClose: () => void;
}) {
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [lightness, setLightness] = useState(0);

  return (
    <ModalDialog onClickOutside={onClose}>
      <h3 className="text-lg font-semibold mb-4">Hue/Saturation</h3>

      <div className="flex flex-col gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2">Hue: {hue}°</label>
          <SliderH
            className="w-48 h-5"
            value={(hue + 180) / 360}
            onChange={(value) => setHue(Math.round(value * 360 - 180))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Saturation: {saturation}
          </label>
          <SliderH
            className="w-48 h-5"
            value={(saturation + 100) / 200}
            onChange={(value) => setSaturation(Math.round(value * 200 - 100))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Lightness: {lightness}
          </label>
          <SliderH
            className="w-48 h-5"
            value={(lightness + 100) / 200}
            onChange={(value) => setLightness(Math.round(value * 200 - 100))}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => {
            onApply(hue, saturation, lightness);
            onClose();
          }}
        >
          Apply
        </button>
      </div>
    </ModalDialog>
  );
}

function ColorBalanceDialog({
  onApply,
  onClose,
}: {
  onApply: (cyan: number, magenta: number, yellow: number) => void;
  onClose: () => void;
}) {
  const [cyan, setCyan] = useState(0);
  const [magenta, setMagenta] = useState(0);
  const [yellow, setYellow] = useState(0);

  return (
    <ModalDialog onClickOutside={onClose}>
      <h3 className="text-lg font-semibold mb-4">Color Balance</h3>

      <div className="flex flex-col gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Cyan ↔ Red: {cyan}
          </label>
          <SliderH
            className="w-48 h-5"
            value={(cyan + 100) / 200}
            onChange={(value) => setCyan(Math.round(value * 200 - 100))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Magenta ↔ Green: {magenta}
          </label>
          <SliderH
            className="w-48 h-5"
            value={(magenta + 100) / 200}
            onChange={(value) => setMagenta(Math.round(value * 200 - 100))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Yellow ↔ Blue: {yellow}
          </label>
          <SliderH
            className="w-48 h-5"
            value={(yellow + 100) / 200}
            onChange={(value) => setYellow(Math.round(value * 200 - 100))}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => {
            onApply(cyan, magenta, yellow);
            onClose();
          }}
        >
          Apply
        </button>
      </div>
    </ModalDialog>
  );
}

export function EffectsMenu({ onEffectSelect }: { onEffectSelect: () => void }) {
  const simpleEffects = [
    { type: "blur", label: "Blur" },
    { type: "boxBlur", label: "Box blur" },
    { type: "pixelate", label: "Pixelate" },
  ] as const;

  const [value, setValue] = useState(5);
  const [showBrightnessContrast, setShowBrightnessContrast] = useState(false);
  const [showHueSaturation, setShowHueSaturation] = useState(false);
  const [showColorBalance, setShowColorBalance] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <SliderH
        className="w-32 h-5"
        value={value / 20}
        onChange={(newValue) => {
          setValue(Math.max(1, Math.round(newValue * 20)));
        }}
      />
      {simpleEffects.map((effect) => (
        <button
          key={effect.type}
          className="p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded"
          onClick={async () => {
            if (effect.type === "blur") {
              await appApplyEffect({ type: "blur", radius: value });
            } else if (effect.type === "boxBlur") {
              await appApplyEffect({
                type: "boxBlur",
                radius: value,
              });
            } else if (effect.type === "pixelate") {
              await appApplyEffect({
                type: "pixelate",
                pixelSize: value,
              });
            }
            onEffectSelect();
          }}
        >
          {effect.label}
        </button>
      ))}

      <hr className="border-gray-300 dark:border-gray-600" />

      <button
        className="p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded"
        onClick={() => setShowBrightnessContrast(true)}
      >
        Brightness/Contrast
      </button>

      <button
        className="p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded"
        onClick={() => setShowHueSaturation(true)}
      >
        Hue/Saturation
      </button>

      <button
        className="p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded"
        onClick={() => setShowColorBalance(true)}
      >
        Color Balance
      </button>

      {showBrightnessContrast && (
        <BrightnessContrastDialog
          onApply={async (brightness, contrast) => {
            await appApplyEffect({
              type: "brightnessContrast",
              brightness,
              contrast,
            });
            onEffectSelect();
          }}
          onClose={() => setShowBrightnessContrast(false)}
        />
      )}

      {showHueSaturation && (
        <HueSaturationDialog
          onApply={async (hue, saturation, lightness) => {
            await appApplyEffect({
              type: "hueSaturation",
              hue,
              saturation,
              lightness,
            });
            onEffectSelect();
          }}
          onClose={() => setShowHueSaturation(false)}
        />
      )}

      {showColorBalance && (
        <ColorBalanceDialog
          onApply={async (cyan, magenta, yellow) => {
            await appApplyEffect({ type: "colorBalance", cyan, magenta, yellow });
            onEffectSelect();
          }}
          onClose={() => setShowColorBalance(false)}
        />
      )}
    </div>
  );
}
