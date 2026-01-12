// src/components/Sidebar.jsx
import React, { useState } from "react";
// SAFE ICONS: Compatible with all versions
import {
  Grid, FileText, Layers, DollarSign, PieChart, MessageCircle,
  Users, Settings, BookOpen, Menu, Search, X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ onNavigate, currentRoute, settings, isLight, t }) {
  const { user, canView } = useAuth();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const activeKey = currentRoute || "dashboard";
  const isRight = settings?.theme?.sidebar === "Right";
  const logoUrl = settings?.theme?.logoUrl || "/logo.png";

  const shortcutMap = {
    dashboard: "F1", reports: "F2", hierarchy: "F3", outstanding: "F4",
    analyst: "F5", messaging: "F6", usermanagement: "F7", setting: "F8", helpsupport: "F9"
  };

  const sidebarBg = isLight 
    ? "bg-white/95 backdrop-blur-xl border-gray-200 text-slate-800 shadow-2xl" 
    : "bg-[#0A192F]/95 backdrop-blur-xl border-[#1E2D45] text-gray-300 shadow-2xl";

  const inputBg = isLight 
    ? "bg-gray-50 border-gray-200 text-slate-800 focus:bg-white focus:ring-blue-900/20" 
    : "bg-[#112240] border-[#1E2D45] text-gray-200 focus:ring-[#64FFDA]/20";

  const toggleBtnClass = isLight
    ? "bg-white/80 backdrop-blur-md text-blue-900 border border-white/40 shadow-lg shadow-blue-900/5"
    : "bg-[#0A192F]/80 backdrop-blur-md text-[#64FFDA] border border-[#64FFDA]/20 shadow-lg";

  const allItems = [
    { k: "dashboard", icon: <Grid size={20} />, label: t('dashboard'), color: "text-blue-700" },
    { k: "reports", icon: <FileText size={20} />, label: t('reports'), color: "text-indigo-600" },
    { k: "hierarchy", icon: <Layers size={20} />, label: t('hierarchy'), color: "text-blue-600" },
    { k: "outstanding", icon: <DollarSign size={20} />, label: t('outstanding'), color: "text-teal-600" },
    { k: "analyst", icon: <PieChart size={20} />, label: t('analyst'), color: "text-cyan-600" },
    { k: "messaging", icon: <MessageCircle size={20} />, label: t('messaging'), color: "text-sky-600" },
    { k: "usermanagement", icon: <Users size={20} />, label: t('usermanagement'), color: "text-indigo-700" },
    { k: "setting", icon: <Settings size={20} />, label: t('settings'), color: "text-slate-600" },
    { k: "helpsupport", icon: <BookOpen size={20} />, label: t('helpsupport'), color: "text-red-500" },
  ];

  const allowedItems = allItems.filter((item) => canView(item.k));
  const filteredItems = allowedItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNav = (key) => {
    onNavigate(key);
    setOpen(false);
  };

  if (!user) return null;

  return (
    <>
      <button
        className={`fixed top-3 left-3 z-[60] lg:hidden p-2.5 rounded-xl transition-all duration-300 active:scale-95 ${toggleBtnClass} ${isRight ? "right-3 left-auto" : "left-3"}`}
        onClick={() => setOpen(!open)}
        aria-label="Toggle Menu"
      >
        {open ? <X size={24} strokeWidth={2.5} /> : <Menu size={24} strokeWidth={2.5} />}
      </button>

      {/* Main Layout Change: Added flex flex-col to parent */}
      <aside
        className={`fixed top-0 h-full w-72 max-w-[85vw] transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) z-50 border-r flex flex-col
        ${sidebarBg}
        ${isRight ? "right-0 border-l translate-x-full lg:translate-x-0" : "left-0 border-r -translate-x-full lg:translate-x-0"} 
        ${open ? "!translate-x-0" : ""}
        `}
      >
        {/* Header - Added flex-shrink-0 */}
        <div className={`flex-shrink-0 flex flex-col items-center py-6 relative ${isLight ? "bg-gradient-to-b from-blue-50/50 to-transparent" : ""}`}>
          <div className="bg-white p-3 rounded-xl mb-3 shadow-sm border border-gray-100 relative group">
            <div className="absolute inset-0 bg-blue-900/5 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <img src={logoUrl} alt="Logo" className="w-36 h-auto object-contain relative z-10" />
          </div>
          
          <h1 className={`text-xl font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
            SEL-T <span className="text-blue-700 text-lg font-bold">.PRO</span>
          </h1>
          <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mt-1 ${isLight ? "text-slate-400" : "text-gray-500"}`}>
            Business Intelligence
          </p>

          <div className={`mt-3 flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold border ${
             isLight 
             ? "bg-white border-blue-100 text-blue-900 shadow-sm" 
             : "bg-[#64FFDA]/10 border-[#64FFDA]/20 text-[#64FFDA]"
          }`}>
             <span className={`relative flex h-2 w-2`}>
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLight ? "bg-green-400" : "bg-[#64FFDA]"}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isLight ? "bg-green-500" : "bg-[#64FFDA]"}`}></span>
              </span>
             {user.role.toUpperCase()}
          </div>
        </div>

        {/* Search - Added flex-shrink-0 */}
        <div className="flex-shrink-0 px-4 mb-2">
          <div className="relative group">
            <Search className={`absolute left-3 top-2.5 transition-colors ${
                isLight ? "text-slate-400 group-focus-within:text-blue-700" : "text-gray-500 group-focus-within:text-[#64FFDA]"
            }`} size={16} />
            <input
              type="text"
              placeholder={t('searchPlaceholder') || "Search modules..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-xl text-sm font-medium border outline-none transition-all ${inputBg}`}
            />
          </div>
        </div>

        {/* Nav - Changed to flex-1 overflow-y-auto to fill remaining space */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-1 custom-scrollbar py-2 min-h-0">
          {filteredItems.length > 0 ? (
            filteredItems.map((it) => {
               const isActive = activeKey === it.k;
               const shortcutKey = shortcutMap[it.k];
               
               let itemClasses = "";
               if (isLight) {
                 itemClasses = isActive 
                   ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                   : "text-slate-600 hover:bg-slate-50 hover:text-slate-900";
               } else {
                 itemClasses = isActive
                   ? "bg-[#112240] text-[#64FFDA] border-l-2 border-[#64FFDA]"
                   : "text-gray-400 hover:bg-[#112240] hover:text-white";
               }

               return (
                  <button
                    key={it.k}
                    onClick={() => handleNav(it.k)}
                    className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all duration-200 group ${itemClasses}`}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <span className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? "text-white" : (isLight ? it.color : "text-gray-500 group-hover:text-white")}`}>
                        {it.icon}
                      </span>
                      <span className="text-[13px] tracking-wide">{it.label}</span>
                      
                      {shortcutKey && (
                        <span className={`hidden lg:block ml-auto text-[9px] px-1.5 py-0.5 rounded border opacity-60 ${
                          isActive 
                            ? "border-white/30 text-white" 
                            : (isLight ? "border-gray-200 text-gray-400" : "border-[#1E2D45] text-gray-500")
                        }`}>
                          {shortcutKey}
                        </span>
                      )}
                    </div>
                  </button>
               );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
               <span className="text-gray-300 mb-2 opacity-50">🚫</span>
               <p className="text-gray-400 text-xs font-medium">No modules found</p>
            </div>
          )}
        </nav>

        {/* Footer - Removed absolute, added flex-shrink-0 to sit at bottom naturally */}
        <div className={`flex-shrink-0 w-full p-4 border-t ${isLight ? "border-gray-100 bg-gray-50/80" : "border-[#1E2D45] bg-[#0A192F]"}`}>
           <p className={`text-[10px] text-center font-bold tracking-wider opacity-60 ${isLight ? "text-slate-500" : "text-gray-500"}`}>
             v2.5.0 • Enterprise
           </p>
        </div>
      </aside>

      {open && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-[3px] z-40 lg:hidden transition-opacity duration-300" 
          onClick={() => setOpen(false)}
        ></div>
      )}
    </>
  );
}
