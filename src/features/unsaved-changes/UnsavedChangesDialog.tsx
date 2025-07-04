import { useUnsavedChangesDialog } from "./store";
import { ModalDialog } from "@/components/ModalDialog";

export function UnsavedChangesDialog() {
  const { isOpen, message, onConfirm, onCancel } = useUnsavedChangesDialog();

  if (!isOpen) return null;

  return (
    <ModalDialog>
      <div className="flex flex-col gap-4">
        <div className="text-lg font-bold">Unsaved Changes</div>
        <div className="text-gray-700 dark:text-gray-300">{message}</div>
        <div className="flex gap-2 justify-end flex-wrap">
          <button
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
            onClick={onConfirm}
          >
            Continue without saving
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
