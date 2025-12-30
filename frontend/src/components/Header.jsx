// src/components/Header.jsx
import React, { useState, useEffect, useRef } from "react";
import { 
  Bell, Moon, Sun, User, LogOut, ChevronDown, 
  Settings, BookOpen, Search, Menu, X 
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import LoginPopup from "./LoginPopup";
import SignupPopup from "./SignupPopup";

export default function Header({ onNavigate, openLogin, openSignup, isLight, onToggleTheme }) {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- STYLES BASED ON THEME ---
  const headerClass = isLight 
    ? "bg-white/80 border-gray-200 text-gray-800 backdrop-blur-md shadow-sm" 
    : "bg-[#0A192F]/90 border-[#1E2D45] text-white backdrop-blur-md shadow-lg";
    
  const searchClass = isLight 
    ? "bg-gray-100 border-transparent text-gray-800 placeholder-gray-500 focus:bg-white focus:border-blue-500 focus:ring-blue-500" 
    : "bg-[#112240] border-transparent text-gray-200 placeholder-gray-500 focus:bg-[#0A192F] focus:border-[#64FFDA] focus:ring-[#64FFDA]";

  const iconHover = isLight ? "hover:bg-gray-100 text-gray-600 hover:text-blue-600" : "hover:bg-[#112240] text-gray-300 hover:text-[#64FFDA]";
  const dropdownBg = isLight ? "bg-white border-gray-200 text-gray-800" : "bg-[#112240] border-[#1E2D45] text-white";

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-30 h-[70px] border-b transition-all duration-300 ${headerClass}`}>
        <div className="flex items-center justify-between px-4 h-full max-w-[100vw]">

          {/* LEFT: Branding / Title */}
          <div className="flex items-center gap-4 flex-1">
            {/* Mobile Menu Trigger is in Sidebar component, space reserved here */}
            <div className="lg:hidden w-8"></div> 
            
            <div className="hidden md:block">
              <h1 className={`text-lg font-bold leading-tight ${isLight ? "text-blue-700" : "text-[#64FFDA]"}`}>
                Sel-T ANALYST
              </h1>
              <p className={`text-[10px] uppercase tracking-wider ${isLight ? "text-gray-500" : "text-gray-400"}`}>
                Business Intelligence Suite
              </p>
            </div>
          </div>

          {/* CENTER: Search Bar (Hidden on small mobile) */}
          <div className="hidden sm:flex flex-1 max-w-md mx-4">
            <div className="relative w-full group">
              <Search className={`absolute left-3 top-2.5 w-4 h-4 transition-colors ${isLight ? "text-gray-400 group-focus-within:text-blue-500" : "text-gray-500 group-focus-within:text-[#64FFDA]"}`} />
              <input
                type="text"
                placeholder="Search analytics, reports..."
                className={`w-full pl-10 pr-4 py-2 rounded-full text-sm outline-none border transition-all duration-300 ${searchClass}`}
              />
            </div>
          </div>

          {/* RIGHT: Actions & Profile */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0" ref={menuRef}>

            {/* Theme Toggle */}
            {/* Note: Pass onToggleTheme prop from App.jsx if you implement direct toggle here. 
                For now, it's just visual or linked to settings */}
            {/* <button className={`p-2 rounded-full transition-all ${iconHover}`}>
               {isLight ? <Moon size={20} /> : <Sun size={20} />}
            </button> */}

            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-full relative transition-all ${iconHover}`}
              >
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              </button>
              
              {/* Notification Dropdown */}
              {showNotifications && (
                <div className={`absolute right-0 mt-3 w-72 rounded-xl shadow-2xl border py-2 animate-in fade-in slide-in-from-top-2 ${dropdownBg}`}>
                  <div className={`px-4 py-2 border-b font-semibold text-sm flex justify-between ${isLight ? "border-gray-100" : "border-[#1E2D45]"}`}>
                    <span>Notifications</span>
                    <span className="text-xs text-blue-500 cursor-pointer">Mark all read</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <div className={`px-4 py-3 border-b text-sm hover:bg-opacity-50 ${isLight ? "border-gray-100 hover:bg-gray-50" : "border-[#1E2D45] hover:bg-[#0A192F]"}`}>
                      <p className="font-medium">System Update</p>
                      <p className={`text-xs mt-1 ${isLight ? "text-gray-500" : "text-gray-400"}`}>Version 2.0 is live with new features.</p>
                    </div>
                    <div className={`px-4 py-3 text-sm hover:bg-opacity-50 ${isLight ? "hover:bg-gray-50" : "hover:bg-[#0A192F]"}`}>
                      <p className="font-medium">Welcome {user?.name}!</p>
                      <p className={`text-xs mt-1 ${isLight ? "text-gray-500" : "text-gray-400"}`}>Get started by exploring the dashboard.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            {!user ? (
              <div className="flex gap-2">
                <button onClick={openLogin} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${isLight ? "text-gray-600 hover:bg-gray-100" : "text-gray-300 hover:bg-[#112240]"}`}>Login</button>
                <button onClick={openSignup} className={`px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-all transform hover:scale-105 ${isLight ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-[#64FFDA] text-[#0A192F] hover:bg-[#4CDBB3]"}`}>Sign Up</button>
              </div>
            ) : (
              <div className="relative">
                <button 
                  onClick={() => setShowMenu(!showMenu)}
                  className={`flex items-center gap-2 pl-2 pr-1 py-1 rounded-full border transition-all ${isLight ? "bg-white border-gray-200 hover:border-blue-300" : "bg-[#112240] border-[#1E2D45] hover:border-[#64FFDA]"}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-inner ${isLight ? "bg-blue-100 text-blue-700" : "bg-gradient-to-br from-[#64FFDA] to-blue-500 text-[#0A192F]"}`}>
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <ChevronDown size={14} className={`mr-1 transition-transform duration-200 ${showMenu ? "rotate-180" : ""} ${isLight ? "text-gray-500" : "text-gray-400"}`} />
                </button>

                {/* Profile Dropdown */}
                {showMenu && (
                  <div className={`absolute right-0 mt-3 w-60 rounded-xl shadow-2xl border py-2 animate-in fade-in slide-in-from-top-2 overflow-hidden ${dropdownBg}`}>
                    
                    {/* User Info */}
                    <div className={`px-4 py-3 border-b ${isLight ? "bg-gray-50 border-gray-100" : "bg-[#0A192F]/50 border-[#1E2D45]"}`}>
                      <p className={`font-bold truncate ${isLight ? "text-gray-900" : "text-[#64FFDA]"}`}>{user.name}</p>
                      <p className={`text-xs truncate ${isLight ? "text-gray-500" : "text-gray-400"}`}>{user.email}</p>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-2 uppercase tracking-wide ${isLight ? "bg-blue-100 text-blue-700" : "bg-[#64FFDA]/10 text-[#64FFDA] border border-[#64FFDA]/30"}`}>
                        {user.role}
                      </span>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <button onClick={() => { onNavigate("setting"); setShowMenu(false); }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${isLight ? "hover:bg-gray-50 text-gray-700" : "hover:bg-[#1E2D45] text-gray-300 hover:text-white"}`}>
                        <Settings size={16} /> Settings
                      </button>
                      <button onClick={() => { onNavigate("helpsupport"); setShowMenu(false); }} className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${isLight ? "hover:bg-gray-50 text-gray-700" : "hover:bg-[#1E2D45] text-gray-300 hover:text-white"}`}>
                        <BookOpen size={16} /> Help & Support
                      </button>
                    </div>

                    <div className={`border-t my-1 ${isLight ? "border-gray-100" : "border-[#1E2D45]"}`}></div>

                    <button 
                      onClick={() => { logout(); setShowMenu(false); window.location.reload(); }}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut size={16} /> Logout
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
