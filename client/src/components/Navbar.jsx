/**
 * Top navigation.
 *
 * Shows "Hi <first name>" and Logout for a signed-in user, and a Login
 * button otherwise - the behaviour the specification asks for.
 */
import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { logout, selectUser } from "../features/auth/authSlice";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const close = () => setOpen(false);

  const onLogout = () => {
    dispatch(logout());
    close();
    navigate("/");
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <Link to="/" className="brand" onClick={close}>Alzikrayat</Link>

        <button
          type="button"
          className="navbar-toggle"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="Toggle navigation"
        >
          &#9776;
        </button>

        <nav className={`navbar-links ${open ? "open" : ""}`}>
          <NavLink to="/" onClick={close} end>Home</NavLink>
          <NavLink to="/gallery" onClick={close}>Gallery</NavLink>
          <NavLink to="/about" onClick={close}>About</NavLink>
          {user && <NavLink to="/upload" onClick={close}>Upload</NavLink>}

          {user ? (
            <div className="navbar-user">
              <span className="greeting">Hi {user.firstName}</span>
              <button type="button" className="btn btn-outline" onClick={onLogout}>
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-accent" onClick={close}>
              Please Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
