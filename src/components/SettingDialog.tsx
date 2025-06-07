import { create } from "zustand";
import { storage } from "../libs/storage";
import { useGlobalSettings } from "../store/globalSetting";
import { ModalDialog } from "./ModalDialog";
import { PressureCurveEditor } from "./PressureCurveEditor";
import { pushToast } from "./Toasts";

export const useSettingDialog = create<{
  show: boolean;
  setShow(show: boolean): void;
  toggleShow(): void;
}>()((set) => ({
  show: false,
  setShow(show: boolean) {
    set({ show });
  },
  toggleShow() {
    set((state) => ({ show: !state.show }));
  },
}));

export function SettingDialog() {
  const settingDialog = useSettingDialog();
  const globalSettings = useGlobalSettings();

  return (
    settingDialog.show && (
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

          <hr className="opacity-20" />

          <div>
            <div className="text-sm font-medium mb-2">Pen Pressure</div>
            <PressureCurveEditor />
          </div>

          <hr className="opacity-20" />

          <button
            className="px-4 py-2 rounded font-semibold bg-red-700 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 transition-colors cursor-pointer"
            onClick={() => {
              if (confirm("Delete all data?")) {
                storage.deleteDatabase();
                pushToast("All data deleted.");
              }
            }}
          >
            Delete storage
          </button>

          <button
            className="px-4 py-2 rounded font-semibold bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors cursor-pointer"
            onClick={() => {
              pushToast("\uD83C\uDF1F（ゝω・）vｷｬﾋﾟ");
            }}
          >
            Toast test
          </button>

          {/* Build date display */}
          <div className="mt-4 text-xs opacity-40 select-text">
            build {__BUILD_DATE__}
          </div>
        </div>
      </ModalDialog>
    )
  );
}
