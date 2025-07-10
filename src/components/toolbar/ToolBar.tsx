import { ReactComponent as IconArrowsOutCardinal } from "@/assets/icons/arrows-out-cardinal.svg";
import { ReactComponent as IconBucket } from "@/assets/icons/bucket.svg";
import { ReactComponent as IconCheckerBoard } from "@/assets/icons/checkerboard.svg";
import { ReactComponent as IconDropper } from "@/assets/icons/dropper.svg";
import { ReactComponent as IconEraser } from "@/assets/icons/eraser.svg";
import { ReactComponent as IconFill } from "@/assets/icons/fill.svg";
import { ReactComponent as IconMagnifyingGlass } from "@/assets/icons/magnifying-glass.svg";
import { ReactComponent as IconMinus } from "@/assets/icons/minus.svg";
import { ReactComponent as IconPencil } from "@/assets/icons/pencil.svg";
import { ReactComponent as IconPlus } from "@/assets/icons/plus.svg";
import { ReactComponent as IconRedo } from "@/assets/icons/redo.svg";
import { ReactComponent as IconSelection } from "@/assets/icons/selection.svg";
import { ReactComponent as IconSparkle } from "@/assets/icons/sparkle.svg";
import { ReactComponent as IconUndo } from "@/assets/icons/undo.svg";
import { findLayerById } from "@/model/state";
import {
  StateContainerHasRedo,
  StateContainerHasUndo,
} from "@/model/stateContainer";
import { useAppState } from "@/store/appState";
import * as Popover from "@radix-ui/react-popover";
import { useCallback, useMemo, useState } from "react";
import { BrushPreview } from "./BrushPreview";
import { BrushSelector } from "./BrushSelector";
import { BucketFillTool } from "./BucketFillTool";
import { ColorPalette } from "./ColorPalette";
import { EffectsMenu } from "./EffectsMenu";
import { PenWidthControl } from "./PenWidthControl";
import { SelectionControls } from "./SelectionControls";
import { SliderV } from "./SliderV";
import { useControl } from "./useControl";
import { ViewControls } from "./ViewControls";

const scaleFactor = 2 ** (1 / 4);

export function ToolBar() {
  const stateContainer = useAppState((state) => state.stateContainer);
  const alphaLock = useAppState((state) => state.uiState.alphaLock);
  const opacity = useAppState((state) => state.uiState.opacity);
  const currentLayerId = useAppState((state) => state.uiState.currentLayerId);
  const brushType = useAppState((state) => state.uiState.brushType);
  const color = useAppState((state) => state.uiState.color);
  const erase = useAppState((state) => state.uiState.erase);
  const penSize = useAppState((state) => state.uiState.penSize);
  const tool = useAppState((state) => state.uiState.tool);

  const [showBrushPreview, setShowBrushPreview] = useState(false);
  const [showBucketFill, setShowBucketFill] = useState(false);
  const [showBrush, setShowBrush] = useState(false);
  const [showSelectionControls, setShowSelectionControls] = useState(false);
  const [showViewControls, setShowViewControls] = useState(false);
  const [showEffects, setShowEffects] = useState(false);

  const controlOpacity = useControl({
    getValue: () => opacity,
    setValue: (v) =>
      useAppState.getState().update((draft) => {
        draft.uiState.opacity = Math.max(Math.min(v, 1), 0);
      }),
    sensitivity: 0.01,
  });

  const currentLayer = useMemo(
    () => findLayerById(stateContainer.state.layers, currentLayerId),
    [stateContainer.state.layers, currentLayerId]
  );

  const hasUndo = useMemo(
    () => StateContainerHasUndo(stateContainer),
    [stateContainer]
  );

  const hasRedo = useMemo(
    () => StateContainerHasRedo(stateContainer),
    [stateContainer]
  );

  const colorStyle = useMemo(
    () => ({ background: color }),
    [color]
  );

  const brushPreviewProps = useMemo(
    () => ({
      color: color,
      width: penSize,
      opacity: opacity,
    }),
    [color, penSize, opacity]
  );

  const handleColorChange = useCallback((color: string) => {
    useAppState.getState().update((draft) => {
      draft.uiState.color = color;
    });
  }, []);

  const handleOpacityChange = useCallback((value: number) => {
    useAppState.getState().update((draft) => {
      draft.uiState.opacity = value;
    });
  }, []);

  const handleEraserToggle = useCallback(() => {
    useAppState.getState().update((draft) => {
      draft.uiState.erase = !draft.uiState.erase;
    });
  }, []);

  const handleAlphaLockToggle = useCallback(() => {
    useAppState.getState().update((draft) => {
      draft.uiState.alphaLock = !draft.uiState.alphaLock;
    });
  }, []);

  const handleBrushToolSelect = useCallback(() => {
    if (tool === "brush") setShowBrush((x) => !x);
    else setShowBrush(true);
    useAppState.getState().update((draft) => {
      draft.uiState.tool = "brush";
    });
  }, [tool]);

  const handleBrushTypeChange = useCallback((brushType: string) => {
    useAppState.getState().update((draft) => {
      draft.uiState.brushType = brushType;
    });
    setShowBrushPreview(false);
  }, []);

  const handleFillToolSelect = useCallback(() => {
    useAppState.getState().update((draft) => {
      draft.uiState.tool = "fill";
    });
  }, []);

  const handleBucketFillToolSelect = useCallback(() => {
    if (tool === "bucketFill") setShowBucketFill((x) => !x);
    else setShowBucketFill(true);
    useAppState.getState().update((draft) => {
      draft.uiState.tool = "bucketFill";
    });
  }, [tool]);

  const handleEyeDropperToolSelect = useCallback(() => {
    useAppState.getState().update((draft) => {
      draft.uiState.tool = "eyeDropper";
    });
  }, []);

  const handleSelectionToolSelect = useCallback(() => {
    if (tool === "selection") setShowSelectionControls((x) => !x);
    else setShowSelectionControls(true);
    useAppState.getState().update((draft) => {
      draft.uiState.tool = "selection";
    });
  }, [tool]);

  const handleLayerTransform = useCallback(() => {
    if (currentLayer?.type !== "layer" || currentLayer.canvas.getBbox() == null)
      return;
    intoLayerTransformMode();
  }, [currentLayer]);

  const handleUndo = useCallback(() => {
    useAppState.getState().undo();
  }, []);

  const handleRedo = useCallback(() => {
    useAppState.getState().redo();
  }, []);

  const handleZoomIn = useCallback(() => {
    useAppState.getState().update((draft) => {
      draft.uiState.canvasView.scale = roundFloat(
        draft.uiState.canvasView.scale * scaleFactor,
        4
      );
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    useAppState.getState().update((draft) => {
      draft.uiState.canvasView.scale = roundFloat(
        draft.uiState.canvasView.scale / scaleFactor,
        4
      );
    });
  }, []);

  const canTransformLayer = useMemo(
    () =>
      currentLayer?.type === "layer" && currentLayer.canvas.getBbox() != null,
    [currentLayer]
  );
  return (
    <div
      data-testid="toolbar"
      className="h-full p-2 flex flex-col gap-2 overflow-y-auto"
      data-scroll
    >
      <Popover.Root>
        <Popover.Trigger asChild>
          <div
            className="relative w-6 h-6 rounded-full shadow cursor-pointer"
            style={colorStyle}
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
              initialColor={color}
              onChanged={handleColorChange}
            />
            <BrushPreview
              brushType={brushType}
              overwriteProps={brushPreviewProps}
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
            {Math.round(opacity * 255)}
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
            <SliderV value={opacity} onChange={handleOpacityChange} />
            <BrushPreview
              brushType={brushType}
              overwriteProps={brushPreviewProps}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <div
        className="cursor-pointer data-[selected=true]:text-blue-400"
        data-selected={erase}
        onClick={handleEraserToggle}
        title="Eraser"
      >
        <IconEraser width={24} height={24} />
      </div>

      <div
        className="cursor-pointer data-[selected=true]:text-blue-400"
        data-selected={alphaLock}
        onClick={handleAlphaLockToggle}
        title="Alpha Lock"
      >
        <IconCheckerBoard width={24} height={24} />
      </div>

      <hr className="opacity-20" />

      <Popover.Root open={tool === "brush" && showBrush}>
        <Popover.Trigger asChild>
          <div
            className="cursor-pointer data-[selected=true]:text-blue-400"
            data-selected={tool === "brush"}
            onClick={handleBrushToolSelect}
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
                    brushType={brushType}
                    onChange={handleBrushTypeChange}
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
        data-selected={tool === "fill"}
        onClick={handleFillToolSelect}
        title="Fill"
      >
        <IconFill width={24} height={24} />
      </div>

      <Popover.Root open={tool === "bucketFill" && showBucketFill}>
        <Popover.Trigger asChild>
          <div
            className="cursor-pointer data-[selected=true]:text-blue-400"
            data-selected={tool === "bucketFill"}
            onClick={handleBucketFillToolSelect}
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
        data-selected={tool === "eyeDropper"}
        onClick={handleEyeDropperToolSelect}
        title="Eye Dropper"
      >
        <IconDropper width={24} height={24} />
      </div>

      <Popover.Root
        open={tool === "selection" && showSelectionControls}
        onOpenChange={setShowSelectionControls}
      >
        <Popover.Trigger asChild>
          <div
            className="cursor-pointer data-[selected=true]:text-blue-400"
            data-selected={tool === "selection"}
            onClick={handleSelectionToolSelect}
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
        data-selected={canTransformLayer}
        onClick={handleLayerTransform}
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
        data-enabled={hasUndo}
        onClick={handleUndo}
        title="Undo"
      >
        <IconUndo width={24} height={24} />
      </div>

      <div
        className="cursor-pointer data-[enabled=false]:opacity-50"
        data-enabled={hasRedo}
        onClick={handleRedo}
        title="Redo"
      >
        <IconRedo width={24} height={24} />
      </div>

      <hr className="opacity-20" />

      <div
        className="cursor-pointer data-[selected=false]:opacity-50"
        onClick={handleZoomIn}
        title="Zoom in"
      >
        <IconPlus width={24} height={24} />
      </div>

      <div
        className="cursor-pointer data-[selected=false]:opacity-50"
        onClick={handleZoomOut}
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

function intoLayerTransformMode() {
  // TODO: support multiple layers
  useAppState.getState().update((draft) => {
    const layer = draft.stateContainer.state.layers.find(
      (l) => l.id === draft.uiState.currentLayerId
    );
    const canvas = layer?.type === "layer" ? layer.canvas : undefined;
    if (!canvas) return;
    const bbox =
      draft.stateContainer.state.selection?.getBounds() ?? canvas.getBbox();
    if (!bbox) return;
    draft.mode = {
      type: "layerTransform",
      layerId: draft.uiState.currentLayerId,
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
