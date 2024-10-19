import { useEffect, useMemo, useRef, useState } from "react";
import * as color from "color-convert";
import { usePointer } from "../hooks/useMouse";

type Color = string;

const colors = [
  "#000",
  "#787878",
  "#fff",
  "#f00",
  "#ff0",
  "#0f0",
  "#0ff",
  "#00f",
  "#f0f",
];

export function ColorPalette({
  initialColor = "#000",
  onChanged,
}: {
  initialColor?: Color;
  onChanged?: (color: Color) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <ColorPicker initialColor={initialColor} onChanged={onChanged} />
      <div>
        <div className="flex flex-wrap gap-1">
          {colors.map((color) => (
            <div
              key={color}
              className="w-6 h-6 rounded-sm shadow cursor-pointer"
              style={{ background: color }}
              onClick={() => onChanged?.(color)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function ColorPicker({
  initialColor = "#000",
  onChanged,
}: {
  initialColor?: Color;
  onChanged?: (color: Color) => void;
}) {
  const circleRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<HTMLDivElement>(null);
  const [hsl, setHsl] = useState({
    hue: 0,
    saturation: 1,
    lightness: 1,
  });
  const hsv = useMemo(
    () =>
      color.hsl.hsv.raw([
        hsl.hue * 360,
        hsl.saturation * 100,
        hsl.lightness * 100,
      ]),
    [hsl]
  );
  const code =
    "#" +
    color.hsl.hex([hsl.hue * 360, hsl.saturation * 100, hsl.lightness * 100]);

  useEffect(() => {
    const hsl = color.hex.hsl(initialColor.slice(1));
    setHsl({
      hue: hsl[0] / 360,
      saturation: hsl[1] / 100,
      lightness: hsl[2] / 100,
    });
  }, [initialColor]);

  const changed = useRef(() => {});
  changed.current = () => onChanged?.(code);

  usePointer<HTMLDivElement>({
    ref: circleRef,
    onPointerDown: (pos, e, el) => {
      if (el !== e.target) return null;
      const bbox = el.getBoundingClientRect();
      const h = (pos: [number, number]) => {
        const x = pos[0] - bbox.width / 2;
        const y = pos[1] - bbox.height / 2;
        const angle = Math.atan2(y, x);
        setHsl((hsl) => ({ ...hsl, hue: angle / (2 * Math.PI) + 0.25 }));
      };
      h(pos);
      return {
        onMove(pos) {
          h(pos);
        },
        onUp() {
          changed.current();
        },
      };
    },
  });

  usePointer<HTMLDivElement>({
    ref: rectRef,
    onPointerDown: (pos, e, el) => {
      if (el !== e.target) return null;
      const bbox = el.getBoundingClientRect();
      const h = (pos: [number, number]) => {
        const x = Math.max(Math.min(pos[0] / bbox.width, 1), 0);
        const y = Math.max(Math.min(pos[1] / bbox.height, 1), 0);
        setHsl((hsl) => {
          const hsl_ = color.hsv.hsl.raw([
            hsl.hue * 360,
            x * 100,
            100 - y * 100,
          ]);
          return {
            hue: hsl.hue,
            saturation: hsl_[1] / 100,
            lightness: hsl_[2] / 100,
          };
        });
      };
      h(pos);
      return {
        onMove(pos) {
          h(pos);
        },
        onUp() {
          changed.current();
        },
      };
    },
  });

  return (
    <div>
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-sm shadow"
          style={{
            background: `hsl(${hsl.hue * 360}, ${hsl.saturation * 100}%, ${
              hsl.lightness * 100
            }%)`,
          }}
        ></div>
        <p className="select-text">{code}</p>
      </div>
      <div className="flex w-52 h-52 relative">
        <div
          className="w-full h-full rounded-full cursor-pointer"
          style={{
            background:
              "conic-gradient(#f00, #ff0 16.6%, #0f0 33.3%, #0ff 50%, #00f 66.6%, #f0f 83.3%, #f00)",
          }}
          ref={circleRef}
        ></div>
        <div
          className="w-4 h-4 rounded-full bg-white border-2 border-black absolute cursor-default"
          style={{
            top: `${-Math.cos(hsl.hue * 2 * Math.PI) * 45 + 50}%`,
            left: `${Math.sin(hsl.hue * 2 * Math.PI) * 45 + 50}%`,
            transform: "translate(-50%, -50%)",
          }}
        />
        <div className="w-[80%] h-[80%] absolute top-[10%] left-[10%] rounded-full bg-white"></div>
        <div
          className="w-[50%] h-[50%] absolute top-[25%] left-[25%] cursor-pointer"
          style={{
            background: `linear-gradient(to bottom, #ffff, #000f), linear-gradient(to right, #ffff, hsl(${
              hsl.hue * 360
            }, 100%, 50%))`,
            backgroundBlendMode: "multiply, normal",
          }}
          ref={rectRef}
        >
          <div
            className="w-4 h-4 rounded-full bg-white border-2 border-black absolute"
            style={{
              top: `${100 - hsv[2]}%`,
              left: `${hsv[1]}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
