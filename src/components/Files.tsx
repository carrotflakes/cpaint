import { useCallback, useEffect, useState } from "react";
import { useStorage } from "../hooks/useStorage";
import { Storage } from "../libs/storage";
import { StateContainerFromState } from "../model/state";
import { useStore } from "../state";

export function Files() {
  const [files, setFiles] = useState(
    null as null | { id: number; name: string }[]
  );

  const storage = useStorage();

  const load = useCallback(() => {
    storage?.getAllImageMetas()?.then((images) => {
      images && setFiles(images as any);
    });
  }, [storage]);

  useEffect(() => {
    load();
  }, [load]);

  const newFile = useCallback(() => {
    useStore.setState({
      imageMeta: {
        id: Date.now(),
        name: new Date().toISOString().split(".")[0].replace(/:/g, "-"),
        createdAt: Date.now(),
      },
    });
    useStore.getState().clearAll();
  }, []);

  return (
    <div className="p-4">
      <button
        className="bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200"
        onClick={newFile}
      >
        New file
      </button>
      <div className="flex flex-wrap">
        {files?.map((file) => (
          <div
            key={file.id}
            className="p-4 flex flex-col gap-2 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900"
            onClick={() => storage && loadImage(storage, file.id)}
          >
            {file.name}
            <Thumbnail id={file.id} />
            <button
              className="bg-gray-50 dark:bg-gray-950 text-gray-800 dark:text-gray-200"
              onClick={() => {
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
    canvas: OffscreenCanvas;
    opacity: number;
    visible: boolean;
  }[] = [];
  for (const layerData of imageData.layers) {
    const image = await blobToImage(layerData.canvas);
    const canvas = new OffscreenCanvas(image.width, image.height);
    {
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
    }
    layers.push({
      id: layerData.id,
      canvas,
      opacity: layerData.opacity,
      visible: layerData.visible,
    });
  }

  const state = {
    layers,
  };
  useStore.setState(() => {
    return {
      imageMeta,
      stateContainer: StateContainerFromState(state),
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
