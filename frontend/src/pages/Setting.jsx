// src/pages/Setting.jsx
import React, { useState, useEffect } from "react";
import {
  Settings, Shield, Bell, Palette, Cpu, Users, LineChart,
  Smartphone, ToggleLeft, Key, Building2, Database,
  Save, Trash2, Download, RefreshCw, CheckCircle, XCircle, Plus
} from "lucide-react";

export default function SettingsPage() {
  const [active, setActive] = useState("userRole");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // --- 1. GLOBAL STATE (Original) ---
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
      mode: "Light", // Default to Light now
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

  // --- 2. LOAD & SAVE ---
  useEffect(() => {
    const saved = localStorage.getItem("selt_full_config");
    if (saved) setConfig(JSON.parse(saved));
  }, []);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem("selt_full_config", JSON.stringify(config));
      setLoading(false);
      showToast("✅ All Settings Saved Successfully!");
    }, 1000);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const updateConfig = (section, key, value, subKey = null) => {
    setConfig(prev => {
      if (subKey) {
        return {
          ...prev,
          section: {
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
    <div className="p-6 min-h-screen bg-gray-50 text-gray-800 font-sans pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Settings className="animate-spin-slow" size={24}/></span>
              Master Control Panel
            </h2>
            <p className="text-gray-500 text-sm mt-1 ml-1">Configure global application preferences.</p>
          </div>
          {toast && (
            <div className="absolute top-6 right-6 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg shadow-sm animate-fade-in z-50 flex items-center gap-2">
              <CheckCircle size={16}/> {toast}
            </div>
          )}
        </div>

        {/* MAIN LAYOUT */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* SIDEBAR NAVIGATION */}
          <div className="lg:w-64 flex-shrink-0">
             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden sticky top-4">
                <div className="p-3 grid gap-1">
                  {sections.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setActive(s.id)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all text-left ${
                        active === s.id
                          ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600 shadow-sm"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
                      }`}
                    >
                      <span className={active === s.id ? "text-blue-600" : "text-gray-400"}>{s.icon}</span>
                      <span className="truncate">{s.label}</span>
                    </button>
                  ))}
                </div>
             </div>
          </div>

          {/* CONTENT AREA */}
          <div className="flex-1 min-h-[500px] animate-fadeIn">
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
        </div>

        {/* FLOATING SAVE BUTTON */}
        <div className="fixed bottom-8 right-8 z-50">
          <button 
            onClick={handleSave} 
            disabled={loading}
            className="flex items-center gap-2 bg-gray-900 text-white px-8 py-3.5 rounded-full font-bold shadow-xl hover:bg-black hover:scale-105 transition-all disabled:opacity-70 disabled:scale-100 ring-2 ring-white"
          >
            {loading ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
            {loading ? "Saving System..." : "Save All Changes"}
          </button>
        </div>

      </div>
    </div>
  );
}

// --- SUB-COMPONENTS (WHITE THEME) ---

function UserRolePanel({ data, update }) {
  const [newRole, setNewRole] = useState("");
  const handleApprove = (id) => { const updated = data.pendingUsers.filter(u => u.id !== id); update("userRole", "pendingUsers", updated); };
  const handleAddRole = () => { if(newRole && !data.roles.includes(newRole)) { update("userRole", "roles", [...data.roles, newRole]); setNewRole(""); } };
  
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-gray-800 text-lg font-bold mb-6 pb-2 border-b border-gray-100 flex items-center gap-2">
            <Users size={18} className="text-blue-600"/> Signup & Roles
        </h3>
        <div className="space-y-5">
          <Toggle label="Allow New Signups" checked={data.allowSignup} onChange={v => update("userRole", "allowSignup", v)} />
          <Toggle label="Require Email/WhatsApp Confirmation" checked={data.requireConfirmation} onChange={v => update("userRole", "requireConfirmation", v)} />
          
          <div>
            <label className="block text-gray-600 text-xs font-bold uppercase tracking-wider mb-2">Default Role</label>
            <select value={data.defaultRole} onChange={e => update("userRole", "defaultRole", e.target.value)} className="w-full bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none">
                {data.roles.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          
          <div>
             <label className="block text-gray-600 text-xs font-bold uppercase tracking-wider mb-2">Create New Role</label>
             <div className="flex gap-2">
                <input type="text" value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Manager"/>
                <button onClick={handleAddRole} className="bg-blue-600 text-white p-2.5 rounded-lg hover:bg-blue-700"><Plus size={20}/></button>
             </div>
             <div className="flex flex-wrap gap-2 mt-3">
                {data.roles.map(r => (
                    <span key={r} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-md border border-gray-200">{r}</span>
                ))}
             </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
        <h3 className="text-gray-800 text-lg font-bold mb-6 pb-2 border-b border-gray-100 flex items-center gap-2">
            <Shield size={18} className="text-orange-600"/> Pending Approvals
        </h3>
        {data.pendingUsers.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-gray-400 text-sm">No pending users found.</p>
            </div>
        ) : (
            <div className="space-y-3">
                {data.pendingUsers.map(user => (
                    <div key={user.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                        <div>
                            <p className="text-gray-900 font-bold text-sm">{user.name}</p>
                            <p className="text-gray-500 text-xs">{user.email}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleApprove(user.id)} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors" title="Approve"><CheckCircle size={18}/></button>
                            <button onClick={() => handleApprove(user.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors" title="Reject"><XCircle size={18}/></button>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}

function FeaturesPanel({ data, update }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Object.entries(data).map(([moduleName, features]) => (
        <div key={moduleName} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <h4 className="text-gray-800 font-bold mb-4 border-b border-gray-100 pb-2 flex items-center gap-2">
             <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
             {moduleName} Module
          </h4>
          <div className="space-y-1">
             {Object.entries(features).map(([key, val]) => (
                 <Toggle key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} checked={val} onChange={v => update("features", moduleName, v, key)} />
             ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ThemePanel({ data, update }) {
  return (
    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div>
            <label className="block text-gray-600 text-xs font-bold uppercase tracking-wider mb-2">Color Scheme</label>
            <select value={data.mode} onChange={e => update("theme", "mode", e.target.value)} className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none">
                <option>Light</option>
                <option>Dark</option>
                <option>High Contrast</option>
            </select>
        </div>
        <div>
            <label className="block text-gray-600 text-xs font-bold uppercase tracking-wider mb-2">Font Family</label>
            <select value={data.font} onChange={e => update("theme", "font", e.target.value)} className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none">
                <option>Inter</option>
                <option>Roboto</option>
                <option>Poppins</option><option>Open Sans</option>
            </select>
        </div>
      </div>
      <div className="space-y-6">
         <div>
            <label className="block text-gray-600 text-xs font-bold uppercase tracking-wider mb-2">Sidebar Position</label>
            <div className="flex gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={data.sidebar === "Left"} onChange={() => update("theme", "sidebar", "Left")} className="text-blue-600 focus:ring-blue-500"/> 
                    <span className="text-sm font-medium text-gray-700">Left Sidebar</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={data.sidebar === "Right"} onChange={() => update("theme", "sidebar", "Right")} className="text-blue-600 focus:ring-blue-500"/> 
                    <span className="text-sm font-medium text-gray-700">Right Sidebar</span>
                </label>
            </div>
         </div>
        <div>
            <label className="block text-gray-600 text-xs font-bold uppercase tracking-wider mb-2">Custom Logo URL</label>
            <input type="text" value={data.logoUrl} onChange={e => update("theme", "logoUrl", e.target.value)} placeholder="https://example.com/logo.png" className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>
    </div>
  );
}

function NotificationsPanel({ data, update }) {
  return (
    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm space-y-8">
      <div>
        <h3 className="text-gray-900 font-bold mb-4 text-lg">Delivery Channels</h3>
        <div className="flex flex-wrap gap-x-8 gap-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <Toggle label="Email Alerts" checked={data.channels.email} onChange={v => update("notifications", "channels", v, "email")} />
            <Toggle label="WhatsApp Alerts" checked={data.channels.whatsapp} onChange={v => update("notifications", "channels", v, "whatsapp")} />
            <Toggle label="In-App Toasts" checked={data.channels.inApp} onChange={v => update("notifications", "channels", v, "inApp")} />
        </div>
      </div>
      <div className="border-t border-gray-100 pt-6">
        <h3 className="text-gray-900 font-bold mb-4 text-lg">Event Triggers</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(data.triggers).map(([key, val]) => (
                <div key={key} className="p-3 border border-gray-100 rounded-lg hover:border-blue-100 transition-colors">
                    <Toggle label={`On ${key.charAt(0).toUpperCase() + key.slice(1)}`} checked={val} onChange={v => update("notifications", "triggers", v, key)} />
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function SecurityPanel({ data, update }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
       <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
          <h3 className="text-gray-800 font-bold text-lg flex items-center gap-2">
             <Key size={18} className="text-purple-600"/> Authentication
          </h3>
          <div className="space-y-2">
            <Toggle label="OTP Login via WhatsApp" checked={data.otpLogin} onChange={v => update("security", "otpLogin", v)} />
            <Toggle label="Two-Factor Authentication (2FA)" checked={data.twoFactor} onChange={v => update("security", "twoFactor", v)} />
          </div>
          <div>
            <label className="block text-gray-600 text-xs font-bold uppercase tracking-wider mb-2">Session Timeout (Minutes)</label>
            <input type="number" value={data.sessionTimeout} onChange={e => update("security", "sessionTimeout", e.target.value)} className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
       </div>
       
       <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
          <h3 className="text-gray-800 font-bold text-lg flex items-center gap-2">
             <Shield size={18} className="text-green-600"/> Network Security
          </h3>
          <div>
             <label className="block text-gray-600 text-xs font-bold uppercase tracking-wider mb-2">Whitelist IPs (Comma separated)</label>
             <textarea value={data.ipWhitelist} onChange={e => update("security", "ipWhitelist", e.target.value)} className="w-full h-32 bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-none" placeholder="192.168.1.1, 127.0.0.1" />
             <p className="text-xs text-gray-400 mt-2">Leave empty to allow all IPs.</p>
          </div>
       </div>
    </div>
  );
}

function HierarchyPanel({ data, update }) {
  return (
    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center py-12">
        <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building2 size={40} className="text-blue-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-6">Structure Configuration</h3>
        <div className="max-w-md mx-auto space-y-4 text-left bg-gray-50 p-6 rounded-xl border border-gray-100">
            <Toggle label="Show Departments in Tree" checked={data.showDept} onChange={v => update("hierarchy", "showDept", v)} />
            <Toggle label="Auto-Sync Hierarchy from Tally" checked={data.autoSync} onChange={v => update("hierarchy", "autoSync", v)} />
            <Toggle label="Allow Manual Override" checked={data.allowManualEdit} onChange={v => update("hierarchy", "allowManualEdit", v)} />
        </div>
    </div>
  );
}

function ReportsPanel({ data, update }) {
  return (
    <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-gray-900 font-bold mb-6 pb-2 border-b border-gray-100">Report Visibility & Export</h3>
        <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
                <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Visible Reports</h4>
                <div className="space-y-2">
                    {Object.entries(data.visible).map(([key, val]) => (
                        <Toggle key={key} label={`Show ${key.charAt(0).toUpperCase() + key.slice(1)}`} checked={val} onChange={v => update("reports", "visible", v, key)} />
                    ))}
                </div>
            </div>
            <div>
                <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-3">Default Export Format</h4>
                <select value={data.defaultFormat} onChange={e => update("reports", "defaultFormat", e.target.value)} className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none">
                    <option>PDF</option>
                    <option>Excel</option>
                    <option>CSV</option>
                </select>
                <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                    <p className="text-xs text-yellow-700"><strong>Note:</strong> PDF format is read-only. Excel allows further data manipulation.</p>
                </div>
            </div>
        </div>
    </div>
  );
}

function IntegrationPanel({ data, update }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
       <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="text-gray-900 font-bold mb-6 flex items-center gap-2">
            <span className="p-1.5 bg-orange-100 text-orange-600 rounded-lg"><Cpu size={18}/></span> Tally Prime Sync
          </h4>
          <div className="space-y-5">
            <div>
                <label className="block text-gray-600 text-xs font-bold uppercase tracking-wider mb-2">Tally Connector URL</label>
                <input type="text" value={data.tallyUrl} onChange={e => update("integration", "tallyUrl", e.target.value)} className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" />
            </div>
            <Toggle label="Auto Sync Every 1 Hour" checked={data.autoSync} onChange={v => update("integration", "autoSync", v)} />
            <button className="w-full bg-orange-50 text-orange-600 border border-orange-200 p-3 rounded-lg hover:bg-orange-100 font-semibold transition-colors">Test Tally Connection</button>
          </div>
       </div>
       
       <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h4 className="text-gray-900 font-bold mb-6 flex items-center gap-2">
            <span className="p-1.5 bg-green-100 text-green-600 rounded-lg"><Smartphone size={18}/></span> WhatsApp API
          </h4>
          <div className="space-y-5">
            <div>
                <label className="block text-gray-600 text-xs font-bold uppercase tracking-wider mb-2">API Key</label>
                <input type="password" value={data.whatsappKey} onChange={e => update("integration", "whatsappKey", e.target.value)} className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" />
            </div>
            <div>
                <label className="block text-gray-600 text-xs font-bold uppercase tracking-wider mb-2">Sender Number</label>
                <input type="text" value={data.senderNumber} onChange={e => update("integration", "senderNumber", e.target.value)} className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm" />
            </div>
          </div>
       </div>
    </div>
  );
}

function AdvancedPanel({ data, update }) {
  return (
    <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-8 justify-between items-start">
            <div className="space-y-6 w-full md:w-1/2">
                <div>
                    <label className="block text-gray-600 text-xs font-bold uppercase tracking-wider mb-2">Data Backup Frequency</label>
                    <select value={data.backupFreq} onChange={e => update("advanced", "backupFreq", e.target.value)} className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none">
                        <option>Hourly</option><option>Daily</option><option>Weekly</option>
                    </select>
                </div>
                <div>
                    <label className="block text-gray-600 text-xs font-bold uppercase tracking-wider mb-2">Log Retention (Days)</label>
                    <input type="number" value={data.retention} onChange={e => update("advanced", "retention", e.target.value)} className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
            </div>
            <div className="flex flex-col gap-3 w-full md:w-auto mt-6 md:mt-0">
                <button className="flex items-center gap-2 px-6 py-3 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors w-full md:w-auto">
                    <Trash2 size={18}/> Clear Application Cache
                </button>
                <button className="flex items-center gap-2 px-6 py-3 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-100 font-medium transition-colors w-full md:w-auto">
                    <Download size={18}/> Export Config JSON
                </button>
            </div>
        </div>
    </div>
  );
}

function MobilePanel({ data, update }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
        <h3 className="text-gray-900 font-bold mb-4 flex items-center gap-2">
            <Smartphone size={20} className="text-gray-500"/> App Behavior on Mobile
        </h3>
        <div className="space-y-2 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <Toggle label="Enable Swipe Actions (Lists)" checked={data.swipeActions} onChange={v => update("mobile", "swipeActions", v)} />
            <Toggle label="Force Compact View" checked={data.compactView} onChange={v => update("mobile", "compactView", v)} />
            <Toggle label="Show Quick Filters Bar" checked={data.quickFilters} onChange={v => update("mobile", "quickFilters", v)} />
        </div>
    </div>
  );
}

const Toggle = ({ label, checked, onChange }) => (
  <div className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0 hover:bg-white transition-colors rounded px-2">
    <span className="text-sm font-medium text-gray-700">{label}</span>
    <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" checked={checked || false} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
    </label>
  </div>
);
