import { create } from "zustand";
import { useGlobalSettings } from "../store/globalSetting";
import { ModalDialog } from "./ModalDialog";
import { pushToast } from "./Toasts";
import { storage } from "../libs/storage";

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
        <div className="flex flex-col gap-2">
          <div className="text-lg">Settings</div>
          <hr />

          <div className="flex gap-2">
            <input
              type="checkbox"
              name="fingerOperations"
              checked={globalSettings.fingerOperations}
              onChange={(e) =>
                useGlobalSettings.setState({
                  fingerOperations: e.target.checked,
                })
              }
              className="w-6 h-6"
            />
            <label htmlFor="fingerOperations">Finger operations</label>
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

          <hr />

          <button
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
            onClick={() => {
              pushToast("🌟（ゝω・）vｷｬﾋﾟ");
            }}
          >
            Toast test
          </button>
        </div>
      </ModalDialog>
    )
  );
}
