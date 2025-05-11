import { useRef, useState } from "react";
import { usePointer } from "../hooks/usePointer";
import { useAppState } from "../store/appState";
import { ColorPalette } from "./ColorPalette";
import {
  IconEraser,
  IconFill,
  IconMagnifyingGlass,
  IconMinus,
  IconPencil,
  IconPlus,
  IconRedo,
  IconUndo,
} from "./icons";
import { StateContainerHasRedo, StateContainerHasUndo } from "../model/state";
import { BrushPreview } from "./BrushPreview";

const penWidthMax = 50;
const scaleFactor = 2 ** (1 / 4);

export function ToolBar() {
  const store = useAppState();
  const { uiState } = store;
  const [showCp, setShowCp] = useState(false);
  const [showBrushPreview, setShowBrushPreview] = useState(false);

  const controlPenWidth = useControl({
    getValue: () => uiState.penSize,
    setValue: (v) =>
      store.update((draft) => {
        draft.uiState.penSize = Math.max(
          Math.min(Math.round(v), penWidthMax),
          1
        );
      }),
    sensitivity: 1 / 5,
  });
  const controlOpacity = useControl({
    getValue: () => uiState.opacity,
    setValue: (v) =>
      store.update((draft) => {
        draft.uiState.opacity = Math.max(Math.min(v, 1), 0);
      }),
    sensitivity: 0.01,
  });

  return (
    <div className="h-full p-2 flex flex-col gap-2 overflow-y-auto">
      <div>
        <div
          className="relative w-6 h-6 rounded-full shadow cursor-pointer"
          style={{ background: uiState.color }}
          onClick={() => setShowCp((showCp) => !showCp)}
        ></div>
        {showCp && (
          <div className="absolute p-2 bg-gray-50 dark:bg-gray-950 shadow z-10">
            <ColorPalette
              initialColor={uiState.color}
              onChanged={(color: string) => {
                store.update((draft) => {
                  draft.uiState.color = color;
                });
              }}
            />
          </div>
        )}
      </div>

      <div>
        <div
          className="w-6 h-6 flex justify-center items-center rounded border-2 bg-white dark:bg-black cursor-pointer"
          title="Pen width"
          {...controlPenWidth.props}
        >
          {uiState.penSize}
        </div>
        {controlPenWidth.show && (
          <div className="absolute p-2 bg-white dark:bg-black shadow z-10">
            <SliderV
              value={uiState.penSize / penWidthMax}
              onChange={(value) =>
                store.update((draft) => {
                  draft.uiState.penSize = Math.round(value * penWidthMax);
                })
              }
            />
          </div>
        )}
      </div>

      <div>
        <div
          className="w-6 h-6 flex justify-center items-center rounded border-2 bg-white dark:bg-black cursor-pointer"
          title="Opacity"
          {...controlOpacity.props}
        >
          {Math.round(uiState.opacity * 255)}
        </div>
        {controlOpacity.show && (
          <div className="absolute p-2 bg-white dark:bg-black shadow z-10">
            <SliderV
              value={uiState.opacity}
              onChange={(value) => {
                store.update((draft) => {
                  draft.uiState.opacity = value;
                });
              }}
            />
          </div>
        )}
      </div>

      <div>
        <div
          className="w-6 h-6 flex justify-center items-center rounded border-2 bg-white dark:bg-black cursor-pointer"
          onClick={() => {
            setShowBrushPreview((showBrushPreview) => !showBrushPreview);
          }}
          title="Brush type"
        >
          B
        </div>
        {showBrushPreview && (
          <div className="absolute h-[70%] p-2 bg-white dark:bg-black shadow z-10 overflow-y-auto">
            <BrushSelector
              brushType={uiState.brushType}
              onChange={(brushType) => {
                store.update((draft) => {
                  draft.uiState.brushType = brushType;
                });
              }}
            />
          </div>
        )}
      </div>

      <div
        className="cursor-pointer data-[selected=false]:opacity-50"
        data-selected={uiState.erase}
        onClick={() => {
          store.update((draft) => {
            draft.uiState.erase = !draft.uiState.erase;
          });
        }}
        title="Eraser"
      >
        <IconEraser />
      </div>

      <hr />

      <div
        className="cursor-pointer data-[selected=false]:opacity-50"
        data-selected={uiState.tool === "brush"}
        onClick={() => {
          store.update((draft) => {
            draft.uiState.tool = "brush";
          });
        }}
        title="Brush"
      >
        <IconPencil />
      </div>

      <div
        className="cursor-pointer data-[selected=false]:opacity-50"
        data-selected={uiState.tool === "fill"}
        onClick={() => {
          store.update((draft) => {
            draft.uiState.tool = "fill";
          });
        }}
        title="Fill"
      >
        <IconFill />
      </div>

      <hr />

      <div
        className="cursor-pointer data-[enabled=false]:opacity-50"
        data-enabled={StateContainerHasUndo(store.stateContainer)}
        onClick={() => {
          store.undo();
        }}
        title="Undo"
      >
        <IconUndo />
      </div>

      <div
        className="cursor-pointer data-[enabled=false]:opacity-50"
        data-enabled={StateContainerHasRedo(store.stateContainer)}
        onClick={() => {
          store.redo();
        }}
        title="Redo"
      >
        <IconRedo />
      </div>

      <hr />

      <div
        className="cursor-pointer data-[selected=false]:opacity-50"
        onClick={() =>
          store.update((draft) => {
            draft.uiState.canvasView.scale = roundFloat(
              draft.uiState.canvasView.scale * scaleFactor,
              4
            );
          })
        }
        title="Zoom"
      >
        <IconPlus />
      </div>

      <div
        className="cursor-pointer data-[selected=false]:opacity-50"
        onClick={() =>
          store.update((draft) => {
            draft.uiState.canvasView.scale = roundFloat(
              draft.uiState.canvasView.scale / scaleFactor,
              4
            );
          })
        }
        title="Unzoom"
      >
        <IconMinus />
      </div>

      <div
        className="cursor-pointer data-[selected=false]:opacity-50"
        onClick={() =>
          store.update((draft) => {
            draft.uiState.canvasView = {
              angle: 0,
              scale: 1,
              pan: [0, 0],
            };
          })
        }
        title="Reset view"
      >
        <IconMagnifyingGlass />
      </div>
    </div>
  );
}

function SliderV({
  value,
  onChange,
}: {
  value: number;
  onChange?: (value: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  usePointer<HTMLDivElement>({
    ref,
    onPointerDown(pos, _event, el) {
      const bbox = el.getBoundingClientRect();
      const h = (pos: [number, number]) => {
        const y = Math.max(Math.min(1 - pos[1] / bbox.height, 1), 0);
        onChange?.(y);
      };
      h(pos);
      return {
        onMove(pos) {
          h(pos);
        },
      };
    },
  });

  return (
    <div className="relative w-4 h-32 rounded border-2" ref={ref}>
      <div
        className="absolute w-3 h-[1px] bg-gray-400"
        style={{ top: `${(1 - value) * 100}%` }}
      />
    </div>
  );
}

const clickTime = 200;

function useControl({
  getValue,
  setValue,
  sensitivity = 1,
}: {
  getValue: () => number;
  setValue: (value: number) => void;
  sensitivity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  const [temporalShow, setTemporalShow] = useState(false);

  usePointer<HTMLDivElement>({
    ref,
    onPointerDown(pos) {
      setTemporalShow(true);
      const initValue = getValue();
      let moved = false;
      const startAt = Date.now();

      return {
        onMove(pos_) {
          const dy = pos_[1] - pos[1];
          const value = initValue - dy * sensitivity;
          setValue(value);
          moved = true;
        },
        onUp() {
          setTemporalShow(false);
          if (!moved || Date.now() - startAt <= clickTime) setShow((x) => !x);
        },
      };
    },
  });

  return {
    props: { ref },
    show: show || temporalShow,
    setShow,
  };
}

function roundFloat(x: number, n: number) {
  return Math.round(x * 10 ** n) / 10 ** n;
}

function BrushSelector({
  brushType,
  onChange,
}: {
  brushType: string;
  onChange: (brushType: string) => void;
}) {
  return (
    <div className="h-full flex flex-col gap-2">
      {["soft", "hard", "particle1", "particle2"].map((type) => (
        <button
          key={type}
          className="p-1 data-[selected=true]:bg-blue-400"
          onClick={() => onChange(type)}
          data-selected={brushType === type}
        >
          <BrushPreview brushType={type} />
        </button>
      ))}
    </div>
  );
}
