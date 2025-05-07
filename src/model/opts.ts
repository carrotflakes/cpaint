import type { Op } from "./op";

export type OpTs = Op & {
  timestamp: number;
}

export function OpTsNew(
  op: Op,
): OpTs {
  return {
    ...op,
    timestamp: Date.now(),
  };
}
