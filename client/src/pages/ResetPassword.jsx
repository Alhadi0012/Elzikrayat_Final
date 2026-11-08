/** Step 2 of the reset: the code plus the new password. */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import Alert, { FieldError } from "../components/Alert";
import { resetPassword, clearMessages } from "../features/auth/authSlice";

export default function ResetPassword() {
  const { user, loading, error, fieldErrors, pendingEmail, lockedUntil } =
    useSelector(state => state.auth);

  const [form, setForm] = useState({
    email: pendingEmail || "", otp: "", newPassword: ""
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => () => { dispatch(clearMessages()); }, [dispatch]);

  useEffect(() => {
    if (user) navigate("/gallery", { replace: true });
  }, [user, navigate]);

  const locked = lockedUntil && new Date(lockedUntil) > new Date();

  const change = event => setForm({ ...form, [event.target.name]: event.target.value });

  const submit = event => {
    event.preventDefault();
    dispatch(resetPassword(form));
  };

  return (
    <div className="card form-card">
      <h2>Set a new password</h2>

      <Alert type="error" onClose={() => dispatch(clearMessages())}>{error}</Alert>

      <form onSubmit={submit} noValidate>
        <label>
          Email
          <input type="email" name="email" value={form.email} onChange={change} required />
          <FieldError errors={fieldErrors} name="email" />
        </label>

        <label>
          Reset code
          <input
            className="otp-input"
            name="otp"
            value={form.otp}
            onChange={event =>
              setForm({ ...form, otp: event.target.value.replace(/\D/g, "").slice(0, 6) })}
            inputMode="numeric"
            placeholder="000000"
            maxLength={6}
            required
          />
          <FieldError errors={fieldErrors} name="otp" />
        </label>

        <label>
          New password
          <input type="password" name="newPassword" value={form.newPassword}
                 onChange={change} minLength={6} required />
          <FieldError errors={fieldErrors} name="newPassword" />
        </label>

        <button type="submit" className="btn btn-primary block" disabled={loading || locked}>
          {loading ? "Saving..." : "Change password"}
        </button>
      </form>

      <p className="form-links"><Link to="/login">Back to login</Link></p>
    </div>
  );
}
