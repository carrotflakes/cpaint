import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import logo from "../assets/cpaint.svg";
import { storage } from "../libs/storage";
import { StateRender } from "../model/state";
import { useAppState } from "../store/appState";
import { IconCaretLeft, IconFrameCorners, IconGear, IconSave } from "./icons";
import { useSettingDialog } from "./SettingDialog";
import { pushToast } from "./Toasts";
import { ModalDialog } from "./ModalDialog";

export function Header() {
  const imageMeta = useAppState((store) => store.imageMeta);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [resizeDialogOpen, setResizeDialogOpen] = useState(false);

  return (
    <div className="h-10 px-2 flex items-center gap-2 overflow-x-auto">
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
            <Popover.Content
              className="p-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 rounded shadow z-50 flex gap-2 items-center"
              sideOffset={5}
              align="center"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <FileInfo
                imageMeta={imageMeta}
                setPopoverOpen={setPopoverOpen}
                onResizeClick={() => {
                  setPopoverOpen(false);
                  setResizeDialogOpen(true);
                }}
              />
            </Popover.Content>
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

      {resizeDialogOpen && (
        <ResizeCanvasDialog onClose={() => setResizeDialogOpen(false)} />
      )}
    </div>
  );
}

function FileInfo({
  imageMeta,
  setPopoverOpen,
  onResizeClick,
}: {
  imageMeta: { name: string };
  setPopoverOpen: (v: boolean) => void;
  onResizeClick: () => void;
}) {
  const [editName, setEditName] = useState(imageMeta?.name || "");

  return (
    <div className="flex flex-col gap-2 items-center">
      <input
        className="min-w-52 border rounded px-2 py-1 text-black dark:text-white bg-white dark:bg-gray-800"
        value={editName}
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
      />
      <button
        className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 text-sm flex items-center gap-1"
        onClick={onResizeClick}
      >
        Resize Canvas
      </button>
    </div>
  );
}

function ResizeCanvasDialog({ onClose }: { onClose: () => void }) {
  const store = useAppState();
  const layers = store.stateContainer.state.layers;
  const currentWidth = layers[0]?.canvas.width ?? 1;
  const currentHeight = layers[0]?.canvas.height ?? 1;
  const [width, setWidth] = useState(currentWidth);
  const [height, setHeight] = useState(currentHeight);

  return (
    <ModalDialog onClickOutside={onClose}>
      <div className="flex flex-col gap-4">
        <div className="text-lg font-bold">Resize Canvas</div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (width < 1 || height < 1) return;
            intoResizeCanvasMode(width, height);
            onClose();
          }}
        >
          <div className="flex gap-2 items-center">
            <label htmlFor="resize-width">Width</label>
            <input
              id="resize-width"
              type="number"
              className="border rounded px-2 py-1 w-20"
              min={1}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
            />
            <label htmlFor="resize-height">Height</label>
            <input
              id="resize-height"
              type="number"
              className="border rounded px-2 py-1 w-20"
              min={1}
              value={height}
              onChange={(e) => setHeight(Number(e.target.value))}
            />
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button
              type="button"
              className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
              onClick={() => onClose()}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
              disabled={
                width < 1 ||
                height < 1 ||
                (width === currentWidth && height === currentHeight)
              }
            >
              Apply
            </button>
          </div>
        </form>
      </div>
    </ModalDialog>
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

function intoResizeCanvasMode(width: number, height: number) {
  const state = useAppState.getState();
  const firstCanvas = state.stateContainer.state.layers[0].canvas;
  const canvas = new OffscreenCanvas(firstCanvas.width, firstCanvas.height);
  const ctx = canvas.getContext("2d")!;
  StateRender(state.stateContainer.state, ctx, null);

  useAppState.getState().update((state) => {
    state.mode = {
      type: "canvasResize",
      rendered: canvas,
      size: [width, height],
      rect: {
        cx: width / 2,
        cy: height / 2,
        hw: canvas.width / 2,
        hh: canvas.height / 2,
        angle: 0,
      },
    };
  });
}
