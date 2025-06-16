export function isSafari() {
  return (
    /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent)
  );
}
