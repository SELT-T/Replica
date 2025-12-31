// src/components/Sidebar.jsx
import React, { useState } from "react";
// FIXED IMPORTS: Using standard icons that are compatible with all Lucide versions
import {
  Grid, FileText, Layers, DollarSign, PieChart, MessageCircle,
  Users, Settings, BookOpen, Menu, Search, ChevronRight
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ onNavigate, settings, isLight, t }) {
  const { user, canView } = useAuth();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeKey, setActiveKey] = useState("dashboard"); // Track active item

  const isRight = settings?.theme?.sidebar === "Right";
  const logoUrl = settings?.theme?.logoUrl || "/logo.png";

  // Dynamic Styles based on Theme
  const sidebarBg = isLight 
    ? "bg-white border-gray-200 text-gray-700 shadow-xl" 
    : "bg-[#0A192F] border-[#1E2D45] text-gray-300 shadow-2xl";

  const inputBg = isLight 
    ? "bg-gray-50 border-gray-200 text-gray-800 focus:bg-white focus:ring-blue-500/20" 
    : "bg-[#112240] border-[#1E2D45] text-gray-200 focus:ring-[#64FFDA]/20";

  // Navigation Items Config - USING SAFE ICONS
  const allItems = [
    { k: "dashboard", icon: <Grid size={20} />, label: t('dashboard'), color: "text-blue-500" },
    { k: "reports", icon: <FileText size={20} />, label: t('reports'), color: "text-purple-500" },
    { k: "hierarchy", icon: <Layers size={20} />, label: t('hierarchy'), color: "text-orange-500" },
    { k: "outstanding", icon: <DollarSign size={20} />, label: t('outstanding'), color: "text-green-500" },
    { k: "analyst", icon: <PieChart size={20} />, label: t('analyst'), color: "text-cyan-500" },
    { k: "messaging", icon: <MessageCircle size={20} />, label: t('messaging'), color: "text-pink-500" },
    { k: "usermanagement", icon: <Users size={20} />, label: t('usermanagement'), color: "text-indigo-500" },
    { k: "setting", icon: <Settings size={20} />, label: t('settings'), color: "text-slate-500" },
    { k: "helpsupport", icon: <BookOpen size={20} />, label: t('helpsupport'), color: "text-red-500" },
  ];

  const allowedItems = allItems.filter((item) => canView(item.k));
  const filteredItems = allowedItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNav = (key) => {
    setActiveKey(key);
    onNavigate(key);
    setOpen(false);
  };

  if (!user) return null;

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className={`fixed top-4 z-50 lg:hidden p-2 rounded-lg shadow-lg transition-transform active:scale-95 ${
          isLight ? "bg-white text-blue-600 border border-gray-100" : "bg-[#64FFDA] text-[#0A192F]"
        } ${isRight ? "right-4" : "left-4"}`}
        onClick={() => setOpen(!open)}
      >
        <Menu size={24} strokeWidth={2.5} />
      </button>

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 h-full w-72 transform transition-transform duration-300 ease-in-out z-40 border-r
        ${sidebarBg}
        ${isRight ? "right-0 border-l" : "left-0 border-r"} 
        ${open ? "translate-x-0" : (isRight ? "translate-x-full" : "-translate-x-full")} 
        lg:translate-x-0`}
      >
        {/* Header / Logo Section */}
        <div className={`flex flex-col items-center py-8 relative ${isLight ? "bg-gradient-to-b from-blue-50/50 to-transparent" : ""}`}>
          <div className="bg-white p-3 rounded-xl mb-4 shadow-sm border border-gray-100 relative group">
            <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <img src={logoUrl} alt="Logo" className="w-44 h-auto object-contain relative z-10" />
          </div>
          
          <h1 className={`text-2xl font-black tracking-tight ${isLight ? "text-gray-900" : "text-white"}`}>
            SEL-T <span className="text-blue-500 text-lg font-bold">.PRO</span>
          </h1>
          <p className={`text-[11px] font-medium uppercase tracking-widest mt-1 ${isLight ? "text-gray-400" : "text-gray-500"}`}>
            Business Intelligence
          </p>

          <div className={`mt-4 flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${
             isLight 
             ? "bg-white border-blue-100 text-blue-700 shadow-sm" 
             : "bg-[#64FFDA]/10 border-[#64FFDA]/20 text-[#64FFDA]"
          }`}>
             <div className={`w-2 h-2 rounded-full ${isLight ? "bg-green-500" : "bg-[#64FFDA] animate-pulse"}`}></div>
             {user.role.toUpperCase()}
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-5 mb-2">
          <div className="relative group">
            <Search className={`absolute left-3 top-2.5 transition-colors ${
                isLight ? "text-gray-400 group-focus-within:text-blue-500" : "text-gray-500 group-focus-within:text-[#64FFDA]"
            }`} size={16} />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium border outline-none transition-all ${inputBg}`}
            />
          </div>
        </div>

        {/* Navigation List */}
        <nav className="px-4 space-y-1.5 overflow-y-auto max-h-[calc(100vh-320px)] custom-scrollbar py-2">
          {filteredItems.length > 0 ? (
            filteredItems.map((it) => {
               const isActive = activeKey === it.k;
               
               // Dynamic Active/Hover Classes
               let itemClasses = "";
               if (isLight) {
                 itemClasses = isActive 
                   ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100" 
                   : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent";
               } else {
                 itemClasses = isActive
                   ? "bg-[#112240] text-[#64FFDA] border-l-4 border-[#64FFDA]"
                   : "text-gray-400 hover:bg-[#112240] hover:text-white border-l-4 border-transparent";
               }

               return (
                  <button
                    key={it.k}
                    onClick={() => handleNav(it.k)}
                    className={`w-full text-left flex items-center justify-between px-3.5 py-3 rounded-lg font-semibold transition-all duration-200 group relative overflow-hidden ${itemClasses}`}
                  >
                    <div className="flex items-center gap-3.5 relative z-10">
                      <span className={`transition-transform duration-300 group-hover:scale-110 ${isActive ? (isLight ? "text-blue-600" : "text-[#64FFDA]") : (isLight ? it.color : "text-gray-500 group-hover:text-white")}`}>
                        {it.icon}
                      </span>
                      <span className="text-[13.5px] tracking-wide">{it.label}</span>
                    </div>
                    
                    <ChevronRight 
                       size={14} 
                       className={`transition-all duration-300 ${isActive ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 group-hover:opacity-50 group-hover:translate-x-0"}`} 
                    />
                  </button>
               );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
               <span className="text-gray-300 mb-2">🚫</span>
               <p className="text-gray-400 text-xs font-medium">No modules found</p>
            </div>
          )}
        </nav>

        {/* Footer Area */}
        <div className={`absolute bottom-0 w-full p-4 border-t ${isLight ? "border-gray-100 bg-gray-50/50" : "border-[#1E2D45] bg-[#0A192F]"}`}>
           <p className={`text-[10px] text-center font-medium ${isLight ? "text-gray-400" : "text-gray-600"}`}>
             v2.4.0 • Enterprise Edition
           </p>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {open && (
        <div 
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-[2px] z-30 lg:hidden transition-opacity" 
          onClick={() => setOpen(false)}
        ></div>
      )}
    </>
  );
}
