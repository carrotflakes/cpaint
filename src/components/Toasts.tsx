import { create } from "zustand";
import { useEffect, useState } from "react";
import { ReactComponent as IconClose } from "../assets/icons/close.svg";

export function Toasts() {
  const store = useStore();

  return (
    <div className="absolute top-4 w-full flex flex-col items-center gap-2 pointer-events-none">
      {store.messages.map((message) => (
        <Toast message={message} key={message.id} />
      ))}
    </div>
  );
}

function Toast({ message }: { message: Message }) {
  const [isFading, setIsFading] = useState(false);

  // Fading effect for auto-hide messages
  useEffect(() => {
    if (message.autoHide) {
      const fadeTimer = setTimeout(() => {
        setIsFading(true);
      }, 2000);

      return () => clearTimeout(fadeTimer);
    }
  }, [message.autoHide]);

  return (
    <div
      className={`w-64 flex items-center shadow p-2 rounded bg-white pointer-events-auto fade-in-out transition-opacity duration-1000 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="grow select-text">{message.text}</div>
      <div
        className="shrink-0 w-5 text-black/50 hover:text-black/100 cursor-pointer"
        onClick={() => useStore.getState().removeMessage(message.id)}
      >
        <IconClose width={24} height={24} />
      </div>
    </div>
  );
}

type Message = {
  id: number;
  text: string;
  autoHide: boolean;
};

export type State = {
  id: number;
  messages: Message[];
  pushMessage: (message: string, autoHide?: boolean) => void;
  removeMessage: (id: number) => void;
};

export const useStore = create<State>()((set, get) => ({
  id: 1,
  messages: [],
  pushMessage(message, autoHide = false) {
    const id = get().id;
    set((state) => ({
      id: state.id + 1,
      messages: [...state.messages, { id, text: message, autoHide }],
    }));

    if (autoHide) {
      setTimeout(() => {
        get().removeMessage(id);
      }, 3000); // Auto-hide after 3 seconds
    }
  },
  removeMessage(id) {
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    }));
  },
}));

export function pushToast(message: string, autoHide?: boolean) {
  useStore.getState().pushMessage(message, autoHide);
}
