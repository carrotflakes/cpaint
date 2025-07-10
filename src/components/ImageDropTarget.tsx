import { useUnsavedChangesGuard } from "@/features/unsaved-changes";
import { loadFile } from "@/store/loadFile";
import { useEffect, useState } from "react";
import { loadImageFromFile } from "../libs/loadImageFile";
import { useAppState } from "../store/appState";
import { ModalDialog } from "./ModalDialog";
import { pushToast } from "./Toasts";

export function ImageDropTarget() {
  const [importImageFile, setImportImageFile] = useState<File | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (
          file.type.startsWith("image/") ||
          file.name.match(/\.(jpg|jpeg|png|gif|webp|psd)$/i)
        ) {
          setImportImageFile(file);
        } else {
          pushToast("Please drop an image file.", {
            type: "info",
          });
        }
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      // Check if the dragged item is a file
      if (
        e.dataTransfer?.items.length &&
        e.dataTransfer.items[0].kind === "file"
      ) {
        setIsDraggingOver(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      if (
        e.clientX <= 0 ||
        e.clientY <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY >= window.innerHeight
      ) {
        setIsDraggingOver(false);
      }
    };

    window.addEventListener("drop", handleDrop);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    return () => {
      window.removeEventListener("drop", handleDrop);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
    };
  }, []);

  return (
    <>
      {isDraggingOver && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-none">
          <p className="text-white text-2xl font-bold">
            Drop image here to import
          </p>
        </div>
      )}
      {importImageFile && (
        <ImportImage
          onClose={() => setImportImageFile(null)}
          file={importImageFile}
        />
      )}
    </>
  );
}

function ImportImage({ onClose, file }: { onClose: () => void; file: File }) {
  const store = useAppState();
  const isPsd = file.name.match(/\.psd$/i);

  const { executeWithGuard } = useUnsavedChangesGuard();

  return (
    <ModalDialog onClickOutside={onClose}>
      <div className="flex flex-col gap-4 p-4">
        <h2 className="text-lg font-semibold">Import Image</h2>

        <p>How would you like to import this image?</p>

        <p className="text-sm text-gray-500">
          <span translate="no">{file.name}</span> (
          {Math.round(file.size / 1024).toLocaleString("en-US")} KB)
        </p>

        {isPsd && (
          <p className="text-red-800">
            Loading PSD files is still an experimental feature. Opening a PSD
            file may result in loss of layer information.
          </p>
        )}

        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 cursor-pointer"
            onClick={async () => {
              executeWithGuard(async () => {
                await loadFile(file);
              });
              onClose();
            }}
          >
            Open as New File
          </button>

          {store.imageMeta && !isPsd && (
            <button
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 cursor-pointer"
              onClick={async () => {
                const img = await loadImageFromFile(file);
                store.importAsLayer(img);
                onClose();
              }}
            >
              Import as Layer
            </button>
          )}
        </div>
      </div>
    </ModalDialog>
  );
}
