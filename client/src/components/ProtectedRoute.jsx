/**
 * Guards the pages that need a signed-in user.
 *
 * While the session is being restored it shows a spinner rather than
 * redirecting, otherwise a refresh on a protected page would always bounce
 * the user to the login screen before loadMe had a chance to answer.
 */
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";

import Spinner from "./Spinner";
import { selectUser, selectAuthLoading } from "../features/auth/authSlice";

export default function ProtectedRoute({ children }) {
  const user = useSelector(selectUser);
  const loading = useSelector(selectAuthLoading);
  const location = useLocation();

  if (loading) return <Spinner full />;

  /* Remember where the user was going so login can send them back. */
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;

  return children;
}
