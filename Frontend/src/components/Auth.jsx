import React, { useState } from "react";
import logo from "../assets/logo.png";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";

export default function Auth({ onAuthSuccess, onBackToLanding }) {
  const [isLogin, setIsLogin] = useState(true); // true = Login, false = Register
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState(() => {
    return localStorage.getItem("whats_bulk_remembered_email") || "";
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    // Basic Validation
    if (!email.trim() || (!isForgotPassword && !password.trim())) {
      setError("Please fill in all fields.");
      return;
    }

    if (!isLogin && !isForgotPassword && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!isForgotPassword && password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      let endpoint;
      let bodyData;

      if (isForgotPassword) {
        endpoint = "/api/forgot-password";
        bodyData = { email };
      } else {
        endpoint = isLogin ? "/api/login" : "/api/register";
        bodyData = { email, password };
      }

      const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") ? "http://localhost:5002" : (import.meta.env.VITE_API_BASE || "");
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyData),
      });

      const data = await response.json();

      if (response.ok) {
        if (isForgotPassword) {
          if (data.reset_link) {
            setSuccessMsg(
              <span>
                {data.message}{" "}
                <a 
                  href={data.reset_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline text-emerald-600 hover:text-emerald-500 font-bold block mt-1"
                >
                  Click here to Reset Password
                </a>
              </span>
            );
            setEmail("");
          } else {
            setSuccessMsg(data.message || "A password reset link has been sent to your email.");
            setEmail("");
            setTimeout(() => {
              setIsForgotPassword(false);
              setSuccessMsg("");
            }, 3500);
          }
        } else if (isLogin) {
          // Success login
          if (rememberMe) {
            localStorage.setItem("whats_bulk_remembered_email", email);
          } else {
            localStorage.removeItem("whats_bulk_remembered_email");
          }
          onAuthSuccess(data.user, rememberMe);
        } else {
          // Success register
          setSuccessMsg("Registration successful! Redirecting to login...");
          setEmail("");
          setPassword("");
          setConfirmPassword("");
          setTimeout(() => {
            setIsLogin(true);
            setSuccessMsg("");
          }, 2000);
        }
      } else {
        setError(data.message || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setError("Backend server is not running or unreachable.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-800 bg-slate-50 font-sans selection:bg-emerald-500 selection:text-white flex items-center justify-center relative overflow-hidden px-4">
      {/* Background ambient glowing blobs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Back to landing page button */}
      <button
        onClick={onBackToLanding}
        className="absolute top-6 left-6 flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors z-10"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-slate-200 p-8 rounded-3xl shadow-xl shadow-slate-100/50 z-10"
      >
        {/* Brand Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="Whats-Bulk Logo" className="w-12 h-12 object-contain mb-3" />
          <span className="font-bold text-2xl tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            Whats-Bulk
          </span>
          <p className="text-slate-500 text-xs mt-1 text-center">
            {isForgotPassword
              ? "Enter your email to receive a password reset link"
              : isLogin
              ? "Sign in to access your dashboard"
              : "Create a new admin account"}
          </p>
        </div>

        {/* Alerts */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3.5 rounded-xl flex items-start gap-2.5 font-medium">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3.5 rounded-xl flex items-start gap-2.5 font-medium">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                name="email"
                autoComplete="username"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all text-sm text-slate-900 placeholder-slate-400"
              />
            </div>
          </div>

          {!isForgotPassword && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-11 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all text-sm text-slate-900 placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {!isLogin && !isForgotPassword && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-11 pr-11 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-all text-sm text-slate-900 placeholder-slate-400"
                />
              </div>
            </div>
          )}

          {isLogin && !isForgotPassword && (
            <div className="flex items-center justify-between text-xs font-semibold select-none py-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-500 hover:text-slate-700 transition-colors">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-350 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(true);
                  setError("");
                  setSuccessMsg("");
                }}
                className="text-emerald-600 hover:text-emerald-500 hover:underline font-bold"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-extrabold py-3.5 rounded-xl transition-all duration-200 shadow-md shadow-emerald-600/10 mt-2 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>
                  {isForgotPassword
                    ? "Send Reset Link"
                    : isLogin
                    ? "Sign In"
                    : "Sign Up"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Toggler */}
        <div className="text-center mt-6 text-xs text-slate-500">
          {isForgotPassword ? (
            <p>
              Remember your password?{" "}
              <button
                onClick={() => {
                  setIsForgotPassword(false);
                  setError("");
                  setSuccessMsg("");
                }}
                className="text-emerald-600 hover:text-emerald-500 hover:underline font-bold"
              >
                Sign In
              </button>
            </p>
          ) : isLogin ? (
            <p>
              Don't have an account?{" "}
              <button
                onClick={() => {
                  setIsLogin(false);
                  setError("");
                  setSuccessMsg("");
                }}
                className="text-emerald-600 hover:text-emerald-500 hover:underline font-bold"
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                onClick={() => {
                  setIsLogin(true);
                  setError("");
                  setSuccessMsg("");
                }}
                className="text-emerald-655 hover:text-emerald-500 hover:underline font-bold"
              >
                Sign In
              </button>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
