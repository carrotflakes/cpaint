import { State } from "../model/state";
import { useAppState, AppState } from "../store/appState";
import { useState } from "react";
import { IconEye, IconEyeSlash, IconMenu } from "./icons";
import { BlendMode } from "../model/blendMode";
import * as Popover from "@radix-ui/react-popover";

export function LayersBar() {
  const store = useAppState();
  const [popoverOpen, setPopoverOpen] = useState<{
    open: boolean;
    layerIndex: number;
  }>({ open: false, layerIndex: 0 });

  const addLayer = () => {
    const layers = store.stateContainer.state.layers;
    const firstLayer = layers[0];
    const canvas = new OffscreenCanvas(
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
              id: `${Date.now()}`,
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
  };

  const toggleVisibility = (index: number) => {
    const layer = store.stateContainer.state.layers[index];
    store.apply(
      {
        type: "patch",
        patches: [
          {
            op: "replace",
            path: `/layers/${index}/visible`,
            value: !layer.visible satisfies State["layers"][number]["visible"],
          },
        ],
      },
      null
    );
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border-r border-gray-300">
      <div className="flex flex-col items-stretch">
        <div className="p-2 border-b border-gray-300">Layers</div>
        <div className="grow overflow-y-auto">
          {store.stateContainer.state.layers.map((layer, i) => (
            <div
              key={i}
              className={`p-2 flex items-center gap-2 ${
                i === store.uiState.layerIndex
                  ? "bg-gray-200 dark:bg-gray-700"
                  : ""
              }`}
            >
              <button
                className="mt-1 w-8 h-8 p-1 rounded cursor-pointer"
                onClick={() => toggleVisibility(i)}
              >
                {layer.visible ? <IconEye /> : <IconEyeSlash />}
              </button>
              <div
                className="cursor-pointer"
                onClick={() => {
                  store.update((draft) => {
                    draft.uiState.layerIndex = i;
                  });
                }}
              >
                Layer {i}
              </div>
              <Popover.Root
                open={popoverOpen.open && popoverOpen.layerIndex === i}
                onOpenChange={(open) => setPopoverOpen({ open, layerIndex: i })}
              >
                <Popover.Trigger asChild>
                  <button
                    className="mt-1 w-8 h-8 p-1 rounded cursor-pointer"
                    onClick={() => {
                      setPopoverOpen({ open: true, layerIndex: i });
                    }}
                  >
                    <IconMenu />
                  </button>
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Content
                    className="min-w-20 bg-white border border-gray-300 shadow-md z-50"
                    sideOffset={5}
                    align="end"
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
          ))}
          <div className="p-2 cursor-pointer" onClick={addLayer}>
            New Layer
          </div>
        </div>
      </div>
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
  const updateOpacity = (index: number, opacity: number) => {
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
  };

  const deleteLayer = (index: number) => {
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
  };

  return (
    <div>
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
          className="w-full mt-1"
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
          className="w-full mt-1"
        />
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
