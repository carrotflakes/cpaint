import { create } from "zustand";
import { ModalDialog } from "./ModalDialog";
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

  return (
    settingDialog.show && (
      <ModalDialog onClickOutside={() => settingDialog.setShow(false)}>
        <div className="flex flex-col gap-2">
          <div className="text-lg">Setting</div>
          <hr />

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
