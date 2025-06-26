import * as Popover from "@radix-ui/react-popover";
import { useRef, useState } from "react";
import { ReactComponent as IconArrowsOutCardinal } from "../assets/icons/arrows-out-cardinal.svg";
import { ReactComponent as IconBucket } from "../assets/icons/bucket.svg";
import { ReactComponent as IconCheckerBoard } from "../assets/icons/checkerboard.svg";
import { ReactComponent as IconDropper } from "../assets/icons/dropper.svg";
import { ReactComponent as IconEraser } from "../assets/icons/eraser.svg";
import { ReactComponent as IconFill } from "../assets/icons/fill.svg";
import { ReactComponent as IconMagnifyingGlass } from "../assets/icons/magnifying-glass.svg";
import { ReactComponent as IconMinus } from "../assets/icons/minus.svg";
import { ReactComponent as IconPencil } from "../assets/icons/pencil.svg";
import { ReactComponent as IconPlus } from "../assets/icons/plus.svg";
import { ReactComponent as IconRedo } from "../assets/icons/redo.svg";
import { ReactComponent as IconSelection } from "../assets/icons/selection.svg";
import { ReactComponent as IconSparkle } from "../assets/icons/sparkle.svg";
import { ReactComponent as IconUndo } from "../assets/icons/undo.svg";
import { usePointer } from "../hooks/usePointer";
import { StateContainerHasRedo, StateContainerHasUndo } from "../model/state";
import { appApplyEffect, AppState, useAppState } from "../store/appState";
import { BrushPreview } from "./BrushPreview";
import { ColorPalette } from "./ColorPalette";
import { ModalDialog } from "./ModalDialog";
import { SelectionControls } from "./SelectionControls";
import { ViewControls } from "./ViewControls";
import { SliderH } from "./slider";

const penWidthExp = 2;
const penWidthMax = 1000;
const scaleFactor = 2 ** (1 / 4);

export function ToolBar() {
  const store = useAppState();
  const { uiState } = store;
  const [showBrushPreview, setShowBrushPreview] = useState(false);
  const [showBucketFill, setShowBucketFill] = useState(false);
  const [showBrush, setShowBrush] = useState(false);
  const [showSelectionControls, setShowSelectionControls] = useState(false);
  const [showViewControls, setShowViewControls] = useState(false);
  const [showEffects, setShowEffects] = useState(false);

  const controlOpacity = useControl({
    getValue: () => uiState.opacity,
    setValue: (v) =>
      store.update((draft) => {
        draft.uiState.opacity = Math.max(Math.min(v, 1), 0);
      }),
    sensitivity: 0.01,
  });

  const currentLayer = store.stateContainer.state.layers[uiState.layerIndex];
  return (
    <div className="h-full p-2 flex flex-col gap-2 overflow-y-auto" data-scroll>
      <Popover.Root>
        <Popover.Trigger asChild>
          <div
            className="relative w-6 h-6 rounded-full shadow cursor-pointer"
            style={{ background: uiState.color }}
          ></div>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="p-2 bg-gray-50 dark:bg-gray-950 shadow z-10"
            side="right"
            sideOffset={5}
            collisionPadding={8}
          >
            <ColorPalette
              initialColor={uiState.color}
              onChanged={(color: string) => {
                store.update((draft) => {
                  draft.uiState.color = color;
                });
              }}
            />
            <BrushPreview
              brushType={uiState.brushType}
              overwriteProps={{
                color: uiState.color,
                width: uiState.penSize,
                opacity: uiState.opacity,
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <Popover.Root open={controlOpacity.show}>
        <Popover.Trigger asChild>
          <div
            className="w-6 h-6 flex justify-center items-center rounded border-2 border-gray-300 bg-white dark:bg-black cursor-pointer"
            title="Opacity"
            {...controlOpacity.props}
          >
            {Math.round(uiState.opacity * 255)}
          </div>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="p-2 flex bg-white dark:bg-black shadow z-10"
            side="right"
            sideOffset={5}
            collisionPadding={8}
            onOpenAutoFocus={(e) => e.preventDefault()} // Prevent focus steal for slider
          >
            <SliderV
              value={uiState.opacity}
              onChange={(value) => {
                store.update((draft) => {
                  draft.uiState.opacity = value;
                });
              }}
            />
            <BrushPreview
              brushType={uiState.brushType}
              overwriteProps={{
                color: uiState.color,
                width: uiState.penSize,
                opacity: uiState.opacity,
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <div
        className="cursor-pointer data-[selected=true]:text-blue-400"
        data-selected={uiState.erase}
        onClick={() => {
          store.update((draft) => {
            draft.uiState.erase = !draft.uiState.erase;
          });
        }}
        title="Eraser"
      >
        <IconEraser width={24} height={24} />
      </div>

      <div
        className="cursor-pointer data-[selected=true]:text-blue-400"
        data-selected={uiState.alphaLock}
        onClick={() => {
          store.update((draft) => {
            draft.uiState.alphaLock = !draft.uiState.alphaLock;
          });
        }}
        title="Alpha Lock"
      >
        <IconCheckerBoard width={24} height={24} />
      </div>

      <hr className="opacity-20" />

      <Popover.Root open={uiState.tool === "brush" && showBrush}>
        <Popover.Trigger asChild>
          <div
            className="cursor-pointer data-[selected=true]:text-blue-400"
            data-selected={uiState.tool === "brush"}
            onClick={() => {
              if (uiState.tool === "brush") setShowBrush((x) => !x);
              else setShowBrush(true);
              store.update((draft) => {
                draft.uiState.tool = "brush";
              });
            }}
            title="Brush"
          >
            <IconPencil width={24} height={24} />
          </div>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="p-2 flex flex-col gap-2 bg-gray-50 dark:bg-black shadow z-10"
            side="right"
            sideOffset={5}
            collisionPadding={8}
          >
            <Popover.Root
              open={showBrushPreview}
              onOpenChange={setShowBrushPreview}
            >
              <Popover.Trigger asChild>
                <div
                  className="w-6 h-6 flex justify-center items-center rounded border-2 border-gray-300 bg-white dark:bg-black cursor-pointer"
                  title="Brush type"
                >
                  B
                </div>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className="max-h-[calc(100dvh-16px)] p-2 bg-white dark:bg-black shadow z-10 overflow-y-auto"
                  data-scroll={true}
                  side="right"
                  align="start"
                  sideOffset={5}
                  collisionPadding={8}
                  forceMount
                >
                  <BrushSelector
                    brushType={uiState.brushType}
                    onChange={(brushType) => {
                      store.update((draft) => {
                        draft.uiState.brushType = brushType;
                      });
                      setShowBrushPreview(false); // Close popover on select
                    }}
                  />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>

            <PenWidthControl />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <div
        className="cursor-pointer data-[selected=true]:text-blue-400"
        data-selected={uiState.tool === "fill"}
        onClick={() => {
          store.update((draft) => {
            draft.uiState.tool = "fill";
          });
        }}
        title="Fill"
      >
        <IconFill width={24} height={24} />
      </div>

      <Popover.Root open={uiState.tool === "bucketFill" && showBucketFill}>
        <Popover.Trigger asChild>
          <div
            className="cursor-pointer data-[selected=true]:text-blue-400"
            data-selected={uiState.tool === "bucketFill"}
            onClick={() => {
              if (uiState.tool === "bucketFill") setShowBucketFill((x) => !x);
              else setShowBucketFill(true);
              store.update((draft) => {
                draft.uiState.tool = "bucketFill";
              });
            }}
            title="Bucket Fill"
          >
            <IconBucket width={24} height={24} />
          </div>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="p-2 flex bg-gray-50 dark:bg-black shadow z-10"
            side="right"
            sideOffset={5}
            collisionPadding={8}
          >
            <BucketFillTool />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <div
        className="cursor-pointer data-[selected=true]:text-blue-400"
        data-selected={uiState.tool === "eyeDropper"}
        onClick={() => {
          store.update((draft) => {
            draft.uiState.tool = "eyeDropper";
          });
        }}
        title="Eye Dropper"
      >
        <IconDropper width={24} height={24} />
      </div>

      <Popover.Root
        open={uiState.tool === "selection" && showSelectionControls}
        onOpenChange={setShowSelectionControls}
      >
        <Popover.Trigger asChild>
          <div
            className="cursor-pointer data-[selected=true]:text-blue-400"
            data-selected={uiState.tool === "selection"}
            onClick={() => {
              if (uiState.tool === "selection")
                setShowSelectionControls((x) => !x);
              else setShowSelectionControls(true);
              store.update((draft) => {
                draft.uiState.tool = "selection";
              });
            }}
            title="Selection"
          >
            <IconSelection width={24} height={24} />
          </div>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="max-h-[calc(100dvh-16px)] p-2 bg-gray-50 dark:bg-black shadow z-10 overflow-y-auto"
            data-scroll={true}
            side="right"
            align="start"
            sideOffset={5}
            collisionPadding={8}
            forceMount
          >
            <SelectionControls />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <hr className="opacity-20" />

      <div
        className="cursor-pointer data-[selected=false]:opacity-50"
        data-selected={currentLayer?.canvas.getBbox() != null}
        onClick={() => {
          if (currentLayer?.canvas.getBbox() == null) return;
          intoLayerTransformMode(store);
        }}
        title="Layer Transform"
      >
        <IconArrowsOutCardinal width={24} height={24} />
      </div>

      <Popover.Root open={showEffects} onOpenChange={setShowEffects}>
        <Popover.Trigger asChild>
          <div
            className="cursor-pointer data-[selected=true]:text-blue-400"
            data-selected={showEffects}
            onClick={() => setShowEffects((x) => !x)}
            title="Effects"
          >
            <IconSparkle width={24} height={24} />
          </div>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="max-h-[calc(100dvh-16px)] p-2 bg-gray-50 dark:bg-black shadow z-10 overflow-y-auto"
            data-scroll={true}
            side="right"
            align="start"
            sideOffset={5}
            collisionPadding={8}
            forceMount
          >
            <EffectsMenu onEffectSelect={() => setShowEffects(false)} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <hr className="opacity-20" />

      <div
        className="cursor-pointer data-[enabled=false]:opacity-50"
        data-enabled={StateContainerHasUndo(store.stateContainer)}
        onClick={() => {
          store.undo();
        }}
        title="Undo"
      >
        <IconUndo width={24} height={24} />
      </div>

      <div
        className="cursor-pointer data-[enabled=false]:opacity-50"
        data-enabled={StateContainerHasRedo(store.stateContainer)}
        onClick={() => {
          store.redo();
        }}
        title="Redo"
      >
        <IconRedo width={24} height={24} />
      </div>

      <hr className="opacity-20" />

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
        title="Zoom in"
      >
        <IconPlus width={24} height={24} />
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
        title="Zoom out"
      >
        <IconMinus width={24} height={24} />
      </div>

      <Popover.Root open={showViewControls} onOpenChange={setShowViewControls}>
        <Popover.Trigger asChild>
          <div
            className="cursor-pointer data-[selected=true]:text-blue-400"
            data-selected={showViewControls}
            onClick={() => setShowViewControls((x) => !x)}
            title="View Controls"
          >
            <IconMagnifyingGlass width={24} height={24} />
          </div>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="max-h-[calc(100dvh-16px)] p-2 bg-gray-50 dark:bg-black shadow z-10 overflow-y-auto"
            data-scroll={true}
            side="right"
            align="start"
            sideOffset={5}
            collisionPadding={8}
            forceMount
          >
            <ViewControls />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

function intoLayerTransformMode(store: AppState) {
  store.update((draft) => {
    const canvas =
      draft.stateContainer.state.layers[draft.uiState.layerIndex].canvas;
    const bbox =
      draft.stateContainer.state.selection?.getBounds() ?? canvas.getBbox();
    if (!bbox) return;
    draft.mode = {
      type: "layerTransform",
      layerIndex: draft.uiState.layerIndex,
      rect: {
        cx: bbox.width / 2 + bbox.x,
        cy: bbox.height / 2 + bbox.y,
        hw: bbox.width / 2,
        hh: bbox.height / 2,
        angle: 0,
      },
    };
  });
}

function PenWidthControl() {
  const store = useAppState();
  const { uiState } = store;

  const controlPenWidth = useControl({
    getValue: () => (uiState.penSize / penWidthMax) ** (1 / penWidthExp),
    setValue: (v) =>
      store.update((draft) => {
        draft.uiState.penSize = Math.max(
          Math.min(
            Math.round(Math.max(0, v) ** penWidthExp * penWidthMax),
            penWidthMax
          ),
          1
        );
      }),
    sensitivity: 1 / 100,
  });

  return (
    <Popover.Root open={controlPenWidth.show}>
      <Popover.Trigger asChild>
        <div
          className="w-6 h-6 flex justify-center items-center rounded border-2 border-gray-300 bg-white dark:bg-black cursor-pointer"
          title="Pen width"
          {...controlPenWidth.props}
        >
          {uiState.penSize}
        </div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="p-2 flex bg-white dark:bg-black shadow z-10"
          side="right"
          sideOffset={5}
          collisionPadding={8}
          onOpenAutoFocus={(e) => e.preventDefault()} // Prevent focus steal for slider
        >
          <SliderV
            value={(uiState.penSize / penWidthMax) ** (1 / penWidthExp)}
            onChange={(value) =>
              store.update((draft) => {
                draft.uiState.penSize = Math.round(
                  value ** penWidthExp * penWidthMax
                );
              })
            }
          />
          <BrushPreview
            brushType={uiState.brushType}
            overwriteProps={{
              color: uiState.color,
              width: uiState.penSize,
              opacity: uiState.opacity,
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function BucketFillTool() {
  const store = useAppState();
  const { uiState } = store;

  const controlBFTolerance = useControl({
    getValue: () => uiState.bucketFillTolerance,
    setValue: (v) =>
      store.update((draft) => {
        draft.uiState.bucketFillTolerance = Math.max(Math.min(v, 1), 0);
      }),
    sensitivity: 0.01,
  });
  return (
    <Popover.Root
      open={controlBFTolerance.show}
      onOpenChange={controlBFTolerance.setShow}
    >
      <Popover.Trigger asChild>
        <div
          className="w-6 h-6 flex justify-center items-center rounded border-2 border-gray-300 bg-white dark:bg-black cursor-pointer"
          title="Tolerance"
          {...controlBFTolerance.props}
        >
          {Math.round(uiState.bucketFillTolerance * 255)}
        </div>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="p-2 flex bg-white dark:bg-black shadow z-10"
          sideOffset={5}
          collisionPadding={8}
          onOpenAutoFocus={(e) => e.preventDefault()} // Prevent focus steal for slider
        >
          <SliderV
            value={uiState.bucketFillTolerance}
            onChange={(value) => {
              store.update((draft) => {
                draft.uiState.bucketFillTolerance = value;
              });
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
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
    <div
      className="relative w-4 h-32 rounded border-2 border-gray-300"
      ref={ref}
    >
      <div
        className="absolute w-3 h-px bg-gray-400"
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

  usePointer<HTMLDivElement>({
    ref,
    onPointerDown(pos) {
      setTemporalShow(true);
      const initValue = getValue();
      let moved = false;

      return {
        onMove(pos_) {
          const dy = pos_[1] - pos[1];
          const value = initValue - dy * sensitivity;
          setValue(value);
          moved = true;
        },
        onUp() {
          setTemporalShow(false);
          // Toggle visibility if not moved
          if (!moved) setShow((prev) => !prev);
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
    <div className="flex flex-col gap-2">
      {[
        "soft",
        "hard",
        "particle1",
        "particle2",
        "particle3",
        "particle3.1",
        "pixel",
        "cat",
      ].map((type) => (
        <button
          key={type}
          className="p-1 data-[selected=true]:bg-blue-400 cursor-pointer"
          onClick={() => onChange(type)}
          data-selected={brushType === type}
        >
          <BrushPreview brushType={type} />
        </button>
      ))}
    </div>
  );
}

function EffectsMenu({ onEffectSelect }: { onEffectSelect: () => void }) {
  const simpleEffects = [
    { type: "blur", label: "Blur" },
    { type: "boxBlur", label: "Box blur" },
    { type: "pixelate", label: "Pixelate" },
  ] as const;

  const [value, setValue] = useState(5);
  const [showBrightnessContrast, setShowBrightnessContrast] = useState(false);
  const [showHueSaturation, setShowHueSaturation] = useState(false);
  const [showColorBalance, setShowColorBalance] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <SliderH
        className="w-32 h-5"
        value={value / 20}
        onChange={(newValue) => {
          setValue(Math.max(1, Math.round(newValue * 20)));
        }}
      />
      {simpleEffects.map((effect) => (
        <button
          key={effect.type}
          className="p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded"
          onClick={async () => {
            if (effect.type === "blur") {
              await appApplyEffect({ type: "blur", radius: value });
            } else if (effect.type === "boxBlur") {
              await appApplyEffect({
                type: "boxBlur",
                radius: value,
              });
            } else if (effect.type === "pixelate") {
              await appApplyEffect({
                type: "pixelate",
                pixelSize: value,
              });
            }
            onEffectSelect();
          }}
        >
          {effect.label}
        </button>
      ))}

      <hr className="border-gray-300 dark:border-gray-600" />

      <button
        className="p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded"
        onClick={() => setShowBrightnessContrast(true)}
      >
        Brightness/Contrast
      </button>

      <button
        className="p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded"
        onClick={() => setShowHueSaturation(true)}
      >
        Hue/Saturation
      </button>

      <button
        className="p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded"
        onClick={() => setShowColorBalance(true)}
      >
        Color Balance
      </button>

      {showBrightnessContrast && (
        <BrightnessContrastDialog
          onApply={async (brightness, contrast) => {
            await appApplyEffect({
              type: "brightnessContrast",
              brightness,
              contrast,
            });
            onEffectSelect();
          }}
          onClose={() => setShowBrightnessContrast(false)}
        />
      )}

      {showHueSaturation && (
        <HueSaturationDialog
          onApply={async (hue, saturation, lightness) => {
            await appApplyEffect({
              type: "hueSaturation",
              hue,
              saturation,
              lightness,
            });
            onEffectSelect();
          }}
          onClose={() => setShowHueSaturation(false)}
        />
      )}

      {showColorBalance && (
        <ColorBalanceDialog
          onApply={async (cyan, magenta, yellow) => {
            await appApplyEffect({ type: "colorBalance", cyan, magenta, yellow });
            onEffectSelect();
          }}
          onClose={() => setShowColorBalance(false)}
        />
      )}
    </div>
  );
}

function BrightnessContrastDialog({
  onApply,
  onClose,
}: {
  onApply: (brightness: number, contrast: number) => void;
  onClose: () => void;
}) {
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);

  return (
    <ModalDialog onClickOutside={onClose}>
      <h3 className="text-lg font-semibold mb-4">Brightness/Contrast</h3>

      <div className="flex flex-col gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Brightness: {brightness}
          </label>
          <SliderH
            className="w-48 h-5"
            value={(brightness + 100) / 200}
            onChange={(value) => setBrightness(Math.round(value * 200 - 100))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Contrast: {contrast}
          </label>
          <SliderH
            className="w-48 h-5"
            value={(contrast + 100) / 200}
            onChange={(value) => setContrast(Math.round(value * 200 - 100))}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => {
            onApply(brightness, contrast);
            onClose();
          }}
        >
          Apply
        </button>
      </div>
    </ModalDialog>
  );
}

function HueSaturationDialog({
  onApply,
  onClose,
}: {
  onApply: (hue: number, saturation: number, lightness: number) => void;
  onClose: () => void;
}) {
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [lightness, setLightness] = useState(0);

  return (
    <ModalDialog onClickOutside={onClose}>
      <h3 className="text-lg font-semibold mb-4">Hue/Saturation</h3>

      <div className="flex flex-col gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2">Hue: {hue}°</label>
          <SliderH
            className="w-48 h-5"
            value={(hue + 180) / 360}
            onChange={(value) => setHue(Math.round(value * 360 - 180))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Saturation: {saturation}
          </label>
          <SliderH
            className="w-48 h-5"
            value={(saturation + 100) / 200}
            onChange={(value) => setSaturation(Math.round(value * 200 - 100))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Lightness: {lightness}
          </label>
          <SliderH
            className="w-48 h-5"
            value={(lightness + 100) / 200}
            onChange={(value) => setLightness(Math.round(value * 200 - 100))}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => {
            onApply(hue, saturation, lightness);
            onClose();
          }}
        >
          Apply
        </button>
      </div>
    </ModalDialog>
  );
}

function ColorBalanceDialog({
  onApply,
  onClose,
}: {
  onApply: (cyan: number, magenta: number, yellow: number) => void;
  onClose: () => void;
}) {
  const [cyan, setCyan] = useState(0);
  const [magenta, setMagenta] = useState(0);
  const [yellow, setYellow] = useState(0);

  return (
    <ModalDialog onClickOutside={onClose}>
      <h3 className="text-lg font-semibold mb-4">Color Balance</h3>

      <div className="flex flex-col gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Cyan ↔ Red: {cyan}
          </label>
          <SliderH
            className="w-48 h-5"
            value={(cyan + 100) / 200}
            onChange={(value) => setCyan(Math.round(value * 200 - 100))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Magenta ↔ Green: {magenta}
          </label>
          <SliderH
            className="w-48 h-5"
            value={(magenta + 100) / 200}
            onChange={(value) => setMagenta(Math.round(value * 200 - 100))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Yellow ↔ Blue: {yellow}
          </label>
          <SliderH
            className="w-48 h-5"
            value={(yellow + 100) / 200}
            onChange={(value) => setYellow(Math.round(value * 200 - 100))}
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={() => {
            onApply(cyan, magenta, yellow);
            onClose();
          }}
        >
          Apply
        </button>
      </div>
    </ModalDialog>
  );
}
