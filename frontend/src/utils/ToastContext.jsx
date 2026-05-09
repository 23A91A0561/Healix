import { createContext, useCallback, useContext, useMemo, useState } from "react";
import Toast from "../components/Toast";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback((payload) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    setToasts((prev) => [...prev, { id, ...payload }]);

    setTimeout(() => {
      removeToast(id);
    }, 3800);
  }, [removeToast]);

  const api = useMemo(() => ({
    success: (message, title = "Success") => pushToast({ message, title, type: "success" }),
    error: (message, title = "Error") => pushToast({ message, title, type: "error" }),
    info: (message, title = "Info") => pushToast({ message, title, type: "info" }),
  }), [pushToast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toast toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
};
