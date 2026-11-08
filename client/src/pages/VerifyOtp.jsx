/**
 * Email confirmation page.
 *
 * The address comes from the store (set by register or by a login that was
 * refused), so the user never retypes it. The resend button keeps its own
 * countdown to match the 60-second rule on the server.
 */
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import Alert from "../components/Alert";
import { verifyOtp, resendOtp, clearMessages } from "../features/auth/authSlice";

const COOLDOWN = 60;

export default function VerifyOtp() {
  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(COOLDOWN);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user, loading, error, message, pendingEmail, lockedUntil } =
    useSelector(state => state.auth);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds(seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  useEffect(() => {
    if (user) navigate("/gallery", { replace: true });
  }, [user, navigate]);

  /* Reaching this page without an address means the flow was skipped. */
  if (!pendingEmail && !user) return <Navigate to="/register" replace />;

  const locked = lockedUntil && new Date(lockedUntil) > new Date();

  const submit = event => {
    event.preventDefault();
    dispatch(verifyOtp({ email: pendingEmail, otp: code }));
  };

  const resend = () => {
    dispatch(clearMessages());
    dispatch(resendOtp(pendingEmail));
    setSeconds(COOLDOWN);
  };

  return (
    <div className="card form-card">
      <h2>Confirm your email</h2>
      <p className="muted">
        We sent a 6-digit code to <strong>{pendingEmail}</strong>. It expires in 10 minutes.
      </p>

      <Alert type="error" onClose={() => dispatch(clearMessages())}>{error}</Alert>
      <Alert type="success" onClose={() => dispatch(clearMessages())}>{message}</Alert>

      <form onSubmit={submit} noValidate>
        <label>
          Verification code
          <input
            className="otp-input"
            value={code}
            onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            placeholder="000000"
            maxLength={6}
            required
          />
        </label>

        <button type="submit" className="btn btn-primary block"
                disabled={loading || locked || code.length !== 6}>
          {loading ? "Checking..." : "Confirm"}
        </button>
      </form>

      <p className="form-links">
        {locked ? (
          <span className="muted">Locked after 3 incorrect codes. Try again later.</span>
        ) : seconds > 0 ? (
          <span className="muted">You can request a new code in {seconds}s</span>
        ) : (
          <button type="button" className="link-button" onClick={resend}>
            Resend code
          </button>
        )}
      </p>
    </div>
  );
}
