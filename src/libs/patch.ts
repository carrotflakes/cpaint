import { MCanvas } from "./MCanvas";
import { Selection } from "./Selection";

export type Obj = string | number | boolean | null | readonly Obj[] | { readonly [key: string]: Obj } | MCanvas | Selection;

export type Patch = {
  op: "add",
  path: readonly (string | number)[],
  value: Obj,
} | {
  op: "remove",
  path: readonly (string | number)[],
} | {
  op: "replace",
  path: readonly (string | number)[],
  value: Obj,
} | {
  op: "move",
  from: readonly (string | number)[],
  to: readonly (string | number)[],
}

export function applyPatch(
  obj: Obj,
  patch: Patch,
): Obj {
  switch (patch.op) {
    case "add": {
      if (patch.path.length === 0)
        throw new Error(`Invalid path: ${JSON.stringify(patch)}`);
      return applyAdd(obj, [...patch.path], patch.value);
    }
    case "remove": {
      if (patch.path.length === 0)
        throw new Error(`Invalid path: ${JSON.stringify(patch)}`);
      return applyRemove(obj, [...patch.path]);
    }
    case "replace": {
      if (patch.path.length === 0)
        throw new Error(`Invalid path: ${JSON.stringify(patch)}`);
      return applyReplace(obj, [...patch.path], patch.value);
    }
    case "move": {
      if (patch.from.length === 0)
        throw new Error(`Invalid path: ${JSON.stringify(patch)}`);
      if (patch.to.length === 0)
        throw new Error(`Invalid path: ${JSON.stringify(patch)}`);
      const value = getValue(obj, [...patch.from]);
      return applyAdd(applyRemove(obj, [...patch.from]), [...patch.to], value);
    }
  }
}

export function reversePatch(obj: Obj, patch: Patch): Patch {
  switch (patch.op) {
    case "add":
      return {
        op: "remove",
        path: patch.path,
      }
    case "remove":
      return {
        op: "add",
        path: patch.path,
        value: getValue(obj, [...patch.path]),
      };
    case "replace":
      return {
        op: "replace",
        path: patch.path,
        value: getValue(obj, [...patch.path]),
      };
    case "move": {
      return {
        op: "move",
        from: patch.to,
        to: patch.from,
      };
    }
  }
}

function applyAdd(obj: Obj, path: (string | number)[], value: Obj): Obj {
  const key = path.shift();
  if (key === undefined) {
    return value;
  }
  if (Array.isArray(obj)) {
    if (typeof key !== "number") {
      throw new Error(`Invalid key for array: ${key}`);
    }
    if (path.length === 0) {
      return [...obj.slice(0, key), applyAdd(obj[key], path, value), ...obj.slice(key)];
    } else {
      return [...obj.slice(0, key), applyAdd(obj[key], path, value), ...obj.slice(key + 1)];
    }
  } else if (isPlainObject(obj)) {
    return {
      ...obj,
      [key]: applyAdd(obj[key], path, value),
    };
  } else {
    throw new Error("Invalid patch");
  }
}

function applyRemove(obj: Obj, path: (string | number)[]): Obj {
  const key = path.shift()!;
  if (Array.isArray(obj)) {
    if (typeof key !== "number") {
      throw new Error(`Invalid key for array: ${key}`);
    }
    if (path.length === 0) {
      return [...obj.slice(0, key), ...obj.slice(key + 1)];
    } else {
      return [...obj.slice(0, key), applyRemove(obj[key], path), ...obj.slice(key + 1)];
    }
  } else if (isPlainObject(obj)) {
    if (path.length === 0) {
      const newObj = { ...obj };
      delete newObj[key];
      return newObj;
    } else {
      return {
        ...obj,
        [key]: applyRemove(obj[key], path),
      };
    }
  } else {
    throw new Error("Invalid patch");
  }
}

function applyReplace(obj: Obj, path: (string | number)[], value: Obj): Obj {
  const key = path.shift();
  if (key === undefined) {
    return value;
  }
  if (Array.isArray(obj)) {
    if (typeof key !== "number") {
      throw new Error(`Invalid key for array: ${key}`);
    }
    return [...obj.slice(0, key), applyReplace(obj[key], path, value), ...obj.slice(key + 1)];
  } else if (isPlainObject(obj)) {
    return {
      ...obj,
      [key]: applyReplace(obj[key], path, value),
    };
  } else {
    throw new Error("Invalid patch");
  }
}

function getValue(obj: Obj, path: (string | number)[]): Obj {
  const key = path.shift();
  if (key === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    if (typeof key !== "number") {
      throw new Error(`Invalid key for array: ${key}`);
    }
    return getValue(obj[key], path);
  } else if (isPlainObject(obj)) {
    return getValue(obj[key], path);
  } else {
    throw new Error("Invalid patch");
  }
}

function isPlainObject(obj: any): obj is { [key: string]: Obj } {
  return typeof obj === "object" && obj !== null && !(obj instanceof Array) && obj.constructor === Object;
}
