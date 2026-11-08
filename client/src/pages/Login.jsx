/** Login page. Sends unverified accounts to the OTP page automatically. */
import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import Alert, { FieldError } from "../components/Alert";
import { login, clearMessages } from "../features/auth/authSlice";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { user, loading, error, fieldErrors, needsVerification } =
    useSelector(state => state.auth);

  useEffect(() => () => { dispatch(clearMessages()); }, [dispatch]);

  /* The server answers 403 + needsVerification for an unconfirmed account
     and sends a fresh code, so take the user straight to the OTP page. */
  useEffect(() => {
    if (needsVerification) navigate("/verify-otp");
  }, [needsVerification, navigate]);

  useEffect(() => {
    if (user) navigate(location.state?.from || "/gallery", { replace: true });
  }, [user, navigate, location.state]);

  const change = event =>
    setForm({ ...form, [event.target.name]: event.target.value });

  const submit = event => {
    event.preventDefault();
    dispatch(login(form));
  };

  return (
    <div className="card form-card">
      <h2>Log in</h2>
      <Alert type="error" onClose={() => dispatch(clearMessages())}>{error}</Alert>

      <form onSubmit={submit} noValidate>
        <label>
          Email
          <input type="email" name="email" value={form.email} onChange={change} required />
          <FieldError errors={fieldErrors} name="email" />
        </label>

        <label>
          Password
          <input type="password" name="password" value={form.password} onChange={change} required />
          <FieldError errors={fieldErrors} name="password" />
        </label>

        <button type="submit" className="btn btn-primary block" disabled={loading}>
          {loading ? "Signing in..." : "Log in"}
        </button>
      </form>

      <p className="form-links">
        <Link to="/forgot-password">Forgot your password?</Link>
        <span> &middot; </span>
        <Link to="/register">Create an account</Link>
      </p>
    </div>
  );
}
