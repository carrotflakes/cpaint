import { useRef, useState } from "react";
import { useMouse } from "../hooks/useMouse";
import { useStore } from "../state";
import { ColorPalette } from "./ColorPalette";
import {
  IconEraser,
  IconFill,
  IconFrameCorners,
  IconMinus,
  IconPencil,
  IconPlus,
  IconRedo,
  IconUndo,
} from "./icons";
import { pushToast } from "./Toasts";

const penWidthMax = 50;
const scaleFactor = 2 ** (1 / 4);

export function ToolBar() {
  const store = useStore();
  const [showCp, setShowCp] = useState(false);

  const controlPenWidth = useControl({
    getValue: () => store.penSize,
    setValue: (v) =>
      store.setPenSize(Math.max(Math.min(Math.round(v), penWidthMax), 1)),
    sensitivity: 1 / 5,
  });
  const controlOpacity = useControl({
    getValue: () => store.opacity,
    setValue: (v) => store.setOpacity(Math.max(Math.min(v, 1), 0)),
    sensitivity: 0.01,
  });

  return (
    <div className="h-full p-2 flex flex-col gap-2 overflow-y-auto">
      <div>
        <div
          className="relative w-6 h-6 rounded-full shadow cursor-pointer"
          style={{ background: store.color }}
          onClick={() => setShowCp((showCp) => !showCp)}
        ></div>
        {showCp && (
          <div className="absolute p-2 bg-white shadow z-10">
            <ColorPalette
              initialColor={store.color}
              onChanged={(color) => store.setColor(color)}
            />
          </div>
        )}
      </div>

      <div>
        <div
          className="w-6 h-6 flex justify-center items-center rounded border-2 bg-white cursor-pointer"
          title="Pen width"
          {...controlPenWidth.props}
        >
          {store.penSize}
        </div>
        {controlPenWidth.show && (
          <div className="absolute p-2 bg-white shadow z-10">
            <SliderV
              value={store.penSize / penWidthMax}
              onChange={(value) =>
                store.setPenSize(Math.round(value * penWidthMax))
              }
            />
          </div>
        )}
      </div>

      <div>
        <div
          className="w-6 h-6 flex justify-center items-center rounded border-2 bg-white cursor-pointer"
          title="Opacity"
          {...controlOpacity.props}
        >
          {Math.round(store.opacity * 255)}
        </div>
        {controlOpacity.show && (
          <div className="absolute p-2 bg-white shadow z-10">
            <SliderV
              value={store.opacity}
              onChange={(value) => store.setOpacity(value)}
            />
          </div>
        )}
      </div>

      <div>
        <div
          className="w-6 h-6 flex justify-center items-center rounded border-2 bg-white cursor-pointer"
          onClick={() => store.setSoftPen(!store.softPen)}
          title="Soft/Hard pen"
        >
          {store.softPen ? "S" : "H"}
        </div>
      </div>

      <hr />

      <div
        className="cursor-pointer data-[selected=false]:opacity-50"
        data-selected={store.tool === "pen"}
        onClick={() => store.setTool("pen")}
        title="Pen"
      >
        <IconPencil />
      </div>

      <div
        className="cursor-pointer data-[selected=false]:opacity-50"
        data-selected={store.tool === "eraser"}
        onClick={() => store.setTool("eraser")}
        title="Eraser"
      >
        <IconEraser />
      </div>

      <div
        className="cursor-pointer data-[selected=false]:opacity-50"
        data-selected={store.tool === "fill"}
        onClick={() => store.setTool("fill")}
        title="Fill"
      >
        <IconFill />
      </div>

      <hr />

      <div
        className="cursor-pointer data-[enabled=false]:opacity-50"
        data-enabled={store.history.hasUndo}
        onClick={() => {
          store.undo();
        }}
        title="Undo"
      >
        <IconUndo />
      </div>

      <div
        className="cursor-pointer data-[enabled=false]:opacity-50"
        data-enabled={store.history.hasRedo}
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
          store.setCanvasScale(roundFloat(store.canvasScale * scaleFactor, 4))
        }
        title="Zoom"
      >
        <IconPlus />
      </div>

      <div
        className="cursor-pointer data-[selected=false]:opacity-50"
        onClick={() =>
          store.setCanvasScale(roundFloat(store.canvasScale / scaleFactor, 4))
        }
        title="Unzoom"
      >
        <IconMinus />
      </div>

      <div className="grow" />

      {document.body.requestFullscreen && (
        <div
          className="cursor-pointer"
          onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen();
            else
              document.body.requestFullscreen().catch((e) => pushToast("" + e));
          }}
          title="Fullscreen"
        >
          <IconFrameCorners />
        </div>
      )}
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
  useMouse<HTMLDivElement>({
    ref,
    onMouseDown(pos, _event, el) {
      const bbox = el.getBoundingClientRect();
      const h = (pos: [number, number]) => {
        const y = Math.max(Math.min(1 - pos[1] / bbox.height, 1), 0);
        onChange?.(y);
      };
      h(pos);
      return {
        onMouseMove(pos) {
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
  useMouse<HTMLDivElement>({
    ref,
    onMouseDown(pos) {
      setTemporalShow(true);
      const initValue = getValue();
      let moved = false;

      return {
        onMouseMove(pos_) {
          const dy = pos_[1] - pos[1];
          const value = initValue - dy * sensitivity;
          setValue(value);
          moved = true;
        },
        onMouseUp() {
          setTemporalShow(false);
          if (!moved) setShow((x) => !x);
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
