import { useCallback } from "react";
import { BlendMode } from "@/model/blendMode";
import { findLayerById, findLayerIndexById } from "@/model/state";
import { AppState } from "@/store/appState";
import * as ops from "@/store/layers";
import { SliderH } from "../slider";
import { BLEND_MODES } from "./constants";

interface LayerMenuPopoverProps {
  layerId: string;
  closePopover: () => void;
  store: AppState;
}

export function LayerMenuPopover({
  layerId,
  closePopover,
  store,
}: LayerMenuPopoverProps) {
  const layerIndex = findLayerIndexById(
    store.stateContainer.state.layers,
    layerId
  );
  if (layerIndex === null) return null;

  const handleUpdateOpacity = useCallback(
    (opacity: number) => {
      ops.updateOpacity(store, layerIndex, opacity);
    },
    [store]
  );

  const handleCreateGroup = useCallback(() => {
    ops.createGroup(store, layerIndex);
    closePopover();
  }, [store, layerIndex, closePopover]);

  const handleDuplicateLayer = useCallback(() => {
    ops.duplicateLayer(store, layerIndex);
    closePopover();
  }, [store, closePopover]);

  const handleDeleteLayer = useCallback(() => {
    ops.deleteLayer(store, layerIndex);
    closePopover();
  }, [store, closePopover]);

  const handleMergeLayer = useCallback(() => {
    ops.mergeLayer(store, layerIndex);
    closePopover();
  }, [store, closePopover]);

  const layer = findLayerById(store.stateContainer.state.layers, layerId);
  if (layer?.type !== "layer") return null;

  return (
    <div className="flex flex-col text-gray-800 bg-gray-50">
      <div className="p-2 hover:bg-gray-100">
        <select
          value={layer.blendMode}
          onChange={(e) =>
            ops.updateBlendMode(store, layerIndex, e.target.value as BlendMode)
          }
          className="w-full"
        >
          {BLEND_MODES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="p-2 hover:bg-gray-100">
        <SliderH
          className="h-5"
          value={layer.opacity}
          onChange={(value) => handleUpdateOpacity(value)}
        />
      </div>

      <hr className="opacity-20" />

      <div
        className="p-2 cursor-pointer hover:bg-gray-100"
        onClick={() => {
          ops.updateLayerLock(store, layerIndex, !layer.locked);
          closePopover();
        }}
      >
        {layer.locked ? "Unlock Layer" : "Lock Layer"}
      </div>

      <hr className="opacity-20" />

      <div
        className="p-2 cursor-pointer hover:bg-gray-100"
        onClick={() => handleDuplicateLayer()}
      >
        Duplicate Layer
      </div>
      <div
        className="p-2 cursor-pointer hover:bg-gray-100 data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed"
        data-disabled={layerIndex.at(-1) === 0}
        onClick={() => {
          if (layerIndex.at(-1) !== 0) {
            handleMergeLayer();
          }
        }}
        title={
          layerIndex.at(-1) === 0
            ? "Cannot merge the bottom layer"
            : "Merge with layer below"
        }
      >
        Merge Down
      </div>
      <div
        className="p-2 cursor-pointer hover:bg-gray-100"
        onClick={() => handleDeleteLayer()}
      >
        Delete Layer
      </div>
      <div
        className="p-2 cursor-pointer hover:bg-gray-100"
        onClick={() => handleCreateGroup()}
      >
        Create Group
      </div>
    </div>
  );
}
