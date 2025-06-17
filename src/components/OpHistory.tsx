import { useMemo, useState } from "react";
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
            <div
              key={index}
              className="relative p-1 flex items-center gap-2"
            >
              {op.op.type}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
