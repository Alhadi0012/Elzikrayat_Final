/**
 * Routes and application shell.
 *
 * loadMe runs once on mount when a token is stored, so a refresh keeps the
 * user signed in instead of dropping them back to the login page.
 */
import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Home from "./pages/Home";
import About from "./pages/About";
import Gallery from "./pages/Gallery";
import PhotoDetail from "./pages/PhotoDetail";
import Upload from "./pages/Upload";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyOtp from "./pages/VerifyOtp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

import { loadMe } from "./features/auth/authSlice";

export default function App() {
  const dispatch = useDispatch();
  const token = useSelector(state => state.auth.token);

  useEffect(() => {
    if (token) dispatch(loadMe());
  }, [dispatch, token]);

  return (
    <>
      <Navbar />

      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/photo/:id" element={<PhotoDetail />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            path="/upload"
            element={<ProtectedRoute><Upload /></ProtectedRoute>}
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="footer">
        Alzikrayat &copy; 2026 &mdash; Advanced Web Technologies, SUST
      </footer>
    </>
  );
}
