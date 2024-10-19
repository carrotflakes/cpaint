import { IconFrameCorners, IconGear } from "./icons";
import { useSettingDialog } from "./SettingDialog";
import { pushToast } from "./Toasts";

export function Header() {
  return (
    <div className="p-2 flex gap-2 overflow-x-auto">
      <div
        className="opacity-50 font-extrabold"
        onDoubleClick={() =>
          pushToast("cpaint v0.0.0 created by @carrotflakes")
        }
      >
        cpaint
      </div>

      <div className="grow" />

      <div
        className="basis-6 cursor-pointer"
        onClick={() => {
          useSettingDialog.getState().toggleShow();
        }}
        title="Setting"
      >
        <IconGear />
      </div>

      {document.body.requestFullscreen && (
        <div
          className="basis-6 cursor-pointer"
          onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen();
            else
              document.body.requestFullscreen().catch((e) => pushToast("" + e));
          }}
          title="Fullscreen"
        >
          <IconFrameCorners />
        </div>
      )}
    </div>
  );
}
