import * as Popover from "@radix-ui/react-popover";
import { useCallback } from "react";
import { ReactComponent as IconDotsV } from "@/assets/icons/dots-six-vertical.svg";
import { ReactComponent as IconEyeSlash } from "@/assets/icons/eye-slash.svg";
import { ReactComponent as IconEye } from "@/assets/icons/eye.svg";
import { ReactComponent as IconMenu } from "@/assets/icons/menu.svg";
import { Layer, LayerGroup } from "@/model/state";
import { useAppState } from "@/store/appState";
import * as ops from "@/store/layers";
import { CanvasPreview } from "./CanvasPreview";
import { LayerGroupMenuPopover } from "./LayerGroupMenuPopover";
import { LayerMenuPopover } from "./LayerMenuPopover";

interface LayersProps {
  index: number[];
  layers: readonly (Layer | LayerGroup)[];
  popoverOpen: { open: boolean; layerIndex: number[] };
  setPopoverOpen: (state: { open: boolean; layerIndex: number[] }) => void;
  draggedIndex: number[] | null;
  setDraggedIndex: (index: number[] | null) => void;
  dragOverIndex: number[] | null;
  setDragOverIndex: (index: number[] | null) => void;
}

export function Layers({
  index,
  layers,
  popoverOpen,
  setPopoverOpen,
  draggedIndex,
  setDraggedIndex,
  dragOverIndex,
  setDragOverIndex,
}: LayersProps) {
  const store = useAppState();

  const handleToggleVisibility = useCallback(
    (index: number[], visible: boolean) => {
      ops.updateVisibility(store, index, !visible);
    },
    [store, layers]
  );

  const handleMoveLayer = useCallback(
    (from: number[], to: number[]) => {
      ops.moveLayer(store, from, to);
    },
    [store]
  );

  return layers
    .map((layer, i) => (
      <div
        key={layer.id}
        className={`relative flex flex-col ${
          dragOverIndex?.at(-1) === i && draggedIndex !== null
            ? "bg-blue-100 dark:bg-blue-900"
            : layer.id === store.uiState.currentLayerId
            ? "bg-gray-200 dark:bg-gray-700"
            : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverIndex([...index, i]);
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (draggedIndex !== null) {
            handleMoveLayer(draggedIndex, [...index, i]);
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
            if (touchY >= rect.top && touchY <= rect.bottom && layerIndex) {
              setDragOverIndex([...index, +layerIndex]);
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
        <div className="flex items-center gap-2">
          <button
            className="w-8 h-8 cursor-pointer"
            onClick={() => handleToggleVisibility([...index, i], layer.visible)}
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
            {layer.type === "layer" ? (
              <CanvasPreview canvas={layer.canvas} locked={layer.locked} />
            ) : (
              <div className="w-8 h-8 grid place-items-center" />
            )}
            {layer.id}
          </div>
          <Popover.Root
            open={
              popoverOpen.open &&
              "" + popoverOpen.layerIndex === "" + [...index, i]
            }
            onOpenChange={(open) =>
              setPopoverOpen({ open, layerIndex: [...index, i] })
            }
          >
            <Popover.Trigger asChild>
              <button
                className="w-8 h-8 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setPopoverOpen({ open: true, layerIndex: [...index, i] });
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
                  setPopoverOpen({ open: false, layerIndex: [] })
                }
              >
                {layer.type === "layer" ? (
                  <LayerMenuPopover
                    layerId={layer.id}
                    store={store}
                    closePopover={() =>
                      setPopoverOpen({ open: false, layerIndex: [] })
                    }
                  />
                ) : (
                  <LayerGroupMenuPopover
                    layerId={layer.id}
                    store={store}
                    closePopover={() =>
                      setPopoverOpen({ open: false, layerIndex: [] })
                    }
                  />
                )}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          <div
            className="cursor-grab"
            draggable
            onDragStart={() => {
              setDraggedIndex([...index, i]);
            }}
            onTouchStart={() => {
              setDraggedIndex([...index, i]);
            }}
          >
            <IconDotsV width={16} height={24} />
          </div>
        </div>
        {layer.type === "group" && (
          <div className="pl-2">
            <Layers
              index={[...index, i]}
              layers={layer.layers}
              popoverOpen={popoverOpen}
              setPopoverOpen={setPopoverOpen}
              draggedIndex={draggedIndex}
              setDraggedIndex={setDraggedIndex}
              dragOverIndex={dragOverIndex}
              setDragOverIndex={setDragOverIndex}
            />
          </div>
        )}
      </div>
    ))
    .toReversed();
}
