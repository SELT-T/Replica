// frontend/src/pages/Analyst.jsx
// COMPLETE PROFESSIONAL VERSION - Same data as Dashboard + Tally-style billing
// UPDATED: Light Mode, Colorful UI, Item Group Filter

import React, { useEffect, useMemo, useState, useRef } from "react";
import { Line, Doughnut } from "react-chartjs-2";
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

  // DIRECT BACKEND FETCH - SAME AS DASHBOARD (NO DUPLICATES)
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
        const resp = await fetch(vouchersURL);

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
        console.log(`✅ Analyst loaded ${arr.length} vouchers (NO DUPLICATES)`);

        if (!cancelled) {
          const mapped = arr.map((v) => ({
            // 🔑 REQUIRED FOR REPORTS-STYLE FILTERS
            _rawDate: v.date || "",
            "__party_group": v.party_group || "",

            // DISPLAY FIELDS
            "Date": v.date || "",
            "Voucher Number": v.vch_no || "",
            "Voucher No": v.vch_no || "",
            "Vch No.": v.vch_no || "",
            "Invoice No": v.vch_no || "",
            "Voucher Type": v.vch_type || "Sales",
            "Type": v.vch_type || "Sales",
            "Vch Type": v.vch_type || "Sales",

            "Party Name": v.party_name || "N/A",
            "Party": v.party_name || "N/A",
            "Customer": v.party_name || "N/A",
            "Party Group": v.party_group || "N/A",

            "ItemName": v.name_item || "N/A",
            "Item Name": v.name_item || "N/A",
            "Description": v.name_item || "N/A",
            "Narration": v.narration || "",

            "Item Group": v.item_group || "N/A",
            "Item Category": v.item_category || "Sales",
            "Company": v.item_category || "Sales",

            // 🔁 SAME AS REPORTS
            "Salesman": v.party_group || v.salesman || "N/A",

            "City/Area": v.city_area || "N/A",

            "Amount": Number(v.amount) || 0,
            "Net Amount": Number(v.amount) || 0,
            "Qty": Number(v.qty) || 0,
            "Quantity": Number(v.qty) || 0,
            "Rate": Number(v.rate) || 0,
            "Price": Number(v.rate) || 0,
            "Outstanding": 0,
          }));

          // ✅ CLEAN TOTAL / GRAND TOTAL (ONCE ONLY)
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

        const backup = localStorage.getItem("analyst_latest_rows");
        if (backup) {
          try {
            const cached = JSON.parse(backup);
            console.log("📦 Cache:", cached.length);
            setRawData(cached);
            setLastSync("Cached");
          } catch {
            setError("Cache error");
          }
        } else {
          setError("Unable to load analyst data. Check backend.");
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

  const cleanData = useMemo(() => {
    return rawData;
  }, [rawData]);

  // ===== REPORTS STYLE FILTER STATES (EXACT) + ITEM GROUP ADDED =====
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("All");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [partyFilter, setPartyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [itemGroupFilter, setItemGroupFilter] = useState(""); // 🆕 ADDED FILTER
  const [salesmanFilter, setSalesmanFilter] = useState("");
  const [filteredData, setFilteredData] = useState([]);

  const checkDateRange = (dateStr) => {
    if (!dateStr) return false;

    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (dateRange === "All") return true;

    if (dateRange === "Custom") {
      if (!customStart || !customEnd) return true;
      const start = new Date(customStart);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      return d >= start && d <= end;
    }

    if (dateRange === "Today")
      return d.toDateString() === today.toDateString();

    if (dateRange === "Yesterday") {
      const y = new Date(today);
      y.setDate(today.getDate() - 1);
      return d.toDateString() === y.toDateString();
    }

    if (dateRange === "This Week") {
      const firstDay = new Date(today);
      const day = firstDay.getDay() || 7;
      if (day !== 1) firstDay.setDate(firstDay.getDate() - (day - 1));
      firstDay.setHours(0, 0, 0, 0);
      return d >= firstDay && d <= new Date(today.setHours(23, 59, 59, 999));
    }

    if (dateRange === "This Month")
      return d.getMonth() === today.getMonth() &&
             d.getFullYear() === today.getFullYear();

    if (dateRange === "Last Month") {
      const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return d.getMonth() === lm.getMonth() &&
             d.getFullYear() === lm.getFullYear();
    }

    if (dateRange === "This Year")
      return d.getFullYear() === today.getFullYear();

    if (dateRange === "Last Year")
      return d.getFullYear() === today.getFullYear() - 1;

    return true;
  };

  useEffect(() => {
    let rows = [...cleanData];

    // 🔐 FRONTEND LOCKS (SAME AS REPORTS)
    try {
      if (user) {
        if (
          user.companyLockEnabled &&
          Array.isArray(user.allowedCompanies) &&
          user.allowedCompanies.length
        ) {
          rows = rows.filter(r =>
            user.allowedCompanies.includes(r["Item Category"])
          );
        }

        if (
          user.partyLockEnabled &&
          Array.isArray(user.allowedPartyGroups) &&
          user.allowedPartyGroups.length
        ) {
          rows = rows.filter(r =>
            user.allowedPartyGroups.includes(r["__party_group"])
          );
        }
      }
    } catch {}

    // 1️⃣ DATE FILTER
    rows = rows.filter(r => checkDateRange(r._rawDate));

    // 2️⃣ SEARCH
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter(r =>
        Object.values(r).some(v =>
          String(v || "").toLowerCase().includes(s)
        )
      );
    }

    // 3️⃣ DROPDOWNS
    if (partyFilter)
      rows = rows.filter(r => r["Party Name"] === partyFilter);

    if (categoryFilter)
      rows = rows.filter(r => r["Item Category"] === categoryFilter);

    // 🆕 ITEM GROUP FILTER LOGIC
    if (itemGroupFilter)
      rows = rows.filter(r => r["Item Group"] === itemGroupFilter);

    if (salesmanFilter)
      rows = rows.filter(r => r["Salesman"] === salesmanFilter);

    setFilteredData(rows);
    setCurrentPage(1);
  }, [
    cleanData,
    user,
    search,
    dateRange,
    customStart,
    customEnd,
    partyFilter,
    categoryFilter,
    itemGroupFilter, // 🆕 DEPENDENCY
    salesmanFilter
  ]);


  const metrics = useMemo(() => {
    let totalSales = 0;
    const partySet = new Set();
    const inventorySet = new Set();
    let billingCount = 0;

    (filteredData || []).forEach((r) => {
      const amt = parseFloat(r["Amount"]) || 0;
      totalSales += amt;

      const party = r["Party Name"] || r["Customer"] || "";
      if (party) partySet.add(party);

      const item = r["ItemName"] || r["Item Name"] || "";
      if (item) inventorySet.add(item);

      const vchType = String(r["Voucher Type"] || "").toLowerCase();
      if (vchType.includes("sales") || vchType.includes("invoice")) {
        billingCount += 1;
      }
    });

    return {
      totalSales,
      partyCount: partySet.size,
      inventoryCount: inventorySet.size,
      billingCount
    };
  }, [filteredData]);


  const monthlySales = useMemo(() => {
    const m = {};
    (filteredData || []).forEach((r) => {
      const dstr = r["Date"] || "";
      let key = "Unknown";
      
      if (dstr) {
        const parts = String(dstr).split(/[-\/]/);
        if (parts.length >= 3) {
          if (parts[0].length === 4) {
            key = `${parts[0]}-${parts[1].padStart(2, "0")}`;
          } else {
            key = `${parts[2]}-${parts[1].padStart(2, "0")}`;
          }
        }
      }
      
      const amt = parseFloat(r["Amount"]) || 0;
      m[key] = (m[key] || 0) + amt;
    });
    
    const ordered = Object.keys(m).sort();
    return { labels: ordered, values: ordered.map((k) => m[k]) };
  }, [filteredData]);

  const companySplit = useMemo(() => {
    const map = {};
    (filteredData || []).forEach((r) => {
      const c = r["Company"] || r["Item Category"] || "Unknown";
      const amt = parseFloat(r["Amount"]) || 0;
      map[c] = (map[c] || 0) + amt;
    });
    return { labels: Object.keys(map), values: Object.values(map) };
  }, [filteredData]);

  const topEntities = useMemo(() => {
    const prod = {};
    const cust = {};
    
    (filteredData || []).forEach((r) => {
      const item = r["ItemName"] || "Unknown";
      const party = r["Party Name"] || "Unknown";
      const amt = parseFloat(r["Amount"]) || 0;
      
      prod[item] = (prod[item] || 0) + amt;
      cust[party] = (cust[party] || 0) + amt;
    });
    
    const topProducts = Object.entries(prod).sort((a, b) => b[1] - a[1]).slice(0, 25);
    const topCustomers = Object.entries(cust).sort((a, b) => b[1] - a[1]).slice(0, 25);
    
    return { topProducts, topCustomers };
  }, [filteredData]);

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

  const monthlyChartData = {
    labels: monthlySales.labels,
    datasets: [{
      label: "Monthly Sales",
      data: monthlySales.values,
      borderColor: "#3B82F6", // Bright Blue
      backgroundColor: "rgba(59, 130, 246, 0.2)",
      fill: true,
      tension: 0.4,
    }],
  };

  const companyPie = {
    labels: companySplit.labels,
    datasets: [{
      data: companySplit.values,
      backgroundColor: [
        "#3B82F6", // Blue
        "#10B981", // Emerald
        "#F59E0B", // Amber
        "#EF4444", // Red
        "#8B5CF6", // Violet
        "#EC4899", // Pink
        "#6366F1", // Indigo
        "#14B8A6", // Teal
        "#F97316", // Orange
        "#06B6D4"  // Cyan
      ],
      borderWidth: 1,
      borderColor: "#ffffff"
    }],
  };

  // LOADING STATE (Light)
  if (loading)
    return (
      <div className="h-screen flex items-center justify-center text-blue-600 bg-gray-50">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-3" size={32} />
          <p className="text-sm font-medium text-gray-600">Loading analyst data...</p>
        </div>
      </div>
    );

  // ERROR STATE (Light)
  if (error)
    return (
      <div className="h-screen p-6 bg-gray-50 text-gray-800 flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center bg-white p-6 rounded-xl shadow-lg border border-red-100">
          <h2 className="text-2xl text-red-500 font-bold mb-3">⚠️ Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-md transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );

  // NO DATA STATE (Light)
  if (!cleanData.length)
    return (
      <div className="h-screen p-6 bg-gray-50 text-gray-800 flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl text-gray-800 font-bold mb-3">📊 No Data Found</h2>
          <p className="text-sm text-gray-500 mb-4">Check backend API connection</p>
        </div>
      </div>
    );

  // MAIN RENDER - COLORFUL LIGHT MODE
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-2 sm:p-4">
      <div className="max-w-[1500px] mx-auto space-y-4">
        
        {/* HEADER CARD - White with Shadow */}
        <div className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <FileSpreadsheet size={24} />
             </div>
             <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
                    ANALYST DASHBOARD
                </h1>
                <p className="text-xs text-gray-500 flex items-center gap-2">
                    {filteredData.length} records found
                    {lastSync && (
                      <span className="hidden sm:inline-block px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[10px]">
                        Synced: {new Date(lastSync).toLocaleTimeString()}
                      </span>
                    )}
                </p>
             </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAutoRefresh((s) => !s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-2 transition-all ${
                autoRefresh 
                  ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <RefreshCw size={14} className={autoRefresh ? "animate-spin" : ""} />
              {autoRefresh ? "Auto Sync On" : "Auto Sync Off"}
            </button>
            
            <button
              onClick={() => {
                if (confirm("Clear cache and reload?")) {
                  localStorage.removeItem("analyst_latest_rows");
                  window.location.reload();
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-100 text-xs font-medium hover:bg-red-100 transition-colors"
            >
              Clear Cache
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS - Colorful Active State */}
        <div className="bg-white rounded-xl p-2 border border-gray-100 shadow-sm overflow-x-auto">
          <div className="flex flex-nowrap gap-2 min-w-max">
            {[
              { key: "dashboard", label: "Dashboard", icon: "📊" },
              { key: "masters", label: "Masters", icon: "📋" },
              { key: "transactions", label: "Transactions", icon: "💰" },
              { key: "reports", label: "Reports", icon: "📈" },
              { key: "party", label: "Party Analysis", icon: "👥" },
              { key: "inventory", label: "Inventory", icon: "📦" },
              { key: "alldata", label: "All Data", icon: "📄" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveSection(tab.key);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeSection === tab.key
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md transform scale-105"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent hover:border-gray-200"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* FILTERS BAR - COMPACT ONE LINE */}
        <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
           <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 flex-1 min-w-[150px] max-w-[250px]">
                 <Filter size={14} className="text-gray-400" />
                 <input
                    placeholder="Search anything..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-transparent text-sm w-full outline-none text-gray-700 placeholder:text-gray-400"
                 />
                 {search && <X size={14} className="cursor-pointer text-gray-400 hover:text-red-500" onClick={() => setSearch("")} />}
              </div>

              {/* DATE RANGE */}
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-xs sm:text-sm rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option>Today</option>
                <option>Yesterday</option>
                <option>This Week</option>
                <option>This Month</option>
                <option>Last Month</option>
                <option>This Year</option>
                <option>All</option>
                <option>Custom</option>
              </select>

              {dateRange === "Custom" && (
                <>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-1.5"
                  />
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-1.5"
                  />
                </>
              )}

              {/* PARTY FILTER */}
              <select
                value={partyFilter}
                onChange={(e) => setPartyFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-xs sm:text-sm rounded-lg px-2 py-1.5 max-w-[140px] truncate focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Parties</option>
                {[...new Set(cleanData.map(r => r["Party Name"]).filter(Boolean))]
                  .sort()
                  .map(p => (
                    <option key={p} value={p}>{p}</option>
                ))}
              </select>

              {/* CATEGORY FILTER */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-xs sm:text-sm rounded-lg px-2 py-1.5 max-w-[140px] truncate focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Categories</option>
                {[...new Set(cleanData.map(r => r["Item Category"]).filter(Boolean))]
                  .sort()
                  .map(c => (
                    <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* 🆕 ITEM GROUP FILTER (New Requirement) */}
              <select
                value={itemGroupFilter}
                onChange={(e) => setItemGroupFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-xs sm:text-sm rounded-lg px-2 py-1.5 max-w-[140px] truncate focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Item Groups</option>
                {[...new Set(cleanData.map(r => r["Item Group"]).filter(Boolean))]
                  .sort()
                  .map(g => (
                    <option key={g} value={g}>{g}</option>
                ))}
              </select>

              {/* SALESMAN FILTER */}
              <select
                value={salesmanFilter}
                onChange={(e) => setSalesmanFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-xs sm:text-sm rounded-lg px-2 py-1.5 max-w-[140px] truncate focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">All Salesmen</option>
                {[...new Set(cleanData.map(r => r["Salesman"]).filter(Boolean))]
                  .sort()
                  .map(s => (
                    <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <div className="ml-auto">
                <button
                  onClick={() => exportCSV(filteredData.slice(0, 5000), "AnalystExport")}
                  className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 text-xs font-semibold flex items-center gap-1 hover:bg-green-100 transition-colors"
                >
                  <Download size={14} />
                  Export
                </button>
              </div>
           </div>
        </div>

        {/* MAIN CONTENT AREA */}
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
            <MastersSection 
              data={cleanData} 
              openInvoice={openInvoice} 
            />
          )}
          
          {activeSection === "transactions" && (
            <TransactionsSection 
              data={filteredData} 
              openInvoice={openInvoice} 
              exportCSV={exportCSV} 
            />
          )}
          
          {activeSection === "reports" && (
            <ReportsSection 
              data={filteredData} 
              exportCSV={exportCSV} 
            />
          )}
          
          {activeSection === "party" && (
            <PartySection 
              data={filteredData} 
              openInvoice={openInvoice} 
            />
          )}
          
          {activeSection === "inventory" && (
            <InventorySection 
              data={filteredData} 
            />
          )}
          
          {activeSection === "alldata" && (
            <AllDataSection 
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

      {/* TALLY-STYLE INVOICE MODAL */}
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

// ==========================================
// DASHBOARD SECTION
// ==========================================
function DashboardSection({ metrics, monthlyChartData, companyPie, topProducts, topCustomers, data, openInvoice, formatINR }) {
  return (
    <div className="space-y-4">
      {/* METRICS CARDS - COLORFUL */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard title="Total Sales" value={formatINR(metrics.totalSales)} color="blue" icon="💰" />
        <MetricCard title="Party Count" value={metrics.partyCount} color="green" icon="👥" />
        <MetricCard title="Inventory Count" value={metrics.inventoryCount} color="orange" icon="📦" />
        <MetricCard title="Billing Count" value={metrics.billingCount} color="purple" icon="🧾" />
      </div>

      {/* CHARTS ROW */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="col-span-2 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-gray-800 text-sm font-bold flex items-center gap-2">
               <span className="w-2 h-4 bg-blue-600 rounded-full"></span>
               Monthly Sales Trend
             </h3>
          </div>
          <div className="h-64">
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
        
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-gray-800 text-sm font-bold flex items-center gap-2">
               <span className="w-2 h-4 bg-purple-600 rounded-full"></span>
               Company Split
             </h3>
          </div>
          <div className="h-64">
            <Doughnut 
              data={companyPie} 
              options={{ 
                maintainAspectRatio: false,
                responsive: true,
                plugins: { 
                  legend: { 
                    position: 'bottom',
                    labels: { 
                      color: "#475569",
                      padding: 15,
                      font: { size: 11 },
                      usePointStyle: true,
                    } 
                  } 
                } 
              }} 
            />
          </div>
        </div>
      </div>

      {/* TOP LISTS */}
      <div className="grid md:grid-cols-2 gap-4">
        <ListBox title="🏆 Top Products" items={topProducts} color="indigo" />
        <ListBox title="👥 Top Customers" items={topCustomers} color="emerald" />
      </div>

      {/* RECENT TRANSACTIONS */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <h3 className="text-gray-800 mb-4 text-sm font-bold flex items-center gap-2">
            <span className="w-2 h-4 bg-orange-500 rounded-full"></span>
            Recent Transactions
        </h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-xs text-gray-700">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 font-semibold uppercase">
              <tr>
                <th className="text-left py-3 px-4">Vch No</th>
                <th className="text-left py-3 px-4 hidden sm:table-cell">Date</th>
                <th className="text-left py-3 px-4">Party</th>
                <th className="text-right py-3 px-4">Amount</th>
                <th className="text-right py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.slice(0, 10).map((r, i) => {
                const inv = r["Vch No."] || "—";
                const date = r["Date"] || "—";
                const party = r["Party Name"] || "—";
                const amount = parseFloat(r["Amount"]) || 0;
                
                return (
                  <tr 
                    key={i} 
                    className="hover:bg-blue-50 transition-colors cursor-pointer"
                    onClick={() => openInvoice(r)}
                  >
                    <td className="py-2.5 px-4 font-medium text-gray-900 truncate max-w-[100px]">{inv}</td>
                    <td className="py-2.5 px-4 text-gray-500 hidden sm:table-cell">{date}</td>
                    <td className="py-2.5 px-4 truncate max-w-[150px]">{party}</td>
                    <td className="text-right py-2.5 px-4 font-bold text-gray-800">
                      ₹{Number(amount).toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openInvoice(r);
                        }}
                        className="p-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                      >
                        <Eye size={14} />
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

function MetricCard({ title, value, color, icon }) {
  const colors = {
    blue: "bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-200",
    green: "bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-200",
    orange: "bg-gradient-to-br from-orange-500 to-orange-600 shadow-orange-200",
    purple: "bg-gradient-to-br from-purple-500 to-purple-600 shadow-purple-200",
    red: "bg-gradient-to-br from-red-500 to-red-600 shadow-red-200",
  };
  
  return (
    <div className={`${colors[color]} p-4 rounded-xl shadow-lg text-white transform hover:scale-105 transition-transform duration-200`}>
      <div className="flex justify-between items-start">
        <div className="text-xs font-medium opacity-90 uppercase tracking-wide">{title}</div>
        <span className="opacity-80 text-lg">{icon}</span>
      </div>
      <div className="text-xl sm:text-2xl font-bold mt-2 tracking-tight">{value}</div>
    </div>
  );
}

function ListBox({ title, items = [], color }) {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
      <h3 className="text-gray-800 mb-4 text-sm font-bold flex items-center gap-2">
         <span className={`w-2 h-4 rounded-full ${color === 'indigo' ? 'bg-indigo-600' : 'bg-emerald-600'}`}></span>
         {title}
      </h3>
      <ul className="text-sm text-gray-600 space-y-2 max-h-64 overflow-auto pr-2 custom-scrollbar">
        {items.map(([name, amt], i) => (
          <li key={i} className="flex justify-between items-center border-b border-gray-50 pb-2 hover:bg-gray-50 rounded px-2 transition-colors">
            <span className="truncate max-w-[200px] flex gap-2 items-center">
                <span className="w-5 h-5 flex items-center justify-center bg-gray-100 rounded-full text-xs font-bold text-gray-500">{i + 1}</span>
                {name}
            </span>
            <span className="font-semibold text-gray-800">₹{(amt || 0).toLocaleString("en-IN")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ==========================================
// OTHER SECTIONS
// ==========================================
function MastersSection({ data, openInvoice }) {
  const parties = [...new Set(data.map(r => r["Party Name"]))].filter(p => p !== "N/A").sort();
  const items = [...new Set(data.map(r => r["ItemName"]))].filter(i => i !== "N/A").sort();
  
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="text-gray-800 mb-4 text-sm font-bold flex items-center gap-2">
            <span className="p-1 bg-blue-100 rounded text-blue-600"><Filter size={14}/></span>
            Parties Directory ({parties.length})
        </h3>
        <ul className="text-sm text-gray-600 space-y-1 max-h-[500px] overflow-auto pr-2">
          {parties.map((p, i) => (
            <li key={i} className="py-2 px-3 border-b border-gray-50 hover:bg-blue-50 rounded transition-colors flex gap-2">
                <span className="text-gray-400 text-xs w-6">{i + 1}.</span> {p}
            </li>
          ))}
        </ul>
      </div>
      
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <h3 className="text-gray-800 mb-4 text-sm font-bold flex items-center gap-2">
            <span className="p-1 bg-orange-100 rounded text-orange-600"><Filter size={14}/></span>
            Item Master ({items.length})
        </h3>
        <ul className="text-sm text-gray-600 space-y-1 max-h-[500px] overflow-auto pr-2">
          {items.map((it, i) => (
            <li key={i} className="py-2 px-3 border-b border-gray-50 hover:bg-orange-50 rounded transition-colors truncate flex gap-2">
                <span className="text-gray-400 text-xs w-6">{i + 1}.</span> {it}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TransactionsSection({ data, openInvoice, exportCSV }) {
  const [page, setPage] = useState(1);
  const perPage = 25;
  const pages = Math.max(1, Math.ceil(data.length / perPage));
  const pageData = data.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-gray-800 font-bold flex items-center gap-2">
            <span className="w-2 h-5 bg-green-500 rounded-full"></span>
            Transactions Log ({data.length})
        </h3>
        <button 
          onClick={() => exportCSV(data, "Transactions")} 
          className="px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-semibold flex items-center gap-1 hover:bg-green-100"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>
      
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs text-gray-700">
          <thead className="bg-gray-100 text-gray-800 font-semibold sticky top-0">
            <tr>
              <th className="text-left py-3 px-3">Vch No</th>
              <th className="text-left py-3 px-3 hidden sm:table-cell">Date</th>
              <th className="text-left py-3 px-3">Party</th>
              <th className="text-right py-3 px-3">Amount</th>
              <th className="text-right py-3 px-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageData.map((r, i) => (
              <tr 
                key={i} 
                className="hover:bg-blue-50 transition-colors cursor-pointer"
                onClick={() => openInvoice(r)}
              >
                <td className="py-2 px-3 font-medium truncate max-w-[100px]">{r["Vch No."] || "—"}</td>
                <td className="py-2 px-3 text-gray-500 hidden sm:table-cell">{r["Date"] || "—"}</td>
                <td className="py-2 px-3 truncate max-w-[180px]">{r["Party Name"] || "—"}</td>
                <td className="text-right py-2 px-3 font-bold text-gray-800">
                  ₹{(r["Amount"] || 0).toLocaleString("en-IN")}
                </td>
                <td className="py-2 px-3 text-right">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      openInvoice(r);
                    }} 
                    className="px-2 py-1 rounded bg-blue-100 text-blue-600 text-xs hover:bg-blue-200 font-medium"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="flex justify-between items-center mt-4">
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))} 
          disabled={page === 1} 
          className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <span className="text-xs font-medium text-gray-500">Page {page} of {pages}</span>
        <button 
          onClick={() => setPage(p => Math.min(pages, p + 1))} 
          disabled={page === pages} 
          className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200 disabled:opacity-50 flex items-center gap-1"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function ReportsSection({ data, exportCSV }) {
  const salesData = data.filter(r => {
    const type = String(r["Type"] || "").toLowerCase();
    return type.includes("sales") || type.includes("invoice");
  });
  
  const purchaseData = data.filter(r => {
    const type = String(r["Type"] || "").toLowerCase();
    return type.includes("purchase");
  });
  
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
      <h3 className="text-gray-800 mb-6 text-lg font-bold flex items-center gap-2">
         <span className="w-2 h-6 bg-purple-600 rounded-full"></span>
         Reports Center
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 hover:shadow-md transition-shadow">
            <h4 className="font-semibold text-blue-800 mb-2">Full Data Dump</h4>
            <p className="text-xs text-blue-600 mb-4">Export all {data.length} records available in current view.</p>
            <button 
              onClick={() => exportCSV(data, "AllData")} 
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow"
            >
              Export CSV
            </button>
        </div>

        <div className="bg-green-50 p-4 rounded-xl border border-green-100 hover:shadow-md transition-shadow">
            <h4 className="font-semibold text-green-800 mb-2">Sales Register</h4>
            <p className="text-xs text-green-600 mb-4">Export only sales transactions ({salesData.length} records).</p>
            <button 
              onClick={() => exportCSV(salesData, "SalesRegister")} 
              className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 shadow"
            >
              Export Sales
            </button>
        </div>

        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 hover:shadow-md transition-shadow">
            <h4 className="font-semibold text-orange-800 mb-2">Purchase Register</h4>
            <p className="text-xs text-orange-600 mb-4">Export only purchase transactions ({purchaseData.length} records).</p>
            <button 
              onClick={() => exportCSV(purchaseData, "PurchaseRegister")} 
              className="w-full py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 shadow"
            >
              Export Purchases
            </button>
        </div>
      </div>
    </div>
  );
}

function PartySection({ data, openInvoice }) {
  const partyData = useMemo(() => {
    const map = {};
    data.forEach(r => {
      const p = r["Party Name"] || "Unknown";
      const amt = parseFloat(r["Amount"]) || 0;
      if (!map[p]) map[p] = { total: 0, count: 0 };
      map[p].total += amt;
      map[p].count += 1;
    });
    return Object.entries(map).map(([name, info]) => ({ name, ...info })).sort((a, b) => b.total - a.total);
  }, [data]);

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
      <h3 className="text-gray-800 mb-4 text-sm font-bold flex items-center gap-2">
         <span className="p-1 bg-indigo-100 rounded text-indigo-600"><Filter size={14}/></span>
         Party Ledger Summary
      </h3>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs text-gray-700">
          <thead className="bg-indigo-50 text-indigo-900 font-semibold uppercase">
            <tr>
              <th className="text-left py-3 px-4">Party Name</th>
              <th className="text-right py-3 px-4">Trans Count</th>
              <th className="text-right py-3 px-4">Total Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {partyData.map((p, i) => (
              <tr key={i} className="hover:bg-indigo-50 transition-colors">
                <td className="py-2.5 px-4 font-medium truncate max-w-[200px]">{p.name}</td>
                <td className="text-right py-2.5 px-4 text-gray-500">{p.count}</td>
                <td className="text-right py-2.5 px-4 font-bold text-gray-800">
                  ₹{p.total.toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InventorySection({ data }) {
  const inv = useMemo(() => {
    const map = {};
    data.forEach(r => {
      const item = r["ItemName"] || "Unknown";
      const qty = parseFloat(r["Qty"]) || 0;
      const amt = parseFloat(r["Amount"]) || 0;
      if (!map[item]) map[item] = { qty: 0, value: 0 };
      map[item].qty += qty;
      map[item].value += amt;
    });
    return Object.entries(map).map(([name, info]) => ({ name, ...info })).sort((a, b) => b.value - a.value);
  }, [data]);

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
      <h3 className="text-gray-800 mb-4 text-sm font-bold flex items-center gap-2">
         <span className="p-1 bg-orange-100 rounded text-orange-600"><Filter size={14}/></span>
         Inventory Summary
      </h3>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-xs text-gray-700">
          <thead className="bg-orange-50 text-orange-900 font-semibold uppercase">
            <tr>
              <th className="text-left py-3 px-4">Item Name</th>
              <th className="text-right py-3 px-4">Total Qty</th>
              <th className="text-right py-3 px-4">Total Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {inv.map((item, i) => (
              <tr key={i} className="hover:bg-orange-50 transition-colors">
                <td className="py-2.5 px-4 font-medium truncate max-w-[250px]">{item.name}</td>
                <td className="text-right py-2.5 px-4 text-gray-600 bg-gray-50">{item.qty.toFixed(2)}</td>
                <td className="text-right py-2.5 px-4 font-bold text-gray-800">
                  ₹{item.value.toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AllDataSection({ data, exportCSV, currentPage, setCurrentPage, rowsPerPage, openInvoice }) {
  const importantColumns = [
    "Date",
    "Vch No.",
    "Party Name",
    "ItemName",
    "Item Group", // Shown in All Data for verification
    "Company",
    "Qty",
    "Amount"
  ];

  const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return data.slice(start, start + rowsPerPage);
  }, [data, currentPage, rowsPerPage]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-gray-800 font-bold flex items-center gap-2">
            <span className="w-2 h-5 bg-blue-600 rounded-full"></span>
            Comprehensive Data View
        </h3>
        <button 
          onClick={() => exportCSV(data, "AllData")} 
          className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold flex items-center gap-1 hover:bg-blue-100"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
          <table className="w-full text-xs text-gray-700 relative">
            <thead className="bg-gradient-to-r from-gray-800 to-gray-700 text-white font-medium sticky top-0 z-10 shadow-md">
              <tr>
                <th className="text-left py-3 px-3 sticky left-0 bg-gray-800 z-20 min-w-[40px] border-r border-gray-600">#</th>
                {importantColumns.map((col, idx) => (
                  <th 
                    key={idx} 
                    className={`text-left py-3 px-3 whitespace-nowrap ${
                      col === "Amount" || col === "Qty" ? "text-right" : ""
                    }`}
                  >
                    {col}
                  </th>
                ))}
                <th className="text-right py-3 px-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedData.map((row, rowIdx) => (
                <tr 
                  key={rowIdx} 
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => openInvoice(row)}
                >
                  <td className="py-2.5 px-3 sticky left-0 bg-gray-50 font-bold text-gray-500 border-r border-gray-200 z-10">
                    {(currentPage - 1) * rowsPerPage + rowIdx + 1}
                  </td>
                  {importantColumns.map((col, colIdx) => {
                    const value = row[col];
                    let displayValue = value === null || value === undefined ? "—" : String(value);
                    
                    if (col === "Amount") {
                      const num = parseFloat(value) || 0;
                      displayValue = num.toLocaleString("en-IN");
                    }
                    
                    if (col === "Qty") {
                      const num = parseFloat(value) || 0;
                      displayValue = num.toFixed(2);
                    }
                    
                    return (
                      <td 
                        key={colIdx} 
                        className={`py-2.5 px-3 ${
                          col === "Amount" ? "text-right font-bold text-gray-800" : ""
                        } ${
                          col === "Qty" ? "text-right text-gray-600" : ""
                        }`}
                        title={displayValue}
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
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openInvoice(row);
                      }}
                      className="p-1 rounded bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                    >
                      <Eye size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
        <button 
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
          disabled={currentPage === 1} 
          className="px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-600 text-xs font-medium disabled:opacity-50 flex items-center gap-1 hover:bg-gray-200"
        >
          <ChevronLeft size={14} /> Previous
        </button>
        <span className="text-xs font-semibold text-gray-600">
          Page {currentPage} of {totalPages}
        </span>
        <button 
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
          disabled={currentPage === totalPages} 
          className="px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-600 text-xs font-medium disabled:opacity-50 flex items-center gap-1 hover:bg-gray-200"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ==========================================
// TALLY-STYLE INVOICE MODAL (Mostly same structure, just refined visuals)
// ==========================================
function TallyInvoiceModal({ refObj, row, onClose, printSize, setPrintSize, onPrint, onShare, onCopy }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div 
        ref={refObj} 
        className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl ring-1 ring-gray-900/5"
      >
        {/* HEADER */}
        <div className="bg-gray-900 p-4 flex justify-between items-center sticky top-0 z-10 rounded-t-xl">
          <h3 className="text-white text-lg font-bold flex items-center gap-2">
            <FileText size={20} className="text-blue-400" />
            TAX INVOICE VIEW
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors bg-white/10 p-1 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* INVOICE CONTENT - TALLY STYLE */}
        <div className="p-6 sm:p-8 bg-white text-gray-900 print:p-0">
          {/* Company Header */}
          <div className="text-center mb-6 border-b-2 border-gray-100 pb-4">
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
              COMMUNICATION WORLD INFOMATIC PVT. LTD.
            </h1>
            <p className="text-sm text-gray-500 mt-1 font-medium">
              Business Intelligence • Data Solutions • ERP Integration
            </p>
          </div>

          {/* Invoice Details Grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 mb-6 text-sm bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">Invoice No:</span>
              <span className="text-gray-900 font-bold">{row["Invoice No"] || row["Vch No."] || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">Date:</span>
              <span className="text-gray-900">{row["Date"] || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">Type:</span>
              <span className="text-gray-900">{row["Voucher Type"] || "Sales"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-gray-600">Salesman:</span>
              <span className="text-gray-900">{row["Salesman"] || "—"}</span>
            </div>
          </div>

          {/* Party Details */}
          <div className="border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
            <h4 className="font-bold text-sm text-blue-600 mb-2 uppercase tracking-wide">Bill To</h4>
            <div className="grid gap-1">
                <p className="text-base font-bold text-gray-800">{row["Party Name"] || "—"}</p>
                <p className="text-sm text-gray-500"><span className="font-medium">Group:</span> {row["Party Group"] || "—"}</p>
                <p className="text-sm text-gray-500"><span className="font-medium">Location:</span> {row["City/Area"] || "—"}</p>
            </div>
          </div>

          {/* Item Details Table */}
          <table className="w-full border border-gray-200 mb-6 text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold">#</th>
                <th className="border-b border-gray-200 px-3 py-2 text-left font-semibold">Item Description</th>
                <th className="border-b border-gray-200 px-3 py-2 text-right font-semibold">Qty</th>
                <th className="border-b border-gray-200 px-3 py-2 text-right font-semibold">Rate</th>
                <th className="border-b border-gray-200 px-3 py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="px-3 py-3 text-gray-500 align-top">1</td>
                <td className="px-3 py-3 align-top">
                  <div className="font-bold text-gray-800">{row["ItemName"] || "—"}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Category: {row["Item Category"] || "—"} • Group: {row["Item Group"] || "—"}
                  </div>
                </td>
                <td className="px-3 py-3 text-right align-top text-gray-600">
                  {parseFloat(row["Qty"] || 0).toFixed(2)}
                </td>
                <td className="px-3 py-3 text-right align-top text-gray-600">
                  ₹{parseFloat(row["Rate"] || 0).toLocaleString("en-IN")}
                </td>
                <td className="px-3 py-3 text-right align-top font-bold text-gray-900">
                  ₹{parseFloat(row["Amount"] || 0).toLocaleString("en-IN")}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-full sm:w-72 bg-gray-50 rounded-lg p-4 border border-gray-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Subtotal</span>
                <span className="text-sm font-medium">₹{parseFloat(row["Amount"] || 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                <span className="font-bold text-gray-800">Grand Total</span>
                <span className="font-bold text-xl text-blue-600">₹{parseFloat(row["Amount"] || 0).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Narration */}
          {row["Narration"] && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 mb-6">
              <p className="text-xs text-yellow-800"><strong>Note:</strong> {row["Narration"]}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 pt-4 border-t border-gray-100">
            <p>Computer generated invoice.</p>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="bg-gray-50 p-4 border-t border-gray-200 flex flex-wrap gap-3 sticky bottom-0 rounded-b-xl">
          <select 
            value={printSize} 
            onChange={(e) => setPrintSize(e.target.value)} 
            className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="A4">A4 Format</option>
            <option value="A5">A5 Format</option>
            <option value="Thermal">Thermal POS</option>
          </select>
          
          <button 
            onClick={onPrint} 
            className="px-4 py-2 rounded-lg bg-gray-800 text-white text-sm font-semibold flex items-center gap-2 hover:bg-gray-900 transition-colors shadow-sm"
          >
            <Printer size={16} /> Print
          </button>
          
          <button 
            onClick={onShare} 
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Share2 size={16} /> Share
          </button>
          
          <button 
            onClick={onCopy} 
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold flex items-center gap-2 hover:bg-green-700 transition-colors shadow-sm"
          >
            <Copy size={16} /> Copy
          </button>
          
          <button 
            onClick={onClose} 
            className="ml-auto px-4 py-2 rounded-lg border border-gray-300 text-gray-700 bg-white text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
