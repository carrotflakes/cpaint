import { useUnsavedChangesGuard } from "@/features/unsaved-changes";
import { loadImage } from "@/store/save";
import { useCallback, useEffect, useState } from "react";
import { useStorage } from "../hooks/useStorage";
import { CHECK_PATTERN } from "../libs/check";
import { loadImageFromFile } from "../libs/loadImageFile";
import {
  computeNextLayerIdFromLayers,
  StateFromImage,
  StateNew
} from "../model/state";
import { ImageMetaNew, useAppState } from "../store/appState";
import { ModalDialog } from "./ModalDialog";
import { pushToast } from "./Toasts";

export function Files() {
  const [files, setFiles] = useState(
    null as null | { id: number; name: string }[]
  );
  const [fileToDelete, setFileToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [showCustomSizeDialog, setShowCustomSizeDialog] = useState(false);
  const [whiteBg, setWhiteBg] = useState(true);

  const storage = useStorage();
  const { executeWithGuard } = useUnsavedChangesGuard();

  const load = useCallback(() => {
    storage?.getAllImageMetas()?.then((images) => {
      images && setFiles(images as any);
    });
  }, [storage]);

  useEffect(() => {
    load();
  }, [load]);

  const newFile = useCallback(
    (size: [number, number], whiteBackground: boolean = true) => {
      executeWithGuard(() => {
        useAppState
          .getState()
          .open(ImageMetaNew(), StateNew(size[0], size[1], whiteBackground));
      }, "Creating a new file will discard your current unsaved changes.");
    },
    [executeWithGuard]
  );

  return (
    <div className="p-4 flex flex-col gap-4 text-gray-800 dark:text-gray-200">
      <h2 className="text-2xl">New</h2>
      <div className="flex flex-col items-start gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap items-center">
          <button
            className="p-2 rounded bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 cursor-pointer"
            onClick={() => setShowCustomSizeDialog(true)}
          >
            Custom Size...
          </button>
          <button
            className="p-2 rounded bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 cursor-pointer"
            onClick={() => newFile([400, 400], whiteBg)}
          >
            {(400).toLocaleString("en-US")} x {(400).toLocaleString("en-US")} px
          </button>
          <button
            className="p-2 rounded bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 cursor-pointer"
            onClick={() => newFile([2000, 2000], whiteBg)}
          >
            {(2000).toLocaleString("en-US")} x {(2000).toLocaleString("en-US")}{" "}
            px
          </button>
          <button
            className="p-2 rounded bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 cursor-pointer"
            onClick={() => newFile([4000, 4000], whiteBg)}
          >
            {(4000).toLocaleString("en-US")} x {(4000).toLocaleString("en-US")}{" "}
            px
          </button>
          <label className="flex items-center gap-1 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={whiteBg}
              onChange={(e) => setWhiteBg(e.target.checked)}
              className="w-6 h-6"
            />
            Add white background
          </label>
        </div>
        <label className="p-2 rounded bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 cursor-pointer">
          Open Local File...
          <input
            type="file"
            accept="image/*,.psd"
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              executeWithGuard(async () => {
                const fileExtension = file.name.toLowerCase().split(".").pop();

                if (fileExtension === "psd") {
                  const { loadPsdFromFile } = await import("../libs/psdImport");
                  const psdData = await loadPsdFromFile(file);
                  useAppState.getState().open(ImageMetaNew(file.name), {
                    layers: psdData.layers,
                    selection: null,
                    size: { width: psdData.width, height: psdData.height },
                    nextLayerId: computeNextLayerIdFromLayers(psdData.layers),
                  });
                } else {
                  try {
                    const img = await loadImageFromFile(file);
                    useAppState
                      .getState()
                      .open(ImageMetaNew(file.name), StateFromImage(img));
                  } catch (e) {
                    pushToast("" + e, { type: "error" });
                  }
                }
                load();
              }, "Opening a file will discard your current unsaved changes.");
            }}
          />
        </label>
      </div>

      <h2 className="text-2xl">Files</h2>
      <div className="flex flex-wrap">
        {files?.map((file) => (
          <div
            key={file.id}
            className="w-48 p-4 flex flex-col gap-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900"
            onClick={() =>
              storage &&
              executeWithGuard(
                () => loadImage(file.id),
                `Loading "${file.name}" will discard your current unsaved changes.`
              )
            }
          >
            <span
              className="whitespace-nowrap text-ellipsis overflow-hidden"
              title={file.name}
              translate="no"
            >
              {file.name}
            </span>
            <Thumbnail id={file.id} />
            <button
              className="bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setFileToDelete(file);
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {fileToDelete && (
        <DeleteDialog
          fileName={fileToDelete.name}
          onDelete={() => {
            storage?.deleteImage(fileToDelete.id);
            load();
            setFileToDelete(null);
          }}
          onCancel={() => setFileToDelete(null)}
        />
      )}

      {showCustomSizeDialog && (
        <CustomSizeDialog
          onCreateFile={(width, height, whiteBackground) => {
            newFile([width, height], whiteBackground);
            setShowCustomSizeDialog(false);
          }}
          onCancel={() => setShowCustomSizeDialog(false)}
          defaultWhiteBg={whiteBg}
        />
      )}
    </div>
  );
}

function DeleteDialog({
  fileName,
  onDelete,
  onCancel,
}: {
  fileName: string;
  onDelete: () => void;
  onCancel: () => void;
}) {
  return (
    <ModalDialog onClickOutside={onCancel}>
      <h2 className="text-xl font-semibold mb-4">Delete File</h2>
      <p className="mb-4">
        Are you sure you want to delete the file <strong>{fileName}</strong>?
      </p>
      <div className="flex justify-end gap-2">
        <button
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          onClick={onDelete}
        >
          Delete
        </button>
      </div>
    </ModalDialog>
  );
}

function CustomSizeDialog({
  onCreateFile,
  onCancel,
  defaultWhiteBg = true,
}: {
  onCreateFile: (
    width: number,
    height: number,
    whiteBackground: boolean
  ) => void;
  onCancel: () => void;
  defaultWhiteBg?: boolean;
}) {
  const [width, setWidth] = useState("800");
  const [height, setHeight] = useState("600");
  const [whiteBg, setWhiteBg] = useState(defaultWhiteBg);

  const handleCreate = () => {
    const w = parseInt(width, 10);
    const h = parseInt(height, 10);

    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
      alert("Please enter valid dimensions (positive numbers)");
      return;
    }

    if (w > 10000 || h > 10000) {
      alert("Maximum canvas size is 10000 x 10000 pixels");
      return;
    }

    onCreateFile(w, h, whiteBg);
  };

  return (
    <ModalDialog onClickOutside={onCancel}>
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Custom Canvas Size</h2>
        <div className="flex flex-col gap-2">
          <div className="flex gap-4 items-center">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Width (px)</label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-w-0 w-24"
                min="1"
                max="10000"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Height (px)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-w-0 w-24"
                min="1"
                max="10000"
              />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Maximum size: {(10000).toLocaleString("en-US")} x{" "}
            {(10000).toLocaleString("en-US")} pixels
          </p>

          <label className="flex items-center gap-1 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={whiteBg}
              onChange={(e) => setWhiteBg(e.target.checked)}
              className="w-6 h-6"
            />
            Add white background
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={handleCreate}
          >
            Create
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}

// TODO: revoke the object URL
function Thumbnail(props: { id: number }) {
  const storage = useStorage();

  const [thumbnail, setThumbnail] = useState(null as null | string);

  useEffect(() => {
    storage?.getThumbnail(props.id)?.then((thumbnail) => {
      thumbnail && setThumbnail(URL.createObjectURL(thumbnail as any));
    });
  }, [storage]);

  return (
    <div className="w-40 h-40 grid place-items-center">
      {thumbnail && (
        <img
          className="max-w-40 max-h-40 object-contain"
          src={thumbnail}
          style={{
            backgroundImage: CHECK_PATTERN,
          }}
        />
      )}
    </div>
  );
}
