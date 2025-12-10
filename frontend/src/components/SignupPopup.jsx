// ===========================
// SignupPopup.jsx (FINAL PRODUCTION VERSION)
// ===========================
import React, { useState } from "react";
import { User, Mail, Phone, Lock, Eye, EyeOff, UserPlus, Building, X } from "lucide-react";

export default function SignupPopup({ onClose, onSwitchToLogin }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    password: "",
    confirm: "",
    loginMethod: "email",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const API = "https://selt-t-backend.selt-3232.workers.dev";

  // ============================
  // SUBMIT SIGNUP
  // ============================
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg("");

    // BASIC VALIDATIONS
    if (!form.name.trim()) return setMsg("❌ Full name required");

    if (form.loginMethod === "email" && !form.email)
      return setMsg("❌ Email is required");
    if (form.loginMethod === "phone" && !form.phone)
      return setMsg("❌ Phone number is required");

    if (form.password.length < 6)
      return setMsg("❌ Password must be at least 6 characters");

    if (form.password !== form.confirm)
      return setMsg("❌ Passwords do not match");

    // CREATE CLEAN PAYLOAD → No "confirm" sent to backend
    const payload = {
      name: form.name.trim(),
      email: form.loginMethod === "email" ? form.email.trim() : "",
      phone: form.loginMethod === "phone" ? form.phone.trim() : "",
      company: form.company.trim(),
      password: form.password,
      loginMethod: form.loginMethod,
    };

    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setLoading(false);

      setMsg(data.message || "Something went wrong");

      if (data.success) {
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err) {
      setLoading(false);
      setMsg("❌ Network error");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn overflow-y-auto p-4">
      <div className="relative bg-gradient-to-br from-[#0D1B2A] to-[#112240] p-6 md:p-8 rounded-2xl border border-[#64FFDA]/30 w-full max-w-2xl shadow-[0_0_50px_rgba(100,255,218,0.2)] animate-scaleIn my-8">

        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white z-10"
        >
          <X size={24} />
        </button>

        {/* HEADER */}
        <div className="text-center mb-6">
          <div className="inline-block p-3 bg-[#64FFDA]/10 rounded-full mb-3">
            <UserPlus className="text-[#64FFDA]" size={28} />
          </div>
          <h2 className="text-2xl font-bold text-[#64FFDA]">
            Create Your Account
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Join Sel-T Business Intelligence
          </p>
        </div>

        {/* LOGIN METHOD */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setForm({ ...form, loginMethod: "email" })}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${
              form.loginMethod === "email"
                ? "bg-[#64FFDA] text-[#0A192F]"
                : "bg-[#1E2D45] text-gray-400"
            }`}
          >
            <Mail size={14} className="inline mr-1" /> Email Login
          </button>

          <button
            type="button"
            onClick={() => setForm({ ...form, loginMethod: "phone" })}
            className={`flex-1 py-2 rounded-lg font-semibold text-sm transition ${
              form.loginMethod === "phone"
                ? "bg-[#64FFDA] text-[#0A192F]"
                : "bg-[#1E2D45] text-gray-400"
            }`}
          >
            <Phone size={14} className="inline mr-1" /> Phone Login
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* NAME */}
          <div className="relative">
            <User className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
            <input
              type="text"
              placeholder="Full Name"
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200 text-sm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          {/* EMAIL */}
          {form.loginMethod === "email" && (
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200 text-sm"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          )}

          {/* PHONE */}
          {form.loginMethod === "phone" && (
            <div className="relative">
              <Phone className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
              <input
                type="tel"
                placeholder="Phone Number"
                className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200 text-sm"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
          )}

          {/* COMPANY */}
          <div className="relative">
            <Building className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
            <input
              type="text"
              placeholder="Company Name (Optional)"
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-4 py-3 rounded-lg text-gray-200 text-sm"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
          </div>

          {/* PASSWORD */}
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password (min 6 chars)"
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-12 py-3 rounded-lg text-gray-200 text-sm"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-400 hover:text-[#64FFDA]"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* CONFIRM PASSWORD */}
          <div className="relative">
            <Lock className="absolute left-3 top-3 text-[#64FFDA]/60" size={18} />
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm Password"
              className="w-full bg-[#0A192F] border border-[#1E2D45] pl-10 pr-12 py-3 rounded-lg text-gray-200 text-sm"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-3 text-gray-400 hover:text-[#64FFDA]"
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* SUBMIT */}
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white py-3 rounded-lg font-bold disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>
          </div>
        </form>

        {/* MESSAGE */}
        {msg && (
          <div
            className={`mt-4 p-3 rounded-lg text-center text-sm ${
              msg.includes("success") || msg.includes("Account")
                ? "bg-green-500/20 text-green-400"
                : "bg-red-500/20 text-red-400"
            }`}
          >
            {msg}
          </div>
        )}

        {/* SWITCH */}
        <div className="mt-4 text-center">
          <button
            onClick={() => {
              onClose();
              onSwitchToLogin && onSwitchToLogin();
            }}
            className="text-[#64FFDA] text-sm hover:underline"
          >
            Already have an account? Login →
          </button>
        </div>

      </div>
    </div>
  );
}
