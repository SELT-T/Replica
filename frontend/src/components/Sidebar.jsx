// src/components/Sidebar.jsx
import React, { useState } from "react";
import {
  Grid,
  FileText,
  Layers,
  DollarSign,
  Printer,
  MessageCircle,
  Users,
  Settings,
  BookOpen,
  Menu,
  Search,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Sidebar({ onNavigate }) {
  const { user, canView, logout, isAdmin } = useAuth(); // isAdmin bhi nikala
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // KEYS MUST MATCH UserManagement.jsx
  const allItems = [
    { k: "dashboard", icon: <Grid size={16} />, label: "Dashboard" },
    { k: "reports", icon: <FileText size={16} />, label: "Reports" },
    { k: "hierarchy", icon: <Layers size={16} />, label: "Company Hierarchy" },
    { k: "outstanding", icon: <DollarSign size={16} />, label: "Outstanding" },
    { k: "analyst", icon: <Printer size={16} />, label: "Analyst" },
    { k: "messaging", icon: <MessageCircle size={16} />, label: "Messaging" },
    { k: "usermanagement", icon: <Users size={16} />, label: "User Management" },
    { k: "setting", icon: <Settings size={16} />, label: "Settings" },
    { k: "helpsupport", icon: <BookOpen size={16} />, label: "Help & Support" },
  ];

  // 1. FILTER: Sirf wahi item dikhao jinki permission hai
  const allowedItems = allItems.filter((item) => canView(item.k));

  // 2. SEARCH: Agar user kuch search kar raha hai
  const filteredItems = allowedItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <>
      {/* MOBILE TOGGLE */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden bg-[#64FFDA] text-[#0A192F] p-2 rounded-md shadow-lg"
        onClick={() => setOpen(!open)}
      >
        <Menu size={22} />
      </button>

      {/* SIDEBAR ASIDE */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#0A192F] border-r border-[#1E2D45] text-white shadow-2xl transform transition-transform duration-300 ease-in-out z-40 flex flex-col
        ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* LOGO AREA */}
        <div className="flex flex-col items-center py-6 border-b border-[#1E2D45] bg-[#0B1727]">
           {/* Logo Image Placeholder */}
           <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#64FFDA] to-[#3B82F6] flex items-center justify-center text-[#0A192F] font-bold text-2xl mb-2">
              S
           </div>
          <h1 className="text-xl font-bold text-[#64FFDA] tracking-wider">SEL-T</h1>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">
            Business Intelligence
          </p>
        </div>

        {/* SEARCH BAR */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#112240] border border-[#1E2D45] pl-9 pr-4 py-2 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#64FFDA] transition-colors"
            />
          </div>
        </div>

        {/* MENU ITEMS */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar py-2">
          {filteredItems.length > 0 ? (
            filteredItems.map((it) => (
              <button
                key={it.k}
                onClick={() => {
                  onNavigate(it.k);
                  setOpen(false);
                }}
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-gray-300 hover:bg-[#112240] hover:text-[#64FFDA] transition-all duration-200 group"
              >
                <span className="text-gray-400 group-hover:text-[#64FFDA] group-hover:scale-110 transition-transform">
                  {it.icon}
                </span>
                <span className="text-sm">{it.label}</span>
              </button>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              <p>No options available.</p>
              <p className="text-xs mt-1">Check permissions.</p>
            </div>
          )}
        </nav>

        {/* --- DEBUGGING FOOTER (REMOVE LATER) --- */}
        <div className="p-3 bg-black/20 text-[9px] text-gray-500 font-mono border-t border-[#1E2D45]">
            <p>Role: <span className={isAdmin ? "text-red-400" : "text-green-400"}>{user.role}</span></p>
            <p>Status: {isAdmin ? "Full Access (Admin)" : "Restricted (User)"}</p>
        </div>
        {/* --------------------------------------- */}

        {/* USER PROFILE & LOGOUT */}
        <div className="p-4 border-t border-[#1E2D45] bg-[#0B1727]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#64FFDA] flex items-center justify-center text-[#0A192F] font-bold">
              {user.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate capitalize">{user.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE OVERLAY */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setOpen(false)}
        ></div>
      )}
    </>
  );
}
