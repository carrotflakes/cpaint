import { create } from 'zustand';

type UnsavedChangesDialogState = {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  openDialog: (message: string, onConfirm: () => void, onCancel?: () => void) => void;
};

export const useUnsavedChangesDialog = create<UnsavedChangesDialogState>()((set) => ({
  isOpen: false,
  message: '',
  onConfirm: () => { },
  onCancel: () => { },

  openDialog: (message: string, onConfirm: () => void, onCancel = () => { }) => {
    set({
      isOpen: true,
      message,
      onConfirm: () => {
        onConfirm();
        set({ isOpen: false });
      },
      onCancel: () => {
        onCancel();
        set({ isOpen: false });
      },
    });
  },
}));
