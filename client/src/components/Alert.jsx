/** Message box used for every error and success message in the app. */
export default function Alert({ type = "error", children, onClose }) {
  if (!children) return null;

  return (
    <div className={`alert alert-${type}`} role="alert">
      <span>{children}</span>
      {onClose && (
        <button type="button" className="alert-close" onClick={onClose} aria-label="Dismiss">
          &times;
        </button>
      )}
    </div>
  );
}

/** Field-level messages returned by Joi, shown under the matching input. */
export function FieldError({ errors, name }) {
  if (!errors?.[name]) return null;
  return <small className="field-error">{errors[name]}</small>;
}
