import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import logo from "../assets/cpaint.svg";
import { storage } from "../libs/storage";
import { StateRender } from "../model/state";
import { useAppState } from "../store/appState";
import { IconCaretLeft, IconFrameCorners, IconGear, IconSave } from "./icons";
import { useSettingDialog } from "./SettingDialog";
import { pushToast } from "./Toasts";

export function Header() {
  const imageMeta = useAppState((store) => store.imageMeta);
  const [popoverOpen, setPopoverOpen] = useState(false);

  return (
    <div className="p-2 flex gap-2 overflow-x-auto">
      {imageMeta ? (
        <div
          className="basis-6 cursor-pointer"
          onClick={() => {
            useAppState.setState({
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

      {imageMeta && (
        <Popover.Root open={popoverOpen} onOpenChange={setPopoverOpen}>
          <Popover.Trigger asChild>
            <div
              className="cursor-pointer px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Click to edit name"
              onClick={() => setPopoverOpen(true)}
            >
              {imageMeta.name}
            </div>
          </Popover.Trigger>
          <Popover.Portal>
            <EditNamePopoverContent
              imageMeta={imageMeta}
              setPopoverOpen={setPopoverOpen}
            />
          </Popover.Portal>
        </Popover.Root>
      )}

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

function EditNamePopoverContent({
  imageMeta,
  setPopoverOpen,
}: {
  imageMeta: { name: string };
  setPopoverOpen: (v: boolean) => void;
}) {
  const [editName, setEditName] = useState(imageMeta?.name || "");

  return (
    <Popover.Content
      className="p-2 bg-white dark:bg-gray-900 border border-gray-300 rounded shadow z-50 flex gap-2 items-center"
      sideOffset={5}
      align="center"
      onOpenAutoFocus={(e) => e.preventDefault()}
    >
      <input
        className="border rounded px-2 py-1 text-black dark:text-white bg-white dark:bg-gray-800"
        value={editName}
        autoFocus
        onChange={(e) => setEditName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (editName.trim() && imageMeta.name !== editName.trim()) {
              useAppState.setState((state) => ({
                imageMeta: { ...state.imageMeta!, name: editName.trim() },
              }));
            }
            setPopoverOpen(false);
          } else if (e.key === "Escape") {
            setPopoverOpen(false);
          }
        }}
        onBlur={() => {
          if (editName.trim() && imageMeta.name !== editName.trim()) {
            useAppState.setState((state) => ({
              imageMeta: { ...state.imageMeta!, name: editName.trim() },
            }));
          }
          setPopoverOpen(false);
        }}
        style={{ minWidth: 120 }}
      />
    </Popover.Content>
  );
}

async function save() {
  const state = useAppState.getState();
  const meta = state.imageMeta;

  if (!meta) return;

  const thumbnail = await createThumbnail();
  const layers = [];
  for (const layer of state.stateContainer.state.layers) {
    const blob = await layer.canvas.convertToBlob();
    layers.push({
      id: layer.id,
      canvas: blob,
      visible: layer.visible,
      opacity: layer.opacity,
      blendMode: layer.blendMode,
    });
  }
  const imageData = {
    layers,
  };
  await storage.putImage(meta, imageData, thumbnail);
}

function createThumbnail() {
  const state = useAppState.getState();
  const c = state.stateContainer.state.layers[0].canvas;
  const canvas = new OffscreenCanvas(c.width, c.height);
  const ctx = canvas.getContext("2d")!;
  StateRender(state.stateContainer.state, ctx, null);
  return canvas.convertToBlob();
}
