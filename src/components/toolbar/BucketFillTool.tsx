import * as Popover from "@radix-ui/react-popover";
import { useAppState } from "../../store/appState";
import { SliderV } from "./SliderV";
import { useControl } from "./useControl";

export function BucketFillTool() {
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
