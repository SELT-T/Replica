// src/components/Header.jsx
import React, { useState, useEffect, useRef } from "react";
import { 
  Bell, Moon, Sun, User, LogOut, ChevronDown, 
  Settings, BookOpen, Search, Menu, X, Maximize, 
  Globe, Plus, Calendar, Clock, CheckCircle, AlertTriangle, 
  CreditCard, Keyboard, UserCircle, Trash2, Activity
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Header({ onNavigate, openLogin, openSignup, isLight }) {
  const { user, logout } = useAuth();
  
  // --- STATE MANAGEMENT ---
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userStatus, setUserStatus] = useState("Active"); // Active, Busy, Away
  const [currentLang, setCurrentLang] = useState("English"); // Language State
  
  // Real-time Clock
  const [time, setTime] = useState(new Date());
  const menuRef = useRef(null);

  // --- PERSISTENT NOTIFICATIONS (Working) ---
  const [notifications, setNotifications] = useState(() => {
    // Load from local storage or default list
    const saved = localStorage.getItem("selt_notifications");
    return saved ? JSON.parse(saved) : [
      { id: 1, title: "New Order Received", desc: "Order #1234 from Shoaib", time: "2 min ago", type: "success" },
      { id: 2, title: "Server Alert", desc: "High CPU usage detected", time: "1 hour ago", type: "warning" },
      { id: 3, title: "Welcome!", desc: "Setup your profile details", time: "1 day ago", type: "info" },
    ];
  });

  // Save notifications when they change
  useEffect(() => {
    localStorage.setItem("selt_notifications", JSON.stringify(notifications));
  }, [notifications]);

  // Update Time every second
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close dropdowns on outside click
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

  // --- ACTIONS ---

  const handleClearNotifications = () => {
    if(window.confirm("Clear all notifications?")) {
        setNotifications([]);
    }
  };

  const handleSearch = (e) => {
      setSearchQuery(e.target.value);
      // Connect this to global search context or API later
      console.log("Searching for:", e.target.value);
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  const changeUserStatus = () => {
      const statuses = ["Active", "Busy", "Away"];
      const next = statuses[(statuses.indexOf(userStatus) + 1) % statuses.length];
      setUserStatus(next);
  };

  const changeLanguage = (lang) => {
      setCurrentLang(lang);
      setShowLangMenu(false);
      // Here you would add logic to actually change app language via context/i18n
      console.log("Language changed to:", lang);
  };

  // --- STYLES BASED ON THEME ---
  const theme = {
    header: isLight 
      ? "bg-white/90 border-b border-gray-200 text-gray-800 backdrop-blur-xl shadow-sm" 
      : "bg-[#0A192F]/95 border-b border-[#1E2D45] text-white backdrop-blur-xl shadow-md",
    search: isLight
      ? "bg-gray-100 text-gray-700 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 border-transparent"
      : "bg-[#112240] text-gray-200 placeholder-gray-500 focus:bg-[#0A192F] focus:ring-2 focus:ring-[#64FFDA] border-[#1E2D45]",
    iconBtn: isLight
      ? "hover:bg-gray-100 text-gray-500 hover:text-blue-600"
      : "hover:bg-[#112240] text-gray-400 hover:text-[#64FFDA]",
    dropdown: isLight
      ? "bg-white border border-gray-200 shadow-2xl text-gray-800"
      : "bg-[#112240] border border-[#1E2D45] shadow-2xl text-white",
    divider: isLight ? "border-gray-100" : "border-[#1E2D45]",
    textMuted: isLight ? "text-gray-500" : "text-gray-400",
    textHighlight: isLight ? "text-blue-600" : "text-[#64FFDA]",
    statusColor: userStatus === "Active" ? "bg-green-500" : userStatus === "Busy" ? "bg-red-500" : "bg-yellow-500"
  };

  return (
    <>
      {/* HEADER CONTAINER */}
      <header className={`fixed top-0 left-0 right-0 z-30 h-[70px] transition-all duration-300 ${theme.header}`}>
        {/* Added lg:ml-64 to push content right when sidebar is visible on desktop */}
        <div className={`flex items-center justify-between px-4 h-full w-full transition-all duration-300 ${user ? 'lg:ml-64 lg:w-[calc(100%-16rem)]' : ''}`} ref={menuRef}>

          {/* LEFT: Breadcrumb & Time */}
          <div className="flex items-center gap-4 flex-1 overflow-hidden">
            <div className="hidden md:flex flex-col min-w-0">
              <span className={`text-[10px] uppercase tracking-widest font-bold ${theme.textMuted} truncate`}>Pages / Dashboard</span>
              <h2 className="text-sm font-bold flex items-center gap-2 truncate">
                Main Overview <span className={`text-[10px] px-2 py-0.5 rounded-full ${isLight ? "bg-blue-100 text-blue-700" : "bg-[#64FFDA]/10 text-[#64FFDA]"}`}>v2.4</span>
              </h2>
            </div>
            
            {/* Quick Time Widget (Fixed Visibility) */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border flex-shrink-0 ${isLight ? "bg-gray-50 border-gray-200" : "bg-[#0A192F] border-[#1E2D45]"}`}>
               <Clock size={14} className={theme.textHighlight} />
               <span className="text-xs font-mono font-medium hidden sm:inline">
                 {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </span>
               <span className={`text-[10px] ${theme.textMuted} hidden sm:inline`}>| {time.toLocaleDateString()}</span>
            </div>
          </div>

          {/* CENTER: Premium Search (Working) */}
          <div className="hidden lg:flex flex-1 justify-center max-w-lg mx-4">
            <div className="relative w-full group">
              <Search className={`absolute left-3 top-2.5 w-4 h-4 transition-colors ${theme.textMuted}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search analytics..."
                className={`w-full pl-10 pr-12 py-2 rounded-xl text-sm outline-none border transition-all ${theme.search}`}
              />
              <span className={`absolute right-3 top-2.5 text-[10px] px-1.5 py-0.5 rounded border ${isLight ? "bg-white border-gray-200 text-gray-400" : "bg-[#0A192F] border-[#1E2D45] text-gray-500"}`}>⌘K</span>
            </div>
          </div>

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">

            {/* Quick Action (+) */}
            <button className={`p-2 rounded-full hidden md:flex items-center justify-center transition-all ${isLight ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200" : "bg-[#64FFDA] text-[#0A192F] hover:bg-[#4cc9ac] shadow-[#64FFDA]/20"} shadow-lg`} title="New Entry">
               <Plus size={18} />
            </button>

            {/* Language (Working) */}
            <div className="relative">
                <button onClick={()=>setShowLangMenu(!showLangMenu)} className={`p-2 rounded-full flex items-center gap-1 transition-all ${theme.iconBtn}`}>
                    <Globe size={18} />
                    <span className="text-[10px] font-bold hidden sm:inline">{currentLang === 'English' ? 'EN' : 'HI'}</span>
                </button>
                {showLangMenu && (
                    <div className={`absolute right-0 mt-3 w-32 rounded-xl py-1 animate-fade-in z-50 ${theme.dropdown}`}>
                        {['English', 'Hindi'].map(l => (
                            <button 
                                key={l} 
                                onClick={() => changeLanguage(l)}
                                className={`w-full text-left px-4 py-2 text-xs hover:bg-opacity-10 ${isLight?"hover:bg-gray-200":"hover:bg-white"} ${currentLang === l ? theme.textHighlight : ''}`}
                            >
                                {l}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Fullscreen */}
            <button onClick={toggleFullScreen} className={`p-2 rounded-full hidden md:block transition-all ${theme.iconBtn}`}>
               <Maximize size={18} />
            </button>

            {/* Notifications (Working) */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className={`p-2 rounded-full relative transition-all ${theme.iconBtn}`}
              >
                <Bell size={18} />
                {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </button>
              
              {showNotifMenu && (
                <div className={`absolute right-0 mt-4 w-80 rounded-2xl py-2 animate-in slide-in-from-top-2 border z-50 ${theme.dropdown}`}>
                  <div className={`px-4 py-3 border-b flex justify-between items-center ${theme.divider}`}>
                    <span className="font-semibold text-sm">Notifications ({notifications.length})</span>
                    {notifications.length > 0 && (
                        <span onClick={handleClearNotifications} className={`text-[10px] cursor-pointer hover:underline ${theme.textHighlight}`}>Clear All</span>
                    )}
                  </div>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs opacity-50">No new notifications</div>
                    ) : (
                        notifications.map((n) => (
                            <div key={n.id} className={`px-4 py-3 flex gap-3 hover:bg-opacity-5 ${isLight ? "hover:bg-black" : "hover:bg-white"} cursor-pointer border-b border-transparent hover:border-gray-500/10 transition`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${n.type === 'success' ? 'bg-green-500/10 text-green-500' : n.type === 'warning' ? 'bg-orange-500/10 text-orange-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                    {n.type === 'success' ? <CheckCircle size={14}/> : n.type === 'warning' ? <AlertTriangle size={14}/> : <User size={14}/>}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold">{n.title}</p>
                                    <p className={`text-[10px] ${theme.textMuted}`}>{n.desc}</p>
                                    <p className={`text-[9px] mt-1 ${theme.textMuted} opacity-70`}>{n.time}</p>
                                </div>
                            </div>
                        ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile (Working) */}
            {!user ? (
              <div className="flex gap-2 ml-2">
                <button onClick={openLogin} className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${isLight ? "border-gray-300 text-gray-700 hover:bg-gray-50" : "border-[#64FFDA] text-[#64FFDA] hover:bg-[#64FFDA]/10"}`}>Login</button>
                <button onClick={openSignup} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${isLight ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-[#64FFDA] text-[#0A192F] hover:bg-[#4cc9ac]"}`}>Sign Up</button>
              </div>
            ) : (
              <div className="relative ml-2">
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className={`flex items-center gap-3 pl-1 pr-3 py-1 rounded-full border transition-all hover:shadow-lg ${isLight ? "bg-white border-gray-200" : "bg-[#112240] border-[#1E2D45] hover:border-[#64FFDA]"}`}
                >
                  <div className="relative">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-inner bg-gradient-to-br from-blue-400 to-purple-500 text-white`}>
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 ${isLight?"border-white":"border-[#0A192F]"} rounded-full ${theme.statusColor}`}></span>
                  </div>
                  <div className="hidden md:block text-left leading-tight">
                      <p className={`text-xs font-bold ${isLight ? "text-gray-800" : "text-white"}`}>Hi, {user.name}</p>
                      <p className={`text-[10px] ${theme.textMuted}`}>{user.role || "Admin"}</p>
                  </div>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${showProfileMenu ? "rotate-180" : ""} ${theme.textMuted}`} />
                </button>

                {/* Rich Profile Dropdown */}
                {showProfileMenu && (
                  <div className={`absolute right-0 mt-4 w-64 rounded-2xl py-2 animate-in slide-in-from-top-2 overflow-hidden border z-50 ${theme.dropdown}`}>
                    
                    {/* Header */}
                    <div className={`px-5 py-4 border-b ${theme.divider}`}>
                      <p className="font-bold text-sm">{user.name}</p>
                      <p className={`text-xs ${theme.textMuted} truncate`}>{user.email}</p>
                      <div className="flex items-center gap-2 mt-2 cursor-pointer" onClick={changeUserStatus}>
                          <span className={`w-2 h-2 rounded-full ${theme.statusColor}`}></span>
                          <span className="text-[10px] font-medium opacity-80 hover:opacity-100 transition">Set Status: {userStatus}</span>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <MenuItem icon={<UserCircle size={16}/>} label="My Profile" onClick={()=>{}} theme={theme} isLight={isLight}/>
                      <MenuItem icon={<CreditCard size={16}/>} label="Billing & Plans" onClick={()=>{}} theme={theme} isLight={isLight}/>
                      <MenuItem icon={<Settings size={16}/>} label="Settings" onClick={() => { onNavigate("setting"); setShowProfileMenu(false); }} theme={theme} isLight={isLight}/>
                      <MenuItem icon={<Keyboard size={16}/>} label="Shortcuts" onClick={()=>{}} theme={theme} isLight={isLight}/>
                    </div>

                    <div className={`border-t my-1 ${theme.divider}`}></div>

                    <button 
                      onClick={() => { logout(); setShowProfileMenu(false); window.location.reload(); }}
                      className="w-full text-left px-5 py-3 text-xs font-bold flex items-center gap-3 text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut size={16} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </header>
    </>
  );
}

// Helper Component
const MenuItem = ({ icon, label, onClick, theme, isLight }) => (
    <button onClick={onClick} className={`w-full text-left px-5 py-2.5 text-xs font-medium flex items-center gap-3 transition-colors ${isLight ? "text-gray-700 hover:bg-gray-50" : "text-gray-300 hover:bg-[#1E2D45] hover:text-[#64FFDA]"}`}>
        <span className="opacity-70">{icon}</span>
        {label}
    </button>
);
