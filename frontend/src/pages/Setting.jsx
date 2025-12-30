// src/pages/Setting.jsx
import React, { useState, useEffect } from "react";
import {
  Settings, Shield, Bell, Palette, Cpu, Users, LineChart,
  Smartphone, ToggleLeft, Key, Building2, Database,
  Save, Trash2, Download, RefreshCw, CheckCircle, XCircle, Plus
} from "lucide-react";

// Accept props for handling settings updates
export default function SettingsPage({ onSettingsChange }) {
  const [active, setActive] = useState("userRole");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Initial State - Matches what App.jsx expects
  const [config, setConfig] = useState({
    userRole: {
      allowSignup: true,
      requireConfirmation: true,
      defaultRole: "MIS",
      roles: ["Admin", "MIS", "Salesman", "User"],
      pendingUsers: [
        { id: 1, name: "shoaib", email: "shoaib@selt-t.com", status: "Pending" },
        { id: 2, name: "info", email: "info@selt-t.com", status: "Pending" }
      ]
    },
    features: {
      Analyst: { salesOrder: true, invoice: true, tallySync: true, whatsapp: true, gst: true, export: true },
      Outstanding: { partialPay: true, bulkReminder: false, graphs: true },
      Messaging: { whatsappInt: true, bulkSend: true, retry: true, templates: true },
      Dashboard: { summary: true, graphs: true, quickActions: false },
      Reports: { exportPdf: true, filters: true, dateRange: true }
    },
    theme: {
      mode: "Dark",
      font: "Inter",
      sidebar: "Left",
      logoUrl: ""
    },
    notifications: {
      channels: { email: true, whatsapp: true, inApp: true },
      triggers: { signup: true, payment: true, order: false, invoice: true, failedMsg: true }
    },
    security: {
      otpLogin: true,
      twoFactor: false,
      sessionTimeout: 30,
      ipWhitelist: "",
      passwordPolicy: "Strong"
    },
    hierarchy: {
      showDept: true,
      autoSync: false,
      allowManualEdit: false
    },
    reports: {
      visible: { sales: true, outstanding: true, recovery: true, activity: false },
      defaultFormat: "PDF"
    },
    integration: {
      tallyUrl: "http://localhost:9000",
      autoSync: true,
      whatsappKey: "********************",
      senderNumber: "919876543210"
    },
    advanced: {
      backupFreq: "Daily",
      retention: 90,
      autoSuspend: true,
      invoiceTemplate: "Professional"
    },
    mobile: {
      swipeActions: true,
      compactView: false,
      quickFilters: true
    }
  });

  // Load from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("selt_full_config");
    if (saved) {
        try {
            setConfig(JSON.parse(saved));
        } catch(e) {}
    }
  }, []);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      // 1. Save to LocalStorage
      localStorage.setItem("selt_full_config", JSON.stringify(config));
      // 2. Notify Parent App (Crucial for live updates!)
      if (onSettingsChange) {
          onSettingsChange(config);
      }
      setLoading(false);
      showToast("✅ All Settings Saved & Applied!");
    }, 800);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Helper to update state deeply
  const updateConfig = (section, key, value, subKey = null) => {
    setConfig(prev => {
      if (subKey) {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [key]: { ...prev[section][key], [subKey]: value }
          }
        };
      }
      return {
        ...prev,
        [section]: { ...prev[section], [key]: value }
      };
    });
  };

  const sections = [
    { id: "userRole", label: "User & Role Management", icon: <Users size={18} /> },
    { id: "features", label: "Module Feature Toggles", icon: <ToggleLeft size={18} /> },
    { id: "themeUI", label: "Theme & UI Settings", icon: <Palette size={18} /> },
    { id: "notifications", label: "Notification Settings", icon: <Bell size={18} /> },
    { id: "security", label: "Login & Security", icon: <Shield size={18} /> },
    { id: "hierarchy", label: "Company Hierarchy", icon: <Building2 size={18} /> },
    { id: "reports", label: "Report Visibility & Export", icon: <LineChart size={18} /> },
    { id: "integration", label: "Integration Settings", icon: <Cpu size={18} /> },
    { id: "advanced", label: "Advanced Settings", icon: <Database size={18} /> },
    { id: "mobile", label: "Mobile Optimization", icon: <Smartphone size={18} /> },
  ];

  return (
    <div className="p-6 min-h-screen bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F] text-gray-200 font-sans pb-24">
      <div className="max-w-7xl mx-auto bg-[#1B2A4A] rounded-2xl p-6 border border-[#223355] shadow-2xl relative">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#64FFDA] flex items-center gap-2">
            <Settings className="animate-spin-slow" /> Master Control Panel
          </h2>
          {toast && (
            <div className="absolute top-6 right-6 bg-green-500/20 border border-green-500 text-green-400 px-4 py-2 rounded-lg animate-fade-in z-50">
              {toast}
            </div>
          )}
        </div>

        {/* Tabs Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-8">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`flex items-center gap-2 px-3 py-3 rounded-lg text-sm font-semibold transition-all border ${
                active === s.id
                  ? "bg-[#64FFDA] text-[#0A192F] border-[#64FFDA] shadow-[0_0_10px_rgba(100,255,218,0.3)]"
                  : "bg-[#112240] text-gray-400 border-[#223355] hover:bg-[#1a335f] hover:text-white"
              }`}
            >
              {s.icon}
              <span className="truncate">{s.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="min-h-[500px] animate-fadeIn">
           {active === "userRole" && <UserRolePanel data={config.userRole} update={updateConfig} />}
           {active === "features" && <FeaturesPanel data={config.features} update={updateConfig} />}
           {active === "themeUI" && <ThemePanel data={config.theme} update={updateConfig} />}
           {active === "notifications" && <NotificationsPanel data={config.notifications} update={updateConfig} />}
           {active === "security" && <SecurityPanel data={config.security} update={updateConfig} />}
           {active === "hierarchy" && <HierarchyPanel data={config.hierarchy} update={updateConfig} />}
           {active === "reports" && <ReportsPanel data={config.reports} update={updateConfig} />}
           {active === "integration" && <IntegrationPanel data={config.integration} update={updateConfig} />}
           {active === "advanced" && <AdvancedPanel data={config.advanced} update={updateConfig} />}
           {active === "mobile" && <MobilePanel data={config.mobile} update={updateConfig} />}
        </div>

        {/* FLOATING SAVE BUTTON */}
        <div className="fixed bottom-8 right-8 z-50">
          <button 
            onClick={handleSave} 
            disabled={loading}
            className="flex items-center gap-2 bg-[#64FFDA] text-[#0A192F] px-8 py-4 rounded-full font-bold shadow-[0_0_20px_rgba(100,255,218,0.4)] hover:shadow-[0_0_30px_rgba(100,255,218,0.6)] hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100"
          >
            {loading ? <RefreshCw className="animate-spin" size={24} /> : <Save size={24} />}
            {loading ? "Saving..." : "Save All Changes"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ... (Rest of your sub-components: UserRolePanel, FeaturesPanel, etc. remain EXACTLY as they were in your code)
// Just make sure to include them below the main component in the file.
// I will include one example below for completeness, but you should keep all of them.

function UserRolePanel({ data, update }) {
  const [newRole, setNewRole] = useState("");
  const handleApprove = (id) => {
    const updated = data.pendingUsers.filter(u => u.id !== id);
    update("userRole", "pendingUsers", updated);
  };
  const handleAddRole = () => {
    if(newRole && !data.roles.includes(newRole)) {
      update("userRole", "roles", [...data.roles, newRole]);
      setNewRole("");
    }
  };
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="bg-[#0D1B34] p-5 rounded-xl border border-[#1E2D50]">
        <h3 className="text-[#64FFDA] text-lg font-bold mb-4">Signup & Roles</h3>
        <div className="space-y-4">
          <Toggle label="Allow New Signups" checked={data.allowSignup} onChange={v => update("userRole", "allowSignup", v)} />
          {/* ... rest of your existing JSX ... */}
        </div>
      </div>
      {/* ... rest of your existing JSX ... */}
    </div>
  );
}

// ... Include FeaturesPanel, ThemePanel, etc ...

const Toggle = ({ label, checked, onChange }) => (
  <div className="flex justify-between items-center py-2 border-b border-[#122240] last:border-0">
    <span className="text-sm text-gray-300">{label}</span>
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked || false} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <div className="w-10 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#64FFDA]"></div>
    </label>
  </div>
);
