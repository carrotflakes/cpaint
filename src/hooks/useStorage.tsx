import { useEffect, useState } from "react";
import { Storage, storage as storageInstance } from "../libs/Storage";

export function useStorage() {
  const [storage, setStorage] = useState(null as null | Storage);

  useEffect(() => {
    function f() {
      if (storageInstance.isReady) setStorage(storageInstance);
      else setTimeout(f, 100);
    }
    f();
  }, []);

  return storage;
}
