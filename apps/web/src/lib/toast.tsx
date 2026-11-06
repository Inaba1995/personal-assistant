import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  text: string;
}

export interface ToastApi {
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const KIND_STYLES: Record<ToastKind, string> = {
  success: 'border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  error: 'border-rose-500/40 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
  info: 'border-indigo-500/40 bg-indigo-50 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback((kind: ToastKind, text: string) => {
    idRef.current += 1;
    const id = idRef.current;
    setItems((prev) => [...prev, { id, kind, text }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (text) => push('success', text),
      error: (text) => push('error', text),
      info: (text) => push('info', text),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto rounded-lg border px-4 py-3 text-sm shadow-lg ${KIND_STYLES[item.kind]}`}
          >
            {item.text}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast должен вызываться внутри ToastProvider');
  return ctx;
}
