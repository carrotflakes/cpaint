import * as Popover from "@radix-ui/react-popover";
import { useAppState } from "@/store/appState";
import { BrushPreview } from "./BrushPreview";
import { SliderV } from "./SliderV";
import { useControl } from "./useControl";

const penWidthExp = 2;
const penWidthMax = 1000;

export function PenWidthControl() {
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
