import { create } from "zustand";
import { IconClose } from "./icons";

export function Toasts() {
  const store = useStore();
  return (
    <div className="absolute top-4 w-full flex flex-col items-center gap-2 pointer-events-none">
      {store.messages.map((message) => (
        <div
          className="w-64 flex items-center shadow p-2 rounded-xl bg-white pointer-events-auto fade-in-out"
          key={message.id}
        >
          <div className="grow select-text">{message.text}</div>
          <div
            className="shrink-0 w-5 opacity-50 hover:opacity-100 cursor-pointer"
            onClick={() => store.removeMessage(message.id)}
          >
            <IconClose />
          </div>
        </div>
      ))}
    </div>
  );
}

export type State = {
  id: number;
  messages: { id: number; text: string }[];
  pushMessage: (message: string) => void;
  removeMessage: (id: number) => void;
};

export const useStore = create<State>()((set) => ({
  id: 1,
  messages: [],
  pushMessage(message) {
    set((state) => ({
      id: state.id + 1,
      messages: [...state.messages, { id: state.id, text: message }],
    }));
  },
  removeMessage(id) {
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    }));
  },
}));

export function pushToast(message: string) {
  useStore.getState().pushMessage(message);
}
