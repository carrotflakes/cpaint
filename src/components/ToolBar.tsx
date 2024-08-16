import { useState } from "react";
import { useStore } from "../state";
import { ColorPalette } from "./ColorPalette";
import { useMouse } from "../hooks/useMouse";
import { IconPencil, IconEraser, IconFill } from "./icons";

export function ToolBar() {
  const store = useStore();
  const [showCp, setShowCp] = useState(false);

  const controlPenWidth = useControl({
    getValue: () => store.penSize,
    setValue: (v) => store.setPenSize(Math.max(Math.min(Math.round(v), 20), 1)),
    sensitivity: 1 / 5,
  });
  const controlOpacity = useControl({
    getValue: () => store.opacity,
    setValue: (v) => store.setOpacity(Math.max(Math.min(v, 1), 0)),
    sensitivity: 0.01,
  });

  return (
    <div className="p-2 flex flex-col gap-2">
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
          onClick={() => controlPenWidth.setShow((x) => !x)}
          title="Pen width"
          {...controlPenWidth.props}
        >
          {store.penSize}
        </div>
        {controlPenWidth.show && (
          <div className="absolute p-2 bg-white shadow z-10">
            <SliderV
              value={store.penSize / 20}
              onChange={(value) => store.setPenSize(Math.round(value * 20))}
            />
          </div>
        )}
      </div>

      <div>
        <div
          className="w-6 h-6 flex justify-center items-center rounded border-2 bg-white cursor-pointer"
          onClick={() => controlOpacity.setShow((x) => !x)}
          title="Opacity"
          {...controlOpacity.props}
        >
          {Math.round(store.opacity * 100)}
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
  const mouse = useMouse<HTMLDivElement>({
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
    <div className="relative w-4 h-32 rounded border-2" {...mouse.props}>
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
  const [show, setShow] = useState(false);
  const [temporalShow, setTemporalShow] = useState(false);
  const mouse = useMouse<HTMLDivElement>({
    onMouseDown(pos) {
      setTemporalShow(true);
      const initValue = getValue();
      return {
        onMouseMove(pos_) {
          const dy = pos_[1] - pos[1];
          const value = initValue - dy * sensitivity;
          setValue(value);
        },
        onMouseUp() {
          setTemporalShow(false);
        },
      };
    },
  });

  return {
    props: mouse.props,
    show: show || temporalShow,
    setShow,
  };
}
