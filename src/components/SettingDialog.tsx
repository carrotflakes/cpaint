import { create } from "zustand";
import { storage } from "../libs/Storage";
import { useGlobalSettings } from "../store/globalSetting";
import { ModalDialog } from "./ModalDialog";
import { usePenPressureDialog } from "./PenPressureDialog";
import { pushToast } from "./Toasts";

export const useSettingDialog = create<{
  show: boolean;
  setShow(show: boolean): void;
}>()((set) => ({
  show: false,
  setShow(show: boolean) {
    set({ show });
  },
}));

export function SettingDialog() {
  const settingDialog = useSettingDialog();
  const globalSettings = useGlobalSettings();

  if (!settingDialog.show) return null;

  return (
    <ModalDialog onClickOutside={() => settingDialog.setShow(false)}>
      <div className="min-w-64 flex flex-col gap-2">
        <div className="text-lg">Settings</div>
        <hr className="opacity-20" />

        <div className="flex gap-2">
          <input
            type="checkbox"
            name="touchToDraw"
            checked={globalSettings.touchToDraw}
            onChange={(e) =>
              useGlobalSettings.setState({
                touchToDraw: e.target.checked,
              })
            }
            className="w-6 h-6"
          />
          <label htmlFor="touchToDraw">Touch to draw</label>
        </div>

        <div className="flex gap-2">
          <input
            type="checkbox"
            name="wheelZoom"
            checked={globalSettings.wheelZoom}
            onChange={(e) =>
              useGlobalSettings.setState({
                wheelZoom: e.target.checked,
              })
            }
            className="w-6 h-6"
          />
          <label htmlFor="wheelZoom">Wheel zoom</label>
        </div>

        <div className="flex items-center gap-2">
          <div>View angle snapping:</div>
          {[0, 4, 8].map((divisor) => (
            <button
              key={divisor}
              className="px-2 rounded border border-gray-300 data-[selected=true]:bg-blue-500 data-[selected=true]:text-white cursor-pointer transition-colors"
              data-selected={globalSettings.angleSnapDivisor === divisor}
              onClick={() =>
                useGlobalSettings.setState({
                  angleSnapDivisor: divisor,
                })
              }
            >
              {divisor === 0 ? "Off" : `${360 / divisor}°`}
            </button>
          ))}
        </div>

        <hr className="opacity-20" />

        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded font-semibold text-gray-800 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors cursor-pointer"
            onClick={() => usePenPressureDialog.getState().show()}
          >
            Pen Pressure
          </button>
        </div>

        <hr className="opacity-20" />

        <div className="flex gap-2">
          <input
            type="checkbox"
            name="showOpHistory"
            checked={globalSettings.showOpHistory}
            onChange={(e) =>
              useGlobalSettings.setState({
                showOpHistory: e.target.checked,
              })
            }
            className="w-6 h-6"
          />
          <label htmlFor="showOpHistory">Show operation history view</label>
        </div>

        <div className="flex gap-2">
          <button
            className="px-2 py-1 rounded font-semibold bg-red-700 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors cursor-pointer"
            onClick={() => {
              if (confirm("Delete all data?")) {
                storage.deleteDatabase();
                pushToast("All data deleted.", { type: "warning" });
              }
            }}
          >
            Delete storage
          </button>
        </div>

        <div className="flex gap-2">
          <button
            className="px-2 py-1 rounded font-semibold text-gray-800 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors cursor-pointer"
            onClick={() => {
              const toasts = [
                { message: "（ゝω・）vｷｬﾋﾟ", type: "success" },
                { message: "◝(*'▿'*)◜", type: "info" },
                { message: "ʅ(◔౪◔ ) ʃ", type: "warning" },
                { message: "(∩´﹏`∩);", type: "error" },
                { message: "✌('ω'✌ )三✌('ω')✌三( ✌'ω')✌", type: null },
              ] as const;
              const { message, type } =
                toasts[Math.floor(Math.random() * toasts.length)];
              pushToast(message, { type });
            }}
          >
            Toast test
          </button>
          <button
            className="px-2 py-1 rounded font-semibold text-gray-800 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors cursor-pointer"
            onClick={() => {
              pushToast("(｡╹ω╹｡)", { autoHide: true });
            }}
          >
            Toast auto hide
          </button>
        </div>

        {/* Build date display */}
        <div className="mt-4 text-xs opacity-40 select-text">
          build {__BUILD_DATE__}
        </div>
      </div>
    </ModalDialog>
  );
}
