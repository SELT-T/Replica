// src/components/Header.jsx
import React, { useState, useEffect, useRef } from "react";
import { 
  Bell, Globe, Plus, Clock, Search, Maximize, 
  CheckCircle, AlertTriangle, User, ChevronDown, 
  UserCircle, CreditCard, Settings, LogOut, X, Mail, Shield, Hash, Menu
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Header({ onNavigate, openLogin, openSignup, isLight, currentLang, onLanguageChange, t, toggleSidebar }) {
  const { user, logout } = useAuth();
  
  // --- STATE ---
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showProfilePopup, setShowProfilePopup] = useState(false); 
  const [searchQuery, setSearchQuery] = useState("");
  const [userStatus, setUserStatus] = useState("Active"); 
  const [time, setTime] = useState(new Date());
  
  const menuRef = useRef(null);

  // --- REALISTIC NOTIFICATIONS ---
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("selt_notifications");
    return saved ? JSON.parse(saved) : [
      { id: 1, title: "System Online", desc: "Analytics engine connected successfully.", time: "Just now", type: "success" },
      { id: 2, title: "Data Sync", desc: "Tally synchronization completed.", time: "5m ago", type: "info" },
      { id: 3, title: "Security Alert", desc: "New login detected from IP 192.168.1.4", time: "1h ago", type: "warning" }
    ];
  });

  useEffect(() => {
    localStorage.setItem("selt_notifications", JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
        setShowNotifMenu(false);
        setShowLangMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- HANDLERS ---
  const handleLanguageSelect = (lang) => {
    onLanguageChange(lang); 
    setShowLangMenu(false);
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(()=>{});
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  const changeUserStatus = () => {
    const statuses = ["Active", "Busy", "Away"];
    const next = statuses[(statuses.indexOf(userStatus) + 1) % statuses.length];
    setUserStatus(next);
  };

  // --- STYLES (ADAPTIVE) ---
  const theme = {
    header: isLight 
      ? "bg-white/80 border-b border-gray-200 text-gray-800 backdrop-blur-md shadow-sm" 
      : "bg-[#0A192F]/90 border-b border-[#1E2D45] text-white backdrop-blur-md shadow-md",
    search: isLight
      ? "bg-gray-100 text-gray-700 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500/20 border-transparent"
      : "bg-[#112240] text-gray-200 placeholder-gray-500 focus:bg-[#0A192F] focus:ring-2 focus:ring-[#64FFDA]/50 border-[#1E2D45]",
    iconBtn: isLight
      ? "hover:bg-gray-100 text-gray-500 hover:text-blue-600 active:bg-gray-200"
      : "hover:bg-[#112240] text-gray-400 hover:text-[#64FFDA] active:bg-[#1E2D45]",
    dropdown: isLight
      ? "bg-white border border-gray-100 shadow-xl text-gray-700 ring-1 ring-black/5"
      : "bg-[#112240] border border-[#1E2D45] shadow-2xl text-white",
    divider: isLight ? "border-gray-100" : "border-[#1E2D45]",
    textMuted: isLight ? "text-gray-400" : "text-gray-500",
    textHighlight: isLight ? "text-blue-600" : "text-[#64FFDA]",
    statusColor: userStatus === "Active" ? "bg-green-500" : userStatus === "Busy" ? "bg-red-500" : "bg-yellow-500",
  };

  return (
    <>
      {/* NOTE: 'lg:pl-72' is added here to push the header right when the sidebar is fixed. 
         This solves your "Header hidden behind Sidebar" issue. 
      */}
      <header className={`sticky top-0 z-30 h-[72px] w-full transition-all duration-300 lg:pl-72 ${theme.header}`}>
        <div className="flex items-center justify-between px-4 sm:px-6 h-full w-full max-w-[1920px] mx-auto" ref={menuRef}>

          {/* LEFT: Mobile Menu & Breadcrumb */}
          <div className="flex items-center gap-4 flex-1 overflow-hidden">
             {/* Mobile Menu Trigger */}
             <button 
                className="lg:hidden p-2 -ml-2 rounded-md hover:bg-gray-100 text-gray-600"
                onClick={toggleSidebar}
             >
                <Menu size={24} />
             </button>

             <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                   <span>Pages</span>
                   <span className="text-gray-300">/</span>
                   <span className={theme.textHighlight}>{t(onNavigate.name || "Dashboard")}</span>
                </div>
                <h2 className={`text-base font-bold truncate leading-tight ${isLight ? "text-gray-800" : "text-white"}`}>
                   {t('welcome')} <span className="font-normal opacity-60">Manager</span>
                </h2>
             </div>
          </div>

          {/* CENTER: Search Bar */}
          <div className="hidden md:flex flex-1 justify-center max-w-lg mx-4">
             <div className="relative w-full group">
               <Search className={`absolute left-3.5 top-2.5 w-4 h-4 transition-colors ${theme.textMuted} group-focus-within:text-blue-500`} />
               <input
                 type="text"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 placeholder="Type / to search..."
                 className={`w-full pl-10 pr-12 py-2 rounded-full text-sm outline-none border transition-all shadow-sm ${theme.search}`}
               />
               <div className="absolute right-3 top-2 flex items-center gap-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border font-sans font-medium ${isLight ? "bg-white border-gray-200 text-gray-400" : "bg-[#0A192F] border-[#1E2D45] text-gray-500"}`}>/</span>
               </div>
             </div>
          </div>

          {/* RIGHT: Actions & Profile */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
             
             {/* Add Button */}
             <button className={`p-2.5 rounded-full hidden sm:flex items-center justify-center transition-all active:scale-95 ${isLight ? "bg-gray-900 text-white hover:bg-black shadow-md shadow-gray-200" : "bg-[#64FFDA] text-[#0A192F] hover:bg-[#4cc9ac]"} `} title={t('newEntry')}>
                <Plus size={18} strokeWidth={2.5} />
             </button>

             <div className={`h-6 w-px mx-1 ${theme.divider}`}></div>

             {/* Language Selector */}
             <div className="relative">
                <button onClick={() => setShowLangMenu(!showLangMenu)} className={`p-2 rounded-xl flex items-center gap-1 transition-all ${theme.iconBtn}`}>
                   <Globe size={18} />
                   <span className="text-xs font-bold">{currentLang === "English" ? "EN" : "HI"}</span>
                </button>
                {showLangMenu && (
                   <div className={`absolute right-0 mt-3 w-36 rounded-xl py-1 animate-in fade-in zoom-in-95 duration-100 z-50 ${theme.dropdown}`}>
                      {['English', 'Hindi'].map(l => (
                         <button key={l} onClick={() => handleLanguageSelect(l)} className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors ${currentLang===l ? "text-blue-600 bg-blue-50" : ""}`}>
                           {l}
                         </button>
                      ))}
                   </div>
                )}
             </div>

             {/* Notifications */}
             <div className="relative">
               <button onClick={() => setShowNotifMenu(!showNotifMenu)} className={`p-2 rounded-xl relative transition-all ${theme.iconBtn}`}>
                 <Bell size={20} />
                 {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                 )}
               </button>
               
               {showNotifMenu && (
                 <div className={`absolute right-0 mt-4 w-80 sm:w-96 rounded-2xl py-2 animate-in slide-in-from-top-2 z-50 ${theme.dropdown}`}>
                   <div className={`px-5 py-3 border-b flex justify-between items-center ${theme.divider}`}>
                     <span className="font-bold text-sm">Notifications</span>
                     {notifications.length > 0 && <button onClick={handleClearNotifications} className="text-xs text-blue-500 hover:text-blue-700 font-medium">Mark all read</button>}
                   </div>
                   <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-2 space-y-1">
                     {notifications.length === 0 ? (
                        <div className="py-8 text-center flex flex-col items-center opacity-50">
                           <Bell size={32} strokeWidth={1.5} className="mb-2 text-gray-300"/>
                           <span className="text-xs font-medium">All caught up!</span>
                        </div>
                     ) : notifications.map((n) => (
                         <div key={n.id} className={`p-3 rounded-xl flex gap-3 transition-colors ${isLight ? "hover:bg-gray-50" : "hover:bg-[#1E2D45]"}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${n.type === 'success' ? 'bg-green-100 text-green-600' : n.type === 'warning' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                               {n.type === 'success' ? <CheckCircle size={18}/> : n.type === 'warning' ? <AlertTriangle size={18}/> : <User size={18}/>}
                            </div>
                            <div className="flex-1 min-w-0">
                               <div className="flex justify-between items-start">
                                  <p className={`text-sm font-semibold ${isLight ? "text-gray-900" : "text-white"}`}>{n.title}</p>
                                  <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">{n.time}</span>
                               </div>
                               <p className={`text-xs mt-0.5 truncate ${theme.textMuted}`}>{n.desc}</p>
                            </div>
                         </div>
                       ))
                     }
                   </div>
               </div>
               )}
             </div>

             {/* User Profile */}
             {!user ? (
               <div className="flex gap-2 ml-2">
                 <button onClick={openLogin} className="px-5 py-2 rounded-full text-sm font-bold border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Login</button>
                 <button onClick={openSignup} className="px-5 py-2 rounded-full text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-colors">Sign Up</button>
               </div>
             ) : (
               <div className="relative ml-1">
                 <button onClick={() => setShowProfileMenu(!showProfileMenu)} className={`flex items-center gap-3 pl-1 pr-2 py-1 rounded-full border transition-all hover:shadow-md ${isLight ? "bg-white border-gray-200" : "bg-[#112240] border-[#1E2D45] hover:border-[#64FFDA]"}`}>
                   <div className="relative">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-sm ring-2 ring-white">
                         {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-white rounded-full ${theme.statusColor}`}></span>
                   </div>
                   <div className="hidden md:block text-left leading-tight pr-2">
                      <p className={`text-xs font-bold ${isLight ? "text-gray-800" : "text-white"}`}>Hi, {user.name.split(' ')[0]}</p>
                      <p className={`text-[10px] font-medium ${theme.textMuted}`}>{user.role || "Admin"}</p>
                   </div>
                   <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${showProfileMenu ? "rotate-180" : ""}`} />
                 </button>

                 {showProfileMenu && (
                   <div className={`absolute right-0 mt-3 w-64 rounded-2xl py-2 animate-in slide-in-from-top-2 z-50 ${theme.dropdown}`}>
                     <div className={`px-5 py-4 border-b ${theme.divider}`}>
                       <p className="font-bold text-sm truncate">{user.name}</p>
                       <p className={`text-xs ${theme.textMuted} truncate`}>{user.email}</p>
                       <div className="flex items-center gap-2 mt-3 p-1.5 rounded-lg bg-gray-50 border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors" onClick={changeUserStatus}>
                          <span className={`w-2 h-2 rounded-full ${theme.statusColor}`}></span>
                          <span className="text-[10px] font-semibold text-gray-600">Status: {userStatus}</span>
                       </div>
                     </div>
                     <div className="py-2 px-2 space-y-0.5">
                       <MenuItem icon={<UserCircle size={16}/>} label={t('myProfile')} onClick={()=>{setShowProfilePopup(true); setShowProfileMenu(false)}} theme={theme} isLight={isLight}/>
                       <MenuItem icon={<CreditCard size={16}/>} label={t('billing')} theme={theme} isLight={isLight}/>
                       <MenuItem icon={<Settings size={16}/>} label={t('settings')} onClick={()=>{onNavigate("setting");setShowProfileMenu(false)}} theme={theme} isLight={isLight}/>
                     </div>
                     <div className={`border-t my-1 mx-2 ${theme.divider}`}></div>
                     <div className="px-2 pb-1">
                        <button onClick={() => { logout(); setShowProfileMenu(false); window.location.reload(); }} className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-3 text-red-600 hover:bg-red-50 transition-colors">
                           <LogOut size={16} /> {t('logout')}
                        </button>
                     </div>
                   </div>
                 )}
               </div>
             )}
          </div>
        </div>
      </header>

      {/* --- PROFILE POPUP MODAL --- */}
      {showProfilePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className={`w-full max-w-sm rounded-3xl shadow-2xl border relative overflow-hidden transform transition-all scale-100 ${theme.dropdown}`}>
            
            {/* Header / Cover */}
            <div className={`h-28 ${isLight ? "bg-gradient-to-r from-blue-600 to-indigo-600" : "bg-gradient-to-r from-[#64FFDA]/20 to-blue-600/20"}`}>
               <button onClick={()=>setShowProfilePopup(false)} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/30 text-white rounded-full transition backdrop-blur-sm">
                  <X size={16} strokeWidth={2.5}/>
               </button>
            </div>

            {/* Avatar & Main Info */}
            <div className="px-6 relative -mt-12 mb-6 text-center">
               <div className="w-24 h-24 mx-auto rounded-full border-4 border-white bg-white shadow-xl flex items-center justify-center relative p-1">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white">
                     {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={`absolute bottom-1 right-1 w-5 h-5 border-4 border-white rounded-full ${theme.statusColor}`}></span>
               </div>
               <h2 className={`text-xl font-bold mt-3 ${isLight ? "text-gray-900" : "text-white"}`}>{user.name}</h2>
               <p className={`text-sm font-medium ${theme.textMuted}`}>{user.email}</p>
               <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${isLight ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-[#64FFDA]/10 text-[#64FFDA]"}`}>
                  {user.role} Account
               </div>
            </div>

            {/* Details Grid */}
            <div className={`px-6 py-2 grid grid-cols-1 gap-3`}>
               <ProfileField icon={<Mail size={16}/>} label="Email" value={user.email} isLight={isLight} />
               <ProfileField icon={<Hash size={16}/>} label="User ID" value={`UID-${user.id || "8392"}`} isLight={isLight} />
               <ProfileField icon={<Shield size={16}/>} label="Security" value="2FA Enabled" isLight={isLight} />
            </div>

            {/* Footer Actions */}
            <div className={`p-6 mt-2 flex gap-3`}>
               <button className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition border ${isLight?"bg-white border-gray-200 text-gray-700 hover:bg-gray-50":"bg-transparent border-gray-600 text-white hover:bg-white/5"}`}>
                  Edit
               </button>
               <button onClick={()=>setShowProfilePopup(false)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition shadow-lg shadow-blue-500/20 ${isLight?"bg-blue-600 hover:bg-blue-700 text-white":"bg-[#64FFDA] hover:bg-[#4cc9ac] text-[#0A192F]"}`}>
                  Done
               </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

// Sub-components for cleaner code
const MenuItem = ({ icon, label, onClick, theme, isLight }) => (
    <button onClick={onClick} className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-3 transition-all ${isLight ? "text-gray-600 hover:bg-blue-50 hover:text-blue-700" : "text-gray-300 hover:bg-[#1E2D45] hover:text-[#64FFDA]"}`}>
        <span className="opacity-70">{icon}</span>{label}
    </button>
);

const ProfileField = ({ icon, label, value, isLight }) => (
   <div className={`flex items-center gap-3 p-3 rounded-xl border ${isLight ? "bg-gray-50 border-gray-100" : "bg-[#0D1B34] border-[#1E2D45]"}`}>
      <div className={`p-2 rounded-full ${isLight?"bg-white text-gray-500 shadow-sm":"bg-[#1E2D45] text-gray-400"}`}>
         {icon}
      </div>
      <div>
         <p className="text-[10px] font-bold uppercase tracking-wider opacity-50">{label}</p>
         <p className="text-xs font-semibold">{value}</p>
      </div>
   </div>
);
