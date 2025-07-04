import * as Popover from "@radix-ui/react-popover";
import { useCallback, useState } from "react";
import { ReactComponent as IconDotsV } from "../assets/icons/dots-six-vertical.svg";
import { ReactComponent as IconEyeSlash } from "../assets/icons/eye-slash.svg";
import { ReactComponent as IconEye } from "../assets/icons/eye.svg";
import { ReactComponent as IconLayers } from "../assets/icons/layers.svg";
import { ReactComponent as IconLock } from "../assets/icons/lock.svg";
import { ReactComponent as IconMenu } from "../assets/icons/menu.svg";
import { MCanvas } from "../libs/MCanvas";
import { BlendMode } from "../model/blendMode";
import {
  findLayerIndexById
} from "../model/state";
import { AppState, useAppState } from "../store/appState";
import * as ops from "../store/layers";
import { SliderH } from "./slider";

export function LayersBar() {
  const store = useAppState();
  const layers = store.stateContainer.state.layers;
  const [popoverOpen, setPopoverOpen] = useState<{
    open: boolean;
    layerIndex: number;
  }>({ open: false, layerIndex: 0 });

  // D&D state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [layersVisible, setLayersVisible] = useState(true);

  const handleAddLayer = useCallback(() => {
    ops.addLayer(store, layers);
  }, [store, layers]);

  const handleToggleVisibility = useCallback(
    (index: number) => {
      ops.toggleVisibility(store, layers, index);
    },
    [store, layers]
  );

  const handleMoveLayer = useCallback(
    (from: number, to: number) => {
      ops.moveLayer(store, from, to);
    },
    [store]
  );

  return (
    <div
      data-testid="layers-bar"
      className="max-h-full flex flex-col items-stretch bg-gray-50 dark:bg-gray-800 border-l border-b border-gray-300"
    >
      <div
        className="p-2 flex gap-2 cursor-pointer"
        onClick={() => setLayersVisible((v) => !v)}
      >
        <IconLayers width={24} height={24} />
        <span>Layers</span>
      </div>
      {layersVisible && (
        <div
          className="grow shrink border-t border-gray-300 overflow-y-auto"
          data-scroll={true}
        >
          {store.stateContainer.state.layers
            .map((layer, i) => (
              <div
                key={layer.id}
                className={`relative p-1 flex items-center gap-2 ${
                  dragOverIndex === i && draggedIndex !== null
                    ? "bg-blue-100 dark:bg-blue-900"
                    : layer.id === store.uiState.currentLayerId
                    ? "bg-gray-200 dark:bg-gray-700"
                    : ""
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverIndex(i);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedIndex !== null) {
                    handleMoveLayer(draggedIndex, i);
                  }
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                }}
                onDragEnd={() => {
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                }}
                onTouchMove={(e) => {
                  if (draggedIndex === null) return;
                  const touchY = e.touches[0].clientY;
                  // Calculate the index of the layer being dragged over
                  const parent = e.currentTarget.parentElement;
                  if (!parent) return;
                  const children = Array.from(parent.children);
                  for (const child of children) {
                    const rect = child.getBoundingClientRect();
                    const layerIndex = child.getAttribute("data-layer-index");
                    if (
                      touchY >= rect.top &&
                      touchY <= rect.bottom &&
                      layerIndex
                    ) {
                      setDragOverIndex(+layerIndex);
                      break;
                    }
                  }
                }}
                onTouchEnd={() => {
                  if (draggedIndex !== null && dragOverIndex !== null) {
                    handleMoveLayer(draggedIndex, dragOverIndex);
                  }
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                }}
                data-layer-index={i}
              >
                <div
                  className="cursor-grab"
                  draggable
                  onDragStart={() => {
                    setDraggedIndex(i);
                  }}
                  onTouchStart={() => {
                    setDraggedIndex(i);
                  }}
                >
                  <IconDotsV width={16} height={24} />
                </div>
                <button
                  className="w-8 h-8 cursor-pointer"
                  onClick={() => handleToggleVisibility(i)}
                  tabIndex={-1}
                  title={layer.visible ? "Hide layer" : "Show layer"}
                >
                  {layer.visible ? (
                    <IconEye width={24} height={24} />
                  ) : (
                    <IconEyeSlash width={24} height={24} />
                  )}
                </button>
                <div
                  className="grow flex items-center gap-2 cursor-pointer"
                  onClick={() => {
                    store.update((draft) => {
                      draft.uiState.currentLayerId = layer.id;
                    });
                  }}
                >
                  <CanvasPreview canvas={layer.canvas} locked={layer.locked} />
                  {layer.id}
                </div>
                <Popover.Root
                  open={popoverOpen.open && popoverOpen.layerIndex === i}
                  onOpenChange={(open) =>
                    setPopoverOpen({ open, layerIndex: i })
                  }
                >
                  <Popover.Trigger asChild>
                    <button
                      className="w-8 h-8 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPopoverOpen({ open: true, layerIndex: i });
                      }}
                      tabIndex={-1}
                    >
                      <IconMenu width={24} height={24} />
                    </button>
                  </Popover.Trigger>
                  <Popover.Portal>
                    <Popover.Content
                      className="min-w-20 bg-gray-50 border border-gray-300 shadow-sm z-50"
                      sideOffset={5}
                      align="end"
                      collisionPadding={8}
                      avoidCollisions={true}
                      onInteractOutside={() =>
                        setPopoverOpen({ open: false, layerIndex: 0 })
                      }
                    >
                      <ContextMenuPopover
                        layerId={layer.id}
                        store={store}
                        closePopover={() =>
                          setPopoverOpen({ open: false, layerIndex: 0 })
                        }
                      />
                    </Popover.Content>
                  </Popover.Portal>
                </Popover.Root>
              </div>
            ))
            .toReversed()}
          <button
            className="w-full p-2 cursor-pointer"
            onClick={handleAddLayer}
          >
            New Layer
          </button>
        </div>
      )}
    </div>
  );
}

function ContextMenuPopover({
  layerId,
  closePopover,
  store,
}: {
  layerId: string;
  closePopover: () => void;
  store: AppState;
}) {
  const layerIndex = findLayerIndexById(
    store.stateContainer.state.layers,
    layerId
  );

  const handleUpdateOpacity = useCallback(
    (index: number, opacity: number) => {
      ops.updateOpacity(store, index, opacity);
    },
    [store]
  );

  const handleDuplicateLayer = useCallback(
    (index: number) => {
      ops.duplicateLayer(store, index);
      closePopover();
    },
    [store, closePopover]
  );

  const handleDeleteLayer = useCallback(
    (index: number) => {
      ops.deleteLayer(store, index);
      closePopover();
    },
    [store, closePopover]
  );

  const handleMergeLayer = useCallback(
    (index: number) => {
      ops.mergeLayer(store, index);
      closePopover();
    },
    [store, closePopover]
  );

  const layer = store.stateContainer.state.layers[layerIndex];
  if (!layer) return null;
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
          onChange={(value) => handleUpdateOpacity(layerIndex, value)}
        />
      </div>

      <hr className="opacity-20" />

      <div
        className="p-2 cursor-pointer hover:bg-gray-100"
        onClick={() => {
          ops.toggleLockLayer(store, layerIndex, layer.locked);
          closePopover();
        }}
      >
        {layer.locked ? "Unlock Layer" : "Lock Layer"}
      </div>

      <hr className="opacity-20" />

      <div
        className="p-2 cursor-pointer hover:bg-gray-100"
        onClick={() => handleDuplicateLayer(layerIndex)}
      >
        Duplicate Layer
      </div>
      <div
        className="p-2 cursor-pointer hover:bg-gray-100 data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed"
        data-disabled={layerIndex === 0}
        onClick={() => {
          if (layerIndex > 0) {
            handleMergeLayer(layerIndex);
          }
        }}
        title={
          layerIndex === 0
            ? "Cannot merge the bottom layer"
            : "Merge with layer below"
        }
      >
        Merge Down
      </div>
      <div
        className="p-2 cursor-pointer hover:bg-gray-100"
        onClick={() => handleDeleteLayer(layerIndex)}
      >
        Delete Layer
      </div>
    </div>
  );
}

function CanvasPreview({
  canvas,
  locked,
}: {
  canvas: MCanvas;
  locked: boolean;
}) {
  const thumbnail = canvas.getThumbnail();

  return (
    <div className="w-8 h-8 grid place-items-center overflow-hidden">
      <canvas
        className="max-w-8 max-h-8"
        ref={(ref) => {
          if (!ref) return;
          const ctx = ref.getContext("2d")!;
          ctx.clearRect(0, 0, ref.width, ref.height);
          if (locked) ctx.globalAlpha = 0.75;
          ctx.drawImage(thumbnail, 0, 0);
        }}
        width={thumbnail.width}
        height={thumbnail.height}
      />
      {locked && (
        <IconLock width={16} height={16} className="absolute m-auto" />
      )}
    </div>
  );
}

const BLEND_MODES: [BlendMode, string][] = [
  ["source-over", "Normal"],
  ["multiply", "Multiply"],
  ["screen", "Screen"],
  ["overlay", "Overlay"],
  ["darken", "Darken"],
  ["lighten", "Lighten"],
  ["color-dodge", "Color Dodge"],
  ["color-burn", "Color Burn"],
  ["hard-light", "Hard Light"],
  ["soft-light", "Soft Light"],
  ["difference", "Difference"],
  ["exclusion", "Exclusion"],
  ["hue", "Hue"],
  ["saturation", "Saturation"],
  ["color", "Color"],
  ["luminosity", "Luminosity"],
  ["xor", "XOR"],
];
