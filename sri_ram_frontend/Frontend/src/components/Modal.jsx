import "../styles/components/Modal.css";

const Modal = ({
  open,
  title,
  children,
  onClose,
  footer,
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="ui-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="ui-modal-card fade-in-up"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="ui-modal-head">
          <h3>{title}</h3>
          <button className="ui-modal-close" type="button" onClick={onClose}>
            X
          </button>
        </div>

        <div className="ui-modal-body">{children}</div>

        {footer ? <div className="ui-modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
};

export default Modal;
