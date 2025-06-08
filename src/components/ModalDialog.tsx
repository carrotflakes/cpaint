import { useEffect, useRef } from "react";

export function ModalDialog({
  children,
  onClickOutside,
}: {
  children: React.ReactNode;
  onClickOutside?: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  const onClick = (e: React.MouseEvent<HTMLDialogElement, MouseEvent>) => {
    // Ignore events triggered by click()
    if (!e.isTrusted) return;

    const rect = ref.current!.getBoundingClientRect();
    const clickedInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;
    if (!clickedInDialog) onClickOutside?.();
  };

  return (
    <dialog
      className="min-w-40 min-h-10 rounded-lg bg-gray-50 dark:bg-gray-950 p-4 fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-auto"
      onClick={onClick}
      ref={ref}
      data-scroll
    >
      {children}
    </dialog>
  );
}
