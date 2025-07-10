import { useAppState } from "@/store/appState";
import * as ops from "@/store/layers";
import { useCallback } from "react";

interface LayersMenuPopoverProps {
  closePopover: () => void;
}

export function LayersMenuPopover({ closePopover }: LayersMenuPopoverProps) {
  const handleAddLayer = useCallback(() => {
    ops.addLayer(useAppState.getState());
    closePopover();
  }, [closePopover]);

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
