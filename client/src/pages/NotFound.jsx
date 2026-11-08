import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <h2>Page not found</h2>
      <p className="muted">The page you asked for does not exist.</p>
      <Link to="/" className="btn btn-primary">Go home</Link>
    </div>
  );
}
