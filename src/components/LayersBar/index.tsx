import { ReactComponent as IconLayers } from "@/assets/icons/layers.svg";
import { ReactComponent as IconMenu } from "@/assets/icons/menu.svg";
import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { Layers } from "./Layers";
import { LayersMenuPopover } from "./LayersMenuPopover";

export function LayersBar() {
  const [layersVisible, setLayersVisible] = useState(true);
  const [layersMenuOpen, setLayersMenuOpen] = useState(false);

  return (
    <div
      data-testid="layers-bar"
      className="max-h-full flex flex-col items-stretch bg-gray-50 dark:bg-gray-800 border-l border-b border-gray-300"
    >
      <div className="p-2 flex gap-2 items-center">
        <div
          className="flex gap-2 cursor-pointer grow"
          onClick={() => setLayersVisible((v) => !v)}
        >
          <IconLayers width={24} height={24} />
          <span>Layers</span>
        </div>
        {layersVisible && (
          <Popover.Root open={layersMenuOpen} onOpenChange={setLayersMenuOpen}>
            <Popover.Trigger asChild>
              <button
                className="w-8 h-8 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setLayersMenuOpen(true);
                }}
                tabIndex={-1}
              >
                <IconMenu width={24} height={24} />
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                className="min-w-20 bg-gray-50 border border-gray-300 shadow-sm z-50"
                sideOffset={5}
                align="end"
                collisionPadding={8}
                avoidCollisions={true}
                onInteractOutside={() => setLayersMenuOpen(false)}
              >
                <LayersMenuPopover
                  closePopover={() => setLayersMenuOpen(false)}
                />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        )}
      </div>
      {layersVisible && <Layers />}
    </div>
  );
}
