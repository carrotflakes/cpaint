import { useCallback, useEffect, useState } from "react";
import { useStorage } from "../hooks/useStorage";
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

  return (
    <div className="p-4">
      <button
        onClick={() => {
          useStore.setState({
            imageMeta: {
              id: Date.now(),
              name: new Date().toISOString().replace(/:/g, "-"),
              createdAt: Date.now(),
            },
          });
        }}
      >
        New file
      </button>
      <div className="flex flex-wrap">
        {files?.map((file) => (
          <div
            key={file.id}
            className="p-4 flex flex-col gap-2 hover:bg-gray-100"
          >
            {file.name}
            <Thumbnail id={file.id} />
            <button
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
