import { State } from "../model/state";
import { useAppState, AppState } from "../store/appState";
import { useState } from "react";
import { IconEye, IconEyeSlash, IconMenu } from "./icons";
import { BlendMode } from "../model/blendMode";

export function LayersBar() {
  const store = useAppState();
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    layerIndex: 0,
  });

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

  const handleContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    if (contextMenu.visible) {
      closeContextMenu();
      return;
    }
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      layerIndex: index,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, layerIndex: 0 });
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border-r border-gray-300">
      <div className="flex flex-col items-stretch">
        <div className="p-2 border-b border-gray-300">Layers</div>
        <div className="flex-grow overflow-y-auto">
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
                className="mt-1 w-8 h-8 p-1 rounded"
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
              <button
                className="mt-1 w-8 h-8 p-1 rounded"
                onClick={(e) => handleContextMenu(e, i)}
              >
                <IconMenu />
              </button>
            </div>
          ))}
          <div className="p-2 cursor-pointer" onClick={addLayer}>
            New Layer
          </div>
        </div>
      </div>
      {contextMenu.visible && (
        <ContextMenu
          contextMenu={contextMenu}
          closeContextMenu={closeContextMenu}
          store={store}
        />
      )}
    </div>
  );
}

function ContextMenu({
  contextMenu,
  closeContextMenu,
  store,
}: {
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
    layerIndex: number;
  };
  closeContextMenu: () => void;
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
  };

  const handleMenuAction = (action: string) => {
    if (contextMenu.layerIndex !== null) {
      if (action === "delete") {
        deleteLayer(contextMenu.layerIndex);
      }
    }
    closeContextMenu();
  };

  return (
    <div
      className="fixed min-w-20 bg-white border border-gray-300 shadow-md"
      style={{ top: contextMenu.y, left: contextMenu.x - 100 }}
    >
      <div
        className="p-2 cursor-pointer hover:bg-gray-100"
        onClick={() => closeContextMenu()}
      >
        Close
      </div>
      <div className="p-2 hover:bg-gray-100">
        <select
          value={
            store.stateContainer.state.layers[contextMenu.layerIndex].blendMode
          }
          onChange={(e) =>
            store.apply(
              {
                type: "patch",
                patches: [
                  {
                    op: "replace",
                    path: `/layers/${contextMenu.layerIndex}/blendMode`,
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
          value={
            store.stateContainer.state.layers[contextMenu.layerIndex].opacity
          }
          onChange={(e) =>
            updateOpacity(contextMenu.layerIndex, parseFloat(e.target.value))
          }
          className="w-full mt-1"
        />
      </div>
      <div
        className="p-2 cursor-pointer hover:bg-gray-100"
        onClick={() => handleMenuAction("delete")}
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
