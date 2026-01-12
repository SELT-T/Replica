// src/pages/Dashboard.jsx
import React, { useEffect, useState, useMemo, useRef } from "react";
import { Line, Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { useAuth } from "../context/AuthContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// PROPS ADDED: isLight (Theme), t (Translation), openLogin/openSignup (Button Fix)
export default function Dashboard({ isLight, t = (s) => s, openLogin, openSignup }) {
  const [excelData, setExcelData] = useState([]);
  const [allData, setAllData] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRowDetail, setSelectedRowDetail] = useState(null);
  const [modalContent, setModalContent] = useState({ title: "", columns: [], data: [] });
   
  // Filters State
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPartyGroup, setFilterPartyGroup] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
   
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({
    total_vouchers: 0,
    total_amount: 0,
    total_parties: 0,
    total_types: 0
  });

  // Report Filters
  const [partyFilter, setPartyFilter] = useState("");
  const [salesmanFilter, setSalesmanFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [itemGroupFilter, setItemGroupFilter] = useState(""); // Used in reports
  const [mainItemGroupFilter, setMainItemGroupFilter] = useState(""); // NEW: For main dashboard

  // Refs for Keyboard Navigation
  const dateSelectRef = useRef(null);
  const categorySelectRef = useRef(null);

  const { user } = useAuth();
  const isLoggedIn = !!user;

  const modalRef = useRef();

  // --- UPDATED THEME COLORS (Colorful Professional English Style) ---
  const colors = {
    // Force White/Light BG for that clean look, Dark mode fallback
    bg: isLight ? "bg-[#F8F9FA]" : "bg-[#0B1120]", 
    containerBg: isLight ? "bg-white border-blue-100 shadow-xl text-[#1e293b]" : "bg-[#1B2A4A] border-[#1E2D45] text-gray-100",
    cardBg: isLight ? "bg-white border-gray-100 text-[#1e293b]" : "bg-[#0F1E33] border-[#1E2D45] text-white", 
    textMain: isLight ? "text-[#1e293b]" : "text-gray-100", // Carbon Blue-ish Dark
    textMuted: isLight ? "text-[#64748b]" : "text-gray-400",
    accentText: isLight ? "text-[#2563EB]" : "text-[#64FFDA]", // Royal Blue
    border: isLight ? "border-gray-200" : "border-[#1E2D45]",
    inputBg: isLight ? "bg-white text-[#1e293b] border-gray-300 shadow-sm" : "bg-[#112A45] text-gray-200 border-[#1E2D45]",
    buttonPrimary: isLight ? "bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg" : "bg-[#64FFDA] text-[#0A192F] hover:bg-[#4cc9ac]",
    chartLine: isLight ? "#2563EB" : "#64FFDA",
    chartGrid: isLight ? "#E2E8F0" : "#1E293B",
    chartText: isLight ? "#475569" : "#9CA3AF"
  };

  // --- KEYBOARD SHORTCUTS HANDLER START ---
  useEffect(() => {
    const handleDashboardKeys = (e) => {
      // Avoid conflict if typing in an input
      if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;

      // ALT Key Combinations for fast access
      if (e.altKey) {
        switch(e.key.toLowerCase()) {
          case 'o': setActiveTab("overview"); break;
          case 'p': setActiveTab("performers"); break;
          case 'r': setActiveTab("reports"); break;
          case 'd': if(dateSelectRef.current) dateSelectRef.current.focus(); break;
          case 'c': if(categorySelectRef.current) categorySelectRef.current.focus(); break;
          default: break;
        }
      }
    };
    window.addEventListener("keydown", handleDashboardKeys);
    return () => window.removeEventListener("keydown", handleDashboardKeys);
  }, []);
  // --- KEYBOARD SHORTCUTS HANDLER END ---

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
         
        const backendURL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
          ? "http://127.0.0.1:8787"
          : "https://selt-t-backend.selt-3232.workers.dev";

        let vouchersURL = `${backendURL}/api/vouchers?limit=10000`;

        const vouchersRes = await fetch(vouchersURL, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });

        const vouchersJson = await vouchersRes.json();

        if (vouchersJson.success && vouchersJson.data) {
          const normalized = vouchersJson.data.map(v => ({
            "Date": v.date || '',
            "Voucher Number": v.vch_no || v.voucher_number || '',
            "Voucher Type": v.vch_type || v.voucher_type || 'Sales',
            "Party Name": v.party_name || 'N/A',
            "Party Group": v.party_group || 'N/A',
            "ItemName": v.name_item || v.item_name || 'N/A',
            "Item Group": v.item_group || 'N/A',
            "Item Category": v.item_category || 'Sales',
            "Salesman": v.salesman || 'N/A',
            "City/Area": v.city_area || 'N/A',
            "Amount": parseFloat(v.amount) || 0,
            "Qty": parseFloat(v.qty) || 0,
            "Narration": v.narration || ''
          }));

          setAllData(normalized);
          setExcelData(normalized);
        } else {
          setAllData([]);
          setExcelData([]);
        }

        const statsRes = await fetch(`${backendURL}/api/dashboard/stats`, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });

        const statsJson = await statsRes.json();

        if (statsJson.success && statsJson.data) {
          setStats(statsJson.data);
        }

        setLoading(false);
      } catch (err) {
        console.error("❌ Error:", err);
        setAllData([]);
        setExcelData([]);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!allData.length) return;

    let filtered = [...allData];

    if (dateFilter !== "all") {
      const today = new Date();
      let startDate = null;
      let endDate = null;

      switch(dateFilter) {
        case "today":
          startDate = new Date(today.setHours(0,0,0,0));
          endDate = new Date(today.setHours(23,59,59,999));
          break;
        case "yesterday":
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          startDate = new Date(yesterday.setHours(0,0,0,0));
          endDate = new Date(yesterday.setHours(23,59,59,999));
          break;
        case "this_week":
          const startOfWeek = new Date(today);
          const day = startOfWeek.getDay();
          const diff = startOfWeek.getDate() - day;
          startDate = new Date(startOfWeek.setDate(diff));
          startDate.setHours(0,0,0,0);
          endDate = new Date();
          endDate.setHours(23,59,59,999);
          break;
        case "this_month":
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          startDate.setHours(0,0,0,0);
          endDate = new Date();
          endDate.setHours(23,59,59,999);
          break;
        case "last_month":
          startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          startDate.setHours(0,0,0,0);
          endDate = new Date(today.getFullYear(), today.getMonth(), 0);
          endDate.setHours(23,59,59,999);
          break;
        case "this_quarter":
          const currentQuarter = Math.floor(today.getMonth() / 3);
          startDate = new Date(today.getFullYear(), currentQuarter * 3, 1);
          startDate.setHours(0,0,0,0);
          endDate = new Date();
          endDate.setHours(23,59,59,999);
          break;
        case "this_year":
          startDate = new Date(today.getFullYear(), 0, 1);
          startDate.setHours(0,0,0,0);
          endDate = new Date();
          endDate.setHours(23,59,59,999);
          break;
        case "last_year":
          startDate = new Date(today.getFullYear() - 1, 0, 1);
          startDate.setHours(0,0,0,0);
          endDate = new Date(today.getFullYear() - 1, 11, 31);
          endDate.setHours(23,59,59,999);
          break;
        case "custom":
          if (customDateRange.start) {
            startDate = new Date(customDateRange.start);
            startDate.setHours(0,0,0,0);
          }
          if (customDateRange.end) {
            endDate = new Date(customDateRange.end);
            endDate.setHours(23,59,59,999);
          }
          break;
      }

      if (startDate || endDate) {
        filtered = filtered.filter(row => {
          const rowDate = new Date(row.Date);
          if (isNaN(rowDate)) return false;
           
          if (startDate && endDate) {
            return rowDate >= startDate && rowDate <= endDate;
          } else if (startDate) {
            return rowDate >= startDate;
          } else if (endDate) {
            return rowDate <= endDate;
          }
          return true;
        });
      }
    }

    setExcelData(filtered);

  }, [dateFilter, customDateRange, allData]);

  const toNumber = (v) => parseFloat(String(v || "").replace(/[^0-9.-]/g, "")) || 0;
  const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  const isTotalRow = (r) => {
    try {
      const checkValues = Object.values(r || {}).map((v) => String(v || "").toLowerCase().trim());
      if (checkValues.some((v) => ["total", "grand total", "sub total", "overall total"].some((w) => v.includes(w)))) return true;
      if (checkValues.every((v) => v === "")) return true;
      return false;
    } catch {
      return false;
    }
  };

  const cleanData = useMemo(() => {
    let filtered = excelData.filter((r) => !isTotalRow(r));

    if (user?.companyLockEnabled && Array.isArray(user?.allowedCompanies) && user.allowedCompanies.length > 0) {
      filtered = filtered.filter(r =>
        user.allowedCompanies.includes(r["Item Category"])
      );
    }

    if (user?.partyLockEnabled && Array.isArray(user?.allowedPartyGroups) && user.allowedPartyGroups.length > 0) {
      filtered = filtered.filter(r =>
        user.allowedPartyGroups.includes(r["Party Group"])
      );
    }

    if (filterCategory) {
      filtered = filtered.filter(r => r["Item Category"] === filterCategory);
    }

    if (filterPartyGroup) {
      filtered = filtered.filter(r => r["Party Group"] === filterPartyGroup);
    }
     
    // NEW: Item Group Filter Logic
    if (mainItemGroupFilter) {
      filtered = filtered.filter(r => r["Item Group"] === mainItemGroupFilter);
    }

    return filtered;
  }, [excelData, filterCategory, filterPartyGroup, mainItemGroupFilter, user]);

  const colValue = (r, col) => {
    if (!r) return "";
    const val = r[col];
    if (val !== undefined && val !== null && String(val).trim() !== "" && String(val).trim() !== "N/A") {
      return String(val).trim();
    }
    return "";
  };

  const aggregateData = (col1, col2, filter1 = "", filter2 = "") => {
    const rows = cleanData;
     
    const combined = {};
    rows.forEach((r) => {
      const c1 = colValue(r, col1) || "-";
      const c2 = colValue(r, col2) || "-";
       
      if (filter1 && c1 !== filter1) return;
      if (filter2 && c2 !== filter2) return;
       
      const amt = toNumber(r["Amount"] || 0);
      const qty = toNumber(r["Qty"] || 0);
      const key = `${c1}||${c2}`;
      if (!combined[key]) {
        combined[key] = { [col1]: c1, [col2]: c2, Amount: 0, Qty: 0, Count: 0 };
      }
      combined[key].Amount += amt;
      combined[key].Qty += qty;
      combined[key].Count += 1;
    });

    const finalData = Object.values(combined);
    return finalData.sort((a, b) => b.Amount - a.Amount);
  };

  const totalSales = useMemo(() => cleanData.reduce((s, r) => s + toNumber(r["Amount"] || 0), 0), [cleanData]);

  const uniqueVoucherNumbers = useMemo(() => {
    return new Set(cleanData.map(r => r["Voucher Number"]).filter(v => v && v !== 'N/A')).size;
  }, [cleanData]);

  const totalProducts = useMemo(() => {
    return new Set(cleanData.map(r => r["ItemName"]).filter(v => v && v !== 'N/A')).size;
  }, [cleanData]);

  const exportCSV = (title, columns, data) => {
    const csv = [columns.join(","), ...data.map((r) => columns.map((c) => (r[c] || "").toString().replace(/,/g, " ")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeTitle = title.replace(/\s+/g, "_");
    a.href = url;
    a.download = `${safeTitle}.csv`;
    a.click();
  };

  const exportExcel = (title, columns, data) => {
    const ws = XLSX.utils.json_to_sheet(data.map((row) => {
      const out = {};
      columns.forEach((c) => (out[c] = row[c] || ""));
      return out;
    }));
    const wb = XLSX.utils.book_new();
    const safeTitle = title.replace(/\s+/g, "_");
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${safeTitle}.xlsx`);
  };

  const exportPDF = async (title) => {
    if (!modalRef.current) return;
    const el = modalRef.current;
    const canvas = await html2canvas(el, { scale: 2 });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    const safeTitle = title.replace(/\s+/g, "_");
    pdf.addImage(img, "PNG", 0, 8, width, height);
    pdf.save(`${safeTitle}.pdf`);
  };

  const openViewModal = (title, columns, data) => {
    setModalContent({ title, columns, data });
    setModalOpen(true);
    setTimeout(() => {
      const el = document.getElementById("modal-scroll");
      if (el) el.scrollTop = 0;
      // Focus on close button when modal opens for accessibility
      const closeBtn = document.getElementById("modal-close-btn");
      if(closeBtn) closeBtn.focus();
    }, 40);
  };

  const openDetailModal = (row, columns) => {
    setSelectedRowDetail({ row, columns });
    setDetailModalOpen(true);
  };

  // Keyboard helper for clickable non-buttons
  const handleEnterKey = (e, callback) => {
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        callback();
    }
  };

  if (!isLoggedIn) {
    // LOGIN SCREEN - KEPT AS IS BUT RESPONSIVE
    return (
      <div className={`relative flex items-center justify-center min-h-screen overflow-hidden px-4 ${colors.bg}`}>
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => (
            <div key={i} className={`absolute w-1 h-1 md:w-2 md:h-2 rounded-full animate-float ${isLight ? "bg-blue-300" : "bg-[#64FFDA]/30"}`} style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 5}s`, animationDuration: `${5 + Math.random() * 10}s` }} />
          ))}
        </div>

        <div className="relative z-10 text-center w-full max-w-md animate-fadeInScale">
          <div className="relative inline-block mb-6 md:mb-8">
            <div className="absolute inset-0 -inset-10 md:-inset-20">
              <div className={`absolute inset-0 border-2 md:border-4 rounded-full animate-shockwave ${isLight ? "border-blue-400/40" : "border-[#64FFDA]/40"}`}></div>
              <div className={`absolute inset-0 border-2 md:border-4 rounded-full animate-shockwave animation-delay-300 ${isLight ? "border-blue-400/30" : "border-[#64FFDA]/30"}`}></div>
            </div>
            <img src="/logo.png" alt="Sel-T Logo" className="w-48 md:w-80 relative z-10 drop-shadow-[0_0_40px_rgba(100,255,218,0.6)] animate-pulse-glow" />
          </div>

          <div className="space-y-3 mb-8 animate-slideUp">
            <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#64FFDA] via-[#3B82F6] to-[#8B5CF6] animate-gradient">Welcome to Sel-T</h1>
            <p className={`text-base md:text-xl font-light px-4 ${colors.textMuted}`}>Your Ultimate Business Intelligence Dashboard</p>
            <div className={`flex items-center justify-center gap-2 text-xs md:text-sm ${colors.textMuted}`}>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
              <span>Powered by Tally • Real-time Analytics</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slideUp animation-delay-300 px-4">
            <button onClick={openLogin} className={`w-full sm:w-auto group relative px-8 md:px-10 py-3 md:py-4 font-bold text-base md:text-lg rounded-xl shadow-[0_0_30px_rgba(100,255,218,0.3)] hover:shadow-[0_0_50px_rgba(100,255,218,0.6)] transition-all duration-300 hover:scale-105 ${colors.buttonPrimary}`}>
              <span className="flex items-center justify-center gap-2">🔑 Login Now</span>
            </button>
            <button onClick={openSignup} className="w-full sm:w-auto group relative px-8 md:px-10 py-3 md:py-4 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-bold text-base md:text-lg rounded-xl shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_50px_rgba(59,130,246,0.6)] transition-all duration-300 hover:scale-105">
              <span className="flex items-center justify-center gap-2">✨ Create Account</span>
            </button>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeInScale { 0% { opacity: 0; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1); } }
          @keyframes shockwave { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(2.5); opacity: 0; } }
          @keyframes slideUp { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: translateY(0); } }
          @keyframes float { 0%, 100% { transform: translateY(0) translateX(0); } 50% { transform: translateY(-20px) translateX(20px); } }
          @keyframes pulse-glow { 0%, 100% { filter: drop-shadow(0 0 30px rgba(100,255,218,0.6)); } 50% { filter: drop-shadow(0 0 60px rgba(100,255,218,0.9)); } }
          @keyframes gradient { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
          .animate-fadeInScale { animation: fadeInScale 1s ease-out forwards; }
          .animate-shockwave { animation: shockwave 2s ease-out infinite; }
          .animate-slideUp { animation: slideUp 0.8s ease-out forwards; opacity: 0; }
          .animate-float { animation: float linear infinite; }
          .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
          .animate-gradient { background-size: 200% 200%; animation: gradient 3s ease infinite; }
          .animation-delay-300 { animation-delay: 0.3s; }
          .animation-delay-600 { animation-delay: 0.6s; }
        `}</style>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${colors.bg}`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#64FFDA] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`${colors.accentText} text-xl font-semibold`}>Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  // --- MAIN DASHBOARD RENDER (MOBILE OPTIMIZED) ---
  return (
    // Mobile-first: Less padding on mobile (p-2), more on desktop (sm:p-5)
    <div className={`min-h-screen ${colors.bg} ${colors.textMain} p-2 sm:p-5 font-sans transition-colors duration-300`}>
      <div className={`max-w-[1500px] mx-auto ${colors.containerBg} rounded-2xl sm:rounded-3xl shadow-2xl border ${colors.border} p-3 sm:p-5 md:p-8 space-y-4 sm:space-y-6`}>
       
        {/* HEADER */}
        <div className="flex flex-row justify-between items-center gap-2 mb-2">
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div className="p-2 sm:p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-200">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 sm:w-6 sm:h-6 text-white">
                    <rect x="3" y="3" width="7" height="9"></rect>
                    <rect x="14" y="3" width="7" height="5"></rect>
                    <rect x="14" y="12" width="7" height="9"></rect>
                    <rect x="3" y="16" width="7" height="5"></rect>
                  </svg>
                </div>
                 
                {/* Text */}
                <div>
                  <h2 className={`text-xl sm:text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight leading-none`}>
                    {t('Dashboard')}
                  </h2>
                  <p className="hidden sm:block text-[10px] sm:text-xs font-medium text-slate-500 tracking-wide mt-1 uppercase">
                    Business Overview <span className="text-[9px] text-blue-500 ml-1 opacity-70">(Alt+O)</span>
                  </p>
                </div>
             </div>

             <div className="hidden md:block px-3 py-1 bg-white border border-blue-100 rounded-full shadow-sm">
                <span className="text-[10px] font-bold text-blue-600 tracking-wider uppercase">Carbon Blue v2.5</span>
             </div>
        </div>

        {/* 1. MOBILE OPTIMIZED FILTERS */}
        {/* Mobile: Flex Column (Stacked), Desktop: Flex Row */}
        <div className={`w-full flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border ${isLight ? "bg-white border-blue-100/50" : "bg-[#0D1B2A] border-[#1E2D45]"}`}>
          
          {/* Date - Full width on mobile */}
          <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 px-2 py-2 sm:py-1 shadow-sm hover:shadow-md transition-shadow focus-within:ring-2 focus-within:ring-blue-400">
             <span className="text-lg mr-2">📅</span>
             <select 
               ref={dateSelectRef}
               className="bg-transparent text-xs sm:text-sm font-semibold text-gray-700 outline-none border-none cursor-pointer w-full focus:ring-0"
               value={dateFilter} 
               onChange={(e) => setDateFilter(e.target.value)}
               tabIndex="0"
               aria-label="Date Filter"
             >
               <option value="today">Today</option>
               <option value="yesterday">Yesterday</option>
               <option value="this_week">This Week</option>
               <option value="this_month">This Month</option>
               <option value="last_month">Last Month</option>
               <option value="this_quarter">This Quarter</option>
               <option value="this_year">This Year</option>
               <option value="last_year">Last Year</option>
               <option value="all">All Dates</option>
               <option value="custom">Custom</option>
             </select>
          </div>

          {dateFilter === "custom" && (
            <div className="flex gap-2 w-full sm:w-auto">
                <input type="date" className="flex-1 text-xs border rounded-lg px-2 py-2 bg-white shadow-sm outline-none focus:ring-2 ring-blue-400" value={customDateRange.start} onChange={(e) => setCustomDateRange({...customDateRange, start: e.target.value})} />
                <input type="date" className="flex-1 text-xs border rounded-lg px-2 py-2 bg-white shadow-sm outline-none focus:ring-2 ring-blue-400" value={customDateRange.end} onChange={(e) => setCustomDateRange({...customDateRange, end: e.target.value})} />
            </div>
          )}

          <div className="hidden sm:block h-6 w-px bg-gray-300 mx-1"></div>

          {/* Filters Row for Mobile (Category & Group side by side on mobile if space, else stack) */}
          <div className="grid grid-cols-2 sm:flex sm:flex-1 gap-2">
            {/* Category */}
            <div className="col-span-1 flex items-center bg-gray-50 rounded-lg border border-gray-200 px-2 py-2 sm:py-1 shadow-sm hover:shadow-md transition-shadow min-w-[100px] focus-within:ring-2 focus-within:ring-blue-400">
               <span className="hidden sm:inline text-lg mr-1">🏷️</span>
               <select 
                 ref={categorySelectRef}
                 className="bg-transparent text-xs font-semibold text-gray-700 outline-none border-none cursor-pointer w-full focus:ring-0" 
                 value={filterCategory || ""} 
                 onChange={(e) => setFilterCategory(e.target.value)}
                 tabIndex="0"
               >
                 <option value="">Category</option>
                 {Array.from(new Set(allData.map((r) => r["Item Category"]).filter(v => v && v !== 'N/A'))).map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
               </select>
            </div>

            {/* Group */}
            <div className="col-span-1 flex items-center bg-gray-50 rounded-lg border border-gray-200 px-2 py-2 sm:py-1 shadow-sm hover:shadow-md transition-shadow min-w-[100px] focus-within:ring-2 focus-within:ring-blue-400">
               <span className="hidden sm:inline text-lg mr-1">👥</span>
               <select className="bg-transparent text-xs font-semibold text-gray-700 outline-none border-none cursor-pointer w-full focus:ring-0" value={filterPartyGroup || ""} onChange={(e) => setFilterPartyGroup(e.target.value)} tabIndex="0">
                 <option value="">Party Grp</option>
                 {Array.from(new Set(allData.map((r) => r["Party Group"]).filter(v => v && v !== 'N/A'))).map((grp, i) => <option key={i} value={grp}>{grp}</option>)}
               </select>
            </div>
          </div>
          
           {/* Item Group */}
           <div className="w-full sm:w-auto flex items-center bg-gray-50 rounded-lg border border-gray-200 px-2 py-2 sm:py-1 shadow-sm hover:shadow-md transition-shadow min-w-[140px] focus-within:ring-2 focus-within:ring-blue-400">
               <span className="hidden sm:inline text-lg mr-1">📦</span>
               <select className="bg-transparent text-xs font-semibold text-gray-700 outline-none border-none cursor-pointer w-full focus:ring-0" value={mainItemGroupFilter || ""} onChange={(e) => setMainItemGroupFilter(e.target.value)} tabIndex="0">
                 <option value="">Item Group</option>
                 {Array.from(new Set(allData.map((r) => r["Item Group"]).filter(v => v && v !== 'N/A'))).map((grp, i) => <option key={i} value={grp}>{grp}</option>)}
               </select>
               {mainItemGroupFilter && <button onClick={() => setMainItemGroupFilter('')} className="ml-1 text-red-500 hover:text-red-700 font-bold">×</button>}
            </div>

        </div>

        {/* TAB MENU - Scrollable on Mobile */}
        <div className={`flex gap-2 sm:gap-4 mb-4 sm:mb-6 border-b pb-1 overflow-x-auto whitespace-nowrap scrollbar-hide ${colors.border}`}>
          {["overview", "performers", "reports"].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)} 
                className={`px-4 sm:px-6 py-2 sm:py-3 font-bold rounded-t-lg transition-all text-xs sm:text-sm tracking-wide capitalize focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0
                ${activeTab === tab 
                  ? `bg-blue-600 text-white shadow-lg translate-y-[1px]` 
                  : `${colors.textMuted} hover:bg-gray-100 hover:text-blue-600`}`}
                tabIndex="0"
              >
                {tab === 'overview' && '📈 '}
                {tab === 'performers' && '🏆 '}
                {tab === 'reports' && '📊 '}
                {t(tab)}
              </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <>
            {/* 4. COLORFUL CARDS (Mobile: 1 Column for big impact, Tablet: 2 Col) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              
              {/* Sales Card */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-4 sm:p-5 shadow-lg text-white transform hover:scale-[1.03] transition-transform duration-300 relative overflow-hidden group min-h-[120px]">
                <div className="absolute right-[-20px] top-[-20px] opacity-20 transform rotate-12 group-hover:scale-110 transition-transform">
                    <span className="text-[80px] sm:text-[100px]">💰</span>
                </div>
                <p className="text-blue-100 text-[10px] sm:text-xs font-bold uppercase tracking-wider">{t('Total Sales')}</p>
                <h3 className="text-2xl sm:text-2xl md:text-3xl font-black mt-1 break-all">{fmt(totalSales)}</h3>
                <div className="mt-2 sm:mt-3 text-[10px] sm:text-xs bg-white/20 inline-block px-2 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                    {cleanData.length} transactions
                </div>
              </div>

              {/* Parties Card */}
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 sm:p-5 shadow-lg text-white transform hover:scale-[1.03] transition-transform duration-300 relative overflow-hidden group min-h-[120px]">
                 <div className="absolute right-[-20px] top-[-20px] opacity-20 transform rotate-12 group-hover:scale-110 transition-transform">
                    <span className="text-[80px] sm:text-[100px]">👥</span>
                </div>
                <p className="text-emerald-100 text-[10px] sm:text-xs font-bold uppercase tracking-wider">{t('Active Parties')}</p>
                <h3 className="text-2xl sm:text-2xl md:text-3xl font-black mt-1">{new Set(cleanData.map(r => r["Party Name"]).filter(v => v && v !== 'N/A')).size}</h3>
                <div className="mt-2 sm:mt-3 text-[10px] sm:text-xs bg-white/20 inline-block px-2 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                    Unique Customers
                </div>
              </div>

              {/* Vouchers Card (Smaller grid on mobile for less critical stats? No, keep stacked for consistency or use grid-cols-2 for these) */}
              <div className="bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl p-4 sm:p-5 shadow-lg text-white transform hover:scale-[1.03] transition-transform duration-300 relative overflow-hidden group min-h-[120px]">
                <div className="absolute right-[-20px] top-[-20px] opacity-20 transform rotate-12 group-hover:scale-110 transition-transform">
                    <span className="text-[80px] sm:text-[100px]">🧾</span>
                </div>
                <p className="text-purple-100 text-[10px] sm:text-xs font-bold uppercase tracking-wider">{t('Total Vouchers')}</p>
                <h3 className="text-2xl sm:text-2xl md:text-3xl font-black mt-1">{uniqueVoucherNumbers}</h3>
                <div className="mt-2 sm:mt-3 text-[10px] sm:text-xs bg-white/20 inline-block px-2 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                    Generated Bills
                </div>
              </div>

              {/* Products Card */}
              <div className="bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl p-4 sm:p-5 shadow-lg text-white transform hover:scale-[1.03] transition-transform duration-300 relative overflow-hidden group min-h-[120px]">
                <div className="absolute right-[-20px] top-[-20px] opacity-20 transform rotate-12 group-hover:scale-110 transition-transform">
                    <span className="text-[80px] sm:text-[100px]">📦</span>
                </div>
                <p className="text-orange-100 text-[10px] sm:text-xs font-bold uppercase tracking-wider">{t('Products Sold')}</p>
                <h3 className="text-2xl sm:text-2xl md:text-3xl font-black mt-1">{totalProducts}</h3>
                <div className="mt-2 sm:mt-3 text-[10px] sm:text-xs bg-white/20 inline-block px-2 py-1 rounded-lg backdrop-blur-sm border border-white/10">
                    Unique Items
                </div>
              </div>
            </div>

            {/* Charts - Single Column on Mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-6">
              {/* Sales Trend */}
              {(() => {
                const monthlyAgg = {};
                cleanData.forEach((r) => {
                  const dateStr = r["Date"] || '';
                  const d = new Date(dateStr);
                  if (isNaN(d)) return;
                  const monthYear = d.toLocaleString("en-IN", { month: "short", year: "numeric" });
                  monthlyAgg[monthYear] = (monthlyAgg[monthYear] || 0) + toNumber(r["Amount"]);
                });

                const entries = Object.entries(monthlyAgg).sort((a, b) => new Date(a[0]) - new Date(b[0]));
                const labels = entries.map(([k]) => k);
                const values = entries.map(([, v]) => v);

                return (
                  <div className={`${colors.cardBg} border rounded-2xl p-3 sm:p-5 shadow-md h-[250px] sm:h-[300px] overflow-hidden`}>
                    <h4 className={`text-xs sm:text-sm font-bold mb-2 sm:mb-4 ${colors.accentText} flex items-center gap-2`}><span className="text-lg sm:text-xl">📈</span> {t('Sales Trend')}</h4>
                    <div className="h-[200px] sm:h-[240px]">
                        <Line
                        data={{
                            labels,
                            datasets: [{
                            label: "Sales",
                            data: values,
                            borderColor: colors.chartLine,
                            backgroundColor: isLight ? "rgba(37, 99, 235, 0.1)" : "rgba(100, 255, 218, 0.1)",
                            borderWidth: 2,
                            tension: 0.4,
                            fill: true,
                            pointBackgroundColor: "#fff",
                            pointBorderColor: colors.chartLine,
                            pointBorderWidth: 2,
                            pointRadius: 3,
                            }],
                        }}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: "#1e293b",
                                padding: 10,
                                titleColor: "#fff",
                                bodyColor: "#cbd5e1",
                                callbacks: { label: (ctx) => `₹${ctx.raw.toLocaleString("en-IN")}` }
                            }
                            },
                            scales: {
                            x: { ticks: { color: colors.chartText, font: { size: 9 } }, grid: { color: colors.chartGrid, drawBorder: false } },
                            y: { ticks: { color: colors.chartText, font: { size: 9 }, callback: (val) => `₹${(val/1000).toFixed(0)}K` }, grid: { color: colors.chartGrid, drawBorder: false } },
                            },
                        }}
                        />
                    </div>
                  </div>
                );
              })()}

              {/* Category Pie */}
              {(() => {
                const categoryAgg = {};
                cleanData.forEach((r) => {
                  const cat = r["Item Category"] || "Unknown";
                  if (cat === 'N/A') return;
                  categoryAgg[cat] = (categoryAgg[cat] || 0) + toNumber(r["Amount"]);
                });

                const labels = Object.keys(categoryAgg).slice(0, 6);
                const values = Object.values(categoryAgg).slice(0, 6);
                const chartColors = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#6366F1"];

                return (
                  <div className={`${colors.cardBg} border rounded-2xl p-3 sm:p-5 shadow-md h-[250px] sm:h-[300px] overflow-hidden`}>
                    <h4 className={`text-xs sm:text-sm font-bold mb-2 sm:mb-4 ${colors.accentText} flex items-center gap-2`}><span className="text-lg sm:text-xl">🎯</span> {t('Category Distribution')}</h4>
                    <div className="h-[200px] sm:h-[240px]">
                        <Pie
                        data={{
                            labels,
                            datasets: [{
                            data: values,
                            backgroundColor: chartColors,
                            borderColor: isLight ? "#fff" : "#1B2A4A",
                            borderWidth: 2,
                            }],
                        }}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                            legend: {
                                position: 'right', // Legend on right for mobile pie charts often cleaner
                                labels: {
                                color: colors.chartText,
                                boxWidth: 10,
                                font: { size: 9, weight: 'bold' }
                                }
                            },
                            tooltip: {
                                backgroundColor: "#1e293b",
                                padding: 10,
                                callbacks: { label: (ctx) => `${ctx.label}: ₹${ctx.raw.toLocaleString("en-IN")}` }
                            }
                            },
                        }}
                        />
                    </div>
                  </div>
                );
              })()}

              {/* Top 5 Products */}
              {(() => {
                const prodAgg = {};
                cleanData.forEach((r) => {
                  const item = r["ItemName"] || "";
                  if (item === 'N/A' || !item) return;
                  prodAgg[item] = (prodAgg[item] || 0) + toNumber(r["Amount"]);
                });

                const sorted = Object.entries(prodAgg).sort((a, b) => b[1] - a[1]).slice(0, 5);
                const labels = sorted.map(([name]) => name.length > 15 ? name.substring(0,15)+'...' : name);
                const values = sorted.map(([, val]) => val);

                return (
                  <div className={`${colors.cardBg} border rounded-2xl p-3 sm:p-5 shadow-md h-[250px] sm:h-[300px] overflow-hidden`}>
                    <h4 className={`text-xs sm:text-sm font-bold mb-2 sm:mb-4 ${colors.accentText} flex items-center gap-2`}><span className="text-lg sm:text-xl">🔥</span> {t('Top Selling Items')}</h4>
                    <div className="h-[200px] sm:h-[240px]">
                        <Bar
                        data={{
                            labels,
                            datasets: [{
                            data: values,
                            backgroundColor: "rgba(59, 130, 246, 0.85)",
                            borderRadius: 4,
                            barThickness: 12,
                            }],
                        }}
                        options={{
                            indexAxis: 'y',
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                            x: { ticks: { color: colors.chartText, font: { size: 8 }, callback: (val) => `₹${(val/1000).toFixed(0)}K` }, grid: { display: false } },
                            y: { ticks: { color: colors.chartText, font: { size: 9, weight: 'bold' } }, grid: { display: false } },
                            },
                        }}
                        />
                    </div>
                  </div>
                );
              })()}
              
              {/* Top 5 Quantity */}
              {(() => {
                const qtyAgg = {};
                cleanData.forEach((r) => {
                    const item = r["ItemName"] || "";
                    if (item === 'N/A' || !item) return;
                    qtyAgg[item] = (qtyAgg[item] || 0) + toNumber(r["Qty"]);
                });
                
                const sorted = Object.entries(qtyAgg).sort((a, b) => b[1] - a[1]).slice(0, 5);
                const labels = sorted.map(([name]) => name.length > 15 ? name.substring(0,15)+'...' : name);
                const values = sorted.map(([, val]) => val);

                return (
                 <div className={`${colors.cardBg} border rounded-2xl p-3 sm:p-5 shadow-md h-[250px] sm:h-[300px] overflow-hidden`}>
                   <h4 className={`text-xs sm:text-sm font-bold mb-2 sm:mb-4 ${colors.accentText} flex items-center gap-2`}><span className="text-lg sm:text-xl">📊</span> {t('High Volume Items')}</h4>
                   <div className="h-[200px] sm:h-[240px]">
                    <Bar
                      data={{
                        labels,
                        datasets: [{
                          data: values,
                          backgroundColor: "rgba(16, 185, 129, 0.85)",
                          borderRadius: 4,
                          barThickness: 12,
                        }],
                      }}
                      options={{
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          x: { ticks: { color: colors.chartText, font: { size: 8 } }, grid: { display: false } },
                          y: { ticks: { color: colors.chartText, font: { size: 9, weight: 'bold' } }, grid: { display: false } },
                        },
                      }}
                    />
                   </div>
                 </div>
                );
              })()}

            </div>
          </>
        )}

        {/* TOP PERFORMERS TAB */}
        {activeTab === "performers" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Top Companies */}
            {(() => {
              const companyAgg = {};
              cleanData.forEach((r) => {
                const comp = r["Item Category"] || "Unknown";
                if (comp === 'N/A' || comp === 'Unknown') return;
                companyAgg[comp] = (companyAgg[comp] || 0) + toNumber(r["Amount"]);
              });
              const topCompanies = Object.entries(companyAgg).sort((a, b) => b[1] - a[1]).slice(0, 5);

              return (
                <div className={`${colors.cardBg} rounded-xl p-4 border shadow-md hover:shadow-lg transition-shadow`}>
                  <h4 className={`text-blue-600 font-black text-sm mb-3 uppercase tracking-wide border-b pb-2`}>🏢 {t('Companies')}</h4>
                  {topCompanies.length === 0 && <p className={`${colors.textMuted} text-xs`}>No data</p>}
                  <ul className={`space-y-2 ${colors.textMain} text-xs`}>
                    {topCompanies.map(([name, val], i) => (
                      <li key={i} className={`flex justify-between items-center bg-gray-50 p-2 rounded-lg`}>
                        <span className="truncate flex-1 font-medium">{i + 1}. {name}</span>
                        <span className={`text-blue-600 font-bold ml-2`}>₹{(val/1000).toFixed(0)}K</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
            {/* ... Other performers blocks are structurally fine with grid-cols-1 on mobile ... */}
             {/* Note: I'm keeping the other blocks but ensuring they follow the same responsive grid pattern */}
             {/* Top Products */}
            {(() => {
              const prodAgg = {};
              cleanData.forEach((r) => {
                const prod = r["ItemName"] || "Unknown";
                if (prod === 'N/A' || prod === 'Unknown') return;
                prodAgg[prod] = (prodAgg[prod] || 0) + toNumber(r["Amount"]);
              });
              const topProducts = Object.entries(prodAgg).sort((a, b) => b[1] - a[1]).slice(0, 5);

              return (
                <div className={`${colors.cardBg} rounded-xl p-4 border shadow-md hover:shadow-lg transition-shadow`}>
                  <h4 className={`text-emerald-600 font-black text-sm mb-3 uppercase tracking-wide border-b pb-2`}>📦 {t('Products')}</h4>
                  <ul className={`space-y-2 ${colors.textMain} text-xs`}>
                    {topProducts.map(([name, val], i) => (
                      <li key={i} className={`flex justify-between items-center bg-gray-50 p-2 rounded-lg`}>
                        <span className="truncate flex-1 font-medium">{i + 1}. {name}</span>
                        <span className={`text-emerald-600 font-bold ml-2`}>₹{(val/1000).toFixed(0)}K</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
             {/* Top Groups */}
            {(() => {
              const groupAgg = {};
              cleanData.forEach((r) => {
                const grp = r["Party Group"] || "Unknown";
                if (grp === 'N/A' || grp === 'Unknown') return;
                groupAgg[grp] = (groupAgg[grp] || 0) + toNumber(r["Amount"]);
              });
              const topGroups = Object.entries(groupAgg).sort((a, b) => b[1] - a[1]).slice(0, 5);

              return (
                <div className={`${colors.cardBg} rounded-xl p-4 border shadow-md hover:shadow-lg transition-shadow`}>
                  <h4 className={`text-purple-600 font-black text-sm mb-3 uppercase tracking-wide border-b pb-2`}>👥 {t('Groups')}</h4>
                  <ul className={`space-y-2 ${colors.textMain} text-xs`}>
                    {topGroups.map(([name, val], i) => (
                      <li key={i} className={`flex justify-between items-center bg-gray-50 p-2 rounded-lg`}>
                        <span className="truncate flex-1 font-medium">{i + 1}. {name}</span>
                        <span className={`text-purple-600 font-bold ml-2`}>₹{(val/1000).toFixed(0)}K</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
            {/* Top Areas */}
            {(() => {
              const areaAgg = {};
              cleanData.forEach((r) => {
                const city = r["City/Area"] || "Unknown";
                if (city === 'N/A' || city === 'Unknown') return;
                areaAgg[city] = (areaAgg[city] || 0) + toNumber(r["Amount"]);
              });
              const topAreas = Object.entries(areaAgg).sort((a, b) => b[1] - a[1]).slice(0, 5);

              return (
                <div className={`${colors.cardBg} rounded-xl p-4 border shadow-md hover:shadow-lg transition-shadow`}>
                  <h4 className={`text-orange-600 font-black text-sm mb-3 uppercase tracking-wide border-b pb-2`}>🌆 {t('Areas')}</h4>
                  <ul className={`space-y-2 ${colors.textMain} text-xs`}>
                    {topAreas.map(([name, val], i) => (
                      <li key={i} className={`flex justify-between items-center bg-gray-50 p-2 rounded-lg`}>
                        <span className="truncate flex-1 font-medium">{i + 1}. {name}</span>
                        <span className={`text-orange-600 font-bold ml-2`}>₹{(val/1000).toFixed(0)}K</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </div>
        )}

        {/* REPORTS TAB - Grid 1 col on mobile, 2 on desktop */}
        {activeTab === "reports" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <ReportCard title={t("Party Wise")} columns={["Party Name", "Item Category", "Qty", "Amount"]} data={aggregateData("Party Name", "Item Category", partyFilter, "")} onView={() => openViewModal(t("Party Wise Sales Report"), ["Party Name", "Item Category", "Qty", "Amount", "Count"], aggregateData("Party Name", "Item Category"))} onRowClick={(row) => openDetailModal(row, ["Party Name", "Item Category", "Qty", "Amount", "Count"])} filter1Value={partyFilter} filter1Options={Array.from(new Set(cleanData.map(r => r["Party Name"]).filter(v => v && v !== 'N/A')))} onFilter1Change={setPartyFilter} filter1Label={t("Party")} colors={colors} t={t} icon="👥" />
            <ReportCard title={t("Salesman Wise")} columns={["Salesman", "Item Category", "Qty", "Amount"]} data={aggregateData("Party Group", "Item Category", salesmanFilter, "").map(row => ({...row, Salesman: row["Party Group"]}))} onView={() => openViewModal(t("Salesman Wise Sales Report"), ["Salesman", "Item Category", "Qty", "Amount", "Count"], aggregateData("Party Group", "Item Category").map(row => ({...row, Salesman: row["Party Group"]})))} onRowClick={(row) => openDetailModal(row, ["Salesman", "Item Category", "Qty", "Amount", "Count"])} filter1Value={salesmanFilter} filter1Options={Array.from(new Set(cleanData.map(r => r["Party Group"]).filter(v => v && v !== 'N/A')))} onFilter1Change={setSalesmanFilter} filter1Label={t("Salesman")} colors={colors} t={t} icon="🧑‍💼" />
            <ReportCard title={t("Area Wise")} columns={["City/Area", "Item Category", "Qty", "Amount"]} data={aggregateData("City/Area", "Item Category", areaFilter, "")} onView={() => openViewModal(t("Area Wise Sales Report"), ["City/Area", "Item Category", "Qty", "Amount", "Count"], aggregateData("City/Area", "Item Category"))} onRowClick={(row) => openDetailModal(row, ["City/Area", "Item Category", "Qty", "Amount", "Count"])} filter1Value={areaFilter} filter1Options={Array.from(new Set(cleanData.map(r => r["City/Area"]).filter(v => v && v !== 'N/A')))} onFilter1Change={setAreaFilter} filter1Label={t("Area")} colors={colors} t={t} icon="🌍" />
            <ReportCard title={t("Product Wise")} columns={["Product", "Item Group", "Qty", "Amount"]} data={aggregateData("ItemName", "Item Group", productFilter, "").map(row => ({...row, Product: row["ItemName"]}))} onView={() => openViewModal(t("Product Wise Sales Report"), ["Product", "Item Group", "Qty", "Amount", "Count"], aggregateData("ItemName", "Item Group").map(row => ({...row, Product: row["ItemName"]})))} onRowClick={(row) => openDetailModal(row, ["Product", "Item Group", "Qty", "Amount", "Count"])} filter1Value={productFilter} filter1Options={Array.from(new Set(cleanData.map(r => r["ItemName"]).filter(v => v && v !== 'N/A')))} onFilter1Change={setProductFilter} filter1Label={t("Product")} colors={colors} t={t} icon="📦" />
            <ReportCard title={t("Group Wise")} columns={["Item Group", "Item Category", "Qty", "Amount"]} data={aggregateData("Item Group", "Item Category", itemGroupFilter, "")} onView={() => openViewModal(t("Item Group Wise Sales Report"), ["Item Group", "Item Category", "Qty", "Amount", "Count"], aggregateData("Item Group", "Item Category"))} onRowClick={(row) => openDetailModal(row, ["Item Group", "Item Category", "Qty", "Amount", "Count"])} filter1Value={itemGroupFilter} filter1Options={Array.from(new Set(cleanData.map(r => r["Item Group"]).filter(v => v && v !== 'N/A')))} onFilter1Change={setItemGroupFilter} filter1Label={t("Group")} colors={colors} t={t} icon="📁" />
          </div>
        )}
      </div>

      {/* MODALS - Full width on mobile */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-2 sm:pt-10 px-0 sm:px-2" onKeyDown={(e) => e.key === "Escape" && setModalOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div ref={modalRef} className={`relative w-full sm:max-w-6xl backdrop-blur-lg rounded-t-2xl sm:rounded-2xl shadow-2xl border p-3 sm:p-6 z-60 h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col ${isLight ? "bg-white border-blue-200" : "bg-[#0D1B2A]/90 border-[#1E2D45] mt-auto"}`}>
            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
              <h3 className={`text-lg sm:text-2xl font-black text-blue-700 truncate mr-2`}>{modalContent.title}</h3>
              <button id="modal-close-btn" onClick={() => setModalOpen(false)} className="bg-red-50 text-red-500 rounded-full w-8 h-8 flex-shrink-0 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all focus:outline-none focus:ring-2 focus:ring-red-500">✕</button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 sm:gap-6 flex-1 overflow-hidden">
              <div id="modal-scroll" className={`flex-1 overflow-auto border rounded-xl shadow-inner ${isLight ? "bg-gray-50 border-gray-200" : "bg-[#0F1E33] border-[#1E2D45]"}`}>
                {/* 6. COLORFUL EXCEL STYLE TABLE */}
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <thead className={`sticky top-0 z-20 bg-blue-700 text-white shadow-md`}>
                    <tr>
                      {modalContent.columns.map((col, i) => (
                        <th key={i} className={`px-2 sm:px-4 py-2 sm:py-3 font-bold uppercase tracking-wider text-[10px] sm:text-xs whitespace-nowrap ${i === modalContent.columns.length - 1 ? 'text-right' : 'text-left'}`}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {(modalContent.data || []).map((r, i) => (
                      <tr key={i} tabIndex="0" onKeyDown={(e) => handleEnterKey(e, () => openDetailModal(r, modalContent.columns))} onClick={() => openDetailModal(r, modalContent.columns)} className={`${i % 2 === 0 ? "bg-white" : "bg-blue-50/50"} hover:bg-blue-100 cursor-pointer border-b border-gray-100 transition-colors focus:outline-none focus:bg-blue-200`}>
                        {modalContent.columns.map((col, j) => (
                          <td key={j} className={`px-2 sm:px-4 py-2 sm:py-2.5 ${j === modalContent.columns.length - 1 ? `text-right font-bold text-blue-800` : 'text-gray-700'}`}>
                            {col === "Amount" ? fmt(r[col]) : col === "Qty" ? r[col]?.toLocaleString("en-IN") : r[col] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {modalContent.data && modalContent.data.length > 0 && (
                      <tr className={`font-bold border-t-2 sticky bottom-0 z-20 shadow-lg bg-yellow-50 border-yellow-200 text-yellow-800`}>
                        <td className="px-2 sm:px-4 py-2 sm:py-3" colSpan={modalContent.columns.length - 1}>{t('TOTAL')} ({modalContent.data.length})</td>
                        <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-sm">{fmt(modalContent.data.reduce((sum, r) => sum + toNumber(r.Amount || 0), 0))}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <aside className={`w-full md:w-[220px] border rounded-xl p-3 sm:p-4 bg-white shadow-lg flex flex-row md:flex-col gap-2 sm:gap-3 overflow-x-auto md:overflow-visible`}>
                 {/* Mobile: Horizontal Export buttons */}
                <button onClick={() => exportPDF(modalContent.title)} className="flex-1 md:w-full bg-emerald-600 text-white py-2 rounded-lg text-xs sm:text-sm font-semibold hover:bg-emerald-700 whitespace-nowrap px-2">📄 PDF</button>
                <button onClick={() => exportExcel(modalContent.title, modalContent.columns, modalContent.data)} className="flex-1 md:w-full bg-blue-600 text-white py-2 rounded-lg text-xs sm:text-sm font-semibold hover:bg-blue-700 whitespace-nowrap px-2">📊 Excel</button>
                <button onClick={() => exportCSV(modalContent.title, modalContent.columns, modalContent.data)} className="flex-1 md:w-full bg-slate-700 text-white py-2 rounded-lg text-xs sm:text-sm font-semibold hover:bg-slate-800 whitespace-nowrap px-2">📁 CSV</button>
              </aside>
            </div>
          </div>
        </div>
      )}

      {detailModalOpen && selectedRowDetail && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" onKeyDown={(e) => e.key === "Escape" && setDetailModalOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetailModalOpen(false)} />
          {/* Bottom Sheet on Mobile, Center Modal on Desktop */}
          <div className={`relative border rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 w-full max-w-2xl shadow-2xl z-[71] max-h-[85vh] overflow-auto bg-white border-white animate-slideUp`}>
            <div className={`flex justify-between items-center mb-4 border-b pb-3 sticky top-0 z-10 bg-white`}>
              <h3 className={`text-lg sm:text-xl font-bold text-blue-800`}>📋 {t('Details')}</h3>
              <button onClick={() => setDetailModalOpen(false)} className="bg-red-100 text-red-600 rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 hover:text-white transition-colors focus:ring-2 focus:ring-red-500">✕</button>
            </div>
            <div className="space-y-3">
              {selectedRowDetail.columns.map((col, i) => (
                <div key={i} className={`flex justify-between border-b border-gray-100 pb-2 hover:bg-gray-50 p-2 rounded`}>
                  <span className={`font-semibold text-sm text-gray-600`}>{col}:</span>
                  <span className={`text-right ml-4 text-sm font-bold text-gray-800 break-words max-w-[60%]`}>{col === "Amount" ? fmt(selectedRowDetail.row[col]) : selectedRowDetail.row[col] || "-"}</span>
                </div>
              ))}
            </div>
            <button ref={(btn) => btn && btn.focus()} onClick={() => setDetailModalOpen(false)} className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:shadow-lg text-sm hover:bg-blue-700 transition-all focus:ring-2 focus:ring-blue-500">{t('Close Window')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// COMPACT REPORT CARD (UPDATED WITH THEME & TRANSLATIONS)
function ReportCard({ title, columns, data, onView, onRowClick, filter1Value, filter1Options, onFilter1Change, filter1Label, colors, t, icon }) {
  const [searchTerm, setSearchTerm] = useState("");
  const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
   
  // Helper for keyboard enter on rows
  const handleEnterKey = (e, callback) => {
    if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        callback();
    }
  };

  const exportCSV = () => {
    const csv = [columns.join(","), ...filteredData.map((r) => columns.map((c) => (r[c] || "").toString().replace(/,/g, " ")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.csv`;
    a.click();
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData.map((row) => {
      const out = {};
      columns.forEach((c) => (out[c] = row[c] || ""));
      return out;
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${title}.xlsx`);
  };

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    return data.filter(row => {
      return columns.some(col => {
        const val = String(row[col] || "").toLowerCase();
        return val.includes(searchTerm.toLowerCase());
      });
    });
  }, [data, searchTerm, columns]);

  const totalAmount = filteredData.reduce((sum, r) => sum + parseFloat(String(r.Amount || "").replace(/[^0-9.-]/g, "") || 0), 0);
  const totalQty = filteredData.reduce((sum, r) => sum + parseFloat(String(r.Qty || "").replace(/[^0-9.-]/g, "") || 0), 0);

  return (
    <div className={`${colors.cardBg} rounded-xl p-3 sm:p-4 shadow-md border hover:shadow-xl transition-all duration-300 group`}>
      <div className={`flex justify-between items-center mb-3 border-b border-gray-100 pb-2`}>
        <h4 className={`font-black text-xs sm:text-sm text-blue-900 flex items-center gap-2 truncate`}>
            <span className="bg-blue-100 text-blue-600 p-1 rounded-lg text-md group-hover:scale-110 transition-transform">{icon}</span> 
            {title}
        </h4>
        <div className="flex gap-1 shrink-0">
          <button onClick={exportCSV} className="hidden sm:block bg-gray-100 text-gray-600 text-[10px] px-2 py-1 rounded hover:bg-gray-200 font-bold border focus:ring-2 focus:ring-gray-400">CSV</button>
          <button onClick={onView} className="bg-blue-600 text-white text-[10px] px-2 sm:px-3 py-1 rounded-full hover:bg-blue-700 shadow-md font-bold focus:ring-2 focus:ring-blue-400">{t('Expand')}</button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        {/* COMPACT SEARCH */}
        <input
          type="text"
          placeholder="🔍 Search..."
          className={`w-full sm:w-1/2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
         
        {/* COMPACT FILTER */}
        <div className="flex flex-1 relative w-full">
            <select value={filter1Value} onChange={(e) => onFilter1Change(e.target.value)} className={`w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 appearance-none`}>
            <option value="">All {filter1Label}</option>
            {filter1Options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
            </select>
            {filter1Value && (
            <button onClick={() => onFilter1Change("")} className="absolute right-1 top-1 bg-red-100 text-red-500 rounded-full w-4 h-4 text-[10px] flex items-center justify-center hover:bg-red-500 hover:text-white">✕</button>
            )}
        </div>
      </div>

      {/* COMPACT COLORFUL TABLE */}
      <div className={`overflow-auto max-h-[250px] border border-gray-200 rounded-lg scrollbar-thin`}>
        <table className="w-full text-[10px] sm:text-xs">
          <thead className={`sticky top-0 z-10 bg-slate-100 text-slate-700`}>
            <tr>
              {columns.map((c, i) => (
                <th key={i} className={`px-2 py-2 text-left font-bold uppercase tracking-wide whitespace-nowrap ${i === columns.length - 1 ? "text-right" : ""}`}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 && (
              <tr><td colSpan={columns.length} className={`text-center py-4 text-xs text-gray-400`}>No Data Found</td></tr>
            )}
            {filteredData.slice(0, 20).map((row, i) => (
              <tr 
                key={i} 
                tabIndex="0" 
                onClick={() => onRowClick && onRowClick(row)}
                onKeyDown={(e) => handleEnterKey(e, () => onRowClick && onRowClick(row))}
                className={`hover:bg-blue-50 cursor-pointer border-b border-gray-100 focus:outline-none focus:bg-blue-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
              >
                {columns.map((c, j) => (
                  <td key={j} className={`px-2 py-2 whitespace-nowrap ${j === columns.length - 1 ? `text-right font-bold text-blue-700` : 'text-gray-700 font-medium'}`}>
                    {c === "Amount" ? fmt(row[c]) : c === "Qty" ? row[c]?.toLocaleString("en-IN") : row[c] || "-"}
                  </td>
                ))}
              </tr>
            ))}

            {filteredData.length > 0 && (
              <tr className={`font-bold border-t-2 sticky bottom-0 z-20 shadow-md bg-yellow-50 text-yellow-900 border-yellow-200`}>
                <td className="px-2 py-2 text-xs" colSpan={columns.length - 2}>{t('TOTAL')}</td>
                <td className="px-2 py-2 text-right text-xs">{totalQty.toLocaleString("en-IN")}</td>
                <td className="px-2 py-2 text-right text-xs font-black">{fmt(totalAmount)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
