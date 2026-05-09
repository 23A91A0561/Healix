import "../styles/components/InputField.css";

const InputField = ({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  rightContent,
  ...rest
}) => {
  return (
    <div className="ui-field">
      {label ? <label htmlFor={id}>{label}</label> : null}
      <div className="ui-field-control">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          {...rest}
        />
        {rightContent ? <div className="ui-field-right">{rightContent}</div> : null}
      </div>
    </div>
  );
};

export default InputField;
