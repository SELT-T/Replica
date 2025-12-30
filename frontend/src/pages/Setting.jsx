// src/pages/Setting.jsx
import React, { useState, useEffect } from "react";
import {
  Settings, Shield, Bell, Palette, Cpu, Users, LineChart,
  Smartphone, ToggleLeft, Database, Save, RefreshCw, CheckCircle, XCircle, Plus,
  Building2 // This was missing causing the crash
} from "lucide-react";

export default function SettingsPage({ onSettingsChange, isLight }) {
  const [active, setActive] = useState("userRole");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // --- CONFIG STATE ---
  const [config, setConfig] = useState({
    userRole: {
      allowSignup: true, requireConfirmation: true, defaultRole: "MIS",
      roles: ["Admin", "MIS", "Salesman", "User"],
      pendingUsers: [{ id: 1, name: "shoaib", email: "shoaib@selt-t.com", status: "Pending" }]
    },
    features: {
      Analyst: { salesOrder: true, invoice: true, tallySync: true, whatsapp: true, gst: true, export: true },
      Outstanding: { partialPay: true, bulkReminder: false, graphs: true },
      Messaging: { whatsappInt: true, bulkSend: true, retry: true, templates: true },
      Dashboard: { summary: true, graphs: true, quickActions: false },
      Reports: { exportPdf: true, filters: true, dateRange: true }
    },
    theme: { mode: "Dark", font: "Inter", sidebar: "Left", logoUrl: "" },
    notifications: { channels: { email: true, whatsapp: true, inApp: true }, triggers: { signup: true, payment: true, invoice: true } },
    security: { otpLogin: true, twoFactor: false, sessionTimeout: 30, ipWhitelist: "", passwordPolicy: "Strong" },
    hierarchy: { showDept: true, autoSync: false, allowManualEdit: false },
    reports: { visible: { sales: true, outstanding: true, recovery: true }, defaultFormat: "PDF" },
    integration: { tallyUrl: "http://localhost:9000", autoSync: true, whatsappKey: "", senderNumber: "" },
    advanced: { backupFreq: "Daily", retention: 90, autoSuspend: true, invoiceTemplate: "Professional" },
    mobile: { swipeActions: true, compactView: false, quickFilters: true }
  });

  useEffect(() => {
    const saved = localStorage.getItem("selt_full_config");
    if (saved) { try { setConfig(prev => ({...prev, ...JSON.parse(saved)})); } catch(e) {} }
  }, []);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      localStorage.setItem("selt_full_config", JSON.stringify(config));
      if (onSettingsChange) onSettingsChange(config);
      setLoading(false);
      showToast("✅ Settings Applied!");
    }, 800);
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const updateConfig = (section, key, value, subKey = null) => {
    setConfig(prev => {
      if (subKey) return { ...prev, [section]: { ...prev[section], [key]: { ...prev[section][key], [subKey]: value } } };
      return { ...prev, [section]: { ...prev[section], [key]: value } };
    });
  };

  // --- DYNAMIC COLORS ---
  const colors = {
    bg: isLight ? "bg-[#F3F4F6]" : "bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F]",
    card: isLight ? "bg-white border-gray-300 shadow-sm text-gray-800" : "bg-[#1B2A4A] border-[#223355] shadow-2xl text-gray-200",
    headerText: isLight ? "text-[#0A192F]" : "text-[#64FFDA]",
    activeTab: isLight ? "bg-[#0A192F] text-white border-[#0A192F]" : "bg-[#64FFDA] text-[#0A192F] border-[#64FFDA]",
    inactiveTab: isLight ? "bg-white text-gray-600 border-gray-300 hover:bg-gray-50" : "bg-[#112240] text-gray-400 border-[#223355] hover:bg-[#1a335f]",
    innerCard: isLight ? "bg-white border-gray-200 shadow-sm" : "bg-[#0D1B34] border-[#1E2D50]",
    input: isLight ? "bg-gray-50 border-gray-300 text-gray-900" : "bg-[#112240] border-[#223355] text-white",
    toggleBase: isLight ? "bg-gray-300" : "bg-gray-700",
    toggleActive: isLight ? "bg-[#0A192F]" : "bg-[#64FFDA]",
    subText: isLight ? "text-gray-500" : "text-gray-400"
  };

  const sections = [
    { id: "userRole", label: "Users & Roles", icon: <Users size={18} /> },
    { id: "features", label: "Features", icon: <ToggleLeft size={18} /> },
    { id: "theme", label: "Theme", icon: <Palette size={18} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={18} /> },
    { id: "security", label: "Security", icon: <Shield size={18} /> },
    { id: "hierarchy", label: "Hierarchy", icon: <Building2 size={18} /> },
    { id: "reports", label: "Reports", icon: <LineChart size={18} /> },
    { id: "integration", label: "Integration", icon: <Cpu size={18} /> },
    { id: "advanced", label: "Advanced", icon: <Database size={18} /> },
    { id: "mobile", label: "Mobile", icon: <Smartphone size={18} /> },
  ];

  const panelProps = { data: config, update: updateConfig, colors };

  return (
    <div className={`p-4 md:p-6 min-h-screen ${colors.bg} font-sans pb-24`}>
      <div className={`max-w-7xl mx-auto rounded-2xl p-6 border ${colors.card} relative`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold flex items-center gap-2 ${colors.headerText}`}>
            <Settings className="animate-spin-slow" /> Settings
          </h2>
          {toast && <div className="absolute top-6 right-6 bg-green-500 text-white px-4 py-2 rounded-lg z-50 animate-fade-in">{toast}</div>}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-8">
          {sections.map((s) => (
            <button key={s.id} onClick={() => setActive(s.id)}
              className={`flex items-center gap-2 px-3 py-3 rounded-lg text-sm font-semibold transition-all border ${active === s.id ? colors.activeTab : colors.inactiveTab}`}>
              {s.icon} <span className="truncate">{s.label}</span>
            </button>
          ))}
        </div>

        <div className="min-h-[500px] animate-fadeIn">
           {active === "userRole" && <UserRolePanel data={config.userRole} {...panelProps} />}
           {active === "features" && <FeaturesPanel data={config.features} {...panelProps} />}
           {active === "theme" && <ThemePanel data={config.theme} {...panelProps} />}
           {active === "notifications" && <NotificationsPanel data={config.notifications} {...panelProps} />}
           {active === "security" && <SecurityPanel data={config.security} {...panelProps} />}
           {active === "hierarchy" && <HierarchyPanel data={config.hierarchy} {...panelProps} />}
           {active === "reports" && <ReportsPanel data={config.reports} {...panelProps} />}
           {active === "integration" && <IntegrationPanel data={config.integration} {...panelProps} />}
           {active === "advanced" && <AdvancedPanel data={config.advanced} {...panelProps} />}
           {active === "mobile" && <MobilePanel data={config.mobile} {...panelProps} />}
        </div>

        <div className="fixed bottom-8 right-8 z-50">
          <button onClick={handleSave} disabled={loading}
            className={`flex items-center gap-2 px-8 py-4 rounded-full font-bold shadow-lg hover:scale-105 transition-all disabled:opacity-50 ${isLight ? "bg-[#0A192F] text-white" : "bg-[#64FFDA] text-[#0A192F]"}`}>
            {loading ? <RefreshCw className="animate-spin" size={24} /> : <Save size={24} />}
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- SUB COMPONENTS ---
const Toggle = ({ label, checked, onChange, colors }) => (
  <div className={`flex justify-between items-center py-2 border-b ${colors.subText === "text-gray-500" ? "border-gray-200" : "border-[#122240]"}`}>
    <span className={`text-sm ${colors.subText}`}>{label}</span>
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" checked={checked || false} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
      <div className={`w-10 h-5 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all ${checked ? colors.toggleActive : colors.toggleBase}`}></div>
    </label>
  </div>
);

function UserRolePanel({ data, update, colors }) {
  const [newRole, setNewRole] = useState("");
  const handleAddRole = () => { if(newRole && !data.roles.includes(newRole)) { update("userRole", "roles", [...data.roles, newRole]); setNewRole(""); } };
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className={`p-5 rounded-xl border ${colors.innerCard}`}>
        <h3 className={`text-lg font-bold mb-4 ${colors.headerText}`}>Roles</h3>
        <div className="space-y-4">
          <Toggle label="Allow Signups" checked={data.allowSignup} onChange={v => update("userRole", "allowSignup", v)} colors={colors} />
          <div><label className={`block text-sm mb-1 ${colors.subText}`}>Default Role</label>
            <select value={data.defaultRole} onChange={e => update("userRole", "defaultRole", e.target.value)} className={`w-full p-2 rounded border ${colors.input}`}>
              {data.roles.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div><label className={`block text-sm mb-1 ${colors.subText}`}>New Role</label>
             <div className="flex gap-2"><input value={newRole} onChange={e => setNewRole(e.target.value)} className={`w-full p-2 rounded border ${colors.input}`} placeholder="Role Name"/><button onClick={handleAddRole} className={`p-2 rounded ${colors.toggleActive} text-white`}><Plus/></button></div>
             <div className="flex flex-wrap gap-2 mt-2">{data.roles.map(r => <span key={r} className={`px-2 py-1 text-xs rounded border ${colors.input}`}>{r}</span>)}</div>
          </div>
        </div>
      </div>
      <div className={`p-5 rounded-xl border ${colors.innerCard}`}>
        <h3 className={`text-lg font-bold mb-4 ${colors.headerText}`}>Pending Users</h3>
        {data.pendingUsers.map(u => (
           <div key={u.id} className={`flex justify-between items-center p-3 mb-2 rounded border ${colors.input}`}>
              <div><p className="font-medium">{u.name}</p><p className={`text-xs ${colors.subText}`}>{u.email}</p></div>
              <div className="flex gap-2"><CheckCircle className="text-green-500 cursor-pointer" onClick={()=>update("userRole", "pendingUsers", data.pendingUsers.filter(x=>x.id!==u.id))}/><XCircle className="text-red-500 cursor-pointer" onClick={()=>update("userRole", "pendingUsers", data.pendingUsers.filter(x=>x.id!==u.id))}/></div>
           </div>
        ))}
        {data.pendingUsers.length === 0 && <p className={colors.subText}>No pending users.</p>}
      </div>
    </div>
  );
}

function FeaturesPanel({ data, update, colors }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Object.entries(data).map(([mod, feats]) => (
        <div key={mod} className={`p-4 rounded-xl border ${colors.innerCard}`}>
          <h4 className={`font-bold mb-3 border-b pb-2 ${colors.headerText} ${colors.subText === "text-gray-500" ? "border-gray-200" : "border-[#1E2D50]"}`}>{mod}</h4>
          <div className="space-y-2">{Object.entries(feats).map(([k, v]) => <Toggle key={k} label={k.replace(/([A-Z])/g, ' $1')} checked={v} onChange={val => update("features", mod, val, k)} colors={colors} />)}</div>
        </div>
      ))}
    </div>
  );
}

function ThemePanel({ data, update, colors }) {
  return (
    <div className={`p-6 rounded-xl border ${colors.innerCard} grid md:grid-cols-2 gap-6`}>
      <div className="space-y-4">
        <div><label className={`block text-sm mb-1 ${colors.subText}`}>Mode</label>
          <select value={data.mode} onChange={e => update("theme", "mode", e.target.value)} className={`w-full p-2 rounded border ${colors.input}`}><option>Dark</option><option>Light</option></select>
        </div>
        <div><label className={`block text-sm mb-1 ${colors.subText}`}>Font</label>
          <select value={data.font} onChange={e => update("theme", "font", e.target.value)} className={`w-full p-2 rounded border ${colors.input}`}><option>Inter</option><option>Roboto</option><option>Poppins</option></select>
        </div>
      </div>
      <div className="space-y-4">
         <div><label className={`block text-sm mb-1 ${colors.subText}`}>Sidebar Position</label>
          <div className="flex gap-4">
             <label className={`flex items-center gap-2 cursor-pointer ${colors.subText}`}><input type="radio" checked={data.sidebar === "Left"} onChange={() => update("theme", "sidebar", "Left")} /> Left</label>
             <label className={`flex items-center gap-2 cursor-pointer ${colors.subText}`}><input type="radio" checked={data.sidebar === "Right"} onChange={() => update("theme", "sidebar", "Right")} /> Right</label>
          </div>
        </div>
        <div><label className={`block text-sm mb-1 ${colors.subText}`}>Logo URL</label>
           <input value={data.logoUrl} onChange={e => update("theme", "logoUrl", e.target.value)} className={`w-full p-2 rounded border ${colors.input}`} placeholder="https://..." />
        </div>
      </div>
    </div>
  );
}

function NotificationsPanel({ data, update, colors }) {
  return (
    <div className={`p-6 rounded-xl border ${colors.innerCard} space-y-6`}>
      <div><h3 className={`font-bold mb-3 ${colors.headerText}`}>Channels</h3><div className="flex flex-wrap gap-6">{["email", "whatsapp", "inApp"].map(c => <Toggle key={c} label={c.charAt(0).toUpperCase()+c.slice(1)} checked={data.channels[c]} onChange={v => update("notifications", "channels", v, c)} colors={colors}/>)}</div></div>
      <div><h3 className={`font-bold mb-3 ${colors.headerText}`}>Triggers</h3><div className="grid md:grid-cols-2 gap-4">{Object.entries(data.triggers).map(([k, v]) => <Toggle key={k} label={`On ${k}`} checked={v} onChange={val => update("notifications", "triggers", val, k)} colors={colors} />)}</div></div>
    </div>
  );
}

function SecurityPanel({ data, update, colors }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
       <div className={`p-5 rounded-xl border ${colors.innerCard} space-y-4`}>
          <h3 className={`font-bold ${colors.headerText}`}>Auth</h3>
          <Toggle label="OTP Login" checked={data.otpLogin} onChange={v => update("security", "otpLogin", v)} colors={colors} />
          <Toggle label="2FA" checked={data.twoFactor} onChange={v => update("security", "twoFactor", v)} colors={colors} />
          <div><label className={`text-sm ${colors.subText}`}>Timeout (Min)</label><input type="number" value={data.sessionTimeout} onChange={e => update("security", "sessionTimeout", e.target.value)} className={`w-full mt-1 p-2 rounded border ${colors.input}`} /></div>
       </div>
       <div className={`p-5 rounded-xl border ${colors.innerCard} space-y-4`}>
          <h3 className={`font-bold ${colors.headerText}`}>Network</h3>
          <label className={`text-sm block ${colors.subText}`}>Whitelist IPs</label>
          <textarea value={data.ipWhitelist} onChange={e => update("security", "ipWhitelist", e.target.value)} className={`w-full h-24 p-2 rounded border ${colors.input}`} />
       </div>
    </div>
  );
}

function HierarchyPanel({ data, update, colors }) {
  return (
    <div className={`p-5 rounded-xl border ${colors.innerCard} text-center py-10`}>
       <Building2 size={48} className={`mx-auto mb-4 opacity-80 ${colors.headerText}`} />
       <h3 className={`font-bold mb-4 ${colors.headerText}`}>Structure</h3>
       <div className="max-w-md mx-auto space-y-4 text-left">
          <Toggle label="Show Depts" checked={data.showDept} onChange={v => update("hierarchy", "showDept", v)} colors={colors} />
          <Toggle label="Auto-Sync" checked={data.autoSync} onChange={v => update("hierarchy", "autoSync", v)} colors={colors} />
          <Toggle label="Manual Override" checked={data.allowManualEdit} onChange={v => update("hierarchy", "allowManualEdit", v)} colors={colors} />
       </div>
    </div>
  );
}

function ReportsPanel({ data, update, colors }) {
  return (
    <div className={`p-5 rounded-xl border ${colors.innerCard}`}>
       <h3 className={`font-bold mb-4 ${colors.headerText}`}>Reports Config</h3>
       <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3"><h4 className={`text-sm ${colors.subText}`}>Visibility</h4>{Object.entries(data.visible).map(([k, v]) => <Toggle key={k} label={k.charAt(0).toUpperCase()+k.slice(1)} checked={v} onChange={val => update("reports", "visible", val, k)} colors={colors} />)}</div>
          <div><h4 className={`text-sm mb-2 ${colors.subText}`}>Default Format</h4><select value={data.defaultFormat} onChange={e => update("reports", "defaultFormat", e.target.value)} className={`w-full p-2 rounded border ${colors.input}`}><option>PDF</option><option>Excel</option><option>CSV</option></select></div>
       </div>
    </div>
  );
}

function IntegrationPanel({ data, update, colors }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
       <div className={`p-5 rounded-xl border ${colors.innerCard}`}>
          <h4 className={`font-bold mb-4 flex items-center gap-2 ${colors.headerText}`}><Cpu size={18}/> Tally</h4>
          <div className="space-y-4">
             <div><label className={`text-sm ${colors.subText}`}>URL</label><input value={data.tallyUrl} onChange={e => update("integration", "tallyUrl", e.target.value)} className={`w-full mt-1 p-2 rounded border ${colors.input}`} /></div>
             <Toggle label="Auto Sync" checked={data.autoSync} onChange={v => update("integration", "autoSync", v)} colors={colors} />
          </div>
       </div>
       <div className={`p-5 rounded-xl border ${colors.innerCard}`}>
          <h4 className={`font-bold mb-4 flex items-center gap-2 ${colors.headerText}`}><Smartphone size={18}/> WhatsApp</h4>
          <div className="space-y-4">
             <div><label className={`text-sm ${colors.subText}`}>API Key</label><input type="password" value={data.whatsappKey} onChange={e => update("integration", "whatsappKey", e.target.value)} className={`w-full mt-1 p-2 rounded border ${colors.input}`} /></div>
             <div><label className={`text-sm ${colors.subText}`}>Number</label><input value={data.senderNumber} onChange={e => update("integration", "senderNumber", e.target.value)} className={`w-full mt-1 p-2 rounded border ${colors.input}`} /></div>
          </div>
       </div>
    </div>
  );
}

function AdvancedPanel({ data, update, colors }) {
  return (
    <div className={`p-5 rounded-xl border ${colors.innerCard} flex flex-wrap gap-4 justify-between items-center`}>
       <div className="space-y-4 w-full md:w-auto">
          <div><label className={`text-sm ${colors.subText}`}>Backup Freq</label><select value={data.backupFreq} onChange={e => update("advanced", "backupFreq", e.target.value)} className={`w-full mt-1 p-2 rounded border ${colors.input}`}><option>Hourly</option><option>Daily</option><option>Weekly</option></select></div>
          <div><label className={`text-sm ${colors.subText}`}>Retention (Days)</label><input type="number" value={data.retention} onChange={e => update("advanced", "retention", e.target.value)} className={`w-full mt-1 p-2 rounded border ${colors.input}`} /></div>
       </div>
       <div className="flex flex-col gap-2 w-full md:w-auto">
          <button className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/50 text-red-500 rounded hover:bg-red-500 hover:text-white transition"><Trash2 size={16}/> Clear Cache</button>
          <button className={`flex items-center gap-2 px-4 py-2 rounded border transition ${isLight ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-[#64FFDA]/10 border-[#64FFDA]/50 text-[#64FFDA]"}`}><Download size={16}/> Export Config</button>
       </div>
    </div>
  );
}

function MobilePanel({ data, update, colors }) {
  return (
    <div className={`p-5 rounded-xl border ${colors.innerCard} space-y-4`}>
       <h3 className={`font-bold ${colors.headerText}`}>Mobile App</h3>
       <Toggle label="Swipe Actions" checked={data.swipeActions} onChange={v => update("mobile", "swipeActions", v)} colors={colors} />
       <Toggle label="Compact View" checked={data.compactView} onChange={v => update("mobile", "compactView", v)} colors={colors} />
       <Toggle label="Quick Filters" checked={data.quickFilters} onChange={v => update("mobile", "quickFilters", v)} colors={colors} />
    </div>
  );
}
