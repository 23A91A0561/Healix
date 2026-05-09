import "../styles/components/Button.css";

const Button = ({
  children,
  variant = "primary",
  className = "",
  type = "button",
  ...rest
}) => {
  return (
    <button
      type={type}
      className={`ui-btn ui-btn-${variant} ${className}`.trim()}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;
