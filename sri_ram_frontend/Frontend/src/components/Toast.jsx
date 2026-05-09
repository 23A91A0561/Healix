import "../styles/components/Toast.css";

const Toast = ({ toasts, removeToast }) => {
  return (
    <div className="toast-stack">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-item ${toast.type}`}>
          <div>
            <strong>{toast.title}</strong>
            <p>{toast.message}</p>
          </div>
          <button type="button" onClick={() => removeToast(toast.id)}>
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
};

export default Toast;
