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
  const [showMobileSearch, setShowMobileSearch] = useState(false); // New state for mobile search
  const [userStatus, setUserStatus] = useState("Active"); 
  const [time, setTime] = useState(new Date());
  
  const menuRef = useRef(null);

  // --- REALISTIC NOTIFICATIONS ---
  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("selt_notifications");
    return saved ? JSON.parse(saved) : [
      { id: 1, title: "System Ready", desc: "Analytics engine connected successfully.", time: "Just now", type: "success" },
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
        if (!event.target.closest('.popup-content')) {
            setShowProfileMenu(false);
            setShowNotifMenu(false);
            setShowLangMenu(false);
            setShowMobileSearch(false);
        }
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
    if(window.confirm("Clear all notifications?")) setNotifications([]);
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

  // --- STYLES ---
  const theme = {
    header: isLight 
      ? "bg-white/90 border-b border-gray-200 text-gray-800 backdrop-blur-md shadow-sm" 
      : "bg-[#0A192F]/90 border-b border-[#1E2D45] text-white backdrop-blur-md shadow-md",
    search: isLight
      ? "bg-gray-100 text-gray-700 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 border-transparent"
      : "bg-[#112240] text-gray-200 placeholder-gray-500 focus:bg-[#0A192F] focus:ring-2 focus:ring-[#64FFDA] border-[#1E2D45]",
    iconBtn: isLight
      ? "hover:bg-gray-100 text-gray-600 hover:text-blue-600"
      : "hover:bg-[#112240] text-gray-400 hover:text-[#64FFDA]",
    dropdown: isLight
      ? "bg-white border border-gray-200 shadow-2xl text-gray-800"
      : "bg-[#112240] border border-[#1E2D45] shadow-2xl text-white",
    divider: isLight ? "border-gray-100" : "border-[#1E2D45]",
    textMuted: isLight ? "text-gray-500" : "text-gray-400",
    textHighlight: isLight ? "text-blue-600" : "text-[#64FFDA]",
    statusColor: userStatus === "Active" ? "bg-green-500" : userStatus === "Busy" ? "bg-red-500" : "bg-yellow-500",
  };

  return (
    <>
      <header className={`sticky top-0 z-40 h-[64px] sm:h-[70px] w-full transition-all duration-300 ${theme.header}`}>
        <div className="flex items-center justify-between px-3 sm:px-6 h-full w-full max-w-[100vw]" ref={menuRef}>

          {/* LEFT: Breadcrumb & Mobile Menu Placeholder */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
             {/* Note: Mobile Toggle is now in Sidebar.jsx fixed position. 
                 We add a spacer div here on mobile so header content doesn't go under the toggle button */}
             <div className="w-8 lg:hidden"></div> 

             {/* Breadcrumbs - Hidden on small mobile */}
             <div className="hidden sm:flex flex-col min-w-0">
                <span className={`text-[10px] uppercase tracking-widest font-bold ${theme.textMuted} truncate`}>
                  Pages / {t(onNavigate.name || "Dashboard")} 
                </span>
                <h2 className="text-sm font-bold flex items-center gap-2 truncate">
                  {t('welcome')} <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${isLight ? "bg-blue-100 text-blue-700" : "bg-[#64FFDA]/10 text-[#64FFDA]"}`}>v2.5</span>
                </h2>
             </div>
             
             {/* Time Widget - Hidden on Mobile */}
             <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border flex-shrink-0 ${isLight ? "bg-gray-50 border-gray-200" : "bg-[#0A192F] border-[#1E2D45]"}`}>
                <Clock size={14} className={theme.textHighlight} />
                <span className="text-xs font-mono font-medium">
                  {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
             </div>
          </div>

          {/* CENTER: Search Bar (Desktop) */}
          <div className="hidden lg:flex flex-1 justify-center max-w-lg mx-4">
             <div className="relative w-full group">
               <Search className={`absolute left-3 top-2.5 w-4 h-4 transition-colors ${theme.textMuted}`} />
               <input
                 type="text"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 placeholder={t('searchPlaceholder')}
                 className={`w-full pl-10 pr-12 py-2 rounded-xl text-sm outline-none border transition-all ${theme.search}`}
               />
               <span className={`absolute right-3 top-2.5 text-[10px] px-1.5 py-0.5 rounded border ${isLight ? "bg-white border-gray-200 text-gray-400" : "bg-[#0A192F] border-[#1E2D45] text-gray-500"}`}>⌘K</span>
             </div>
          </div>

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-auto">
             
             {/* Mobile Search Toggle */}
             <button onClick={() => setShowMobileSearch(!showMobileSearch)} className={`p-2 rounded-full lg:hidden transition-all ${theme.iconBtn}`}>
                <Search size={18} />
             </button>

             {/* New Entry Button */}
             <button className={`p-2 rounded-full hidden sm:flex items-center justify-center transition-all ${isLight ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-[#64FFDA] text-[#0A192F] hover:bg-[#4cc9ac]"} shadow-md hover:shadow-lg`} title={t('newEntry')}>
                <Plus size={18} strokeWidth={2.5} />
             </button>

             {/* Language Dropdown */}
             <div className="relative">
                <button onClick={() => setShowLangMenu(!showLangMenu)} className={`p-2 rounded-full flex items-center gap-1 transition-all ${theme.iconBtn}`}>
                   <Globe size={18} />
                   <span className="text-xs font-bold hidden md:inline">{currentLang === "English" ? "EN" : "HI"}</span>
                </button>
                {showLangMenu && (
                   <div className={`popup-content absolute right-0 mt-3 w-32 rounded-xl py-1 animate-in fade-in zoom-in-95 z-50 ${theme.dropdown}`}>
                      {['English', 'Hindi'].map(l => (
                         <button key={l} onClick={() => handleLanguageSelect(l)} className={`w-full text-left px-4 py-2 text-xs hover:bg-opacity-10 ${isLight?"hover:bg-gray-200":"hover:bg-white"} ${currentLang===l ? theme.textHighlight : ""}`}>
                           {l}
                         </button>
                      ))}
                   </div>
                )}
             </div>

             {/* Fullscreen Toggle */}
             <button onClick={toggleFullScreen} className={`p-2 rounded-full hidden md:block transition-all ${theme.iconBtn}`}>
                <Maximize size={18} />
             </button>

             {/* Notifications */}
             <div className="relative">
               <button onClick={() => setShowNotifMenu(!showNotifMenu)} className={`p-2 rounded-full relative transition-all ${theme.iconBtn}`}>
                 <Bell size={18} />
                 {notifications.length > 0 && <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse ring-2 ring-white dark:ring-[#0A192F]"></span>}
               </button>
               {showNotifMenu && (
                 <div className={`popup-content absolute right-0 mt-4 w-72 sm:w-80 rounded-2xl py-2 animate-in slide-in-from-top-2 border z-50 ${theme.dropdown}`}>
                   <div className={`px-4 py-3 border-b flex justify-between items-center ${theme.divider}`}>
                     <span className="font-semibold text-sm">{t('notifications')} ({notifications.length})</span>
                     {notifications.length > 0 && <span onClick={handleClearNotifications} className={`text-[10px] cursor-pointer hover:underline ${theme.textHighlight}`}>{t('markRead')}</span>}
                   </div>
                   <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                     {notifications.length === 0 ? <div className="px-4 py-8 text-center text-xs opacity-50">No new notifications</div> : 
                       notifications.map((n) => (
                         <div key={n.id} className={`px-4 py-3 flex gap-3 hover:bg-opacity-5 ${isLight ? "hover:bg-black" : "hover:bg-white"} border-b border-transparent hover:border-gray-500/10 cursor-pointer transition-colors`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${n.type === 'success' ? 'bg-green-500/10 text-green-500' : n.type === 'warning' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                               {n.type === 'success' ? <CheckCircle size={14}/> : n.type === 'warning' ? <AlertTriangle size={14}/> : <User size={14}/>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate">{n.title}</p>
                                <p className={`text-[10px] ${theme.textMuted} line-clamp-2`}>{n.desc}</p>
                                <p className={`text-[9px] mt-1 ${theme.textMuted} opacity-70`}>{n.time}</p>
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
                 <button onClick={openLogin} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isLight ? "border-gray-300 text-gray-700" : "border-[#64FFDA] text-[#64FFDA]"}`}>Login</button>
                 <button onClick={openSignup} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isLight ? "bg-blue-600 text-white" : "bg-[#64FFDA] text-[#0A192F]"}`}>Sign Up</button>
               </div>
             ) : (
               <div className="relative ml-1 sm:ml-2">
                 <button onClick={() => setShowProfileMenu(!showProfileMenu)} className={`flex items-center gap-2 sm:gap-3 pl-1 pr-1 sm:pr-3 py-1 rounded-full border transition-all hover:shadow-md ${isLight ? "bg-white border-gray-200" : "bg-[#112240] border-[#1E2D45] hover:border-[#64FFDA]"}`}>
                   <div className="relative">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-inner bg-gradient-to-br from-blue-400 to-purple-500 text-white">{user.name?.charAt(0).toUpperCase()}</div>
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 ${isLight?"border-white":"border-[#0A192F]"} rounded-full ${theme.statusColor}`}></span>
                   </div>
                   <div className="hidden md:block text-left leading-tight max-w-[80px]">
                       <p className={`text-xs font-bold truncate ${isLight ? "text-gray-800" : "text-white"}`}>Hi, {user.name.split(' ')[0]}</p>
                       <p className={`text-[10px] ${theme.textMuted} truncate`}>{user.role || "Admin"}</p>
                   </div>
                   <ChevronDown size={14} className={`hidden sm:block transition-transform duration-200 ${showProfileMenu ? "rotate-180" : ""} ${theme.textMuted}`} />
                 </button>
                 {showProfileMenu && (
                   <div className={`popup-content absolute right-0 mt-4 w-64 rounded-2xl py-2 animate-in slide-in-from-top-2 border z-50 ${theme.dropdown}`}>
                     <div className={`px-5 py-4 border-b ${theme.divider}`}>
                       <p className="font-bold text-sm truncate">{user.name}</p>
                       <p className={`text-xs ${theme.textMuted} truncate`}>{user.email}</p>
                       <div className="flex items-center gap-2 mt-2 cursor-pointer group" onClick={changeUserStatus}>
                           <span className={`w-2 h-2 rounded-full ${theme.statusColor} group-hover:scale-125 transition-transform`}></span>
                           <span className="text-[10px] font-medium opacity-80 hover:opacity-100 transition">Set Status: {userStatus}</span>
                       </div>
                     </div>
                     <div className="py-2">
                       <MenuItem icon={<UserCircle size={16}/>} label={t('myProfile')} onClick={()=>{setShowProfilePopup(true); setShowProfileMenu(false)}} theme={theme} isLight={isLight}/>
                       <MenuItem icon={<CreditCard size={16}/>} label={t('billing')} theme={theme} isLight={isLight}/>
                       <MenuItem icon={<Settings size={16}/>} label={t('settings')} onClick={()=>{onNavigate("setting");setShowProfileMenu(false)}} theme={theme} isLight={isLight}/>
                     </div>
                     <div className={`border-t my-1 ${theme.divider}`}></div>
                     <button onClick={() => { logout(); setShowProfileMenu(false); window.location.reload(); }} className="w-full text-left px-5 py-3 text-xs font-bold flex items-center gap-3 text-red-500 hover:bg-red-500/10 transition-colors"><LogOut size={16} /> {t('logout')}</button>
                   </div>
                 )}
               </div>
             )}
          </div>
        </div>

        {/* MOBILE SEARCH BAR (Slide down) */}
        {showMobileSearch && (
            <div className={`lg:hidden absolute top-[64px] left-0 w-full p-4 border-b animate-in slide-in-from-top-5 z-20 ${theme.header}`}>
                <div className="relative w-full">
                    <input
                        type="text"
                        autoFocus
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search..."
                        className={`w-full pl-4 pr-10 py-3 rounded-xl text-sm outline-none border ${theme.search}`}
                    />
                    <button onClick={() => setShowMobileSearch(false)} className="absolute right-3 top-3 text-gray-400">
                        <X size={18} />
                    </button>
                </div>
            </div>
        )}
      </header>

      {/* --- PROFILE POPUP --- */}
      {showProfilePopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border relative overflow-hidden transform transition-all ${theme.dropdown}`}>
            
            {/* Header / Cover */}
            <div className={`h-24 ${isLight ? "bg-gradient-to-r from-blue-500 to-purple-500" : "bg-gradient-to-r from-[#64FFDA]/20 to-blue-600/20"}`}>
               <button onClick={()=>setShowProfilePopup(false)} className="absolute top-4 right-4 p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-full transition"><X size={16}/></button>
            </div>

            {/* Avatar & Main Info */}
            <div className="px-6 relative -mt-10 mb-4 text-center">
               <div className="w-20 h-20 mx-auto rounded-full border-4 border-[#1E2D45] bg-[#0A192F] flex items-center justify-center text-2xl font-bold text-white shadow-lg relative">
                  {user.name.charAt(0).toUpperCase()}
                  <span className={`absolute bottom-1 right-1 w-4 h-4 border-2 border-[#0A192F] rounded-full ${theme.statusColor}`}></span>
               </div>
               <h2 className="text-xl font-bold mt-2">{user.name}</h2>
               <p className={`text-sm ${theme.textMuted}`}>{user.email}</p>
               <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isLight ? "bg-blue-100 text-blue-700" : "bg-[#64FFDA]/10 text-[#64FFDA]"}`}>
                  {user.role} Account
               </div>
            </div>

            {/* Details Grid */}
            <div className={`px-6 py-4 grid grid-cols-1 gap-4 border-t ${theme.divider}`}>
               <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isLight?"bg-gray-100 text-gray-600":"bg-[#0A192F] text-gray-300"}`}><Mail size={18}/></div>
                  <div><p className={`text-[10px] uppercase tracking-wider ${theme.textMuted}`}>Email Address</p><p className="text-sm font-medium">{user.email}</p></div>
               </div>
               <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isLight?"bg-gray-100 text-gray-600":"bg-[#0A192F] text-gray-300"}`}><Hash size={18}/></div>
                  <div><p className={`text-[10px] uppercase tracking-wider ${theme.textMuted}`}>User ID</p><p className="text-sm font-medium">UID-{user.id || "001"}</p></div>
               </div>
               <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isLight?"bg-gray-100 text-gray-600":"bg-[#0A192F] text-gray-300"}`}><Shield size={18}/></div>
                  <div><p className={`text-[10px] uppercase tracking-wider ${theme.textMuted}`}>Security Level</p><p className="text-sm font-medium">High (2FA Enabled)</p></div>
               </div>
            </div>

            {/* Footer Actions */}
            <div className={`px-6 py-4 border-t flex gap-3 ${theme.divider}`}>
               <button className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${isLight?"bg-gray-100 hover:bg-gray-200 text-gray-800":"bg-[#1E2D45] hover:bg-[#2a3f5f] text-white"}`}>Edit Profile</button>
               <button onClick={()=>setShowProfilePopup(false)} className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${isLight?"bg-blue-600 hover:bg-blue-700 text-white":"bg-[#64FFDA] hover:bg-[#4cc9ac] text-[#0A192F]"}`}>Close</button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

const MenuItem = ({ icon, label, onClick, theme, isLight }) => (
    <button onClick={onClick} className={`w-full text-left px-5 py-2.5 text-xs font-medium flex items-center gap-3 transition-colors ${isLight ? "text-gray-700 hover:bg-gray-50" : "text-gray-300 hover:bg-[#1E2D45] hover:text-[#64FFDA]"}`}>
        <span className="opacity-70">{icon}</span>{label}
    </button>
);
