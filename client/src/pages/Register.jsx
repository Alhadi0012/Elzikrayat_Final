/** Registration page. On success the user is sent to the OTP page. */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import Alert, { FieldError } from "../components/Alert";
import { register, clearMessages } from "../features/auth/authSlice";

const EMPTY = {
  firstName: "", lastName: "", email: "", password: "",
  location: "", occupation: "", description: ""
};

export default function Register() {
  const [form, setForm] = useState(EMPTY);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error, fieldErrors, needsVerification } =
    useSelector(state => state.auth);

  useEffect(() => () => { dispatch(clearMessages()); }, [dispatch]);

  useEffect(() => {
    if (needsVerification) navigate("/verify-otp");
  }, [needsVerification, navigate]);

  const change = event =>
    setForm({ ...form, [event.target.name]: event.target.value });

  const submit = event => {
    event.preventDefault();
    dispatch(register(form));
  };

  return (
    <div className="card form-card">
      <h2>Create an account</h2>
      <p className="muted">
        We will email you a 6-digit code to confirm your address.
      </p>

      <Alert type="error" onClose={() => dispatch(clearMessages())}>{error}</Alert>

      <form onSubmit={submit} noValidate>
        <div className="row">
          <label>
            First name
            <input name="firstName" value={form.firstName} onChange={change} required />
            <FieldError errors={fieldErrors} name="firstName" />
          </label>
          <label>
            Last name
            <input name="lastName" value={form.lastName} onChange={change} required />
            <FieldError errors={fieldErrors} name="lastName" />
          </label>
        </div>

        <label>
          Email
          <input type="email" name="email" value={form.email} onChange={change} required />
          <FieldError errors={fieldErrors} name="email" />
        </label>

        <label>
          Password
          <input type="password" name="password" value={form.password}
                 onChange={change} minLength={6} required />
          <FieldError errors={fieldErrors} name="password" />
        </label>

        <div className="row">
          <label>
            Location <span className="muted">(optional)</span>
            <input name="location" value={form.location} onChange={change} />
          </label>
          <label>
            Occupation <span className="muted">(optional)</span>
            <input name="occupation" value={form.occupation} onChange={change} />
          </label>
        </div>

        <label>
          About you <span className="muted">(optional)</span>
          <textarea name="description" value={form.description} onChange={change} rows={2} />
        </label>

        <button type="submit" className="btn btn-primary block" disabled={loading}>
          {loading ? "Creating..." : "Register"}
        </button>
      </form>

      <p className="form-links">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
