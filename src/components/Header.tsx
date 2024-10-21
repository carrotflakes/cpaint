import logo from "../assets/cpaint.svg";
import { storage } from "../libs/storage";
import { useStore } from "../state";
import { IconFrameCorners, IconGear, IconSave } from "./icons";
import { useSettingDialog } from "./SettingDialog";
import { pushToast } from "./Toasts";

export function Header() {
  return (
    <div className="p-2 flex gap-2 overflow-x-auto">
      <div
        className="self-center opacity-50"
        onDoubleClick={() =>
          useStore.setState({
            imageMeta: null,
          })
        }
      >
        <img src={logo} alt="cpaint" />
      </div>

      <div className="grow" />

      <div
        className="basis-6 cursor-pointer"
        onClick={() => {
          save();
        }}
        title="Save"
      >
        <IconSave />
      </div>

      <div
        className="basis-6 cursor-pointer"
        onClick={() => {
          useSettingDialog.getState().toggleShow();
        }}
        title="Settings"
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

function save() {
  const state = useStore.getState();
  const meta = state.imageMeta;

  if (!meta) return;

  return new Promise((resolve) => {
    state.canvas.toBlob((thumbnail) => {
      state.canvas.toBlob((blob) => {
        storage.putImage(meta, blob, thumbnail);
        resolve(null);
      }, "image/png");
    }, "image/png");
  });
}
