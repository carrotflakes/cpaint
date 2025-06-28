import { Op } from "@/model/op";
import { useMemo, useState } from "react";
import { ReactComponent as IconMinus } from "../assets/icons/minus.svg";
import { ReactComponent as IconPlus } from "../assets/icons/plus.svg";
import { ReactComponent as IconTimeClockwise } from "../assets/icons/time-clockwise.svg";
import { useAppState } from "../store/appState";

export function OpHistory() {
  const [visible, setVisible] = useState(false);
  const store = useAppState();

  const ops = useMemo(() => {
    return [
      ...store.stateContainer.backward,
      ...store.stateContainer.forward.toReversed(),
    ];
  }, [store.stateContainer.forward, store.stateContainer.backward]);

  return (
    <div className="max-h-full flex flex-col items-stretch bg-gray-50 dark:bg-gray-800 border-l border-b border-gray-300">
      <div
        className="p-2 flex gap-2 cursor-pointer"
        onClick={() => setVisible((v) => !v)}
      >
        <IconTimeClockwise width={24} height={24} />
        <span>History</span>
      </div>
      {visible && (
        <div
          className="grow shrink border-t border-gray-300 overflow-y-auto"
          data-scroll={true}
        >
          {ops.map((op, index) => (
            <Item key={index} op={op.op} />
          ))}
        </div>
      )}
    </div>
  );
}

function Item({ op }: { op: Op }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const opDetails = useMemo(() => formatOpDetails(op), [op]);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <div
        className="relative p-2 flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <div className="flex-shrink-0">
          {isExpanded ? (
            <IconMinus width={16} height={16} />
          ) : (
            <IconPlus width={16} height={16} />
          )}
        </div>
        <div className="flex-grow">
          {op.type === "patch" ? op.name : op.type}
        </div>
      </div>
      {isExpanded && (
        <div className="px-8 pb-2 text-sm text-gray-600 dark:text-gray-300">
          {opDetails.map((detail, detailIndex) => (
            <div key={detailIndex} className="py-0.5 whitespace-pre-wrap">
              {detail}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatOpDetails(op: Op) {
  const details = [];

  switch (op.type) {
    case "stroke":
      details.push(`Color: ${op.strokeStyle.color}`);
      details.push(`Brush: ${op.strokeStyle.brushType}`);
      details.push(`Size: ${op.strokeStyle.width}px`);
      details.push(`Opacity: ${(op.opacity * 100).toFixed(0)}%`);
      details.push(`Points: ${op.path.length}`);
      if (op.erase) details.push("Mode: Erase");
      if (op.alphaLock) details.push("Alpha Lock: On");
      break;
    case "fill":
      details.push(`Color: ${op.fillColor}`);
      details.push(`Opacity: ${(op.opacity * 100).toFixed(0)}%`);
      details.push(`Points: ${op.path.length}`);
      if (op.erase) details.push("Mode: Erase");
      break;
    case "bucketFill":
      details.push(`Color: ${op.fillColor}`);
      details.push(`Opacity: ${(op.opacity * 100).toFixed(0)}%`);
      details.push(`Tolerance: ${op.tolerance}`);
      details.push(`Position: (${op.pos[0]}, ${op.pos[1]})`);
      if (op.erase) details.push("Mode: Erase");
      break;
    case "layerTransform":
      details.push(`Layer: ${op.layerIndex}`);
      details.push(`Transform: ${JSON.stringify(op.rect, null, 2)}`);
      break;
    case "selectionFill":
      details.push(`Color: ${op.fillColor}`);
      details.push(`Opacity: ${(op.opacity * 100).toFixed(0)}%`);
      break;
    case "selectionDelete":
      details.push(`Layer: ${op.layerIndex}`);
      break;
    case "applyEffect":
      details.push(`Effect: ${op.effect.type}`);
      details.push(JSON.stringify({ ...op.effect, type: undefined }, null, 2));
      break;
    case "patch":
      details.push(`Patches: ${op.patches.length}`);
      break;
  }

  if ("layerIndex" in op) {
    details.push(`Layer: ${op.layerIndex}`);
  }

  return details;
}
