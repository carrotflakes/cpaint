import { useCallback, useEffect, useState } from "react";
import { useStorage } from "../hooks/useStorage";
import { useStore } from "../state";
import { Storage } from "../libs/storage";

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

  const blobUrl = URL.createObjectURL(imageData as any);
  const image = new Image();
  image.onload = () => {
    const initialImage = new OffscreenCanvas(image.width, image.height);
    const ctx = initialImage.getContext("2d");
    ctx!.drawImage(image, 0, 0);
    useStore.setState((state) => {
      state.canvas.width = image.width;
      state.canvas.height = image.height;
      const ctx = state.canvas.getContext("2d")!;
      ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
      ctx.drawImage(initialImage, 0, 0);

      const history = state.history.clone();
      history.clear();
      return {
        imageMeta,
        initialImage,
        history,
      };
    });
  };
  image.src = blobUrl;
}
