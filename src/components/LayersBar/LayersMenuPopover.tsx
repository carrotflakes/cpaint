import { useCallback } from "react";
import { AppState } from "@/store/appState";
import * as ops from "@/store/layers";

interface LayersMenuPopoverProps {
  closePopover: () => void;
  store: AppState;
}

export function LayersMenuPopover({
  closePopover,
  store,
}: LayersMenuPopoverProps) {
  const handleAddLayer = useCallback(() => {
    ops.addLayer(store);
    closePopover();
  }, [store, closePopover]);

  return (
    <div className="flex flex-col text-gray-800 bg-gray-50">
      <div
        className="p-2 cursor-pointer hover:bg-gray-100"
        onClick={() => handleAddLayer()}
      >
        New Layer
      </div>
    </div>
  );
}
