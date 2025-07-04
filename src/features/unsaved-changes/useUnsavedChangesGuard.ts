import { useCallback } from "react";
import { useAppState } from "@/store/appState";
import { useUnsavedChangesDialog } from "./store";

/**
 * Hook to safely execute actions that might discard unsaved changes
 */
export function useUnsavedChangesGuard() {
  const { openDialog } = useUnsavedChangesDialog();

  const executeWithGuard = useCallback(
    (action: () => void, message?: string) => {
      const hasUnsavedChanges = useAppState.getState().hasUnsavedChanges();

      if (hasUnsavedChanges) {
        openDialog(
          message ??
          "You have unsaved changes. Are you sure you want to continue? Your changes will be lost.",
          action
        );
      } else {
        action();
      }
    },
    [openDialog]
  );

  return { executeWithGuard };
}
