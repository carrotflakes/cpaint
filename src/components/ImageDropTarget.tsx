import { useEffect, useState } from "react";
import { useAppState } from "../store/appState";
import { ModalDialog } from "./ModalDialog";
import { pushToast } from "./Toasts";
import { loadImageFromFile } from "../libs/loadImageFile";

export function ImageDropTarget() {
  const store = useAppState();
  const [importImageFile, setImportImageFile] = useState<File | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  useEffect(() => {
    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(false);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file.type.startsWith("image/")) {
          setImportImageFile(file);
        } else {
          pushToast("Please drop an image file.");
        }
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDraggingOver(true);
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
        <ModalDialog onClickOutside={() => setImportImageFile(null)}>
          <div className="flex flex-col gap-4 p-4">
            <h2 className="text-lg font-semibold">Import Image</h2>
            <p>How would you like to import this image?</p>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 cursor-pointer"
                onClick={async () => {
                  if (!importImageFile) return;
                  const img = await loadImageFromFile(importImageFile);
                  store.openAsNewFile(img);
                  setImportImageFile(null);
                }}
              >
                Open as New File
              </button>
              <button
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 cursor-pointer"
                onClick={async () => {
                  if (!importImageFile) return;
                  const img = await loadImageFromFile(importImageFile);
                  store.importAsLayer(img);
                  setImportImageFile(null);
                }}
              >
                Import as Layer
              </button>
            </div>
          </div>
        </ModalDialog>
      )}
    </>
  );
}
