// ===========================
// LoginPopup.jsx (FINAL PRODUCTION VERSION)
// ===========================
import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, LogIn, X, Phone, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function LoginPopup({ onClose, onSwitchToSignup }) {
  const { login, sendOtp, verifyOtp } = useAuth();

  const [role, setRole] = useState("");
  const [loginMethod, setLoginMethod] = useState("email");

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // ---------------------------------
  // EMAIL LOGIN
  // ---------------------------------
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!role) return setMsg("❌ Please select your role first");

    setLoading(true);
    const ok = await login({ email, phone: null, password, role });
    setLoading(false);

    if (!ok) {
      setMsg("❌ Invalid credentials or role mismatch");
      return;
    }

    setMsg("✅ Login Successful!");
    setTimeout(() => (window.location = "/dashboard"), 400);
  };

  // ---------------------------------
  // SEND OTP
  // ---------------------------------
  const handleSendOTP = async () => {
    setMsg("");

    if (!role) return setMsg("❌ Please select your role first");
    if (!phone.trim()) return setMsg("❌ Enter phone number");

    setLoading(true);
    const res = await sendOtp(phone);
    setLoading(false);

    if (!res?.success) {
      setMsg("❌ " + (res.message || "Failed to send OTP"));
      return;
    }

    setOtpSent(true);
    setMsg(`📱 OTP sent (mock): ${res.otp}`);
  };

  // ---------------------------------
  // VERIFY OTP
  // ---------------------------------
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setMsg("");

    if (!otp.trim()) {
      setMsg("❌ OTP required");
      return;
    }

    const res = await verifyOtp(phone, otp);

    if (!res?.success) {
      setMsg("❌ " + (res.message || "Invalid OTP"));
      return;
    }

    setMsg("✅ OTP Verified!");
    setTimeout(() => (window.location = "/dashboard"), 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn p-4">
      <div className="relative bg-gradient-to-br from-[#0D1B2A] to-[#112240] p-6 md:p-8 rounded-2xl border border-[#64FFDA]/30 w-full max-w-md shadow-2xl animate-scaleIn">

        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
        >
          <X size={24} />
        </button>

        {/* HEADER */}
        <div className="text-center mb-6">
          <div className="inline-block p-3 bg-[#64FFDA]/10 rounded-full mb-3">
            <LogIn className="text-[#64FFDA]" size={28} />
          </div>
          <h2 className="text-2xl font-bold text-[#64FFDA]">Welcome Back</h2>
          <p className="text-gray-400 text-sm mt-1">Select role and login</p>
        </div>

        {/* ROLE SELECTOR */}
        <div className="mb-6">
          <label className="text-sm text-gray-300 mb-1 block">Select Your Role:</label>
          <div className="grid grid-cols-3 gap-2">
            {["admin", "mis", "user"].map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`py-2 px-3 rounded-lg font-semibold text-sm transition ${
                  role === r
                    ? "bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] text-[#0A192F]"
                    : "bg-[#1E2D45] text-gray-400 hover:bg-[#243557]"
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* LOGIN METHOD */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => {
              setLoginMethod("email");
              setOtpSent(false);
              setMsg("");
            }}
            className={`flex-1 py-2 rounded-lg font-semibold transition ${
              loginMethod === "email"
                ? "bg-[#64FFDA] text-[#0A192F]"
                : "bg-[#1E2D45] text-gray-400"
            }`}
          >
            <Mail size={16} className="inline mr-2" /> Email
          </button>

          <button
            type="button"
            onClick={() => {
              setLoginMethod("phone");
              setOtpSent(false);
              setMsg("");
            }}
            className={`flex-1 py-2 rounded-lg font-semibold transition ${
              loginMethod === "phone"
                ? "bg-[#64FFDA] text-[#0A192F]"
                : "bg-[#1E2D45] text-gray-400"
            }`}
          >
            <Phone size={16} className="inline mr-2" /> Phone
          </button>
        </div>

        {/* EMAIL LOGIN FORM */}
        {loginMethod === "email" && (
          <form onSubmit={handleEmailLogin} className="space-y-4">

            <div className="relative">
              <Mail className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
              <input
                type="email"
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200 text-sm"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-12 py-3 rounded-lg text-gray-200 text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-[#64FFDA]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] text-[#0A192F] py-3 rounded-lg font-bold"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        )}

        {/* PHONE LOGIN / SEND OTP */}
        {loginMethod === "phone" && !otpSent && (
          <div className="space-y-4">

            <div className="relative">
              <Phone className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
              <input
                type="tel"
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200 text-sm"
                placeholder="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={handleSendOTP}
              className="w-full bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] text-[#0A192F] py-3 rounded-lg font-bold"
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </div>
        )}

        {/* OTP VERIFY */}
        {loginMethod === "phone" && otpSent && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">

            <div className="relative">
              <Shield className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
              <input
                type="text"
                maxLength={6}
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200 text-sm"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#64FFDA] to-[#3B82F6] text-[#0A192F] py-3 rounded-lg font-bold"
            >
              Verify OTP
            </button>

            <button
              type="button"
              onClick={() => setOtpSent(false)}
              className="text-[#64FFDA] text-sm hover:underline"
            >
              ← Change Phone Number
            </button>
          </form>
        )}

        {/* MESSAGE */}
        {msg && (
          <div
            className={`mt-4 p-3 rounded-lg text-center text-sm ${
              msg.includes("✅")
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {msg}
          </div>
        )}

        {/* SWITCH */}
        <div className="mt-6 flex justify-between text-sm">
          <button className="text-[#64FFDA] hover:underline">
            Forgot Password?
          </button>

          <button
            onClick={() => {
              onClose();
              onSwitchToSignup && onSwitchToSignup();
            }}
            className="text-[#64FFDA] hover:underline"
          >
            New Registration →
          </button>
        </div>

      </div>
    </div>
  );
}
