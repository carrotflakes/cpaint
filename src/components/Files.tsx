import { useCallback, useEffect, useState } from "react";
import { useStorage } from "../hooks/useStorage";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard";
import { Storage } from "../libs/storage";
import { BlendMode } from "../model/blendMode";
import { StateContainerFromState } from "../model/state";
import { useAppState } from "../store/appState";
import { MCanvas } from "../libs/mCanvas";

export function Files() {
  const [files, setFiles] = useState(
    null as null | { id: number; name: string }[]
  );

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
    (size: [number, number]) => {
      executeWithGuard(() => {
        useAppState.getState().new(size);
      }, "Creating a new file will discard your current unsaved changes.");
    },
    [executeWithGuard]
  );

  return (
    <div className="p-4 flex flex-col gap-4 text-gray-800 dark:text-gray-200">
      <h2 className="text-2xl">New</h2>
      <div className="flex gap-2 flex-wrap">
        <button
          className="p-2 rounded bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 cursor-pointer"
          onClick={() => newFile([400, 400])}
        >
          New File 400x400
        </button>
        <button
          className="p-2 rounded bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 cursor-pointer"
          onClick={() => newFile([2000, 2000])}
        >
          New File 2000x2000
        </button>
        <button
          className="p-2 rounded bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 cursor-pointer"
          onClick={() => newFile([4000, 4000])}
        >
          New File 4000x4000
        </button>
        <label className="p-2 rounded bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 cursor-pointer">
          Open Local File
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              executeWithGuard(async () => {
                const { loadImageFromFile } = await import(
                  "../libs/loadImageFile"
                );
                const img = await loadImageFromFile(file);
                useAppState.getState().openAsNewFile(img);
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
            className="p-4 flex flex-col gap-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900"
            onClick={() =>
              storage &&
              executeWithGuard(
                () => loadImage(storage, file.id),
                `Loading "${file.name}" will discard your current unsaved changes.`
              )
            }
          >
            <span translate="no">{file.name}</span>
            <Thumbnail id={file.id} />
            <button
              className="bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                storage?.deleteImage(file.id);
                load();
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
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
    <div className="w-40 h-40 bg-gray-200">
      {thumbnail && (
        <img className="w-40 h-40 object-contain bg-white" src={thumbnail} />
      )}
    </div>
  );
}

async function loadImage(storage: Storage, id: number) {
  const imageMeta: any = await storage.getImageMeta(id);
  const imageData = await storage.getImage(id);
  if (!imageMeta || !imageData) return;

  const layers: {
    id: string;
    canvas: MCanvas;
    visible: boolean;
    opacity: number;
    blendMode: BlendMode;
  }[] = [];
  for (const layerData of imageData.layers) {
    const image = await blobToImage(layerData.canvas);
    const canvas = new MCanvas(image.width, image.height);
    {
      const ctx = canvas.getContextWrite();
      ctx.drawImage(image, 0, 0);
    }
    layers.push({
      id: layerData.id,
      canvas,
      visible: layerData.visible,
      opacity: layerData.opacity,
      blendMode: layerData.blendMode,
    });
  }

  const state = {
    layers,
    selection: null,
  };
  useAppState.setState(() => {
    const stateContainer = StateContainerFromState(state);
    return {
      imageMeta,
      stateContainer,
      savedState: stateContainer.state,
    };
  });
}

function blobToImage(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.src = URL.createObjectURL(blob);
  });
}
