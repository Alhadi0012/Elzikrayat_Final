/** Step 1 of the reset: ask for the address and send a code. */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import Alert, { FieldError } from "../components/Alert";
import { forgotPassword, clearMessages, setPendingEmail } from "../features/auth/authSlice";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error, message, fieldErrors } = useSelector(state => state.auth);

  useEffect(() => () => { dispatch(clearMessages()); }, [dispatch]);

  const submit = async event => {
    event.preventDefault();
    const result = await dispatch(forgotPassword(email));
    if (forgotPassword.fulfilled.match(result)) {
      dispatch(setPendingEmail(email));
      setSent(true);
    }
  };

  return (
    <div className="card form-card">
      <h2>Forgot your password?</h2>
      <p className="muted">Enter your email and we will send you a reset code.</p>

      <Alert type="error" onClose={() => dispatch(clearMessages())}>{error}</Alert>
      <Alert type="success">{message}</Alert>

      {sent ? (
        <button type="button" className="btn btn-primary block"
                onClick={() => navigate("/reset-password")}>
          I have the code
        </button>
      ) : (
        <form onSubmit={submit} noValidate>
          <label>
            Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            <FieldError errors={fieldErrors} name="email" />
          </label>
          <button type="submit" className="btn btn-primary block" disabled={loading}>
            {loading ? "Sending..." : "Send reset code"}
          </button>
        </form>
      )}

      <p className="form-links"><Link to="/login">Back to login</Link></p>
    </div>
  );
}
