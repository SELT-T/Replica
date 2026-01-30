// src/pages/Analyst.jsx - FIXED VERSION (Matching Dashboard Data)
import React, { useEffect, useMemo, useState, useRef } from "react";
import { Line, Bar, Pie, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
} from "chart.js";
import {
  FileSpreadsheet,
  RefreshCw,
  Download,
  Printer,
  Send,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  Copy,
  Share2,
  Filter,
  Search,
  BarChart3,
  Users,
  Package,
  FileCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title
);

export default function Analyst({ isLight, t = (s) => s }) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [printSize, setPrintSize] = useState("A4");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const modalRef = useRef();
  const rowsPerPage = 20;

  // FIXED: SAME FETCH LOGIC AS DASHBOARD
  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        const backendURL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
          ? "http://127.0.0.1:8787"
          : "https://selt-t-backend.selt-3232.workers.dev";

        console.log("📡 Analyst fetching from:", backendURL);

        // FIXED: USE SAME ENDPOINT AS DASHBOARD
        const vouchersURL = `${backendURL}/api/vouchers?limit=10000`;
        const resp = await fetch(vouchersURL, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });

        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }

        const json = await resp.json();

        if (!json || !json.success) {
          throw new Error("Invalid response");
        }

        const arr = json.data || [];

        if (!Array.isArray(arr)) {
          throw new Error("No array returned");
        }
        console.log(`✅ Analyst loaded ${arr.length} vouchers`);

        // FIXED: USE EXACT SAME MAPPING AS DASHBOARD
        const mapped = arr.map(v => ({
          // Standardized fields (same as Dashboard)
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
          "Narration": v.narration || '',
          
          // Extra fields for backward compatibility
          "Vch No.": v.vch_no || '',
          "Type": v.vch_type || 'Sales',
          "Invoice No": v.vch_no || '',
          "Customer": v.party_name || 'N/A',
          "Description": v.name_item || 'N/A',
          "Company": v.item_category || 'Sales',
          "Net Amount": parseFloat(v.amount) || 0,
          "Quantity": parseFloat(v.qty) || 0,
          "Rate": parseFloat(v.rate) || 0,
          "Price": parseFloat(v.rate) || 0,
          "Outstanding": 0,
        }));

        if (!cancelled) {
          // Clean total rows (same as Dashboard)
          const cleaned = mapped.filter(r => {
            const party = String(r["Party Name"] || "").toLowerCase();
            const item = String(r["ItemName"] || "").toLowerCase();
            const group = String(r["Party Group"] || "").toLowerCase();
            const amount = parseFloat(r["Amount"]) || 0;
            
            if (party.includes("total") || party.includes("grand")) return false;
            if (item.includes("total") || item.includes("grand")) return false;
            if (group.includes("total") || group.includes("grand")) return false;
            if (party === "" && item === "" && amount === 0) return false;
            return true;
          });

          setRawData(cleaned);
          localStorage.setItem("analyst_latest_rows", JSON.stringify(cleaned));
          setLastSync(new Date().toISOString());
        }

      } catch (e) {
        console.error("❌ Fetch error:", e);
        setError(`Unable to load data: ${e.message}`);

        // Fallback to cache
        const backup = localStorage.getItem("analyst_latest_rows");
        if (backup) {
          try {
            const cached = JSON.parse(backup);
            console.log("📦 Using cached data:", cached.length);
            setRawData(cached);
            setLastSync("Cached");
          } catch {
            setError("Cache error");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    let intv;
    if (autoRefresh) {
      intv = setInterval(fetchData, 60000);
    }

    return () => {
      cancelled = true;
      if (intv) clearInterval(intv);
    };
  }, [autoRefresh]);

  // FIXED: PROPER THEME COLORS LIKE DASHBOARD
  const colors = {
    bg: isLight ? "bg-[#F8F9FA]" : "bg-[#0B1120]", 
    containerBg: isLight ? "bg-white border-blue-100 shadow-xl text-[#1e293b]" : "bg-[#1B2A4A] border-[#1E2D45] text-gray-100",
    cardBg: isLight ? "bg-white border-gray-100 text-[#1e293b]" : "bg-[#0F1E33] border-[#1E2D45] text-white", 
    textMain: isLight ? "text-[#1e293b]" : "text-gray-100",
    textMuted: isLight ? "text-[#64748b]" : "text-gray-400",
    accentText: isLight ? "text-[#2563EB]" : "text-[#64FFDA]",
    border: isLight ? "border-gray-200" : "border-[#1E2D45]",
    inputBg: isLight ? "bg-white text-[#1e293b] border-gray-300 shadow-sm" : "bg-[#112A45] text-gray-200 border-[#1E2D45]",
    buttonPrimary: isLight ? "bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg" : "bg-[#64FFDA] text-[#0A192F] hover:bg-[#4cc9ac]",
    chartLine: isLight ? "#2563EB" : "#64FFDA",
    chartGrid: isLight ? "#E2E8F0" : "#1E293B",
    chartText: isLight ? "#475569" : "#9CA3AF"
  };

  // FILTERS STATE (SAME AS DASHBOARD LOGIC)
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [categoryFilter, setCategoryFilter] = useState("");
  const [partyGroupFilter, setPartyGroupFilter] = useState("");
  const [itemGroupFilter, setItemGroupFilter] = useState("");
  const [salesmanFilter, setSalesmanFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");

  // Apply filters to data
  const filteredData = useMemo(() => {
    let result = [...rawData];

    // Date filter (same as Dashboard)
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
        result = result.filter(row => {
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

    // Category filter
    if (categoryFilter) {
      result = result.filter(r => r["Item Category"] === categoryFilter);
    }

    // Party Group filter
    if (partyGroupFilter) {
      result = result.filter(r => r["Party Group"] === partyGroupFilter);
    }

    // Item Group filter
    if (itemGroupFilter) {
      result = result.filter(r => r["Item Group"] === itemGroupFilter);
    }

    // Salesman filter
    if (salesmanFilter) {
      result = result.filter(r => r["Salesman"] === salesmanFilter);
    }

    // Area filter
    if (areaFilter) {
      result = result.filter(r => r["City/Area"] === areaFilter);
    }

    // Search filter
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(r =>
        Object.values(r).some(v =>
          String(v || "").toLowerCase().includes(term)
        )
      );
    }

    return result;
  }, [rawData, dateFilter, customDateRange, categoryFilter, partyGroupFilter, itemGroupFilter, salesmanFilter, areaFilter, search]);

  // Calculate metrics (SAME AS DASHBOARD)
  const metrics = useMemo(() => {
    const totalSales = filteredData.reduce((sum, r) => sum + (parseFloat(r["Amount"]) || 0), 0);
    const partyCount = new Set(filteredData.map(r => r["Party Name"]).filter(v => v && v !== 'N/A')).size;
    const inventoryCount = new Set(filteredData.map(r => r["ItemName"]).filter(v => v && v !== 'N/A')).size;
    const billingCount = new Set(filteredData.map(r => r["Voucher Number"]).filter(v => v && v !== 'N/A')).size;

    return {
      totalSales,
      partyCount,
      inventoryCount,
      billingCount
    };
  }, [filteredData]);

  // Monthly sales trend (SAME AS DASHBOARD)
  const monthlySales = useMemo(() => {
    const monthlyAgg = {};
    filteredData.forEach(r => {
      const dateStr = r["Date"] || '';
      const d = new Date(dateStr);
      if (isNaN(d)) return;
      const monthYear = d.toLocaleString("en-IN", { month: "short", year: "numeric" });
      monthlyAgg[monthYear] = (monthlyAgg[monthYear] || 0) + (parseFloat(r["Amount"]) || 0);
    });

    const entries = Object.entries(monthlyAgg).sort((a, b) => new Date(a[0]) - new Date(b[0]));
    return {
      labels: entries.map(([k]) => k),
      values: entries.map(([, v]) => v)
    };
  }, [filteredData]);

  // Company split (Category distribution)
  const companySplit = useMemo(() => {
    const map = {};
    filteredData.forEach(r => {
      const cat = r["Item Category"] || "Unknown";
      if (cat === 'N/A') return;
      map[cat] = (map[cat] || 0) + (parseFloat(r["Amount"]) || 0);
    });

    return {
      labels: Object.keys(map),
      values: Object.values(map)
    };
  }, [filteredData]);

  // Top items
  const topItems = useMemo(() => {
    const itemAgg = {};
    filteredData.forEach(r => {
      const item = r["ItemName"] || "Unknown";
      if (item === 'N/A' || !item) return;
      itemAgg[item] = (itemAgg[item] || 0) + (parseFloat(r["Amount"]) || 0);
    });

    return Object.entries(itemAgg).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [filteredData]);

  // Top parties
  const topParties = useMemo(() => {
    const partyAgg = {};
    filteredData.forEach(r => {
      const party = r["Party Name"] || "Unknown";
      if (party === 'N/A' || !party) return;
      partyAgg[party] = (partyAgg[party] || 0) + (parseFloat(r["Amount"]) || 0);
    });

    return Object.entries(partyAgg).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [filteredData]);

  const formatINR = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;
  const formatShort = (n) => `₹${(n/1000).toFixed(0)}K`;

  // Export function
  const exportCSV = (data, filename = "analyst_export") => {
    if (!data || data.length === 0) return;
    
    const keys = Object.keys(data[0] || {});
    const csvRows = [keys.join(",")];
    
    data.forEach(r => {
      const row = keys.map(k => {
        let val = r[k];
        if (val === undefined || val === null) val = "";
        val = String(val).replace(/"/g, '""');
        if (val.includes(",") || val.includes("\n")) val = `"${val}"`;
        return val;
      });
      csvRows.push(row.join(","));
    });
    
    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openInvoice = (row) => {
    setSelectedInvoice(row);
    setInvoiceModalOpen(true);
    setTimeout(() => {
      if (modalRef.current) modalRef.current.scrollTop = 0;
    }, 50);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${colors.bg}`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#64FFDA] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className={`${colors.accentText} text-xl font-semibold`}>Loading Analyst Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && rawData.length === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${colors.bg}`}>
        <div className={`max-w-md ${colors.containerBg} rounded-2xl p-8 text-center`}>
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className={`text-2xl font-bold mb-4 ${colors.accentText}`}>Data Error</h2>
          <p className={`mb-6 ${colors.textMuted}`}>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className={`px-6 py-3 rounded-xl ${colors.buttonPrimary} font-semibold`}
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${colors.bg} ${colors.textMain} p-2 sm:p-4 font-sans transition-colors duration-300`}>
      <div className={`max-w-[1500px] mx-auto ${colors.containerBg} rounded-2xl shadow-xl border ${colors.border} p-3 sm:p-5 md:p-6`}>
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl shadow-lg">
              <FileSpreadsheet size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
                ANALYST DASHBOARD
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {filteredData.length} records found
                </span>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                  Synced: {lastSync ? new Date(lastSync).toLocaleTimeString() : "Just now"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                autoRefresh 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              <RefreshCw size={16} className={autoRefresh ? "animate-spin" : ""} />
              {autoRefresh ? "Auto On" : "Auto Off"}
            </button>
            
            <button
              onClick={() => exportCSV(filteredData, `analyst_data_${new Date().toISOString().split('T')[0]}`)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
            >
              <Download size={16} />
              Export Data
            </button>
          </div>
        </div>

        {/* FILTERS SECTION (SAME STYLE AS DASHBOARD) */}
        <div className={`mb-6 p-4 rounded-xl ${isLight ? "bg-white border border-gray-200" : "bg-[#0D1B2A] border border-[#1E2D45]"}`}>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search anything..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-lg text-sm ${colors.inputBg} focus:ring-2 focus:ring-blue-500 outline-none`}
                />
              </div>
            </div>

            {/* Date Filter */}
            <select 
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={`px-3 py-2.5 rounded-lg text-sm ${colors.inputBg} focus:ring-2 focus:ring-blue-500 outline-none`}
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="custom">Custom Range</option>
            </select>

            {dateFilter === "custom" && (
              <div className="flex gap-2">
                <input 
                  type="date" 
                  value={customDateRange.start}
                  onChange={(e) => setCustomDateRange({...customDateRange, start: e.target.value})}
                  className={`px-3 py-2.5 rounded-lg text-sm ${colors.inputBg} focus:ring-2 focus:ring-blue-500 outline-none`}
                />
                <input 
                  type="date" 
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange({...customDateRange, end: e.target.value})}
                  className={`px-3 py-2.5 rounded-lg text-sm ${colors.inputBg} focus:ring-2 focus:ring-blue-500 outline-none`}
                />
              </div>
            )}

            {/* Category Filter */}
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`px-3 py-2.5 rounded-lg text-sm ${colors.inputBg} focus:ring-2 focus:ring-blue-500 outline-none`}
            >
              <option value="">All Categories</option>
              {[...new Set(rawData.map(r => r["Item Category"]).filter(v => v && v !== 'N/A'))].map((cat, i) => (
                <option key={i} value={cat}>{cat}</option>
              ))}
            </select>

            {/* Item Group Filter */}
            <select 
              value={itemGroupFilter}
              onChange={(e) => setItemGroupFilter(e.target.value)}
              className={`px-3 py-2.5 rounded-lg text-sm ${colors.inputBg} focus:ring-2 focus:ring-blue-500 outline-none`}
            >
              <option value="">All Item Groups</option>
              {[...new Set(rawData.map(r => r["Item Group"]).filter(v => v && v !== 'N/A'))].map((grp, i) => (
                <option key={i} value={grp}>{grp}</option>
              ))}
            </select>

            {/* Clear Filters */}
            {(categoryFilter || itemGroupFilter || dateFilter !== 'all' || search) && (
              <button
                onClick={() => {
                  setSearch('');
                  setDateFilter('all');
                  setCategoryFilter('');
                  setItemGroupFilter('');
                  setPartyGroupFilter('');
                  setSalesmanFilter('');
                  setAreaFilter('');
                  setCustomDateRange({ start: '', end: '' });
                }}
                className="px-4 py-2.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex items-center gap-2"
              >
                <X size={16} />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex overflow-x-auto gap-1 mb-6 pb-2 border-b border-gray-200 dark:border-gray-800">
          {[
            { id: "dashboard", label: "Dashboard", icon: "📊" },
            { id: "transactions", label: "Transactions", icon: "💰" },
            { id: "reports", label: "Reports", icon: "📈" },
            { id: "party", label: "Party Analysis", icon: "👥" },
            { id: "inventory", label: "Inventory", icon: "📦" },
            { id: "masters", label: "Masters", icon: "📋" },
            { id: "alldata", label: "All Data", icon: "📄" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`px-4 py-3 rounded-lg text-sm font-semibold whitespace-nowrap flex items-center gap-2 transition-all ${
                activeSection === tab.id
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="animate-in fade-in duration-300">
          {activeSection === "dashboard" && (
            <DashboardSection
              metrics={metrics}
              monthlySales={monthlySales}
              companySplit={companySplit}
              topItems={topItems}
              topParties={topParties}
              filteredData={filteredData}
              colors={colors}
              formatINR={formatINR}
              formatShort={formatShort}
              openInvoice={openInvoice}
            />
          )}

          {activeSection === "transactions" && (
            <TransactionsSection
              data={filteredData}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              rowsPerPage={rowsPerPage}
              openInvoice={openInvoice}
              exportCSV={exportCSV}
              colors={colors}
            />
          )}

          {activeSection === "reports" && (
            <ReportsSection
              data={filteredData}
              exportCSV={exportCSV}
              colors={colors}
            />
          )}

          {activeSection === "party" && (
            <PartySection
              data={filteredData}
              colors={colors}
              formatINR={formatINR}
            />
          )}

          {activeSection === "inventory" && (
            <InventorySection
              data={filteredData}
              colors={colors}
              formatINR={formatINR}
            />
          )}

          {activeSection === "masters" && (
            <MastersSection
              data={rawData}
              colors={colors}
            />
          )}

          {activeSection === "alldata" && (
            <AllDataSection
              data={filteredData}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              rowsPerPage={rowsPerPage}
              exportCSV={exportCSV}
              colors={colors}
            />
          )}
        </div>
      </div>

      {/* INVOICE MODAL */}
      {invoiceModalOpen && selectedInvoice && (
        <InvoiceModal
          refObj={modalRef}
          row={selectedInvoice}
          onClose={() => setInvoiceModalOpen(false)}
          colors={colors}
          formatINR={formatINR}
        />
      )}
    </div>
  );
}

// ==================== COMPONENTS ====================

function DashboardSection({ metrics, monthlySales, companySplit, topItems, topParties, filteredData, colors, formatINR, formatShort, openInvoice }) {
  return (
    <div className="space-y-6">
      {/* METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 shadow-lg text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">Total Sales</p>
              <h3 className="text-2xl sm:text-3xl font-black mt-2">{formatINR(metrics.totalSales)}</h3>
            </div>
            <BarChart3 size={24} className="opacity-80" />
          </div>
          <div className="mt-4 text-xs bg-white/20 inline-block px-3 py-1.5 rounded-lg">
            {filteredData.length} transactions
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 shadow-lg text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider">Active Parties</p>
              <h3 className="text-2xl sm:text-3xl font-black mt-2">{metrics.partyCount}</h3>
            </div>
            <Users size={24} className="opacity-80" />
          </div>
          <div className="mt-4 text-xs bg-white/20 inline-block px-3 py-1.5 rounded-lg">
            Unique Customers
          </div>
        </div>

        <div className="bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl p-5 shadow-lg text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-purple-100 text-xs font-bold uppercase tracking-wider">Inventory Count</p>
              <h3 className="text-2xl sm:text-3xl font-black mt-2">{metrics.inventoryCount}</h3>
            </div>
            <Package size={24} className="opacity-80" />
          </div>
          <div className="mt-4 text-xs bg-white/20 inline-block px-3 py-1.5 rounded-lg">
            Unique Items
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl p-5 shadow-lg text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-orange-100 text-xs font-bold uppercase tracking-wider">Billing Count</p>
              <h3 className="text-2xl sm:text-3xl font-black mt-2">{metrics.billingCount}</h3>
            </div>
            <FileCheck size={24} className="opacity-80" />
          </div>
          <div className="mt-4 text-xs bg-white/20 inline-block px-3 py-1.5 rounded-lg">
            Generated Bills
          </div>
        </div>
      </div>

      {/* CHARTS ROW */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Sales Trend */}
        <div className={`${colors.cardBg} border rounded-2xl p-5 shadow-md`}>
          <h4 className={`text-sm font-bold mb-4 ${colors.accentText} flex items-center gap-2`}>
            <span className="text-lg">📈</span> Monthly Sales Trend
          </h4>
          <div className="h-64">
            <Line
              data={{
                labels: monthlySales.labels,
                datasets: [{
                  label: "Sales",
                  data: monthlySales.values,
                  borderColor: colors.chartLine,
                  backgroundColor: colors.isLight ? "rgba(37, 99, 235, 0.1)" : "rgba(100, 255, 218, 0.1)",
                  borderWidth: 2,
                  tension: 0.4,
                  fill: true,
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
                  x: { 
                    ticks: { color: colors.chartText, font: { size: 10 } }, 
                    grid: { color: colors.chartGrid } 
                  },
                  y: { 
                    ticks: { 
                      color: colors.chartText, 
                      font: { size: 10 },
                      callback: (val) => `₹${(val/1000).toFixed(0)}K`
                    }, 
                    grid: { color: colors.chartGrid } 
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Company Split */}
        <div className={`${colors.cardBg} border rounded-2xl p-5 shadow-md`}>
          <h4 className={`text-sm font-bold mb-4 ${colors.accentText} flex items-center gap-2`}>
            <span className="text-lg">🏢</span> Company Split
          </h4>
          <div className="h-64">
            <Doughnut
              data={{
                labels: companySplit.labels,
                datasets: [{
                  data: companySplit.values,
                  backgroundColor: [
                    "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", 
                    "#6366F1", "#14B8A6", "#F97316", "#06B6D4", "#84CC16"
                  ],
                  borderWidth: 1,
                  borderColor: colors.isLight ? "#fff" : "#1B2A4A",
                }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                    labels: {
                      color: colors.chartText,
                      font: { size: 10 }
                    }
                  }
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* TOP ITEMS & PARTIES */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Selling Items */}
        <div className={`${colors.cardBg} border rounded-2xl p-5 shadow-md`}>
          <h4 className={`text-sm font-bold mb-4 ${colors.accentText} flex items-center gap-2`}>
            <span className="text-lg">🔥</span> Top Selling Items
          </h4>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {topItems.map(([name, amount], i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i < 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {i + 1}
                  </div>
                  <span className="font-medium truncate max-w-[180px]">{name}</span>
                </div>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {formatShort(amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className={`${colors.cardBg} border rounded-2xl p-5 shadow-md`}>
          <h4 className={`text-sm font-bold mb-4 ${colors.accentText} flex items-center gap-2`}>
            <span className="text-lg">👑</span> Top Customers
          </h4>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {topParties.map(([name, amount], i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    i < 3 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {i + 1}
                  </div>
                  <span className="font-medium truncate max-w-[180px]">{name}</span>
                </div>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {formatShort(amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECENT TRANSACTIONS */}
      <div className={`${colors.cardBg} border rounded-2xl p-5 shadow-md`}>
        <div className="flex justify-between items-center mb-4">
          <h4 className={`text-sm font-bold ${colors.accentText} flex items-center gap-2`}>
            <span className="text-lg">🔄</span> Recent Transactions
          </h4>
          <span className="text-xs text-gray-500 dark:text-gray-400">{filteredData.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={`border-b ${colors.border}`}>
              <tr>
                <th className="text-left py-3 px-4 font-semibold">Voucher No</th>
                <th className="text-left py-3 px-4 font-semibold">Date</th>
                <th className="text-left py-3 px-4 font-semibold">Party</th>
                <th className="text-left py-3 px-4 font-semibold">Item</th>
                <th className="text-right py-3 px-4 font-semibold">Amount</th>
                <th className="text-right py-3 px-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.slice(0, 10).map((row, i) => (
                <tr key={i} className={`border-b ${colors.border} hover:bg-gray-50 dark:hover:bg-gray-800/50`}>
                  <td className="py-3 px-4 font-medium">{row["Voucher Number"] || "-"}</td>
                  <td className="py-3 px-4">{row["Date"] || "-"}</td>
                  <td className="py-3 px-4 truncate max-w-[150px]">{row["Party Name"] || "-"}</td>
                  <td className="py-3 px-4 truncate max-w-[150px]">{row["ItemName"] || "-"}</td>
                  <td className="py-3 px-4 text-right font-bold">{formatINR(row["Amount"])}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => openInvoice(row)}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TransactionsSection({ data, currentPage, setCurrentPage, rowsPerPage, openInvoice, exportCSV, colors }) {
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const pageData = data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className={`${colors.cardBg} border rounded-2xl p-5 shadow-md`}>
      <div className="flex justify-between items-center mb-6">
        <h3 className={`text-lg font-bold ${colors.accentText}`}>Transaction Details</h3>
        <button 
          onClick={() => exportCSV(data, "transactions")}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
        >
          <Download size={16} />
          Export
        </button>
      </div>
      
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="py-3 px-4 text-left font-semibold">Vch No</th>
              <th className="py-3 px-4 text-left font-semibold">Date</th>
              <th className="py-3 px-4 text-left font-semibold">Party</th>
              <th className="py-3 px-4 text-left font-semibold">Item</th>
              <th className="py-3 px-4 text-right font-semibold">Qty</th>
              <th className="py-3 px-4 text-right font-semibold">Amount</th>
              <th className="py-3 px-4 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => (
              <tr key={i} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="py-3 px-4">{row["Voucher Number"] || "-"}</td>
                <td className="py-3 px-4">{row["Date"] || "-"}</td>
                <td className="py-3 px-4 truncate max-w-[120px]">{row["Party Name"] || "-"}</td>
                <td className="py-3 px-4 truncate max-w-[150px]">{row["ItemName"] || "-"}</td>
                <td className="py-3 px-4 text-right">{parseFloat(row["Qty"] || 0).toFixed(2)}</td>
                <td className="py-3 px-4 text-right font-bold">₹{(row["Amount"] || 0).toLocaleString("en-IN")}</td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => openInvoice(row)}
                    className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded text-xs font-medium hover:bg-blue-200"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, data.length)} of {data.length} entries
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="px-3 py-2 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportsSection({ data, exportCSV, colors }) {
  // Generate various reports
  const partyReport = useMemo(() => {
    const map = {};
    data.forEach(r => {
      const party = r["Party Name"] || "Unknown";
      map[party] = (map[party] || 0) + (parseFloat(r["Amount"]) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [data]);

  const categoryReport = useMemo(() => {
    const map = {};
    data.forEach(r => {
      const cat = r["Item Category"] || "Unknown";
      map[cat] = (map[cat] || 0) + (parseFloat(r["Amount"]) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [data]);

  return (
    <div className="space-y-6">
      <div className={`${colors.cardBg} border rounded-2xl p-5 shadow-md`}>
        <h3 className={`text-lg font-bold mb-6 ${colors.accentText}`}>Analytical Reports</h3>
        
        <div className="grid md:grid-cols-3 gap-6">
          {/* Party Summary */}
          <div className="border rounded-xl p-4">
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Users size={16} /> Party Summary
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {partyReport.map(([party, amount], i) => (
                <div key={i} className="flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                  <span className="text-sm truncate flex-1">{party}</span>
                  <span className="font-bold text-sm">₹{(amount/1000).toFixed(0)}K</span>
                </div>
              ))}
            </div>
          </div>

          {/* Category Summary */}
          <div className="border rounded-xl p-4">
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
              <BarChart3 size={16} /> Category Summary
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {categoryReport.map(([cat, amount], i) => (
                <div key={i} className="flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded">
                  <span className="text-sm truncate flex-1">{cat}</span>
                  <span className="font-bold text-sm">₹{(amount/1000).toFixed(0)}K</span>
                </div>
              ))}
            </div>
          </div>

          {/* Export Options */}
          <div className="border rounded-xl p-4">
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Download size={16} /> Export Reports
            </h4>
            <div className="space-y-2">
              <button 
                onClick={() => exportCSV(data, "full_report")}
                className="w-full p-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Full Data Export
              </button>
              <button 
                onClick={() => exportCSV(data.filter(r => r["Voucher Type"]?.includes("Sales")), "sales_report")}
                className="w-full p-3 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
              >
                Sales Report Only
              </button>
              <button 
                onClick={() => exportCSV(partyReport.map(([party, amount]) => ({ Party: party, Amount: amount })), "party_summary")}
                className="w-full p-3 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
              >
                Party Summary
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PartySection({ data, colors, formatINR }) {
  const partyData = useMemo(() => {
    const map = {};
    data.forEach(r => {
      const party = r["Party Name"] || "Unknown";
      if (!map[party]) {
        map[party] = {
          total: 0,
          count: 0,
          items: new Set(),
          lastDate: r["Date"] || ""
        };
      }
      map[party].total += parseFloat(r["Amount"]) || 0;
      map[party].count += 1;
      map[party].items.add(r["ItemName"] || "");
      map[party].lastDate = r["Date"] > map[party].lastDate ? r["Date"] : map[party].lastDate;
    });
    
    return Object.entries(map)
      .map(([name, info]) => ({ 
        name, 
        ...info, 
        itemsCount: info.items.size 
      }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  return (
    <div className={`${colors.cardBg} border rounded-2xl p-5 shadow-md`}>
      <h3 className={`text-lg font-bold mb-6 ${colors.accentText}`}>Party Analysis</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="py-3 px-4 text-left font-semibold">Party Name</th>
              <th className="py-3 px-4 text-left font-semibold">Transactions</th>
              <th className="py-3 px-4 text-left font-semibold">Items</th>
              <th className="py-3 px-4 text-left font-semibold">Last Date</th>
              <th className="py-3 px-4 text-right font-semibold">Total Amount</th>
              <th className="py-3 px-4 text-right font-semibold">Avg. Value</th>
            </tr>
          </thead>
          <tbody>
            {partyData.map((party, i) => (
              <tr key={i} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="py-3 px-4 font-medium truncate max-w-[200px]">{party.name}</td>
                <td className="py-3 px-4">{party.count}</td>
                <td className="py-3 px-4">{party.itemsCount}</td>
                <td className="py-3 px-4">{party.lastDate || "-"}</td>
                <td className="py-3 px-4 text-right font-bold">{formatINR(party.total)}</td>
                <td className="py-3 px-4 text-right">{formatINR(party.total / party.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InventorySection({ data, colors, formatINR }) {
  const inventoryData = useMemo(() => {
    const map = {};
    data.forEach(r => {
      const item = r["ItemName"] || "Unknown";
      if (!map[item]) {
        map[item] = {
          qty: 0,
          amount: 0,
          categories: new Set(),
          parties: new Set()
        };
      }
      map[item].qty += parseFloat(r["Qty"]) || 0;
      map[item].amount += parseFloat(r["Amount"]) || 0;
      map[item].categories.add(r["Item Category"] || "");
      map[item].parties.add(r["Party Name"] || "");
    });
    
    return Object.entries(map)
      .map(([name, info]) => ({ 
        name, 
        ...info,
        avgRate: info.amount / (info.qty || 1)
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [data]);

  return (
    <div className={`${colors.cardBg} border rounded-2xl p-5 shadow-md`}>
      <h3 className={`text-lg font-bold mb-6 ${colors.accentText}`}>Inventory Analysis</h3>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="py-3 px-4 text-left font-semibold">Item Name</th>
              <th className="py-3 px-4 text-left font-semibold">Total Qty</th>
              <th className="py-3 px-4 text-left font-semibold">Categories</th>
              <th className="py-3 px-4 text-left font-semibold">Parties</th>
              <th className="py-3 px-4 text-right font-semibold">Total Amount</th>
              <th className="py-3 px-4 text-right font-semibold">Avg. Rate</th>
            </tr>
          </thead>
          <tbody>
            {inventoryData.slice(0, 50).map((item, i) => (
              <tr key={i} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="py-3 px-4 truncate max-w-[250px]">{item.name}</td>
                <td className="py-3 px-4">{item.qty.toFixed(2)}</td>
                <td className="py-3 px-4">{item.categories.size}</td>
                <td className="py-3 px-4">{item.parties.size}</td>
                <td className="py-3 px-4 text-right font-bold">{formatINR(item.amount)}</td>
                <td className="py-3 px-4 text-right">{formatINR(item.avgRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MastersSection({ data, colors }) {
  const parties = [...new Set(data.map(r => r["Party Name"]).filter(Boolean))].sort();
  const items = [...new Set(data.map(r => r["ItemName"]).filter(Boolean))].sort();
  const categories = [...new Set(data.map(r => r["Item Category"]).filter(Boolean))].sort();
  const groups = [...new Set(data.map(r => r["Item Group"]).filter(Boolean))].sort();

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className={`${colors.cardBg} border rounded-2xl p-5 shadow-md`}>
        <h4 className={`font-bold mb-4 ${colors.accentText} flex items-center gap-2`}>
          <Users size={20} /> Party Master ({parties.length})
        </h4>
        <div className="max-h-96 overflow-y-auto space-y-1">
          {parties.map((party, i) => (
            <div key={i} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded flex justify-between">
              <span className="truncate">{party}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${colors.cardBg} border rounded-2xl p-5 shadow-md`}>
        <h4 className={`font-bold mb-4 ${colors.accentText} flex items-center gap-2`}>
          <Package size={20} /> Item Master ({items.length})
        </h4>
        <div className="max-h-96 overflow-y-auto space-y-1">
          {items.map((item, i) => (
            <div key={i} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded flex justify-between">
              <span className="truncate">{item}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${colors.cardBg} border rounded-2xl p-5 shadow-md`}>
        <h4 className={`font-bold mb-4 ${colors.accentText} flex items-center gap-2`}>
          🏢 Category Master ({categories.length})
        </h4>
        <div className="max-h-96 overflow-y-auto space-y-1">
          {categories.map((cat, i) => (
            <div key={i} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded flex justify-between">
              <span className="truncate">{cat}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={`${colors.cardBg} border rounded-2xl p-5 shadow-md`}>
        <h4 className={`font-bold mb-4 ${colors.accentText} flex items-center gap-2`}>
          📦 Group Master ({groups.length})
        </h4>
        <div className="max-h-96 overflow-y-auto space-y-1">
          {groups.map((group, i) => (
            <div key={i} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded flex justify-between">
              <span className="truncate">{group}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AllDataSection({ data, currentPage, setCurrentPage, rowsPerPage, exportCSV, colors }) {
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const pageData = data.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const columns = data[0] ? Object.keys(data[0]) : [];

  return (
    <div className={`${colors.cardBg} border rounded-2xl p-5 shadow-md`}>
      <div className="flex justify-between items-center mb-6">
        <h3 className={`text-lg font-bold ${colors.accentText}`}>All Data View</h3>
        <div className="flex gap-2">
          <button 
            onClick={() => exportCSV(data, "all_data")}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
          >
            <Download size={16} />
            Export All
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto max-h-[500px] border rounded-lg">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 z-10">
            <tr>
              <th className="py-3 px-4 text-left font-semibold">#</th>
              {columns.slice(0, 8).map((col, i) => (
                <th key={i} className="py-3 px-4 text-left font-semibold whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => (
              <tr key={i} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="py-3 px-4 font-bold">{(currentPage - 1) * rowsPerPage + i + 1}</td>
                {columns.slice(0, 8).map((col, j) => (
                  <td key={j} className="py-3 px-4 truncate max-w-[200px]">
                    {col === "Amount" ? `₹${(row[col] || 0).toLocaleString("en-IN")}` : row[col] || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Showing {(currentPage - 1) * rowsPerPage + 1} to {Math.min(currentPage * rowsPerPage, data.length)} of {data.length} entries
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-2 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function InvoiceModal({ refObj, row, onClose, colors, formatINR }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        ref={refObj} 
        className={`${colors.containerBg} rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FileText className="text-blue-500" />
            Invoice Details
          </h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Invoice Content */}
        <div className="p-6 space-y-6">
          {/* Invoice Header */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              COMMUNICATION WORLD INFOMATIC PVT. LTD.
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Business Intelligence • Tally Integration • Data Analytics
            </p>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Invoice No:</span>
                <span className="font-bold">{row["Voucher Number"] || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Date:</span>
                <span>{row["Date"] || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Type:</span>
                <span>{row["Voucher Type"] || "Sales"}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                <span className="font-bold truncate max-w-[200px]">{row["Party Name"] || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Group:</span>
                <span>{row["Party Group"] || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Area:</span>
                <span>{row["City/Area"] || "-"}</span>
              </div>
            </div>
          </div>

          {/* Item Details */}
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="p-3 text-left font-semibold">Item Description</th>
                  <th className="p-3 text-right font-semibold">Qty</th>
                  <th className="p-3 text-right font-semibold">Rate</th>
                  <th className="p-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100 dark:border-gray-800">
                  <td className="p-3">
                    <div className="font-medium">{row["ItemName"] || "-"}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Category: {row["Item Category"] || "-"} • Group: {row["Item Group"] || "-"}
                    </div>
                  </td>
                  <td className="p-3 text-right">{parseFloat(row["Qty"] || 0).toFixed(2)}</td>
                  <td className="p-3 text-right">{formatINR(parseFloat(row["Rate"] || 0))}</td>
                  <td className="p-3 text-right font-bold">{formatINR(row["Amount"])}</td>
                </tr>
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <td colSpan={3} className="p-3 text-right font-semibold">Total Amount:</td>
                  <td className="p-3 text-right font-bold text-lg text-blue-600 dark:text-blue-400">
                    {formatINR(row["Amount"])}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Narration */}
          {row["Narration"] && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                <strong>Note:</strong> {row["Narration"]}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3">
          <button 
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg flex items-center gap-2 hover:bg-gray-900"
          >
            <Printer size={16} />
            Print
          </button>
          <button 
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
