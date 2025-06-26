import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
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
import { StateContainerHasRedo, StateContainerHasUndo } from "../model/state";
import { AppState, useAppState } from "../store/appState";
import { BrushPreview } from "./BrushPreview";
import { ColorPalette } from "./ColorPalette";
import { SelectionControls } from "./SelectionControls";
import { BrushSelector } from "./toolbar/BrushSelector";
import { BucketFillTool } from "./toolbar/BucketFillTool";
import { EffectsMenu } from "./toolbar/EffectsMenu";
import { PenWidthControl } from "./toolbar/PenWidthControl";
import { SliderV } from "./toolbar/SliderV";
import { useControl } from "./toolbar/useControl";
import { ViewControls } from "./ViewControls";

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

function roundFloat(x: number, n: number) {
  return Math.round(x * 10 ** n) / 10 ** n;
}
