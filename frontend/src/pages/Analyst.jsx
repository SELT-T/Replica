// src/pages/Analyst.jsx - COMPLETE FIXED VERSION
import React, { useEffect, useMemo, useState, useRef } from "react";
import { Line, Doughnut, Bar } from "react-chartjs-2";
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
  TrendingUp,
  Users,
  Package,
  FileBarChart,
  BarChart3,
  PieChart,
  Calendar,
  Tag,
  User,
  MapPin,
  Grid,
  Database,
  Activity,
  Award,
  Target,
  Zap,
  Globe,
  Briefcase,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

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

export default function Analyst() {
  const { user } = useAuth();
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

  // === FIXED: SAME DATA FETCH AS DASHBOARD ===
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

        if (!cancelled) {
          // FIXED: Use SAME NORMALIZATION as Dashboard
          const mapped = arr.map((v) => ({
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
            "Rate": parseFloat(v.rate) || 0,
            // Additional fields for Analyst
            "_rawDate": v.date || "",
            "__party_group": v.party_group || "",
            "Voucher No": v.vch_no || "",
            "Vch No.": v.vch_no || "",
            "Invoice No": v.vch_no || "",
            "Type": v.vch_type || "Sales",
            "Vch Type": v.vch_type || "Sales",
            "Party": v.party_name || "N/A",
            "Customer": v.party_name || "N/A",
            "Item Name": v.name_item || "N/A",
            "Description": v.name_item || "N/A",
            "Company": v.item_category || "Sales",
            "Net Amount": parseFloat(v.amount) || 0,
            "Quantity": parseFloat(v.qty) || 0,
            "Price": parseFloat(v.rate) || 0,
            "Outstanding": 0,
          }));

          // FIXED: Clean TOTAL rows like Dashboard
          const cleaned = mapped.filter((r) => {
            const p = String(r["Party Name"] || "").toLowerCase();
            const i = String(r["ItemName"] || "").toLowerCase();
            const g = String(r["Party Group"] || "").toLowerCase();
            if (p === "total" || p === "grand total") return false;
            if (i === "total" || i === "grand total") return false;
            if (g === "total" || g === "grand total") return false;
            return true;
          });

          setRawData(cleaned);
          localStorage.setItem("analyst_latest_rows", JSON.stringify(cleaned));
          setLastSync(new Date().toISOString());
        }

      } catch (e) {
        console.error("❌ Fetch error:", e);
        setError("Unable to load analyst data. Check backend connection.");

        // Try cache
        const backup = localStorage.getItem("analyst_latest_rows");
        if (backup) {
          try {
            const cached = JSON.parse(backup);
            console.log("📦 Using cache:", cached.length);
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

  // === FIXED: FILTER STATES (Same as Dashboard) ===
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPartyGroup, setFilterPartyGroup] = useState("");
  const [mainItemGroupFilter, setMainItemGroupFilter] = useState("");
  const [salesmanFilter, setSalesmanFilter] = useState("");
  const [partyFilter, setPartyFilter] = useState("");
  const [filteredData, setFilteredData] = useState([]);

  // === FIXED: CLEAN DATA LOGIC (Same as Dashboard) ===
  const cleanData = useMemo(() => {
    let filtered = [...rawData];

    // 1. Apply User Locks
    if (user?.companyLockEnabled && Array.isArray(user?.allowedCompanies) && user.allowedCompanies.length > 0) {
      filtered = filtered.filter(r =>
        user.allowedCompanies.includes(r["Item Category"])
      );
    }

    if (user?.partyLockEnabled && Array.isArray(user?.allowedPartyGroups) && user.allowedPartyGroups.length > 0) {
      filtered = filtered.filter(r =>
        user.allowedPartyGroups.includes(r["__party_group"])
      );
    }

    // 2. Date Filter (Same as Dashboard)
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

    // 3. Other Filters
    if (filterCategory) {
      filtered = filtered.filter(r => r["Item Category"] === filterCategory);
    }

    if (filterPartyGroup) {
      filtered = filtered.filter(r => r["Party Group"] === filterPartyGroup);
    }
     
    if (mainItemGroupFilter) {
      filtered = filtered.filter(r => r["Item Group"] === mainItemGroupFilter);
    }

    if (partyFilter) {
      filtered = filtered.filter(r => r["Party Name"] === partyFilter);
    }

    if (salesmanFilter) {
      filtered = filtered.filter(r => r["Salesman"] === salesmanFilter);
    }

    // 4. Search
    if (search.trim()) {
      const s = search.toLowerCase();
      filtered = filtered.filter(r =>
        Object.values(r).some(v =>
          String(v || "").toLowerCase().includes(s)
        )
      );
    }

    setFilteredData(filtered);
    return filtered;
  }, [
    rawData,
    user,
    dateFilter,
    customDateRange,
    filterCategory,
    filterPartyGroup,
    mainItemGroupFilter,
    partyFilter,
    salesmanFilter,
    search
  ]);

  // === FIXED: METRICS CALCULATION (Same as Dashboard) ===
  const metrics = useMemo(() => {
    let totalSales = 0;
    const partySet = new Set();
    const inventorySet = new Set();
    const voucherSet = new Set();

    (filteredData || []).forEach((r) => {
      const amt = parseFloat(r["Amount"]) || 0;
      totalSales += amt;

      const party = r["Party Name"] || r["Customer"] || "";
      if (party && party !== "N/A") partySet.add(party);

      const item = r["ItemName"] || r["Item Name"] || "";
      if (item && item !== "N/A") inventorySet.add(item);

      const vch = r["Voucher Number"] || "";
      if (vch && vch !== "N/A") voucherSet.add(vch);
    });

    return {
      totalSales,
      partyCount: partySet.size,
      inventoryCount: inventorySet.size,
      billingCount: voucherSet.size, // FIXED: Use unique vouchers like Dashboard
      transactionCount: filteredData.length
    };
  }, [filteredData]);

  // === FIXED: MONTHLY SALES TREND (Same as Dashboard) ===
  const monthlySales = useMemo(() => {
    const m = {};
    (filteredData || []).forEach((r) => {
      const dateStr = r["Date"] || '';
      const d = new Date(dateStr);
      if (isNaN(d)) return;
      const monthYear = d.toLocaleString("en-IN", { month: "short", year: "numeric" });
      m[monthYear] = (m[monthYear] || 0) + parseFloat(r["Amount"] || 0);
    });

    const entries = Object.entries(m).sort((a, b) => new Date(a[0]) - new Date(b[0]));
    return { labels: entries.map(([k]) => k), values: entries.map(([, v]) => v) };
  }, [filteredData]);

  // === FIXED: COMPANY SPLIT (Same as Dashboard) ===
  const companySplit = useMemo(() => {
    const map = {};
    (filteredData || []).forEach((r) => {
      const c = r["Company"] || r["Item Category"] || "Unknown";
      if (c === 'N/A' || c === 'Unknown') return;
      const amt = parseFloat(r["Amount"]) || 0;
      map[c] = (map[c] || 0) + amt;
    });
    
    // Get top 10 companies
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const top10 = sorted.slice(0, 10);
    return { labels: top10.map(([k]) => k), values: top10.map(([, v]) => v) };
  }, [filteredData]);

  // === TOP PRODUCTS & CUSTOMERS ===
  const topEntities = useMemo(() => {
    const prod = {};
    const cust = {};
    
    (filteredData || []).forEach((r) => {
      const item = r["ItemName"] || "Unknown";
      const party = r["Party Name"] || "Unknown";
      const amt = parseFloat(r["Amount"]) || 0;
      
      if (item !== "N/A" && item !== "Unknown") {
        prod[item] = (prod[item] || 0) + amt;
      }
      if (party !== "N/A" && party !== "Unknown") {
        cust[party] = (cust[party] || 0) + amt;
      }
    });
    
    const topProducts = Object.entries(prod).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const topCustomers = Object.entries(cust).sort((a, b) => b[1] - a[1]).slice(0, 15);
    
    return { topProducts, topCustomers };
  }, [filteredData]);

  // === EXPORT CSV ===
  const exportCSV = (rows, filename = "export") => {
    if (!rows || !rows.length) return;
    
    const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r || {}))));
    const csvRows = [keys.join(",")];
    
    rows.forEach((r) => {
      const line = keys.map((k) => {
        let v = r[k];
        if (v === undefined || v === null) return "";
        v = ("" + v).replace(/"/g, '""');
        if (v.includes(",") || v.includes("\n")) v = `"${v}"`;
        return v;
      });
      csvRows.push(line.join(","));
    });
    
    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // === INVOICE FUNCTIONS ===
  const openInvoice = (row) => {
    setSelectedInvoice(row);
    setInvoiceModalOpen(true);
    setTimeout(() => {
      if (modalRef.current) modalRef.current.scrollTop = 0;
    }, 50);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareInvoice = async () => {
    if (!selectedInvoice) return;
    const text = invoiceText(selectedInvoice);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice - ${selectedInvoice["Invoice No"] || ""}`,
          text,
        });
      } catch (e) {
        console.warn("Share cancelled", e);
      }
    } else {
      const wa = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
      window.open(wa, "_blank");
    }
  };

  const invoiceText = (row) => {
    const invNo = row["Invoice No"] || row["Voucher No"] || "";
    const date = row["Date"] || "";
    const party = row["Party Name"] || "";
    const item = row["ItemName"] || "";
    const qty = row["Qty"] || 0;
    const rate = row["Rate"] || 0;
    const amount = row["Amount"] || 0;
    
    return `
COMMUNICATION WORLD INFOMATIC PVT. LTD.
----------------------------------------
Invoice No: ${invNo}
Date: ${date}
Customer: ${party}
----------------------------------------
Item: ${item}
Qty: ${qty}
Rate: ₹${rate}
----------------------------------------
Total Amount: ₹${amount.toLocaleString("en-IN")}
----------------------------------------
Thank you for your business!
    `.trim();
  };

  const copyInvoiceToClipboard = async () => {
    if (!selectedInvoice) return;
    const text = invoiceText(selectedInvoice);
    
    try {
      await navigator.clipboard.writeText(text);
      alert("Invoice copied to clipboard!");
    } catch {
      alert("Copy failed");
    }
  };

  const formatINR = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;

  // === CHART DATA ===
  const monthlyChartData = {
    labels: monthlySales.labels,
    datasets: [{
      label: "Monthly Sales",
      data: monthlySales.values,
      borderColor: "#3B82F6",
      backgroundColor: "rgba(59, 130, 246, 0.2)",
      fill: true,
      tension: 0.4,
      borderWidth: 2,
    }],
  };

  const companyPie = {
    labels: companySplit.labels,
    datasets: [{
      data: companySplit.values,
      backgroundColor: [
        "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", 
        "#EC4899", "#6366F1", "#14B8A6", "#F97316", "#06B6D4",
        "#84CC16", "#F43F5E", "#8B5CF6", "#64748B", "#0EA5E9"
      ],
      borderWidth: 1,
      borderColor: "#ffffff"
    }],
  };

  // === LOADING STATE ===
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity className="text-blue-600" size={40} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mt-6">Loading Analyst Dashboard</h2>
        <p className="text-gray-500 mt-2">Fetching real-time data from Tally...</p>
        <div className="mt-8 flex items-center gap-2 text-sm text-blue-600">
          <RefreshCw className="animate-pulse" size={16} />
          <span>Syncing with backend...</span>
        </div>
      </div>
    );
  }

  // === ERROR STATE ===
  if (error) {
    return (
      <div className="h-screen p-6 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-white p-8 rounded-2xl shadow-2xl border border-red-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X className="text-red-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">⚠️ Connection Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
            >
              <RefreshCw className="inline mr-2" size={16} />
              Retry Connection
            </button>
            <button 
              onClick={() => {
                localStorage.removeItem("analyst_latest_rows");
                window.location.reload();
              }} 
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
            >
              Clear Cache & Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === NO DATA STATE ===
  if (!rawData.length) {
    return (
      <div className="h-screen p-6 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-white p-8 rounded-2xl shadow-xl border border-blue-100">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Database className="text-blue-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">📊 No Data Found</h2>
          <p className="text-gray-600 mb-6">No transaction data available. Please check Tally integration.</p>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
            >
              Refresh Data
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === MAIN RENDER ===
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-gray-800 p-3 sm:p-5">
      <div className="max-w-[1800px] mx-auto space-y-5">
        
        {/* === ENHANCED HEADER === */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-5 shadow-2xl text-white">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                <FileSpreadsheet size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black leading-tight">
                  ANALYST DASHBOARD
                  <span className="block text-sm font-normal opacity-90 mt-1">
                    Advanced Business Intelligence & Analytics
                  </span>
                </h1>
                <div className="flex items-center gap-3 mt-2 text-sm opacity-90">
                  <span className="px-3 py-1 bg-white/20 rounded-full flex items-center gap-2">
                    <Database size={12} />
                    {filteredData.length} records found
                  </span>
                  {lastSync && (
                    <span className="px-3 py-1 bg-white/20 rounded-full flex items-center gap-2">
                      <RefreshCw size={12} />
                      Synced: {new Date(lastSync).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  )}
                  <span className="px-3 py-1 bg-white/20 rounded-full">
                    v2.5 • Professional
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setAutoRefresh((s) => !s)}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold border-2 flex items-center gap-2 transition-all ${
                  autoRefresh 
                    ? "bg-white text-blue-600 border-white shadow-lg" 
                    : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                }`}
              >
                <RefreshCw size={16} className={autoRefresh ? "animate-spin" : ""} />
                {autoRefresh ? "Auto Sync ON" : "Auto Sync OFF"}
              </button>
              
              <button
                onClick={() => {
                  if (confirm("Clear cache and reload from server?")) {
                    localStorage.removeItem("analyst_latest_rows");
                    window.location.reload();
                  }
                }}
                className="px-4 py-2.5 rounded-lg bg-white/10 text-white border-2 border-white/20 text-sm font-semibold hover:bg-white/20 transition-colors flex items-center gap-2"
              >
                <Zap size={16} />
                Force Refresh
              </button>
            </div>
          </div>
        </div>

        {/* === ENHANCED NAVIGATION TABS === */}
        <div className="bg-white rounded-2xl p-2 border border-gray-200 shadow-lg overflow-x-auto">
          <div className="flex flex-nowrap gap-2 min-w-max">
            {[
              { key: "dashboard", label: "Dashboard", icon: <BarChart3 size={18} />, color: "blue" },
              { key: "masters", label: "Masters", icon: <Database size={18} />, color: "purple" },
              { key: "transactions", label: "Transactions", icon: <FileBarChart size={18} />, color: "green" },
              { key: "reports", label: "Reports", icon: <PieChart size={18} />, color: "orange" },
              { key: "party", label: "Party Analysis", icon: <Users size={18} />, color: "indigo" },
              { key: "inventory", label: "Inventory", icon: <Package size={18} />, color: "emerald" },
              { key: "alldata", label: "All Data", icon: <Globe size={18} />, color: "cyan" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveSection(tab.key);
                  setCurrentPage(1);
                }}
                className={`px-5 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 whitespace-nowrap ${
                  activeSection === tab.key
                    ? `bg-gradient-to-r from-${tab.color}-500 to-${tab.color}-600 text-white shadow-lg transform scale-105`
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent hover:border-gray-200"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* === ENHANCED FILTERS BAR === */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Search size={18} />
              </div>
              <input
                placeholder="Search anything..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {search && (
                <button 
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Date Filter */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Calendar size={18} />
              </div>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Dates</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_quarter">This Quarter</option>
                <option value="this_year">This Year</option>
                <option value="last_year">Last Year</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {dateFilter === "custom" && (
              <>
                <div>
                  <input
                    type="date"
                    value={customDateRange.start}
                    onChange={(e) => setCustomDateRange({...customDateRange, start: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <input
                    type="date"
                    value={customDateRange.end}
                    onChange={(e) => setCustomDateRange({...customDateRange, end: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            {/* Category Filter */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Tag size={18} />
              </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {[...new Set(rawData.map(r => r["Item Category"]).filter(Boolean))]
                  .sort()
                  .map(c => (
                    <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Party Group Filter */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Users size={18} />
              </div>
              <select
                value={filterPartyGroup}
                onChange={(e) => setFilterPartyGroup(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Party Groups</option>
                {[...new Set(rawData.map(r => r["Party Group"]).filter(Boolean))]
                  .sort()
                  .map(g => (
                    <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Item Group Filter */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Package size={18} />
              </div>
              <select
                value={mainItemGroupFilter}
                onChange={(e) => setMainItemGroupFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Item Groups</option>
                {[...new Set(rawData.map(r => r["Item Group"]).filter(Boolean))]
                  .sort()
                  .map(g => (
                    <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Party Filter */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <User size={18} />
              </div>
              <select
                value={partyFilter}
                onChange={(e) => setPartyFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Parties</option>
                {[...new Set(rawData.map(r => r["Party Name"]).filter(Boolean))]
                  .sort()
                  .slice(0, 50)
                  .map(p => (
                    <option key={p} value={p}>{p.length > 30 ? p.substring(0, 30) + "..." : p}</option>
                ))}
              </select>
            </div>

            {/* Salesman Filter */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <Briefcase size={18} />
              </div>
              <select
                value={salesmanFilter}
                onChange={(e) => setSalesmanFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Salesmen</option>
                {[...new Set(rawData.map(r => r["Salesman"]).filter(Boolean))]
                  .sort()
                  .map(s => (
                    <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Export Button */}
            <div className="md:col-span-2 lg:col-span-1 xl:col-span-1">
              <button
                onClick={() => exportCSV(filteredData, "AnalystExport")}
                className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Export Data ({filteredData.length} records)
              </button>
            </div>
          </div>

          {/* Active Filters Summary */}
          <div className="mt-4 flex flex-wrap gap-2">
            {dateFilter !== "all" && (
              <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium flex items-center gap-1">
                <Calendar size={12} />
                {dateFilter.replace('_', ' ').toUpperCase()}
                <button onClick={() => setDateFilter("all")} className="ml-1 hover:text-red-600">×</button>
              </span>
            )}
            {filterCategory && (
              <span className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium flex items-center gap-1">
                <Tag size={12} />
                {filterCategory}
                <button onClick={() => setFilterCategory("")} className="ml-1 hover:text-red-600">×</button>
              </span>
            )}
            {filterPartyGroup && (
              <span className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium flex items-center gap-1">
                <Users size={12} />
                {filterPartyGroup}
                <button onClick={() => setFilterPartyGroup("")} className="ml-1 hover:text-red-600">×</button>
              </span>
            )}
            {mainItemGroupFilter && (
              <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium flex items-center gap-1">
                <Package size={12} />
                {mainItemGroupFilter}
                <button onClick={() => setMainItemGroupFilter("")} className="ml-1 hover:text-red-600">×</button>
              </span>
            )}
            {search && (
              <span className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs font-medium flex items-center gap-1">
                <Search size={12} />
                Search: "{search}"
                <button onClick={() => setSearch("")} className="ml-1 hover:text-red-600">×</button>
              </span>
            )}
          </div>
        </div>

        {/* === METRICS CARDS (Same as Dashboard) === */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard 
            title="Total Sales" 
            value={formatINR(metrics.totalSales)} 
            subtitle={`${metrics.transactionCount} transactions`}
            icon={<TrendingUp className="text-white" size={24} />}
            color="from-blue-500 to-blue-600"
            trend={`₹${(metrics.totalSales/1000000).toFixed(1)}M`}
          />
          <MetricCard 
            title="Active Parties" 
            value={metrics.partyCount} 
            subtitle="Unique Customers"
            icon={<Users className="text-white" size={24} />}
            color="from-emerald-500 to-emerald-600"
            trend={`${((metrics.partyCount / filteredData.length) * 100).toFixed(1)}% active`}
          />
          <MetricCard 
            title="Total Vouchers" 
            value={metrics.billingCount} 
            subtitle="Generated Bills"
            icon={<FileBarChart className="text-white" size={24} />}
            color="from-purple-500 to-purple-600"
            trend={`${((metrics.billingCount / filteredData.length) * 100).toFixed(1)}% coverage`}
          />
          <MetricCard 
            title="Products Sold" 
            value={metrics.inventoryCount} 
            subtitle="Unique Items"
            icon={<Package className="text-white" size={24} />}
            color="from-orange-500 to-orange-600"
            trend={`${((metrics.inventoryCount / filteredData.length) * 100).toFixed(1)}% diversity`}
          />
        </div>

        {/* === MAIN CONTENT AREA === */}
        <div className="animate-in fade-in duration-300">
          {activeSection === "dashboard" && (
            <DashboardSection
              metrics={metrics}
              monthlyChartData={monthlyChartData}
              companyPie={companyPie}
              topProducts={topEntities.topProducts}
              topCustomers={topEntities.topCustomers}
              data={filteredData}
              openInvoice={openInvoice}
              formatINR={formatINR}
            />
          )}
          
          {activeSection === "masters" && (
            <EnhancedMastersSection 
              data={rawData} 
              openInvoice={openInvoice} 
            />
          )}
          
          {activeSection === "transactions" && (
            <EnhancedTransactionsSection 
              data={filteredData} 
              openInvoice={openInvoice} 
              exportCSV={exportCSV} 
            />
          )}
          
          {activeSection === "reports" && (
            <EnhancedReportsSection 
              data={filteredData} 
              exportCSV={exportCSV} 
            />
          )}
          
          {activeSection === "party" && (
            <EnhancedPartySection 
              data={filteredData} 
              openInvoice={openInvoice} 
            />
          )}
          
          {activeSection === "inventory" && (
            <EnhancedInventorySection 
              data={filteredData} 
            />
          )}
          
          {activeSection === "alldata" && (
            <EnhancedAllDataSection 
              data={filteredData} 
              exportCSV={exportCSV}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              rowsPerPage={rowsPerPage}
              openInvoice={openInvoice}
            />
          )}
        </div>
      </div>

      {/* === TALLY-STYLE INVOICE MODAL === */}
      {invoiceModalOpen && selectedInvoice && (
        <TallyInvoiceModal
          refObj={modalRef}
          row={selectedInvoice}
          onClose={() => setInvoiceModalOpen(false)}
          printSize={printSize}
          setPrintSize={setPrintSize}
          onPrint={handlePrint}
          onShare={handleShareInvoice}
          onCopy={copyInvoiceToClipboard}
        />
      )}
    </div>
  );
}

// === ENHANCED METRIC CARD ===
function MetricCard({ title, value, subtitle, icon, color, trend }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-2xl p-5 shadow-xl text-white transform hover:scale-[1.02] transition-transform duration-300`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium opacity-90 uppercase tracking-wide">{title}</p>
          <h3 className="text-2xl sm:text-3xl font-black mt-2 tracking-tight">{value}</h3>
          <p className="text-xs opacity-80 mt-1">{subtitle}</p>
        </div>
        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
          {icon}
        </div>
      </div>
      {trend && (
        <div className="mt-4 pt-3 border-t border-white/20">
          <p className="text-xs font-medium opacity-90">{trend}</p>
        </div>
      )}
    </div>
  );
}

// === ENHANCED DASHBOARD SECTION ===
function DashboardSection({ metrics, monthlyChartData, companyPie, topProducts, topCustomers, data, openInvoice, formatINR }) {
  return (
    <div className="space-y-6">
      {/* CHARTS ROW */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sales Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-gray-800 text-lg font-bold flex items-center gap-3">
               <div className="w-3 h-8 bg-blue-600 rounded-full"></div>
               Monthly Sales Trend
             </h3>
             <div className="flex items-center gap-2 text-sm text-gray-500">
               <TrendingUp size={16} />
               <span>₹{(metrics.totalSales/1000000).toFixed(1)}M total</span>
             </div>
          </div>
          <div className="h-72">
            <Line 
              data={monthlyChartData} 
              options={{ 
                maintainAspectRatio: false, 
                responsive: true,
                plugins: { 
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: "#1e293b",
                    padding: 12,
                    titleColor: "#fff",
                    bodyColor: "#fff",
                    titleFont: { size: 13 },
                    bodyFont: { size: 12 },
                    borderColor: '#ffffff20',
                    borderWidth: 1,
                    displayColors: false,
                    callbacks: {
                      label: (ctx) => `Sales: ₹${ctx.raw.toLocaleString('en-IN')}`
                    }
                  }
                },
                scales: {
                  x: { 
                    ticks: { color: "#64748b", font: { size: 11 } },
                    grid: { color: "#f1f5f9" }
                  },
                  y: { 
                    ticks: { 
                      color: "#64748b", 
                      font: { size: 11 },
                      callback: (val) => `₹${(val/1000).toFixed(0)}K`
                    },
                    grid: { color: "#f1f5f9", borderDash: [5, 5] }
                  },
                },
              }} 
            />
          </div>
        </div>
        
        {/* Company Split */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-gray-800 text-lg font-bold flex items-center gap-3">
               <div className="w-3 h-8 bg-purple-600 rounded-full"></div>
               Company Distribution
             </h3>
          </div>
          <div className="h-72">
            <Doughnut 
              data={companyPie} 
              options={{ 
                maintainAspectRatio: false,
                responsive: true,
                cutout: '60%',
                plugins: { 
                  legend: { 
                    position: 'right',
                    labels: { 
                      color: "#475569",
                      padding: 15,
                      font: { size: 11 },
                      usePointStyle: true,
                    } 
                  },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => `${ctx.label}: ₹${ctx.raw.toLocaleString('en-IN')}`
                    }
                  }
                } 
              }} 
            />
          </div>
        </div>
      </div>

      {/* TOP PERFORMERS */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-gray-800 text-lg font-bold flex items-center gap-3">
              <Award className="text-orange-500" size={20} />
              Top Selling Products
            </h3>
            <span className="text-sm text-gray-500">{topProducts.length} items</span>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {topProducts.map(([name, amt], i) => (
              <div key={i} className="flex items-center justify-between p-3 hover:bg-blue-50 rounded-xl transition-colors group">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold ${
                    i === 0 ? 'bg-yellow-500' : 
                    i === 1 ? 'bg-gray-400' : 
                    i === 2 ? 'bg-orange-500' : 'bg-blue-500'
                  }`}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 truncate max-w-[200px]">{name}</p>
                    <p className="text-xs text-gray-500">Sales</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">₹{(amt || 0).toLocaleString("en-IN")}</p>
                  <p className="text-xs text-gray-500">{((amt / metrics.totalSales) * 100).toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-gray-800 text-lg font-bold flex items-center gap-3">
              <Target className="text-indigo-500" size={20} />
              Top Customers
            </h3>
            <span className="text-sm text-gray-500">{topCustomers.length} parties</span>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {topCustomers.map(([name, amt], i) => (
              <div key={i} className="flex items-center justify-between p-3 hover:bg-indigo-50 rounded-xl transition-colors group">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold ${
                    i === 0 ? 'bg-green-500' : 
                    i === 1 ? 'bg-gray-400' : 
                    i === 2 ? 'bg-orange-500' : 'bg-indigo-500'
                  }`}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 truncate max-w-[200px]">{name}</p>
                    <p className="text-xs text-gray-500">Customer</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">₹{(amt || 0).toLocaleString("en-IN")}</p>
                  <p className="text-xs text-gray-500">{((amt / metrics.totalSales) * 100).toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECENT TRANSACTIONS */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-gray-800 text-lg font-bold flex items-center gap-3">
            <Activity className="text-green-500" size={20} />
            Recent Transactions
          </h3>
          <span className="text-sm text-gray-500">Last 10 transactions</span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm text-gray-700">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 font-semibold uppercase">
              <tr>
                <th className="text-left py-4 px-4">Vch No</th>
                <th className="text-left py-4 px-4">Date</th>
                <th className="text-left py-4 px-4">Party</th>
                <th className="text-left py-4 px-4">Item</th>
                <th className="text-right py-4 px-4">Amount</th>
                <th className="text-right py-4 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.slice(0, 10).map((r, i) => {
                const inv = r["Vch No."] || "—";
                const date = r["Date"] || "—";
                const party = r["Party Name"] || "—";
                const item = r["ItemName"] || "—";
                const amount = parseFloat(r["Amount"]) || 0;
                
                return (
                  <tr 
                    key={i} 
                    className="hover:bg-blue-50 transition-colors cursor-pointer group"
                    onClick={() => openInvoice(r)}
                  >
                    <td className="py-3 px-4 font-medium text-gray-900 truncate max-w-[100px]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        {inv}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{date}</td>
                    <td className="py-3 px-4 truncate max-w-[150px]">{party}</td>
                    <td className="py-3 px-4 truncate max-w-[150px] text-gray-600">{item}</td>
                    <td className="text-right py-3 px-4 font-bold text-gray-800">
                      ₹{Number(amount).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openInvoice(r);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-600 text-xs font-semibold hover:bg-blue-200 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Eye size={14} className="inline mr-1" />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// === ENHANCED MASTERS SECTION ===
function EnhancedMastersSection({ data, openInvoice }) {
  const parties = [...new Set(data.map(r => r["Party Name"]))].filter(p => p && p !== "N/A").sort();
  const items = [...new Set(data.map(r => r["ItemName"]))].filter(i => i && i !== "N/A").sort();
  const categories = [...new Set(data.map(r => r["Item Category"]))].filter(c => c && c !== "N/A").sort();
  const groups = [...new Set(data.map(r => r["Party Group"]))].filter(g => g && g !== "N/A").sort();
  
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Parties Directory */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Users className="text-indigo-600" size={20} />
          </div>
          <div>
            <h3 className="text-gray-800 font-bold text-lg">Parties Directory</h3>
            <p className="text-sm text-gray-500">{parties.length} unique parties</p>
          </div>
        </div>
        <div className="max-h-[500px] overflow-y-auto pr-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {parties.slice(0, 100).map((p, i) => (
              <div key={i} className="p-3 border border-gray-100 rounded-xl hover:bg-indigo-50 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-xs font-bold">
                    {i + 1}
                  </div>
                  <span className="font-medium text-gray-800 truncate">{p}</span>
                </div>
              </div>
            ))}
          </div>
          {parties.length > 100 && (
            <div className="mt-4 text-center text-sm text-gray-500">
              + {parties.length - 100} more parties
            </div>
          )}
        </div>
      </div>
      
      {/* Item Master */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Package className="text-orange-600" size={20} />
          </div>
          <div>
            <h3 className="text-gray-800 font-bold text-lg">Item Master</h3>
            <p className="text-sm text-gray-500">{items.length} unique items</p>
          </div>
        </div>
        <div className="max-h-[500px] overflow-y-auto pr-2">
          <div className="space-y-2">
            {items.slice(0, 50).map((it, i) => (
              <div key={i} className="p-3 border border-gray-100 rounded-xl hover:bg-orange-50 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-xs font-bold">
                    {i + 1}
                  </div>
                  <span className="font-medium text-gray-800 truncate">{it}</span>
                </div>
              </div>
            ))}
          </div>
          {items.length > 50 && (
            <div className="mt-4 text-center text-sm text-gray-500">
              + {items.length - 50} more items
            </div>
          )}
        </div>
      </div>

      {/* Categories & Groups */}
      <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Tag className="text-blue-600" size={20} />
            </div>
            <div>
              <h3 className="text-gray-800 font-bold text-lg">Categories</h3>
              <p className="text-sm text-gray-500">{categories.length} categories</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat, i) => (
              <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                {cat}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Grid className="text-purple-600" size={20} />
            </div>
            <div>
              <h3 className="text-gray-800 font-bold text-lg">Party Groups</h3>
              <p className="text-sm text-gray-500">{groups.length} groups</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {groups.map((grp, i) => (
              <span key={i} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium">
                {grp}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// === ENHANCED TRANSACTIONS SECTION ===
function EnhancedTransactionsSection({ data, openInvoice, exportCSV }) {
  const [page, setPage] = useState(1);
  const perPage = 25;
  const pages = Math.max(1, Math.ceil(data.length / perPage));
  const pageData = data.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h3 className="text-gray-800 font-bold text-lg flex items-center gap-3">
            <div className="w-3 h-8 bg-green-600 rounded-full"></div>
            Transactions Log
          </h3>
          <p className="text-sm text-gray-500 mt-1">{data.length} transactions found</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => exportCSV(data, "Transactions")} 
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Download size={16} /> Export CSV
          </button>
          <div className="text-sm text-gray-500">
            Page {page} of {pages}
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm text-gray-700">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 font-semibold sticky top-0">
            <tr>
              <th className="text-left py-4 px-4">#</th>
              <th className="text-left py-4 px-4">Vch No</th>
              <th className="text-left py-4 px-4">Date</th>
              <th className="text-left py-4 px-4">Party</th>
              <th className="text-left py-4 px-4">Item</th>
              <th className="text-right py-4 px-4">Qty</th>
              <th className="text-right py-4 px-4">Amount</th>
              <th className="text-right py-4 px-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageData.map((r, i) => (
              <tr 
                key={i} 
                className="hover:bg-blue-50 transition-colors cursor-pointer group"
                onClick={() => openInvoice(r)}
              >
                <td className="py-3 px-4 font-medium text-gray-500">
                  {(page - 1) * perPage + i + 1}
                </td>
                <td className="py-3 px-4 font-medium truncate max-w-[100px]">{r["Vch No."] || "—"}</td>
                <td className="py-3 px-4 text-gray-500">{r["Date"] || "—"}</td>
                <td className="py-3 px-4 truncate max-w-[150px]">{r["Party Name"] || "—"}</td>
                <td className="py-3 px-4 truncate max-w-[150px] text-gray-600">{r["ItemName"] || "—"}</td>
                <td className="text-right py-3 px-4 text-gray-600">
                  {parseFloat(r["Qty"] || 0).toFixed(2)}
                </td>
                <td className="text-right py-3 px-4 font-bold text-gray-800">
                  ₹{(r["Amount"] || 0).toLocaleString("en-IN")}
                </td>
                <td className="py-3 px-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        openInvoice(r);
                      }} 
                      className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-600 text-xs font-medium hover:bg-blue-200 transition-colors"
                    >
                      View
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        exportCSV([r], `Invoice_${r["Vch No."]}`);
                      }} 
                      className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 transition-colors"
                    >
                      Export
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="flex justify-between items-center mt-6">
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))} 
          disabled={page === 1} 
          className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <ChevronLeft size={16} /> Previous
        </button>
        <div className="flex items-center gap-2">
          {Array.from({ length: Math.min(5, pages) }, (_, i) => {
            let pageNum;
            if (pages <= 5) {
              pageNum = i + 1;
            } else if (page <= 3) {
              pageNum = i + 1;
            } else if (page >= pages - 2) {
              pageNum = pages - 4 + i;
            } else {
              pageNum = page - 2 + i;
            }
            
            return (
              <button
                key={i}
                onClick={() => setPage(pageNum)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium ${
                  page === pageNum
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          {pages > 5 && (
            <span className="text-gray-500 mx-2">...</span>
          )}
        </div>
        <button 
          onClick={() => setPage(p => Math.min(pages, p + 1))} 
          disabled={page === pages} 
          className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// === ENHANCED REPORTS SECTION ===
function EnhancedReportsSection({ data, exportCSV }) {
  const salesData = data.filter(r => {
    const type = String(r["Voucher Type"] || "").toLowerCase();
    return type.includes("sales") || type.includes("invoice");
  });
  
  const purchaseData = data.filter(r => {
    const type = String(r["Voucher Type"] || "").toLowerCase();
    return type.includes("purchase");
  });
  
  const creditData = data.filter(r => {
    const type = String(r["Voucher Type"] || "").toLowerCase();
    return type.includes("credit") || type.includes("receipt");
  });
  
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ReportCard 
          title="Full Data Dump" 
          description="Export all available records"
          count={data.length}
          icon={<Database className="text-white" size={24} />}
          color="from-blue-500 to-blue-600"
          onClick={() => exportCSV(data, "AllData")}
        />
        
        <ReportCard 
          title="Sales Register" 
          description="Sales transactions only"
          count={salesData.length}
          icon={<TrendingUp className="text-white" size={24} />}
          color="from-green-500 to-emerald-600"
          onClick={() => exportCSV(salesData, "SalesRegister")}
        />
        
        <ReportCard 
          title="Purchase Register" 
          description="Purchase transactions"
          count={purchaseData.length}
          icon={<Download className="text-white" size={24} />}
          color="from-orange-500 to-orange-600"
          onClick={() => exportCSV(purchaseData, "PurchaseRegister")}
        />
        
        <ReportCard 
          title="Credit Notes" 
          description="Credit and receipts"
          count={creditData.length}
          icon={<FileText className="text-white" size={24} />}
          color="from-purple-500 to-purple-600"
          onClick={() => exportCSV(creditData, "CreditNotes")}
        />
      </div>

      {/* Quick Stats */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
        <h3 className="text-gray-800 text-lg font-bold mb-6 flex items-center gap-3">
          <PieChart className="text-indigo-500" size={20} />
          Report Statistics
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-xl">
            <p className="text-sm text-blue-600 font-medium">Total Records</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{data.length}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-xl">
            <p className="text-sm text-green-600 font-medium">Sales Records</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{salesData.length}</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-xl">
            <p className="text-sm text-orange-600 font-medium">Purchase Records</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{purchaseData.length}</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl">
            <p className="text-sm text-purple-600 font-medium">Credit Records</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{creditData.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportCard({ title, description, count, icon, color, onClick }) {
  return (
    <div 
      onClick={onClick}
      className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white shadow-xl cursor-pointer transform hover:scale-[1.02] transition-all duration-300`}
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-bold text-lg">{title}</h4>
          <p className="text-sm opacity-90 mt-1">{description}</p>
        </div>
        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
          {icon}
        </div>
      </div>
      <div className="mt-6 flex justify-between items-center">
        <span className="text-3xl font-black">{count.toLocaleString('en-IN')}</span>
        <span className="text-sm opacity-90">records</span>
      </div>
      <div className="mt-4 pt-4 border-t border-white/20">
        <div className="flex items-center justify-between text-sm">
          <span>Click to export</span>
          <Download size={16} className="opacity-80" />
        </div>
      </div>
    </div>
  );
}

// === ENHANCED PARTY SECTION ===
function EnhancedPartySection({ data, openInvoice }) {
  const partyData = useMemo(() => {
    const map = {};
    data.forEach(r => {
      const p = r["Party Name"] || "Unknown";
      if (p === "N/A" || p === "Unknown") return;
      
      const amt = parseFloat(r["Amount"]) || 0;
      const qty = parseFloat(r["Qty"]) || 0;
      
      if (!map[p]) {
        map[p] = { 
          total: 0, 
          count: 0, 
          qty: 0,
          lastDate: r["Date"] || "",
          group: r["Party Group"] || "N/A"
        };
      }
      
      map[p].total += amt;
      map[p].count += 1;
      map[p].qty += qty;
      
      // Keep most recent date
      if (r["Date"] && (!map[p].lastDate || new Date(r["Date"]) > new Date(map[p].lastDate))) {
        map[p].lastDate = r["Date"];
      }
    });
    
    return Object.entries(map)
      .map(([name, info]) => ({ name, ...info }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("total");

  const filteredPartyData = useMemo(() => {
    let filtered = [...partyData];
    
    if (search) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.group.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (sortBy === "total") {
      filtered.sort((a, b) => b.total - a.total);
    } else if (sortBy === "count") {
      filtered.sort((a, b) => b.count - a.count);
    } else if (sortBy === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "group") {
      filtered.sort((a, b) => a.group.localeCompare(b.group));
    }
    
    return filtered;
  }, [partyData, search, sortBy]);

  const totalAmount = filteredPartyData.reduce((sum, p) => sum + p.total, 0);
  const totalTransactions = filteredPartyData.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h3 className="text-gray-800 text-lg font-bold flex items-center gap-3">
            <Users className="text-indigo-500" size={20} />
            Party Ledger Summary
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {filteredPartyData.length} parties • {totalTransactions} transactions • ₹{totalAmount.toLocaleString('en-IN')} total
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search parties..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="total">Sort by Total</option>
            <option value="count">Sort by Count</option>
            <option value="name">Sort by Name</option>
            <option value="group">Sort by Group</option>
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm text-gray-700">
          <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100 text-indigo-800 font-semibold">
            <tr>
              <th className="text-left py-4 px-4">Party Name</th>
              <th className="text-left py-4 px-4">Group</th>
              <th className="text-right py-4 px-4">Trans Count</th>
              <th className="text-right py-4 px-4">Total Qty</th>
              <th className="text-right py-4 px-4">Total Amount</th>
              <th className="text-left py-4 px-4">Last Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredPartyData.slice(0, 50).map((p, i) => (
              <tr 
                key={i} 
                className="hover:bg-indigo-50 transition-colors cursor-pointer"
                onClick={() => {
                  // Open first transaction for this party
                  const partyTransaction = data.find(t => t["Party Name"] === p.name);
                  if (partyTransaction) openInvoice(partyTransaction);
                }}
              >
                <td className="py-3 px-4 font-medium truncate max-w-[200px]">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold ${
                      i === 0 ? 'bg-yellow-500' : 
                      i === 1 ? 'bg-gray-400' : 
                      i === 2 ? 'bg-orange-500' : 'bg-indigo-500'
                    }`}>
                      {i + 1}
                    </div>
                    {p.name}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                    {p.group}
                  </span>
                </td>
                <td className="text-right py-3 px-4 text-gray-600">{p.count}</td>
                <td className="text-right py-3 px-4 text-gray-600">{p.qty.toFixed(2)}</td>
                <td className="text-right py-3 px-4 font-bold text-gray-800">
                  ₹{p.total.toLocaleString("en-IN")}
                </td>
                <td className="py-3 px-4 text-gray-500 text-sm">{p.lastDate || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {filteredPartyData.length > 50 && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Showing 50 of {filteredPartyData.length} parties. Use search to find specific parties.
        </div>
      )}
    </div>
  );
}

// === ENHANCED INVENTORY SECTION ===
function EnhancedInventorySection({ data }) {
  const inv = useMemo(() => {
    const map = {};
    data.forEach(r => {
      const item = r["ItemName"] || "Unknown";
      if (item === "N/A" || item === "Unknown") return;
      
      const qty = parseFloat(r["Qty"]) || 0;
      const amt = parseFloat(r["Amount"]) || 0;
      const rate = parseFloat(r["Rate"]) || 0;
      const group = r["Item Group"] || "N/A";
      const category = r["Item Category"] || "N/A";
      
      if (!map[item]) {
        map[item] = { 
          qty: 0, 
          value: 0, 
          count: 0,
          avgRate: 0,
          group: group,
          category: category
        };
      }
      
      map[item].qty += qty;
      map[item].value += amt;
      map[item].count += 1;
      map[item].avgRate = map[item].value / map[item].qty || 0;
    });
    
    return Object.entries(map)
      .map(([name, info]) => ({ name, ...info }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("value");

  const filteredInventory = useMemo(() => {
    let filtered = [...inv];
    
    if (search) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.group.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (sortBy === "value") {
      filtered.sort((a, b) => b.value - a.value);
    } else if (sortBy === "qty") {
      filtered.sort((a, b) => b.qty - a.qty);
    } else if (sortBy === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "count") {
      filtered.sort((a, b) => b.count - a.count);
    }
    
    return filtered;
  }, [inv, search, sortBy]);

  const totalValue = filteredInventory.reduce((sum, item) => sum + item.value, 0);
  const totalQty = filteredInventory.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-lg">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h3 className="text-gray-800 text-lg font-bold flex items-center gap-3">
            <Package className="text-orange-500" size={20} />
            Inventory Summary
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {filteredInventory.length} items • {totalQty.toFixed(2)} total qty • ₹{totalValue.toLocaleString('en-IN')} total value
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="value">Sort by Value</option>
            <option value="qty">Sort by Quantity</option>
            <option value="name">Sort by Name</option>
            <option value="count">Sort by Count</option>
          </select>
        </div>
      </div>
      
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm text-gray-700">
          <thead className="bg-gradient-to-r from-orange-50 to-orange-100 text-orange-800 font-semibold">
            <tr>
              <th className="text-left py-4 px-4">Item Name</th>
              <th className="text-left py-4 px-4">Category</th>
              <th className="text-left py-4 px-4">Group</th>
              <th className="text-right py-4 px-4">Trans Count</th>
              <th className="text-right py-4 px-4">Total Qty</th>
              <th className="text-right py-4 px-4">Avg Rate</th>
              <th className="text-right py-4 px-4">Total Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredInventory.slice(0, 50).map((item, i) => (
              <tr key={i} className="hover:bg-orange-50 transition-colors">
                <td className="py-3 px-4 font-medium truncate max-w-[250px]">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold ${
                      i === 0 ? 'bg-yellow-500' : 
                      i === 1 ? 'bg-gray-400' : 
                      i === 2 ? 'bg-orange-500' : 'bg-orange-500'
                    }`}>
                      {i + 1}
                    </div>
                    {item.name}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {item.category}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                    {item.group}
                  </span>
                </td>
                <td className="text-right py-3 px-4 text-gray-600">{item.count}</td>
                <td className="text-right py-3 px-4 text-gray-600">{item.qty.toFixed(2)}</td>
                <td className="text-right py-3 px-4 text-gray-600">
                  ₹{item.avgRate.toFixed(2)}
                </td>
                <td className="text-right py-3 px-4 font-bold text-gray-800">
                  ₹{item.value.toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {filteredInventory.length > 50 && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Showing 50 of {filteredInventory.length} items. Use search to find specific items.
        </div>
      )}
    </div>
  );
}

// === ENHANCED ALL DATA SECTION ===
function EnhancedAllDataSection({ data, exportCSV, currentPage, setCurrentPage, rowsPerPage, openInvoice }) {
  const importantColumns = [
    "Date",
    "Vch No.",
    "Party Name",
    "ItemName",
    "Item Group",
    "Item Category",
    "Qty",
    "Rate",
    "Amount"
  ];

  const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return data.slice(start, start + rowsPerPage);
  }, [data, currentPage, rowsPerPage]);

  const [columnSearch, setColumnSearch] = useState(Array(importantColumns.length).fill(""));

  const handleColumnSearch = (colIndex, value) => {
    const newSearch = [...columnSearch];
    newSearch[colIndex] = value;
    setColumnSearch(newSearch);
    setCurrentPage(1);
  };

  const filteredData = useMemo(() => {
    if (columnSearch.every(s => !s)) return paginatedData;

    return paginatedData.filter(row => {
      return importantColumns.every((col, colIndex) => {
        const searchTerm = columnSearch[colIndex];
        if (!searchTerm) return true;
        
        const cellValue = String(row[col] || "").toLowerCase();
        return cellValue.includes(searchTerm.toLowerCase());
      });
    });
  }, [paginatedData, columnSearch]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h3 className="text-gray-800 text-2xl font-bold flex items-center gap-3">
            <Database className="text-blue-500" size={24} />
            Comprehensive Data View
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {data.length} total records • Page {currentPage} of {totalPages}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => exportCSV(data, "AllData")} 
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-bold hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Download size={18} /> Export CSV ({data.length} records)
          </button>
          <div className="text-sm text-gray-500">
            <span className="font-semibold">{rowsPerPage}</span> rows per page
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
          <table className="w-full text-sm text-gray-700">
            <thead className="bg-gradient-to-r from-gray-800 to-gray-900 text-white font-semibold sticky top-0 z-10">
              <tr>
                <th className="text-left py-4 px-4 sticky left-0 bg-gray-800 z-20 min-w-[60px] border-r border-gray-700">
                  #
                </th>
                {importantColumns.map((col, idx) => (
                  <th 
                    key={idx} 
                    className="text-left py-4 px-4 whitespace-nowrap min-w-[150px]"
                  >
                    <div className="flex flex-col">
                      <span>{col}</span>
                      <input
                        type="text"
                        placeholder={`Filter ${col}`}
                        value={columnSearch[idx]}
                        onChange={(e) => handleColumnSearch(idx, e.target.value)}
                        className="mt-1 px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-white"
                      />
                    </div>
                  </th>
                ))}
                <th className="text-right py-4 px-4 min-w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={importantColumns.length + 2} className="py-8 text-center text-gray-500">
                    No matching records found. Try adjusting your filters.
                  </td>
                </tr>
              ) : (
                filteredData.map((row, rowIdx) => (
                  <tr 
                    key={rowIdx} 
                    className="hover:bg-blue-50 cursor-pointer transition-colors group"
                    onClick={() => openInvoice(row)}
                  >
                    <td className="py-3 px-4 sticky left-0 bg-white font-bold text-gray-500 border-r border-gray-200 z-10 group-hover:bg-blue-50">
                      {(currentPage - 1) * rowsPerPage + rowIdx + 1}
                    </td>
                    {importantColumns.map((col, colIdx) => {
                      let displayValue = row[col];
                      if (displayValue === null || displayValue === undefined) displayValue = "—";
                      
                      if (col === "Amount") {
                        const num = parseFloat(displayValue) || 0;
                        displayValue = `₹${num.toLocaleString("en-IN")}`;
                      }
                      
                      if (col === "Qty") {
                        const num = parseFloat(displayValue) || 0;
                        displayValue = num.toFixed(2);
                      }
                      
                      if (col === "Rate") {
                        const num = parseFloat(displayValue) || 0;
                        displayValue = `₹${num.toFixed(2)}`;
                      }
                      
                      return (
                        <td 
                          key={colIdx} 
                          className={`py-3 px-4 ${
                            col === "Amount" ? "text-right font-bold text-gray-800" : ""
                          } ${
                            col === "Qty" || col === "Rate" ? "text-right text-gray-600" : ""
                          }`}
                          title={String(row[col] || "—")}
                        >
                          <div className={`${
                            col === "ItemName" || col === "Party Name" 
                              ? "max-w-[200px] truncate" 
                              : "whitespace-nowrap"
                          }`}>
                            {displayValue}
                          </div>
                        </td>
                      );
                    })}
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openInvoice(row);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-600 text-xs font-semibold hover:bg-blue-200 transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportCSV([row], `Record_${row["Vch No."]}`);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition-colors"
                        >
                          Export
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap justify-between items-center bg-white p-5 rounded-2xl border border-gray-200 shadow-lg">
        <div className="text-sm text-gray-600">
          Showing <span className="font-bold">{filteredData.length}</span> of{" "}
          <span className="font-bold">{data.length}</span> records
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
            disabled={currentPage === 1} 
            className="px-4 py-2.5 rounded-xl bg-gray-100 border border-gray-200 text-gray-600 text-sm font-medium disabled:opacity-50 flex items-center gap-2 hover:bg-gray-200"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={i}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && (
              <span className="text-gray-500 mx-2">...</span>
            )}
          </div>
          
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
            disabled={currentPage === totalPages} 
            className="px-4 py-2.5 rounded-xl bg-gray-100 border border-gray-200 text-gray-600 text-sm font-medium disabled:opacity-50 flex items-center gap-2 hover:bg-gray-200"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
        
        <select
          value={rowsPerPage}
          onChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
          className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={10}>10 rows</option>
          <option value={20}>20 rows</option>
          <option value={50}>50 rows</option>
          <option value={100}>100 rows</option>
        </select>
      </div>
    </div>
  );
}

// === TALLY-STYLE INVOICE MODAL ===
function TallyInvoiceModal({ refObj, row, onClose, printSize, setPrintSize, onPrint, onShare, onCopy }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div 
        ref={refObj} 
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl ring-1 ring-gray-900/10"
      >
        {/* HEADER */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 flex justify-between items-center sticky top-0 z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <FileText size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-white text-xl font-bold">TAX INVOICE</h3>
              <p className="text-gray-300 text-sm">Communication World Infomatic Pvt. Ltd.</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-300 hover:text-white transition-colors bg-white/10 p-2 rounded-full hover:bg-white/20"
          >
            <X size={24} />
          </button>
        </div>

        {/* INVOICE CONTENT */}
        <div className="p-8 bg-white text-gray-900">
          {/* Company Header */}
          <div className="text-center mb-8 border-b-2 border-gray-100 pb-6">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              COMMUNICATION WORLD INFOMATIC PVT. LTD.
            </h1>
            <p className="text-gray-500 mt-2 font-medium">
              123 Business Street, Corporate City, State - 110001
            </p>
            <div className="flex justify-center gap-4 mt-3 text-sm text-gray-600">
              <span>GSTIN: 07AABC1234M1Z5</span>
              <span>•</span>
              <span>PAN: AABC1234M</span>
              <span>•</span>
              <span>Phone: +91-9876543210</span>
            </div>
          </div>

          {/* Invoice Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <h4 className="font-bold text-blue-600 mb-3 text-sm uppercase tracking-wide">Invoice Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Invoice No:</span>
                  <span className="font-bold text-gray-900">{row["Invoice No"] || row["Vch No."] || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Date:</span>
                  <span className="text-gray-900">{row["Date"] || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Voucher Type:</span>
                  <span className="text-gray-900">{row["Voucher Type"] || "Sales"}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
              <h4 className="font-bold text-blue-600 mb-3 text-sm uppercase tracking-wide">Bill To</h4>
              <div className="space-y-1">
                <p className="text-lg font-bold text-gray-900">{row["Party Name"] || "—"}</p>
                <p className="text-gray-600"><span className="font-medium">Group:</span> {row["Party Group"] || "—"}</p>
                <p className="text-gray-600"><span className="font-medium">Area:</span> {row["City/Area"] || "—"}</p>
                <p className="text-gray-600"><span className="font-medium">Salesman:</span> {row["Salesman"] || "—"}</p>
              </div>
            </div>
          </div>

          {/* Item Details Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden mb-8">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700">
                <tr>
                  <th className="py-3 px-4 text-left font-bold">Description</th>
                  <th className="py-3 px-4 text-right font-bold">Quantity</th>
                  <th className="py-3 px-4 text-right font-bold">Rate</th>
                  <th className="py-3 px-4 text-right font-bold">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4">
                    <div className="font-bold text-gray-900">{row["ItemName"] || "—"}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      Category: {row["Item Category"] || "—"} • Group: {row["Item Group"] || "—"}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right text-gray-600">
                    {parseFloat(row["Qty"] || 0).toFixed(2)}
                  </td>
                  <td className="py-4 px-4 text-right text-gray-600">
                    ₹{parseFloat(row["Rate"] || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="py-4 px-4 text-right font-bold text-gray-900">
                    ₹{parseFloat(row["Amount"] || 0).toLocaleString("en-IN")}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full md:w-96 bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">₹{parseFloat(row["Amount"] || 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tax (18%)</span>
                  <span className="font-medium">₹{(parseFloat(row["Amount"] || 0) * 0.18).toLocaleString("en-IN", {maximumFractionDigits: 2})}</span>
                </div>
                <div className="pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg text-gray-900">Grand Total</span>
                    <span className="font-bold text-2xl text-blue-600">
                      ₹{(parseFloat(row["Amount"] || 0) * 1.18).toLocaleString("en-IN", {maximumFractionDigits: 2})}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Narration */}
          {row["Narration"] && (
            <div className="mt-8 bg-yellow-50 border border-yellow-100 rounded-xl p-4">
              <p className="text-sm text-yellow-800">
                <strong className="font-bold">Note:</strong> {row["Narration"]}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-gray-200 text-center text-gray-400 text-sm">
            <p>This is a computer generated invoice. No signature required.</p>
            <p className="mt-1">Thank you for your business!</p>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="bg-gray-50 p-6 border-t border-gray-200 flex flex-wrap gap-4 sticky bottom-0 rounded-b-2xl">
          <select 
            value={printSize} 
            onChange={(e) => setPrintSize(e.target.value)} 
            className="bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="A4">A4 Format</option>
            <option value="A5">A5 Format</option>
            <option value="Thermal">Thermal POS</option>
          </select>
          
          <button 
            onClick={onPrint} 
            className="px-5 py-2.5 rounded-xl bg-gray-800 text-white text-sm font-bold hover:bg-gray-900 transition-colors shadow-sm flex items-center gap-2"
          >
            <Printer size={18} /> Print Invoice
          </button>
          
          <button 
            onClick={onShare} 
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <Share2 size={18} /> Share Invoice
          </button>
          
          <button 
            onClick={onCopy} 
            className="px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <Copy size={18} /> Copy Details
          </button>
          
          <button 
            onClick={onClose} 
            className="ml-auto px-5 py-2.5 rounded-xl border-2 border-gray-300 text-gray-700 bg-white text-sm font-bold hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
