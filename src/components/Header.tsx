import { useUnsavedChangesGuard } from "@/features/unsaved-changes";
import { StateContainerRender } from "@/model/stateContainer";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import logo from "../assets/cpaint.svg";
import { ReactComponent as IconCaretLeft } from "../assets/icons/caret-left.svg";
import { ReactComponent as IconFrameCorners } from "../assets/icons/frame-corners.svg";
import { ReactComponent as IconGear } from "../assets/icons/gear.svg";
import { ReactComponent as IconSave } from "../assets/icons/save.svg";
import { MCanvas } from "../libs/MCanvas";
import { useAppState } from "../store/appState";
import { save } from "../store/save";
import { ModalDialog } from "./ModalDialog";
import { useSettingDialog } from "./SettingDialog";
import { TimelapseDialog } from "./TimelapseDialog";
import { pushToast } from "./Toasts";

export function Header() {
  const imageMeta = useAppState((store) => store.imageMeta);
  const hasUnsavedChanges = useAppState((store) => store.hasUnsavedChanges());
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [resizeDialogOpen, setResizeDialogOpen] = useState(false);
  const [timelapseDialogOpen, setTimelapseDialogOpen] = useState(false);
  const { executeWithGuard } = useUnsavedChangesGuard();

  return (
    <div className="h-10 px-2 flex items-center gap-2 overflow-x-auto">
      {imageMeta ? (
        <div
          className="basis-6 cursor-pointer"
          onClick={() => {
            executeWithGuard(() => {
              useAppState.setState({
                imageMeta: null,
              });
            });
          }}
          title="Back to home"
        >
          <IconCaretLeft width={24} height={24} />
        </div>
      ) : (
        <div className="self-center">
          <img src={logo} alt="cpaint" draggable={false} />
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
              translate="no"
            >
              {imageMeta.name}
              {hasUnsavedChanges ? " *" : ""}
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
                onTimelapseClick={() => {
                  setPopoverOpen(false);
                  setTimelapseDialogOpen(true);
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
          title={hasUnsavedChanges ? "Save (unsaved changes)" : "Save"}
        >
          <IconSave width={24} height={24} />
        </div>
      )}

      <div
        className="basis-6 cursor-pointer"
        onClick={() => {
          useSettingDialog.getState().setShow(true);
        }}
        title="Settings"
      >
        <IconGear width={24} height={24} />
      </div>

      {document.body.requestFullscreen && (
        <div
          className="basis-6 cursor-pointer"
          onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen();
            else
              document.body
                .requestFullscreen()
                .catch((e) => pushToast("" + e, { type: "error" }));
          }}
          title="Fullscreen"
        >
          <IconFrameCorners width={24} height={24} />
        </div>
      )}

      {resizeDialogOpen && (
        <ResizeCanvasDialog onClose={() => setResizeDialogOpen(false)} />
      )}

      {timelapseDialogOpen && (
        <TimelapseDialog onClose={() => setTimelapseDialogOpen(false)} />
      )}
    </div>
  );
}

function FileInfo({
  imageMeta,
  setPopoverOpen,
  onResizeClick,
  onTimelapseClick,
}: {
  imageMeta: { name: string };
  setPopoverOpen: (v: boolean) => void;
  onResizeClick: () => void;
  onTimelapseClick: () => void;
}) {
  const store = useAppState();
  const canvasSize = store.canvasSize();

  const [editName, setEditName] = useState(imageMeta?.name || "");

  return (
    <div className="flex flex-col gap-2 items-start">
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
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {canvasSize.width.toLocaleString("en-US")} x{" "}
        {canvasSize.height.toLocaleString("en-US")} px
      </div>
      <button
        className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 text-sm flex items-center gap-1"
        onClick={onResizeClick}
      >
        Resize
      </button>
      <h2 className="text-sm font-semibold">Export</h2>
      <div className="flex gap-2 flex-wrap">
        <button
          className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 text-sm flex items-center gap-1"
          onClick={() => {
            exportToPNG();
            setPopoverOpen(false);
          }}
        >
          PNG
        </button>
        <button
          className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 text-sm flex items-center gap-1"
          onClick={() => {
            exportToPSD();
            setPopoverOpen(false);
          }}
        >
          PSD
        </button>
        <button
          className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 text-sm flex items-center gap-1"
          onClick={onTimelapseClick}
        >
          Timelapse
        </button>
      </div>
    </div>
  );
}

function ResizeCanvasDialog({ onClose }: { onClose: () => void }) {
  const store = useAppState();
  const canvasSize = store.canvasSize();
  const currentWidth = canvasSize.width;
  const currentHeight = canvasSize.height;
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

function intoResizeCanvasMode(width: number, height: number) {
  const state = useAppState.getState();
  const canvasSize = state.canvasSize();
  const canvas = new OffscreenCanvas(canvasSize.width, canvasSize.height);
  const ctx = canvas.getContext("2d")!;
  StateContainerRender(state.stateContainer, ctx);

  useAppState.getState().update((state) => {
    state.mode = {
      type: "canvasResize",
      rendered: new MCanvas(canvas),
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

async function exportToPNG() {
  const state = useAppState.getState();
  const meta = state.imageMeta;

  if (!meta) return;

  const canvasSize = state.canvasSize();
  const canvas = new OffscreenCanvas(canvasSize.width, canvasSize.height);
  const ctx = canvas.getContext("2d")!;
  StateContainerRender(state.stateContainer, ctx);

  const blob = await canvas.convertToBlob({ type: "image/png" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${meta.name}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

async function exportToPSD() {
  const state = useAppState.getState();
  const meta = state.imageMeta;

  if (!meta) return;

  try {
    const { exportToPSD: performPSDExport } = await import("../libs/psdExport");
    const res = await performPSDExport(state.stateContainer);

    // Report unsupported blend modes
    if (res.unsupportedBlendModes.size > 0) {
      const modes = Array.from(res.unsupportedBlendModes).join(", ");
      pushToast(
        `[exportToPSD] Unsupported blend modes converted to normal: ${modes}`,
        { type: "warning" }
      );
    }

    // Download file
    const blob = new Blob([res.buffer], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${meta.name}.psd`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Failed to export PSD:", error);
    pushToast("Failed to export PSD: " + error, { type: "error" });
  }
}
