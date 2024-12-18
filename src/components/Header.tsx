import logo from "../assets/cpaint.svg";
import { storage } from "../libs/storage";
import { useStore } from "../state";
import { IconCaretLeft, IconFrameCorners, IconGear, IconSave } from "./icons";
import { useSettingDialog } from "./SettingDialog";
import { pushToast } from "./Toasts";

export function Header() {
  const imageMeta = useStore((store) => store.imageMeta);

  return (
    <div className="p-2 flex gap-2 overflow-x-auto">
      {imageMeta ? (
        <div
          className="basis-6 cursor-pointer"
          onClick={() => {
            useStore.setState({
              imageMeta: null,
            });
          }}
          title="Back to home"
        >
          <IconCaretLeft />
        </div>
      ) : (
        <div className="self-center">
          <img src={logo} alt="cpaint" />
        </div>
      )}

      <div className="grow" />

      {imageMeta && <div>{imageMeta.name}</div>}

      <div className="grow" />

      {imageMeta && (
        <div
          className="basis-6 cursor-pointer"
          onClick={() => {
            save();
          }}
          title="Save"
        >
          <IconSave />
        </div>
      )}

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

async function save() {
  const state = useStore.getState();
  const meta = state.imageMeta;

  if (!meta) return;

  const thumbnail = await createThumbnail();
  const layers = [];
  for (const layer of state.layers) {
    layers.push(await layer.canvas.convertToBlob());
  }
  storage.putImage(meta, layers, thumbnail);
}

function createThumbnail() {
  const state = useStore.getState();
  const c = state.layers[0].canvas;
  const canvas = new OffscreenCanvas(c.width, c.height);
  const ctx = canvas.getContext("2d")!;
  for (const layer of state.layers) {
    ctx.drawImage(layer.canvas, 0, 0);
  }
  return canvas.convertToBlob();
}
