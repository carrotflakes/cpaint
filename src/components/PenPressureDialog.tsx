import { create } from "zustand";
import { ModalDialog } from "./ModalDialog";
import { PressureCurveEditor } from "./PressureCurveEditor";
import { useGlobalSettings } from "../store/globalSetting";
import { PressureCurve } from "../libs/pressureCurve";

export const usePenPressureDialog = create<{
  curve: PressureCurve | null;
  show: () => void;
}>()((set) => ({
  curve: null,
  show: () => {
    set({
      curve: { ...useGlobalSettings.getState().pressureCurve },
    });
  },
}));

export function PenPressureDialog() {
  const curve = usePenPressureDialog((state) => state.curve);

  if (!curve) return null;

  return (
    <ModalDialog
      onClickOutside={() => usePenPressureDialog.setState({ curve: null })}
    >
      <div className="flex flex-col gap-4">
        <div className="text-lg">Pen Pressure</div>
        <hr className="opacity-20" />

        <div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pressureCurveEnabled"
              checked={curve.enabled}
              onChange={() =>
                usePenPressureDialog.setState({
                  curve: {
                    ...curve,
                    enabled: !curve.enabled,
                  },
                })
              }
              className="w-4 h-4"
            />
            <label
              htmlFor="pressureCurveEnabled"
              className="text-sm font-medium"
            >
              Enable Pressure Curve
            </label>
          </div>

          <PressureCurveEditor
            pressureCurve={curve}
            setPressureCurve={(curve) =>
              usePenPressureDialog.setState({
                curve: {
                  ...curve,
                },
              })
            }
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            className="px-3 py-2 rounded font-semibold text-gray-800 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors cursor-pointer"
            onClick={() => usePenPressureDialog.setState({ curve: null })}
          >
            Cancel
          </button>
          <button
            className="px-3 py-2 rounded font-semibold text-gray-800 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors cursor-pointer"
            onClick={() => {
              useGlobalSettings.setState({
                pressureCurve: curve,
              });
              usePenPressureDialog.setState({ curve: null });
            }}
          >
            Save
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
