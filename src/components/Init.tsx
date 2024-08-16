import __wbg_init from "../../cpaint/pkg/cpaint";

let init = false;
export function Init() {
  useInit();
  return null;
}

export function useInit() {
  if (!init)
    throw (async () => {
      await __wbg_init();
      init = true;
    })();
}
