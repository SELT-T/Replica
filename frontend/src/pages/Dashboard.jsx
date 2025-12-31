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

  const [partyFilter, setPartyFilter] = useState("");
  const [salesmanFilter, setSalesmanFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [itemGroupFilter, setItemGroupFilter] = useState("");

  const { user } = useAuth();
  const isLoggedIn = !!user;

  const modalRef = useRef();

  // --- DYNAMIC THEME COLORS (Keep Original Dark + Add New Light) ---
  const colors = {
    bg: isLight ? "bg-[#F0F2F5]" : "bg-gradient-to-br from-[#0A192F] via-[#112240] to-[#0A192F]",
    containerBg: isLight ? "bg-white border-gray-300 shadow-md text-[#0A192F]" : "bg-[#1B2A4A] border-[#1E2D45] text-gray-100",
    cardBg: isLight ? "bg-gray-50 border-gray-200 text-[#0A192F]" : "bg-[#0F1E33] border-[#1E2D45] text-white", // Inner cards
    textMain: isLight ? "text-[#0A192F]" : "text-gray-100",
    textMuted: isLight ? "text-gray-500" : "text-gray-400",
    accentText: isLight ? "text-[#0A192F]" : "text-[#64FFDA]",
    border: isLight ? "border-gray-300" : "border-[#1E2D45]",
    inputBg: isLight ? "bg-white text-[#0A192F] border-gray-300" : "bg-[#112A45] text-gray-200 border-[#1E2D45]",
    buttonPrimary: isLight ? "bg-[#0A192F] text-white hover:bg-[#112240]" : "bg-[#64FFDA] text-[#0A192F] hover:bg-[#4cc9ac]",
    chartLine: isLight ? "#0A192F" : "#64FFDA",
    chartGrid: isLight ? "#E5E7EB" : "#1E293B",
    chartText: isLight ? "#374151" : "#9CA3AF"
  };

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

  return filtered;
}, [excelData, filterCategory, filterPartyGroup, user]);

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
    a.href = url;
    a.download = `${title}.csv`;
    a.click();
  };

  const exportExcel = (title, columns, data) => {
    const ws = XLSX.utils.json_to_sheet(data.map((row) => {
      const out = {};
      columns.forEach((c) => (out[c] = row[c] || ""));
      return out;
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${title}.xlsx`);
  };

  const exportPDF = async (title) => {
    if (!modalRef.current) return;
    const el = modalRef.current;
    const canvas = await html2canvas(el, { scale: 2 });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(img, "PNG", 0, 8, width, height);
    pdf.save(`${title}.pdf`);
  };

  const openViewModal = (title, columns, data) => {
    setModalContent({ title, columns, data });
    setModalOpen(true);
    setTimeout(() => {
      const el = document.getElementById("modal-scroll");
      if (el) el.scrollTop = 0;
    }, 40);
  };

  const openDetailModal = (row, columns) => {
    setSelectedRowDetail({ row, columns });
    setDetailModalOpen(true);
  };

  if (!isLoggedIn) {
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

          {/* FIXED: BUTTONS NOW USE openLogin/openSignup PROPS */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slideUp animation-delay-300 px-4">
            <button onClick={openLogin} className={`w-full sm:w-auto group relative px-8 md:px-10 py-3 md:py-4 font-bold text-base md:text-lg rounded-xl shadow-[0_0_30px_rgba(100,255,218,0.3)] hover:shadow-[0_0_50px_rgba(100,255,218,0.6)] transition-all duration-300 hover:scale-105 ${colors.buttonPrimary}`}>
              <span className="flex items-center justify-center gap-2">🔑 Login Now</span>
            </button>
            <button onClick={openSignup} className="w-full sm:w-auto group relative px-8 md:px-10 py-3 md:py-4 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-bold text-base md:text-lg rounded-xl shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_50px_rgba(59,130,246,0.6)] transition-all duration-300 hover:scale-105">
              <span className="flex items-center justify-center gap-2">✨ Create Account</span>
            </button>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-2 md:gap-4 animate-slideUp animation-delay-600 px-2">
            {['📊 Live Reports', '🔒 Secure', '⚡ Real-time', '📈 Analytics'].map((text, i) => (
              <div key={i} className={`px-3 py-1.5 backdrop-blur-sm border rounded-full text-xs ${isLight ? "bg-white/50 border-gray-300 text-gray-600" : "bg-[#112240]/50 border-[#64FFDA]/20 text-gray-300"}`}>{text}</div>
            ))}
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

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.textMain} p-2 sm:p-4 md:p-6 transition-colors duration-300`}>
      <div className={`max-w-[1450px] mx-auto ${colors.containerBg} rounded-2xl shadow-xl border ${colors.border} p-4 md:p-6 space-y-6`}>
        <h2 className={`text-xl sm:text-2xl font-bold ${colors.accentText} mb-4 sm:mb-6`}>📊 {t('dashboard').toUpperCase()}</h2>

        {/* COMPACT FILTERS */}
        <div className={`mb-4 border rounded-lg p-3 space-y-3 ${isLight ? "bg-gray-50 border-gray-300" : "bg-[#0D1B2A] border-[#1E2D45]"}`}>
          {/* Date Filter Row */}
          <div className="flex flex-wrap items-center gap-2">
            <label className={`text-xs font-semibold whitespace-nowrap ${colors.accentText}`}>📅 {t('Date')}:</label>
            <select 
              className={`flex-1 min-w-[120px] border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#64FFDA] ${colors.inputBg}`} 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
              <option value="last_year">Last Year</option>
              <option value="all">All</option>
              <option value="custom">Custom</option>
            </select>

            {dateFilter === "custom" && (
              <>
                <input 
                  type="date" 
                  className={`flex-1 min-w-[120px] border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#64FFDA] ${colors.inputBg}`} 
                  value={customDateRange.start} 
                  onChange={(e) => setCustomDateRange({...customDateRange, start: e.target.value})} 
                />
                <input 
                  type="date" 
                  className={`flex-1 min-w-[120px] border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#64FFDA] ${colors.inputBg}`} 
                  value={customDateRange.end} 
                  onChange={(e) => setCustomDateRange({...customDateRange, end: e.target.value})} 
                />
              </>
            )}
          </div>

          {/* Category & Party Group Row */}
          <div className="flex flex-wrap items-center gap-2">
            <label className={`text-xs font-semibold whitespace-nowrap ${colors.accentText}`}>🏷️ {t('Category')}:</label>
            <select 
              className={`flex-1 min-w-[100px] border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#64FFDA] ${colors.inputBg}`} 
              value={filterCategory || ""} 
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">All</option>
              {Array.from(new Set(allData.map((r) => r["Item Category"]).filter(v => v && v !== 'N/A'))).map((cat, i) => (
                <option key={i} value={cat}>{cat}</option>
              ))}
            </select>
            
            {filterCategory && (
              <button onClick={() => setFilterCategory('')} className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">×</button>
            )}

            <label className={`text-xs font-semibold whitespace-nowrap ${colors.accentText}`}>👥 {t('Group')}:</label>
            <select 
              className={`flex-1 min-w-[100px] border rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#64FFDA] ${colors.inputBg}`} 
              value={filterPartyGroup || ""} 
              onChange={(e) => setFilterPartyGroup(e.target.value)}
            >
              <option value="">All</option>
              {Array.from(new Set(allData.map((r) => r["Party Group"]).filter(v => v && v !== 'N/A'))).map((grp, i) => (
                <option key={i} value={grp}>{grp}</option>
              ))}
            </select>
            
            {filterPartyGroup && (
              <button onClick={() => setFilterPartyGroup('')} className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600">×</button>
            )}
          </div>
        </div>

        {/* TAB MENU */}
        <div className={`flex gap-3 sm:gap-6 mb-6 border-b pb-2 overflow-x-auto scrollbar-hide ${colors.border}`}>
          <button onClick={() => setActiveTab("overview")} className={`px-4 sm:px-6 py-2 font-semibold rounded-lg transition text-xs sm:text-base whitespace-nowrap ${activeTab === "overview" ? `${colors.accentText} border-b-2 border-current` : `${colors.textMuted} hover:bg-gray-100 dark:hover:bg-[#0F1E33]`}`}>📈 {t('overview')}</button>
          <button onClick={() => setActiveTab("performers")} className={`px-4 sm:px-6 py-2 font-semibold rounded-lg transition text-xs sm:text-base whitespace-nowrap ${activeTab === "performers" ? `${colors.accentText} border-b-2 border-current` : `${colors.textMuted} hover:bg-gray-100 dark:hover:bg-[#0F1E33]`}`}>🏆 {t('Top')}</button>
          <button onClick={() => setActiveTab("reports")} className={`px-4 sm:px-6 py-2 font-semibold rounded-lg transition text-xs sm:text-base whitespace-nowrap ${activeTab === "reports" ? `${colors.accentText} border-b-2 border-current` : `${colors.textMuted} hover:bg-gray-100 dark:hover:bg-[#0F1E33]`}`}>📊 {t('reports')}</button>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <>
            {/* Summary Cards - Responsive Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className={`${colors.cardBg} border rounded-xl p-4 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300`}>
                <p className={`text-[10px] sm:text-xs opacity-90 ${colors.textMuted}`}>{t('Total Sales')}</p>
                <h3 className={`text-sm sm:text-xl md:text-2xl font-bold mt-1 ${colors.textMain}`}>{fmt(totalSales)}</h3>
                <p className={`text-[8px] sm:text-[10px] opacity-75 mt-1 ${colors.textMuted}`}>{cleanData.length} trans</p>
              </div>

              <div className={`${colors.cardBg} border rounded-xl p-4 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300`}>
                <p className={`text-[10px] sm:text-xs opacity-90 ${colors.textMuted}`}>{t('Parties')}</p>
                <h3 className={`text-sm sm:text-xl md:text-2xl font-bold mt-1 ${colors.textMain}`}>{new Set(cleanData.map(r => r["Party Name"]).filter(v => v && v !== 'N/A')).size}</h3>
                <p className={`text-[8px] sm:text-[10px] opacity-75 mt-1 ${colors.textMuted}`}>Customers</p>
              </div>

              <div className={`${colors.cardBg} border rounded-xl p-4 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300`}>
                <p className={`text-[10px] sm:text-xs opacity-90 ${colors.textMuted}`}>{t('Vouchers')}</p>
                <h3 className={`text-sm sm:text-xl md:text-2xl font-bold mt-1 ${colors.textMain}`}>{uniqueVoucherNumbers}</h3>
                <p className={`text-[8px] sm:text-[10px] opacity-75 mt-1 ${colors.textMuted}`}>Bills</p>
              </div>

              <div className={`${colors.cardBg} border rounded-xl p-4 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300`}>
                <p className={`text-[10px] sm:text-xs opacity-90 ${colors.textMuted}`}>{t('Products')}</p>
                <h3 className={`text-sm sm:text-xl md:text-2xl font-bold mt-1 ${colors.textMain}`}>{totalProducts}</h3>
                <p className={`text-[8px] sm:text-[10px] opacity-75 mt-1 ${colors.textMuted}`}>Items</p>
              </div>
            </div>

            {/* Charts - Responsive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
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
                  <div className={`${colors.cardBg} border rounded-xl p-4 shadow-lg h-[260px] overflow-hidden`}>
                    <h4 className={`text-xs sm:text-sm font-bold mb-2 sm:mb-3 ${colors.accentText}`}>📈 {t('Sales Trend')}</h4>
                    <Line
                      data={{
                        labels,
                        datasets: [{
                          label: "Sales",
                          data: values,
                          borderColor: colors.chartLine,
                          backgroundColor: isLight ? "rgba(10, 25, 47, 0.1)" : "rgba(100, 255, 218, 0.1)",
                          borderWidth: 2,
                          tension: 0.4,
                          fill: true,
                          pointRadius: 2,
                          pointHoverRadius: 4,
                        }],
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: "rgba(0,0,0,0.8)",
                            padding: 8,
                            titleColor: "#64FFDA",
                            bodyColor: "#fff",
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
                const chartColors = ["#60A5FA", "#10B981", "#F59E0B", "#A78BFA", "#F472B6", "#4ADE80"];

                return (
                  <div className={`${colors.cardBg} border rounded-xl p-4 shadow-lg h-[260px] overflow-hidden`}>
                    <h4 className={`text-xs sm:text-sm font-bold mb-2 sm:mb-3 ${colors.accentText}`}>🎯 {t('Category')}</h4>
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
                            position: 'bottom',
                            labels: {
                              color: colors.chartText,
                              padding: 6,
                              font: { size: 9 },
                              boxWidth: 12,
                              generateLabels: (chart) => {
                                const data = chart.data;
                                return data.labels.map((label, i) => ({
                                  text: `${label}: ₹${(data.datasets[0].data[i]/1000).toFixed(0)}K`,
                                  fillStyle: data.datasets[0].backgroundColor[i],
                                  hidden: false,
                                  index: i
                                }));
                              }
                            }
                          },
                          tooltip: {
                            backgroundColor: "rgba(0,0,0,0.8)",
                            padding: 8,
                            titleColor: "#64FFDA",
                            bodyColor: "#fff",
                            callbacks: { label: (ctx) => `${ctx.label}: ₹${ctx.raw.toLocaleString("en-IN")}` }
                          }
                        },
                      }}
                    />
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
                const labels = sorted.map(([name]) => name);
                const values = sorted.map(([, val]) => val);

                return (
                  <div className={`${colors.cardBg} border rounded-xl p-4 shadow-lg h-[260px] overflow-hidden`}>
                    <h4 className={`text-xs sm:text-sm font-bold mb-2 sm:mb-3 ${colors.accentText}`}>📦 {t('Top Products')} (Sales)</h4>
                    <Bar
                      data={{
                        labels,
                        datasets: [{
                          data: values,
                          backgroundColor: "rgba(59,130,246,0.8)",
                          borderColor: "#60A5FA",
                          borderWidth: 1,
                          borderRadius: 6,
                          barThickness: 20,
                        }],
                      }}
                      options={{
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: "rgba(0,0,0,0.8)",
                            padding: 8,
                            titleColor: "#64FFDA",
                            bodyColor: "#fff",
                            callbacks: { label: (ctx) => `₹${ctx.raw.toLocaleString("en-IN")}` }
                          }
                        },
                        scales: {
                          x: { ticks: { color: colors.chartText, font: { size: 9 }, callback: (val) => `₹${(val/1000).toFixed(0)}K` }, grid: { color: colors.chartGrid, drawBorder: false } },
                          y: { ticks: { color: colors.chartText, font: { size: 9 } }, grid: { display: false } },
                        },
                      }}
                    />
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
                const labels = sorted.map(([name]) => name);
                const values = sorted.map(([, val]) => val);

                return (
                  <div className={`${colors.cardBg} border rounded-xl p-4 shadow-lg h-[260px] overflow-hidden`}>
                    <h4 className={`text-xs sm:text-sm font-bold mb-2 sm:mb-3 ${colors.accentText}`}>📊 {t('Top Products')} (Qty)</h4>
                    <Bar
                      data={{
                        labels,
                        datasets: [{
                          data: values,
                          backgroundColor: "rgba(16,185,129,0.8)",
                          borderColor: "#10B981",
                          borderWidth: 1,
                          borderRadius: 6,
                          barThickness: 20,
                        }],
                      }}
                      options={{
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            backgroundColor: "rgba(0,0,0,0.8)",
                            padding: 8,
                            titleColor: "#64FFDA",
                            bodyColor: "#fff",
                            callbacks: { label: (ctx) => `${ctx.raw.toLocaleString("en-IN")} units` }
                          }
                        },
                        scales: {
                          x: { ticks: { color: colors.chartText, font: { size: 9 } }, grid: { color: colors.chartGrid, drawBorder: false } },
                          y: { ticks: { color: colors.chartText, font: { size: 9 } }, grid: { display: false } },
                        },
                      }}
                    />
                  </div>
                );
              })()}
            </div>
          </>
        )}

        {/* TOP PERFORMERS TAB */}
        {activeTab === "performers" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
                <div className={`${colors.cardBg} rounded-lg p-3 border shadow-lg`}>
                  <h4 className={`${colors.accentText} font-bold text-xs sm:text-sm mb-2`}>🏢 {t('Companies')}</h4>
                  {topCompanies.length === 0 && <p className={`${colors.textMuted} text-xs`}>No data</p>}
                  <ul className={`space-y-1.5 ${colors.textMain} text-[10px] sm:text-xs`}>
                    {topCompanies.map(([name, val], i) => (
                      <li key={i} className={`flex justify-between items-center border-b ${colors.border} pb-1.5`}>
                        <span className="truncate flex-1">{i + 1}. {name}</span>
                        <span className={`${colors.accentText} font-bold ml-2`}>₹{(val/1000).toFixed(0)}K</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

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
                <div className={`${colors.cardBg} rounded-lg p-3 border shadow-lg`}>
                  <h4 className={`${colors.accentText} font-bold text-xs sm:text-sm mb-2`}>📦 {t('Products')}</h4>
                  {topProducts.length === 0 && <p className={`${colors.textMuted} text-xs`}>No data</p>}
                  <ul className={`space-y-1.5 ${colors.textMain} text-[10px] sm:text-xs`}>
                    {topProducts.map(([name, val], i) => (
                      <li key={i} className={`flex justify-between items-center border-b ${colors.border} pb-1.5`}>
                        <span className="truncate flex-1">{i + 1}. {name}</span>
                        <span className={`${colors.accentText} font-bold ml-2`}>₹{(val/1000).toFixed(0)}K</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            {/* Top Party Groups */}
            {(() => {
              const groupAgg = {};
              cleanData.forEach((r) => {
                const grp = r["Party Group"] || "Unknown";
                if (grp === 'N/A' || grp === 'Unknown') return;
                groupAgg[grp] = (groupAgg[grp] || 0) + toNumber(r["Amount"]);
              });
              const topGroups = Object.entries(groupAgg).sort((a, b) => b[1] - a[1]).slice(0, 5);

              return (
                <div className={`${colors.cardBg} rounded-lg p-3 border shadow-lg`}>
                  <h4 className={`${colors.accentText} font-bold text-xs sm:text-sm mb-2`}>👥 {t('Groups')}</h4>
                  {topGroups.length === 0 && <p className={`${colors.textMuted} text-xs`}>No data</p>}
                  <ul className={`space-y-1.5 ${colors.textMain} text-[10px] sm:text-xs`}>
                    {topGroups.map(([name, val], i) => (
                      <li key={i} className={`flex justify-between items-center border-b ${colors.border} pb-1.5`}>
                        <span className="truncate flex-1">{i + 1}. {name}</span>
                        <span className={`${colors.accentText} font-bold ml-2`}>₹{(val/1000).toFixed(0)}K</span>
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
                <div className={`${colors.cardBg} rounded-lg p-3 border shadow-lg`}>
                  <h4 className={`${colors.accentText} font-bold text-xs sm:text-sm mb-2`}>🌆 {t('Areas')}</h4>
                  {topAreas.length === 0 && <p className={`${colors.textMuted} text-xs`}>No data</p>}
                  <ul className={`space-y-1.5 ${colors.textMain} text-[10px] sm:text-xs`}>
                    {topAreas.map(([name, val], i) => (
                      <li key={i} className={`flex justify-between items-center border-b ${colors.border} pb-1.5`}>
                        <span className="truncate flex-1">{i + 1}. {name}</span>
                        <span className={`${colors.accentText} font-bold ml-2`}>₹{(val/1000).toFixed(0)}K</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === "reports" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6 gap-3 sm:gap-4">
            <ReportCard title={t("Party Wise")} columns={["Party Name", "Item Category", "Qty", "Amount"]} data={aggregateData("Party Name", "Item Category", partyFilter, "")} onView={() => openViewModal(t("Party Wise Sales Report"), ["Party Name", "Item Category", "Qty", "Amount", "Count"], aggregateData("Party Name", "Item Category"))} onRowClick={(row) => openDetailModal(row, ["Party Name", "Item Category", "Qty", "Amount", "Count"])} filter1Value={partyFilter} filter1Options={Array.from(new Set(cleanData.map(r => r["Party Name"]).filter(v => v && v !== 'N/A')))} onFilter1Change={setPartyFilter} filter1Label={t("Party")} colors={colors} t={t} />
            <ReportCard title={t("Salesman Wise")} columns={["Salesman", "Item Category", "Qty", "Amount"]} data={aggregateData("Party Group", "Item Category", salesmanFilter, "").map(row => ({...row, Salesman: row["Party Group"]}))} onView={() => openViewModal(t("Salesman Wise Sales Report"), ["Salesman", "Item Category", "Qty", "Amount", "Count"], aggregateData("Party Group", "Item Category").map(row => ({...row, Salesman: row["Party Group"]})))} onRowClick={(row) => openDetailModal(row, ["Salesman", "Item Category", "Qty", "Amount", "Count"])} filter1Value={salesmanFilter} filter1Options={Array.from(new Set(cleanData.map(r => r["Party Group"]).filter(v => v && v !== 'N/A')))} onFilter1Change={setSalesmanFilter} filter1Label={t("Salesman")} colors={colors} t={t} />
            <ReportCard title={t("Area Wise")} columns={["City/Area", "Item Category", "Qty", "Amount"]} data={aggregateData("City/Area", "Item Category", areaFilter, "")} onView={() => openViewModal(t("Area Wise Sales Report"), ["City/Area", "Item Category", "Qty", "Amount", "Count"], aggregateData("City/Area", "Item Category"))} onRowClick={(row) => openDetailModal(row, ["City/Area", "Item Category", "Qty", "Amount", "Count"])} filter1Value={areaFilter} filter1Options={Array.from(new Set(cleanData.map(r => r["City/Area"]).filter(v => v && v !== 'N/A')))} onFilter1Change={setAreaFilter} filter1Label={t("Area")} colors={colors} t={t} />
            <ReportCard title={t("Product Wise")} columns={["Product", "Item Group", "Qty", "Amount"]} data={aggregateData("ItemName", "Item Group", productFilter, "").map(row => ({...row, Product: row["ItemName"]}))} onView={() => openViewModal(t("Product Wise Sales Report"), ["Product", "Item Group", "Qty", "Amount", "Count"], aggregateData("ItemName", "Item Group").map(row => ({...row, Product: row["ItemName"]})))} onRowClick={(row) => openDetailModal(row, ["Product", "Item Group", "Qty", "Amount", "Count"])} filter1Value={productFilter} filter1Options={Array.from(new Set(cleanData.map(r => r["ItemName"]).filter(v => v && v !== 'N/A')))} onFilter1Change={setProductFilter} filter1Label={t("Product")} colors={colors} t={t} />
            <ReportCard title={t("Group Wise")} columns={["Item Group", "Item Category", "Qty", "Amount"]} data={aggregateData("Item Group", "Item Category", itemGroupFilter, "")} onView={() => openViewModal(t("Item Group Wise Sales Report"), ["Item Group", "Item Category", "Qty", "Amount", "Count"], aggregateData("Item Group", "Item Category"))} onRowClick={(row) => openDetailModal(row, ["Item Group", "Item Category", "Qty", "Amount", "Count"])} filter1Value={itemGroupFilter} filter1Options={Array.from(new Set(cleanData.map(r => r["Item Group"]).filter(v => v && v !== 'N/A')))} onFilter1Change={setItemGroupFilter} filter1Label={t("Group")} colors={colors} t={t} />
          </div>
        )}
      </div>

      {/* MODALS */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-10 px-2">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div ref={modalRef} className={`relative w-full max-w-6xl backdrop-blur-lg rounded-xl shadow-2xl border p-3 sm:p-6 z-60 max-h-[90vh] overflow-hidden flex flex-col ${isLight ? "bg-white/95 border-gray-300 text-gray-800" : "bg-[#0D1B2A]/90 border-[#1E2D45] text-gray-100"}`}>
            <div className="flex justify-between items-center mb-3 sm:mb-4 border-b border-gray-700 pb-2 sm:pb-3">
              <h3 className={`text-base sm:text-2xl font-bold ${colors.accentText}`}>{modalContent.title}</h3>
              <button onClick={() => setModalOpen(false)} className="bg-red-500 text-white rounded-full w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center hover:bg-red-600">✕</button>
            </div>

            <div className="flex flex-col md:flex-row gap-3 sm:gap-6 flex-1 overflow-hidden">
              <div id="modal-scroll" className={`flex-1 overflow-auto border rounded-lg p-2 sm:p-4 ${isLight ? "bg-gray-50 border-gray-300" : "bg-[#0F1E33] border-[#1E2D45]"}`}>
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <thead className={`sticky top-0 z-20 ${isLight ? "bg-gray-200 text-[#0A192F]" : "bg-[#0B2545] text-[#64FFDA]"}`}>
                    <tr>
                      {modalContent.columns.map((col, i) => (
                        <th key={i} className={`px-2 py-1.5 sm:px-3 sm:py-2 text-[10px] sm:text-xs ${i === modalContent.columns.length - 1 ? 'text-right' : 'text-left'}`}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(modalContent.data || []).map((r, i) => (
                      <tr key={i} onClick={() => openDetailModal(r, modalContent.columns)} className={`${i % 2 === 0 ? (isLight?"bg-white":"bg-[#13253E]") : (isLight?"bg-gray-50":"bg-[#1A2E4A]")} hover:opacity-80 cursor-pointer border-b border-gray-700/30`}>
                        {modalContent.columns.map((col, j) => (
                          <td key={j} className={`px-2 py-1 sm:px-3 sm:py-2 text-[10px] sm:text-xs ${j === modalContent.columns.length - 1 ? `text-right ${colors.accentText}` : ''}`}>
                            {col === "Amount" ? fmt(r[col]) : col === "Qty" ? r[col]?.toLocaleString("en-IN") : r[col] || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {modalContent.data && modalContent.data.length > 0 && (
                      <tr className={`font-bold border-t-2 sticky bottom-0 z-20 shadow-lg ${isLight ? "bg-gray-200 border-yellow-500 text-[#0A192F]" : "bg-[#0F1E33] border-yellow-400 text-yellow-300"}`}>
                        <td className="px-3 py-2 text-xs sm:text-sm" colSpan={modalContent.columns.length - 1}>{t('TOTAL')} ({modalContent.data.length})</td>
                        <td className="px-3 py-2 text-right text-xs sm:text-base">{fmt(modalContent.data.reduce((sum, r) => sum + toNumber(r.Amount || 0), 0))}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <aside className={`w-full md:w-[200px] border rounded-lg p-3 sm:p-4 ${isLight ? "bg-gray-50 border-gray-300" : "bg-[#102C46] border-[#1E2D45]"}`}>
                <h4 className={`font-semibold mb-2 text-xs sm:text-sm ${colors.accentText}`}>⚙️ {t('Export')}</h4>
                <div className="flex flex-col gap-2">
                  <button onClick={() => exportPDF(modalContent.title)} className="w-full bg-[#059669] text-white py-1.5 sm:py-2 rounded text-xs hover:bg-[#047857]">📄 PDF</button>
                  <button onClick={() => exportExcel(modalContent.title, modalContent.columns, modalContent.data)} className="w-full bg-[#2563EB] text-white py-1.5 sm:py-2 rounded text-xs hover:bg-[#1D4ED8]">📊 Excel</button>
                  <button onClick={() => exportCSV(modalContent.title, modalContent.columns, modalContent.data)} className="w-full bg-[#334155] text-white py-1.5 sm:py-2 rounded text-xs hover:bg-[#1E293B]">📁 CSV</button>
                </div>
                <div className={`text-xs mt-3 border-t pt-3 space-y-1 ${isLight ? "border-gray-300 text-gray-600" : "border-[#1E2D45] text-gray-300"}`}>
                  <div className="flex justify-between"><strong>Rows:</strong> <span>{modalContent.data ? modalContent.data.length : 0}</span></div>
                  <div className="flex justify-between"><strong>{t('Total')}:</strong><span className={colors.accentText}>{fmt(modalContent.data ? modalContent.data.reduce((sum, r) => sum + toNumber(r.Amount || 0), 0) : 0)}</span></div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      )}

      {detailModalOpen && selectedRowDetail && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDetailModalOpen(false)} />
          <div className={`relative border rounded-xl p-4 sm:p-6 max-w-2xl w-full shadow-2xl z-[71] max-h-[80vh] overflow-auto ${isLight ? "bg-white border-blue-200" : "bg-[#0D1B2A] border-[#64FFDA]/30"}`}>
            <div className={`flex justify-between items-center mb-3 sm:mb-4 border-b pb-2 sm:pb-3 sticky top-0 z-10 ${isLight ? "bg-white border-gray-200" : "bg-[#0D1B2A] border-[#1E2D45]"}`}>
              <h3 className={`text-base sm:text-xl font-bold ${colors.accentText}`}>📋 {t('Details')}</h3>
              <button onClick={() => setDetailModalOpen(false)} className="bg-red-500 text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-red-600">✕</button>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {selectedRowDetail.columns.map((col, i) => (
                <div key={i} className={`flex justify-between border-b pb-2 ${isLight ? "border-gray-200" : "border-[#1E2D45]/50"}`}>
                  <span className={`font-semibold text-xs sm:text-sm ${colors.textMain}`}>{col}:</span>
                  <span className={`text-right ml-4 text-xs sm:text-sm ${colors.accentText}`}>{col === "Amount" ? fmt(selectedRowDetail.row[col]) : selectedRowDetail.row[col] || "-"}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setDetailModalOpen(false)} className="mt-4 sm:mt-6 w-full bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white py-2 rounded-lg hover:shadow-lg text-sm">{t('Close')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// COMPACT REPORT CARD (UPDATED WITH THEME & TRANSLATIONS)
function ReportCard({ title, columns, data, onView, onRowClick, filter1Value, filter1Options, onFilter1Change, filter1Label, colors, t }) {
  const [searchTerm, setSearchTerm] = useState("");
  const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  
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
    <div className={`${colors.cardBg} rounded-lg p-3 shadow-lg border border-gray-700`}>
      <div className={`flex justify-between items-center mb-2 border-b border-gray-700 pb-2`}>
        <h4 className={`font-bold text-xs sm:text-sm ${colors.accentText}`}>{title}</h4>
        <div className="flex gap-1">
          <button onClick={exportCSV} className="bg-indigo-600 text-white text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-1 rounded hover:bg-indigo-700">CSV</button>
          <button onClick={exportExcel} className="bg-blue-600 text-white text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-1 rounded hover:bg-blue-700">XLS</button>
          <button onClick={onView} className="bg-rose-500 text-white text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-1 rounded hover:bg-rose-600">{t('View') || 'View'}</button>
        </div>
      </div>

      {/* COMPACT SEARCH */}
      <div className="mb-2">
        <input
          type="text"
          placeholder="🔍 Search..."
          className={`w-full ${colors.inputBg} border rounded px-2 py-1.5 text-[10px] sm:text-xs focus:outline-none focus:ring-1 focus:ring-[#64FFDA]`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* COMPACT FILTER */}
      <div className="flex gap-1 mb-2">
        <select value={filter1Value} onChange={(e) => onFilter1Change(e.target.value)} className={`flex-1 ${colors.inputBg} border rounded px-1.5 py-1 text-[10px] sm:text-xs focus:outline-none focus:ring-1 focus:ring-[#64FFDA]`}>
          <option value="">All {filter1Label}</option>
          {filter1Options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
        </select>
        {filter1Value && (
          <button onClick={() => onFilter1Change("")} className="bg-red-500 text-white text-[10px] px-2 py-1 rounded hover:bg-red-600">×</button>
        )}
      </div>

      {/* COMPACT TABLE */}
      <div className={`overflow-auto max-h-[220px] border border-gray-700 rounded`}>
        <table className="w-full text-[9px] sm:text-[10px]">
          <thead className={`sticky top-0 z-10 ${colors.cardBg.includes("bg-white") ? "bg-gray-200 text-[#0A192F]" : "bg-[#0B2545] text-[#64FFDA]"}`}>
            <tr>
              {columns.map((c, i) => (
                <th key={i} className={`px-1.5 sm:px-2 py-1.5 text-left font-semibold ${i === columns.length - 1 ? "text-right" : ""}`}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 && (
              <tr><td colSpan={columns.length} className={`text-center py-3 text-[10px] ${colors.textMuted}`}>No Data</td></tr>
            )}
            {filteredData.slice(0, 20).map((row, i) => (
              <tr key={i} onClick={() => onRowClick && onRowClick(row)} className={`hover:opacity-80 cursor-pointer border-b border-gray-700 ${i % 2 === 0 ? (colors.bg.includes("white") ? "bg-white" : "bg-[#0F1E33]") : (colors.bg.includes("white") ? "bg-gray-50" : "bg-[#13253E]")}`}>
                {columns.map((c, j) => (
                  <td key={j} className={`px-1.5 sm:px-2 py-1.5 ${j === columns.length - 1 ? `text-right font-semibold ${colors.accentText}` : colors.textMain}`}>
                    {c === "Amount" ? fmt(row[c]) : c === "Qty" ? row[c]?.toLocaleString("en-IN") : row[c] || "-"}
                  </td>
                ))}
              </tr>
            ))}

            {filteredData.length > 0 && (
              <tr className={`font-bold border-t-2 sticky bottom-0 z-20 shadow-lg ${colors.bg.includes("white") ? "bg-gray-100 border-yellow-500 text-[#0A192F]" : "bg-[#0F1E33] border-yellow-400 text-yellow-300"}`}>
                <td className="px-1.5 sm:px-2 py-1.5 text-[9px] sm:text-[10px]" colSpan={columns.length - 2}>{t('TOTAL')}</td>
                <td className="px-1.5 sm:px-2 py-1.5 text-right text-[9px] sm:text-[10px]">{totalQty.toLocaleString("en-IN")}</td>
                <td className="px-1.5 sm:px-2 py-1.5 text-right text-[10px] sm:text-xs">{fmt(totalAmount)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
