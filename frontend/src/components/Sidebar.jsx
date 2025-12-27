// src/components/Sidebar.jsx
import React, { useState } from "react";
import {
  Grid, FileText, Layers, DollarSign, Printer, MessageCircle,
  Users, Settings, BookOpen, Menu, Search,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ onNavigate }) {
  const { user, canView } = useAuth();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // FIXED KEYS 🛠 (Backend + PermissionEditor + Sidebar all matched)
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

  // APPLY PERMISSIONS
  const allowedItems = allItems.filter((item) => canView(item.k));

  const filteredItems = allowedItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return null;

  return (
    <>
      <button
        className="fixed top-4 left-4 z-50 lg:hidden bg-[#0A192F] text-white p-2 rounded-md shadow-lg"
        onClick={() => setOpen(!open)}
      >
        <Menu size={22} />
      </button>

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white text-gray-800 shadow-xl border-r border-gray-200 transform 
        transition-transform duration-300 ease-in-out 
        ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 z-40`}
      >
        <div className="flex flex-col items-center py-6 border-b border-gray-200">
          {/* LOGO CHANGES: Rounded-full removed, bg-white added */}
          <div className="bg-white p-2 rounded-lg mb-2">
             <img
               src="/logo.png"
               alt="Logo"
               className="w-20 h-20 object-contain" 
             />
          </div>
          
          {/* Text colors updated to be visible on white background */}
          <h1 className="text-xl font-bold text-[#0A192F]">SEL-T</h1>
          <p className="text-xs text-gray-500 mt-1">Business Intelligence</p>
          <span className="mt-2 px-3 py-1 bg-gray-100 text-[#0A192F] rounded-full text-xs font-semibold border border-gray-300">
            {user.role.toUpperCase()}
          </span>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            {/* Search Input Colors updated for White Theme */}
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 pl-10 pr-4 py-2 rounded-lg 
              text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 
              focus:ring-[#0A192F] transition"
            />
          </div>
        </div>

        <nav className="px-3 space-y-1 overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
          {filteredItems.length > 0 ? (
            filteredItems.map((it) => (
              <button
                key={it.k}
                onClick={() => {
                  onNavigate(it.k);
                  setOpen(false);
                }}
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg 
                font-medium text-gray-600 hover:bg-gray-100 hover:text-[#0A192F] transition-all duration-200 group"
              >
                <span className="text-[#0A192F] group-hover:scale-110 transition-transform">
                  {it.icon}
                </span>
                <span className="text-sm">{it.label}</span>
              </button>
            ))
          ) : (
            <p className="text-center text-gray-400 text-sm py-4">No access</p>
          )}
        </nav>
      </aside>

      {open && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setOpen(false)}
        ></div>
      )}
    </>
  );
}
