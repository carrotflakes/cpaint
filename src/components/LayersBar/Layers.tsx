import { ReactComponent as IconCaretLeft } from "@/assets/icons/caret-left.svg";
import { ReactComponent as IconDotsV } from "@/assets/icons/dots-six-vertical.svg";
import { ReactComponent as IconEyeSlash } from "@/assets/icons/eye-slash.svg";
import { ReactComponent as IconEye } from "@/assets/icons/eye.svg";
import { ReactComponent as IconMenu } from "@/assets/icons/menu.svg";
import { ReactComponent as IconStackSimple } from "@/assets/icons/stack-simple.svg";
import {
  SortableTree,
  TreeItemProps,
} from "@/components/sortableTree/SortableTree";
import { findLayerIndexById, Layer, LayerGroup } from "@/model/state";
import { useAppState } from "@/store/appState";
import * as ops from "@/store/layers";
import { UniqueIdentifier } from "@dnd-kit/core";
import * as Popover from "@radix-ui/react-popover";
import { forwardRef, useCallback, useMemo, useState } from "react";
import { create } from "zustand";
import { CanvasPreview } from "./CanvasPreview";
import { LayerGroupMenuPopover } from "./LayerGroupMenuPopover";
import { LayerMenuPopover } from "./LayerMenuPopover";

export function Layers() {
  const layers = useAppState((state) => state.stateContainer.state.layers);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );

  const handleToggleCollapse = useCallback((layerId: string) => {
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(layerId)) {
        newSet.delete(layerId);
      } else {
        newSet.add(layerId);
      }
      return newSet;
    });
  }, []);

  return (
    <div
      className="grow shrink border-t border-gray-300 overflow-y-auto"
      data-scroll={true}
    >
      <SortableTree
        Item={LayerItem}
        items={layers}
        itemToId={useCallback((item: Layer | LayerGroup) => item.id, [])}
        itemToChildren={useCallback(
          (item: Layer | LayerGroup) =>
            item.type === "group" ? item.layers : [],
          []
        )}
        itemToCollapsed={useCallback(
          (item: Layer | LayerGroup) => collapsedGroups.has(item.id),
          [collapsedGroups]
        )}
        itemCanHave={useCallback(
          (item: Layer | LayerGroup) => item.type === "group",
          []
        )}
        itemsInverted={true}
        indentationWidth={16}
        offsetY={8}
        onItemMove={useCallback(
          (
            fromId: UniqueIdentifier,
            parentId: UniqueIdentifier | null,
            index: number
          ) => {
            const fromIndex = findLayerIndexById(layers, "" + fromId);
            if (!fromIndex) return;

            const parentIndex = parentId
              ? findLayerIndexById(layers, "" + parentId)
              : [];
            if (!parentIndex) return;

            const toIndex = [...parentIndex, index];
            indexAfterRemove(fromIndex, toIndex);
            ops.moveLayer(fromIndex, toIndex);

            function indexAfterRemove(removed: number[], target: number[]) {
              if (target.length < removed.length) return;
              for (let i = 0; i < removed.length - 1; i++) {
                if (target[i] !== removed[i]) return;
              }
              if (target[removed.length - 1] > removed[removed.length - 1]) {
                target[removed.length - 1] -= 1;
              }
            }
          },
          [layers]
        )}
        extra={useMemo(
          () => ({ handleToggleCollapse }),
          [handleToggleCollapse]
        )}
      />
    </div>
  );
}

const LayerItem = forwardRef<
  HTMLDivElement,
  TreeItemProps<
    Layer | LayerGroup,
    { handleToggleCollapse: (layerId: string) => void }
  >
>(
  (
    {
      childCount,
      clone,
      depth,
      disableInteraction,
      ghost,
      handleProps,
      indentationWidth,
      indicator,
      collapsed,
      style,
      value: layer,
      wrapperRef,
      extra,
      ...props
    },
    ref
  ) => {
    const currentLayerId = useAppState((state) => state.uiState.currentLayerId);
    const renderer = useAppState((state) => state.stateContainer.renderer);

    const {
      open: popoverOpen,
      setPopoverOpen,
      layerId: popoverLayerId,
    } = usePopoverOpenState();

    const handleToggleVisibility = useCallback(() => {
      const store = useAppState.getState();
      const index = findLayerIndexById(
        store.stateContainer.state.layers,
        layer.id
      );
      if (!index) return;
      ops.updateVisibility(index, !layer.visible);
    }, [layer]);

    const handleToggleCollapse = useCallback(() => {
      if (extra?.handleToggleCollapse) {
        extra.handleToggleCollapse(layer.id);
      }
    }, [extra, layer.id]);

    const canvas =
      layer.type === "layer"
        ? layer.canvas
        : collapsed
        ? renderer.getCacheCanvas(layer.id)
        : null;

    return (
      <div
        ref={wrapperRef}
        style={
          {
            paddingLeft: `${indentationWidth * depth}px`,
          } as React.CSSProperties
        }
        {...props}
      >
        <div
          className={`p-1 relative flex items-center gap-2 ${
            ghost
              ? "bg-blue-100 dark:bg-blue-900"
              : layer.id === currentLayerId
              ? "bg-gray-200 dark:bg-gray-700"
              : "bg-gray-50 dark:bg-gray-800"
          } ${clone ? "shadow-lg" : ""}`}
          ref={ref}
          style={style}
        >
          <div className="cursor-grab" draggable {...handleProps}>
            <IconDotsV width={16} height={24} />
          </div>

          <button
            className="w-8 h-8 cursor-pointer"
            onClick={() => handleToggleVisibility()}
            tabIndex={-1}
            title={layer.visible ? "Hide layer" : "Show layer"}
          >
            {layer.visible ? (
              <IconEye width={24} height={24} />
            ) : (
              <IconEyeSlash width={24} height={24} />
            )}
          </button>

          {layer.type === "group" && (
            <button
              className="w-6 h-6 flex items-center justify-center cursor-pointer text-gray-600 hover:text-gray-800"
              onClick={handleToggleCollapse}
              tabIndex={-1}
              title={collapsed ? "Expand group" : "Collapse group"}
            >
              <IconCaretLeft
                width={12}
                height={12}
                className={`transition-transform ${
                  collapsed ? "rotate-180" : "rotate-270"
                }`}
              />
            </button>
          )}

          <div
            className="grow flex items-center gap-2 cursor-pointer"
            onClick={() => {
              useAppState.getState().update((draft) => {
                draft.uiState.currentLayerId = layer.id;
              });
            }}
            title={layer.id}
          >
            {canvas ? (
              <CanvasPreview canvas={canvas} locked={layer.locked} />
            ) : (
              <IconStackSimple width={24} height={24} />
            )}
            {/* {layer.id} */}
          </div>
          <Popover.Root
            open={popoverOpen && popoverLayerId === layer.id}
            onOpenChange={(open) => setPopoverOpen(open, layer.id)}
          >
            <Popover.Trigger asChild>
              <button
                className="w-8 h-8 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setPopoverOpen(true, layer.id);
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
                onInteractOutside={() => setPopoverOpen(false, layer.id)}
              >
                {layer.type === "layer" ? (
                  <LayerMenuPopover
                    layerId={layer.id}
                    closePopover={() => setPopoverOpen(false, layer.id)}
                  />
                ) : (
                  <LayerGroupMenuPopover
                    layerId={layer.id}
                    closePopover={() => setPopoverOpen(false, layer.id)}
                  />
                )}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </div>
    );
  }
);

type PopoverOpenState = {
  open: boolean;
  layerId: string;
  setPopoverOpen: (open: boolean, layerId: string) => void;
};

const usePopoverOpenState = create<PopoverOpenState>()((set) => ({
  open: false,
  layerId: "",
  setPopoverOpen: (open: boolean, layerId: string) => set({ open, layerId }),
}));
