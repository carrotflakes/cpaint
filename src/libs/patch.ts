type Obj = any;

export type Patch = {
  op: "add",
  path: string,
  value: Obj,
} | {
  op: "remove",
  path: string,
} | {
  op: "replace",
  path: string,
  value: Obj,
} | {
  op: "move",
  from: string,
  to: string,
}

export function applyPatch(
  obj: Obj,
  patch: Patch,
): Obj {
  switch (patch.op) {
    case "add": {
      const pathParts = patch.path.split("/");
      if (pathParts.shift() !== "")
        throw new Error(`Invalid path: ${JSON.stringify(patch)}`);
      return applyAdd(obj, pathParts, patch.value);
    }
    case "remove": {
      const pathParts = patch.path.split("/");
      if (pathParts.shift() !== "" || pathParts.length === 0)
        throw new Error(`Invalid path: ${JSON.stringify(patch)}`);
      return applyRemove(obj, pathParts);
    }
    case "replace": {
      const pathParts = patch.path.split("/");
      if (pathParts.shift() !== "" || pathParts.length === 0)
        throw new Error(`Invalid path: ${JSON.stringify(patch)}`);
      return applyReplace(obj, pathParts, patch.value);
    }
    case "move": {
      const fromParts = patch.from.split("/");
      if (fromParts.shift() !== "" || fromParts.length === 0)
        throw new Error(`Invalid path: ${JSON.stringify(patch)}`);
      const toParts = patch.to.split("/");
      if (toParts.shift() !== "" || toParts.length === 0)
        throw new Error(`Invalid path: ${JSON.stringify(patch)}`);
      const value = getValue(obj, [...fromParts]);
      if (pathCmp(fromParts, toParts) === "<") {
        return applyRemove(applyAdd(obj, toParts, value), fromParts);
      } else {
        return applyAdd(applyRemove(obj, fromParts), toParts, value);
      }
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
        value: getValue(obj, patch.path.split("/").slice(1)),
      };
    case "replace":
      return {
        op: "replace",
        path: patch.path,
        value: getValue(obj, patch.path.split("/").slice(1)),
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

function applyAdd(obj: Obj, path: string[], value: Obj): Obj {
  const key = path.shift();
  if (key === undefined) {
    return value;
  }
  if (Array.isArray(obj)) {
    const index = parseInt(key, 10);
    if (path.length === 0) {
      return [...obj.slice(0, index), applyAdd(obj[index], path, value), ...obj.slice(index)];
    } else {
      return [...obj.slice(0, index), applyAdd(obj[index], path, value), ...obj.slice(index + 1)];
    }
  } else if (typeof obj === "object" && obj !== null) {
    return {
      ...obj,
      [key]: applyAdd(obj[key], path, value),
    };
  } else {
    throw new Error("Invalid patch");
  }
}

function applyRemove(obj: Obj, path: string[]): Obj {
  const key = path.shift()!;
  if (Array.isArray(obj)) {
    const index = parseInt(key, 10);
    if (path.length === 0) {
      return [...obj.slice(0, index), ...obj.slice(index + 1)];
    } else {
      return [...obj.slice(0, index), applyRemove(obj[index], path), ...obj.slice(index + 1)];
    }
  } else if (typeof obj === "object" && obj !== null) {
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

function applyReplace(obj: Obj, path: string[], value: Obj): Obj {
  const key = path.shift();
  if (key === undefined) {
    return value;
  }
  if (Array.isArray(obj)) {
    const index = parseInt(key, 10);
    return [...obj.slice(0, index), applyReplace(obj[index], path, value), ...obj.slice(index + 1)];
  } else if (typeof obj === "object" && obj !== null) {
    return {
      ...obj,
      [key]: applyReplace(obj[key], path, value),
    };
  } else {
    throw new Error("Invalid patch");
  }
}

function getValue(obj: Obj, path: string[]): Obj {
  const key = path.shift();
  if (key === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    const index = parseInt(key, 10);
    return getValue(obj[index], path);
  } else if (typeof obj === "object" && obj !== null) {
    return getValue(obj[key], path);
  } else {
    throw new Error("Invalid patch");
  }
}

function pathCmp(path1: string[], path2: string[]): ">" | "<" | null {
  for (let i = 0; i < Math.min(path1.length, path2.length); i++) {
    const left = parseInt(path1[i]);
    const right = parseInt(path2[i]);
    if (!isNaN(left) && !isNaN(right)) {
      if (left < right) return "<";
      if (left > right) return ">";
    }
    if (path1[i] != path2[i]) return null;
  }
  return null;
}
