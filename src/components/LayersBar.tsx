import * as Popover from "@radix-ui/react-popover";
import { useState, useCallback } from "react";
import { ReactComponent as IconDotsV } from "../assets/icons/dots-six-vertical.svg";
import { ReactComponent as IconEyeSlash } from "../assets/icons/eye-slash.svg";
import { ReactComponent as IconEye } from "../assets/icons/eye.svg";
import { ReactComponent as IconLayers } from "../assets/icons/layers.svg";
import { ReactComponent as IconMenu } from "../assets/icons/menu.svg";
import { MCanvas } from "../libs/MCanvas";
import { BlendMode } from "../model/blendMode";
import { newLayerId, State } from "../model/state";
import { AppState, useAppState } from "../store/appState";

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

  const addLayer = useCallback(() => {
    const firstLayer = layers[0];
    const canvas = new MCanvas(
      firstLayer.canvas.width,
      firstLayer.canvas.height
    );
    store.apply(
      {
        type: "patch",
        patches: [
          {
            op: "add",
            path: `/layers/${layers.length}`,
            value: {
              id: newLayerId(),
              canvas,
              visible: true,
              opacity: 1,
              blendMode: "source-over",
            } satisfies State["layers"][number],
          },
        ],
      },
      null
    );
  }, [store.apply, layers]);

  const toggleVisibility = useCallback(
    (index: number) => {
      const layer = layers[index];
      store.apply(
        {
          type: "patch",
          patches: [
            {
              op: "replace",
              path: `/layers/${index}/visible`,
              value:
                !layer.visible satisfies State["layers"][number]["visible"],
            },
          ],
        },
        null
      );
    },
    [store.apply, layers]
  );

  const moveLayer = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      store.apply(
        {
          type: "patch",
          patches: [
            {
              op: "move",
              from: `/layers/${from}`,
              to: `/layers/${to > from ? to + 1 : to}`,
            },
          ],
        },
        null
      );
    },
    [store.apply]
  );

  return (
    <div className="max-h-full flex flex-col items-stretch bg-gray-50 dark:bg-gray-800 border-l border-b border-gray-300">
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
                className={`relative p-1 flex items-center gap-2 cursor-grab ${
                  dragOverIndex === i && draggedIndex !== null
                    ? "bg-blue-100 dark:bg-blue-900"
                    : i === store.uiState.layerIndex
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
                    moveLayer(draggedIndex, i);
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
                    moveLayer(draggedIndex, dragOverIndex);
                  }
                  setDraggedIndex(null);
                  setDragOverIndex(null);
                }}
                data-layer-index={i}
              >
                <div
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
                  onClick={() => toggleVisibility(i)}
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
                  className="grow cursor-pointer"
                  onClick={() => {
                    store.update((draft) => {
                      draft.uiState.layerIndex = i;
                    });
                  }}
                >
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
                        layerIndex={i}
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
          <button className="w-full p-2 cursor-pointer" onClick={addLayer}>
            New Layer
          </button>
        </div>
      )}
    </div>
  );
}

function ContextMenuPopover({
  layerIndex,
  closePopover,
  store,
}: {
  layerIndex: number;
  closePopover: () => void;
  store: AppState;
}) {
  const updateOpacity = useCallback(
    (index: number, opacity: number) => {
      store.apply(
        {
          type: "patch",
          patches: [
            {
              op: "replace",
              path: `/layers/${index}/opacity`,
              value: opacity satisfies State["layers"][number]["opacity"],
            },
          ],
        },
        null
      );
    },
    [store.apply]
  );

  const duplicateLayer = useCallback(
    (index: number) => {
      const layer = store.stateContainer.state.layers[index];
      // Create a new canvas with the same content
      const newCanvas = new MCanvas(layer.canvas.width, layer.canvas.height);
      const newCtx = newCanvas.getContextWrite();
      newCtx.drawImage(layer.canvas.getCanvas(), 0, 0);

      store.apply(
        {
          type: "patch",
          patches: [
            {
              op: "add",
              path: `/layers/${index + 1}`,
              value: {
                id: newLayerId(),
                canvas: newCanvas,
                visible: true,
                opacity: layer.opacity,
                blendMode: layer.blendMode,
              } satisfies State["layers"][number],
            },
          ],
        },
        null
      );
      closePopover();
    },
    [store, closePopover]
  );

  const deleteLayer = useCallback(
    (index: number) => {
      const layers = store.stateContainer.state.layers;
      if (layers.length <= 1) {
        alert("Cannot delete the last layer.");
        return;
      }
      store.apply(
        {
          type: "patch",
          patches: [
            {
              op: "remove",
              path: `/layers/${index}`,
            },
          ],
        },
        null
      );
      closePopover();
    },
    [store, closePopover]
  );

  const mergeLayer = useCallback(
    (index: number) => {
      const layers = store.stateContainer.state.layers;
      if (index === 0) {
        alert("Cannot merge the bottom layer.");
        return;
      }

      const currentLayer = layers[index];
      const belowLayer = layers[index - 1];

      const mergedCanvas = new MCanvas(
        belowLayer.canvas.width,
        belowLayer.canvas.height
      );
      const mergedCtx = mergedCanvas.getContextWrite();

      mergedCtx.drawImage(belowLayer.canvas.getCanvas(), 0, 0);

      mergedCtx.save();
      mergedCtx.globalAlpha = currentLayer.opacity;
      mergedCtx.globalCompositeOperation = currentLayer.blendMode;
      mergedCtx.drawImage(currentLayer.canvas.getCanvas(), 0, 0);
      mergedCtx.restore();

      const mergedLayer = {
        id: newLayerId(),
        canvas: mergedCanvas,
        visible: belowLayer.visible,
        opacity: belowLayer.opacity,
        blendMode: belowLayer.blendMode,
      } satisfies State["layers"][number];

      store.apply(
        {
          type: "patch",
          patches: [
            {
              op: "remove",
              path: `/layers/${index}`,
            },
            {
              op: "replace",
              path: `/layers/${index - 1}`,
              value: mergedLayer,
            },
          ],
        },
        null
      );

      // Update the current layer index if necessary
      store.update((draft) => {
        if (draft.uiState.layerIndex >= index) {
          draft.uiState.layerIndex = Math.max(0, draft.uiState.layerIndex - 1);
        }
      });

      closePopover();
    },
    [store, closePopover]
  );

  return (
    <div className="flex flex-col text-gray-800 bg-gray-50">
      <div className="p-2 hover:bg-gray-100">
        <select
          value={store.stateContainer.state.layers[layerIndex].blendMode}
          onChange={(e) =>
            store.apply(
              {
                type: "patch",
                patches: [
                  {
                    op: "replace",
                    path: `/layers/${layerIndex}/blendMode`,
                    value: e.target
                      .value as any satisfies State["layers"][number]["blendMode"],
                  },
                ],
              },
              null
            )
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
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={store.stateContainer.state.layers[layerIndex].opacity}
          onChange={(e) =>
            updateOpacity(layerIndex, parseFloat(e.target.value))
          }
          className="w-full"
        />
      </div>

      <hr className="opacity-20" />

      <div
        className="p-2 cursor-pointer hover:bg-gray-100"
        onClick={() => duplicateLayer(layerIndex)}
      >
        Duplicate Layer
      </div>
      <div
        className="p-2 cursor-pointer hover:bg-gray-100 data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed"
        data-disabled={layerIndex === 0}
        onClick={() => {
          if (layerIndex > 0) {
            mergeLayer(layerIndex);
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
        onClick={() => deleteLayer(layerIndex)}
      >
        Delete Layer
      </div>
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
