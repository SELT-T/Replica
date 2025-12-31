// frontend/src/pages/Analyst.jsx
// COMPLETE PROFESSIONAL VERSION - White Theme + Premium UI + New Filters

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
  Search,
  Calendar,
  Users,
  Box,
  LayoutDashboard,
  FileBarChart,
  List,
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
        const backendURL =
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1"
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
            __party_group: v.party_group || "",

            // DISPLAY FIELDS
            Date: v.date || "",
            "Voucher Number": v.vch_no || "",
            "Voucher No": v.vch_no || "",
            "Vch No.": v.vch_no || "",
            "Invoice No": v.vch_no || "",
            "Voucher Type": v.vch_type || "Sales",
            Type: v.vch_type || "Sales",
            "Vch Type": v.vch_type || "Sales",

            "Party Name": v.party_name || "N/A",
            Party: v.party_name || "N/A",
            Customer: v.party_name || "N/A",
            "Party Group": v.party_group || "N/A",

            ItemName: v.name_item || "N/A",
            "Item Name": v.name_item || "N/A",
            Description: v.name_item || "N/A",
            Narration: v.narration || "",

            "Item Group": v.item_group || "N/A",
            "Item Category": v.item_category || "Sales",
            Company: v.item_category || "Sales",

            // 🔁 SAME AS REPORTS
            Salesman: v.party_group || v.salesman || "N/A",

            "City/Area": v.city_area || "N/A",

            Amount: Number(v.amount) || 0,
            "Net Amount": Number(v.amount) || 0,
            Qty: Number(v.qty) || 0,
            Quantity: Number(v.qty) || 0,
            Rate: Number(v.rate) || 0,
            Price: Number(v.rate) || 0,
            Outstanding: 0,
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
          localStorage.setItem(
            "analyst_latest_rows",
            JSON.stringify(cleaned)
          );
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
          setError(
            "Unable to load analyst data. Check backend: https://selt-t-backend.selt-3232.workers.dev"
          );
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

  // ===== REPORTS STYLE FILTER STATES (EXACT) =====
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("All");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [partyFilter, setPartyFilter] = useState("");
  const [itemGroupFilter, setItemGroupFilter] = useState(""); // NEW FILTER
  const [categoryFilter, setCategoryFilter] = useState("");
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
      return (
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );

    if (dateRange === "Last Month") {
      const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return (
        d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear()
      );
    }

    if (dateRange === "This Year") return d.getFullYear() === today.getFullYear();

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
          rows = rows.filter((r) =>
            user.allowedCompanies.includes(r["Item Category"])
          );
        }

        if (
          user.partyLockEnabled &&
          Array.isArray(user.allowedPartyGroups) &&
          user.allowedPartyGroups.length
        ) {
          rows = rows.filter((r) =>
            user.allowedPartyGroups.includes(r["__party_group"])
          );
        }
      }
    } catch {}

    // 1️⃣ DATE FILTER (🔥 MAIN FIX)
    rows = rows.filter((r) => checkDateRange(r._rawDate));

    // 2️⃣ SEARCH
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter((r) =>
        Object.values(r).some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(s)
        )
      );
    }

    // 3️⃣ DROPDOWNS
    if (partyFilter)
      rows = rows.filter((r) => r["Party Name"] === partyFilter);

    if (itemGroupFilter)
      rows = rows.filter((r) => r["Item Group"] === itemGroupFilter);

    if (categoryFilter)
      rows = rows.filter((r) => r["Item Category"] === categoryFilter);

    if (salesmanFilter)
      rows = rows.filter((r) => r["Salesman"] === salesmanFilter);

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
    itemGroupFilter,
    categoryFilter,
    salesmanFilter,
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
      billingCount,
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

    const topProducts = Object.entries(prod)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25);
    const topCustomers = Object.entries(cust)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25);

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
      const wa = `https://api.whatsapp.com/send?text=${encodeURIComponent(
        text
      )}`;
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

  // Updated Chart Colors for White Theme
  const monthlyChartData = {
    labels: monthlySales.labels,
    datasets: [
      {
        label: "Monthly Sales",
        data: monthlySales.values,
        borderColor: "#4F46E5", // Indigo 600
        backgroundColor: "rgba(79, 70, 229, 0.1)",
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "#ffffff",
        pointBorderColor: "#4F46E5",
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  const companyPie = {
    labels: companySplit.labels,
    datasets: [
      {
        data: companySplit.values,
        backgroundColor: [
          "#4F46E5", // Indigo
          "#10B981", // Emerald
          "#F59E0B", // Amber
          "#EF4444", // Red
          "#8B5CF6", // Violet
          "#06B6D4", // Cyan
          "#EC4899", // Pink
          "#6366F1", // Indigo Light
          "#14B8A6", // Teal
        ],
        borderWidth: 2,
        borderColor: "#ffffff",
      },
    ],
  };

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 text-indigo-600">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-3" size={40} />
          <p className="text-base font-medium text-gray-600">Getting things ready...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="h-screen p-6 bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl shadow-xl border border-red-100">
          <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
             <X size={32} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Connection Error</h2>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );

  if (!cleanData.length)
    return (
      <div className="h-screen p-6 bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl shadow-xl">
          <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
             <FileSpreadsheet size={32} className="text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Data Found</h2>
          <p className="text-sm text-gray-500">Please check your backend connection.</p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 p-3 sm:p-6 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
        
        {/* === HEADER SECTION === */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-wrap justify-between items-center gap-4 relative overflow-hidden">
          {/* Decorative accent */}
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600"></div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="bg-indigo-50 p-2.5 sm:p-3 rounded-xl shadow-sm text-indigo-600">
                <FileSpreadsheet size={28} className="sm:w-8 sm:h-8" />
            </div>
            <div>
                <h1 className="text-xl sm:text-2xl font-extrabold text-gray-800 tracking-tight">
                Business Analyst
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 font-medium mt-0.5">
                {filteredData.length.toLocaleString()} records found
                </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {lastSync && (
              <div className="px-3 py-1.5 bg-gray-100 rounded-lg text-[11px] font-medium text-gray-500 hidden sm:block border border-gray-200">
                 Updated: {new Date(lastSync).toLocaleTimeString()}
              </div>
            )}
            
            <button
              onClick={() => setAutoRefresh((s) => !s)}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border shadow-sm transition-all flex items-center gap-2 ${
                autoRefresh 
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <RefreshCw size={16} className={autoRefresh ? "animate-spin" : ""} />
              <span className="hidden sm:inline">{autoRefresh ? "Auto Sync On" : "Sync Now"}</span>
            </button>
            
            <button
              onClick={() => {
                if (confirm("Clear cache and reload?")) {
                  localStorage.removeItem("analyst_latest_rows");
                  window.location.reload();
                }
              }}
              className="px-3 sm:px-4 py-2 rounded-xl bg-white border border-red-200 text-red-500 text-xs sm:text-sm font-semibold hover:bg-red-50 shadow-sm transition-all hidden sm:flex items-center gap-2"
            >
              <RefreshCw size={16} /> Reset
            </button>
          </div>
        </div>

        {/* === FILTER & NAVIGATION BAR (COMPACT & STYLISH) === */}
        <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
          
          {/* 1. Navigation Tabs */}
          <div className="p-2 sm:p-3 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar sm:w-auto">
             {[
              { key: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
              { key: "masters", label: "Masters", icon: <Box size={16} /> },
              { key: "transactions", label: "Trans", icon: <List size={16} /> },
              { key: "reports", label: "Reports", icon: <FileBarChart size={16} /> },
              { key: "party", label: "Party", icon: <Users size={16} /> },
              { key: "inventory", label: "Stock", icon: <Box size={16} /> },
              { key: "alldata", label: "All Data", icon: <FileText size={16} /> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveSection(tab.key);
                  setCurrentPage(1);
                }}
                className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                  activeSection === tab.key
                    ? "bg-gray-800 text-white shadow-md shadow-gray-200 transform scale-105"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* 2. Filters (Compact Line) */}
          <div className="flex-1 p-2 sm:p-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
            
            {/* Search */}
            <div className="relative group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                <input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs sm:text-sm w-32 sm:w-40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-gray-400"
                />
            </div>

            {/* Separator */}
            <div className="h-6 w-px bg-gray-200 mx-1"></div>

            {/* Date */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:border-indigo-500 cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <option>Today</option>
              <option>Yesterday</option>
              <option>This Week</option>
              <option>This Month</option>
              <option>Last Month</option>
              <option>This Year</option>
              <option>Last Year</option>
              <option>All</option>
              <option>Custom</option>
            </select>

            {dateRange === "Custom" && (
              <>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                />
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
                />
              </>
            )}

            {/* Party Filter */}
            <select
              value={partyFilter}
              onChange={(e) => setPartyFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:border-indigo-500 max-w-[120px]"
            >
              <option value="">All Parties</option>
              {[...new Set(cleanData.map(r => r["Party Name"]).filter(Boolean))]
                .sort()
                .map(p => (
                  <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* NEW: Item Group Filter */}
            <select
              value={itemGroupFilter}
              onChange={(e) => setItemGroupFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:border-indigo-500 max-w-[120px]"
            >
              <option value="">All Item Groups</option>
              {[...new Set(cleanData.map(r => r["Item Group"]).filter(Boolean))]
                .sort()
                .map(g => (
                  <option key={g} value={g}>{g}</option>
              ))}
            </select>

             {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:border-indigo-500 max-w-[120px]"
            >
              <option value="">All Categories</option>
              {[...new Set(cleanData.map(r => r["Item Category"]).filter(Boolean))]
                .sort()
                .map(c => (
                  <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={salesmanFilter}
              onChange={(e) => setSalesmanFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-700 focus:outline-none focus:border-indigo-500 max-w-[100px]"
            >
              <option value="">All Salesmen</option>
              {[...new Set(cleanData.map(r => r["Salesman"]).filter(Boolean))]
                .sort()
                .map(s => (
                  <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Export Button */}
          <div className="p-2 sm:p-3 flex items-center justify-end border-t sm:border-t-0 sm:border-l border-gray-100">
             <button
              onClick={() => exportCSV(filteredData.slice(0, 5000), "AnalystExport")}
              className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100 transition-colors shadow-sm"
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        {/* === SECTIONS CONTENT === */}
        <div className="min-h-[500px]">
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
// DASHBOARD SECTION - Updated UI
// ==========================================
function DashboardSection({ metrics, monthlyChartData, companyPie, topProducts, topCustomers, data, openInvoice, formatINR }) {
  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      
      {/* METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
        <MetricCard 
          title="Total Sales" 
          value={formatINR(metrics.totalSales)} 
          icon={<div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><FileBarChart size={24} /></div>}
          trend="+12.5%" 
          trendUp={true}
          color="indigo" 
        />
        <MetricCard 
          title="Active Parties" 
          value={metrics.partyCount} 
          icon={<div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><Users size={24} /></div>}
          trend="+5 new"
          trendUp={true}
          color="emerald" 
        />
        <MetricCard 
          title="Products Sold" 
          value={metrics.inventoryCount} 
          icon={<div className="p-2 bg-amber-100 rounded-lg text-amber-600"><Box size={24} /></div>}
          trend="In Stock"
          trendUp={true}
          color="amber" 
        />
        <MetricCard 
          title="Total Invoices" 
          value={metrics.billingCount} 
          icon={<div className="p-2 bg-rose-100 rounded-lg text-rose-600"><FileText size={24} /></div>}
          trend="Generated"
          trendUp={true}
          color="rose" 
        />
      </div>

      {/* CHARTS ROW */}
      <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
        <div className="col-span-2 bg-white p-4 sm:p-6 rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.05)] border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-gray-800 text-sm sm:text-base font-bold flex items-center gap-2">
                <span className="w-1 h-5 bg-indigo-500 rounded-full"></span>
                Sales Performance
            </h3>
            <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded">Monthly Trend</span>
          </div>
          <div className="h-48 sm:h-64">
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
                    titleColor: "#e2e8f0",
                    bodyColor: "#fff",
                    bodyFont: { size: 13 },
                    displayColors: false,
                    cornerRadius: 8,
                  }
                },
                scales: {
                  x: { 
                    ticks: { color: "#64748b", font: { size: 10, weight: '500' } },
                    grid: { color: "#f1f5f9", display: false }
                  },
                  y: { 
                    ticks: { 
                      color: "#64748b", 
                      font: { size: 10 },
                      callback: (val) => `₹${(val/1000).toFixed(0)}K`
                    },
                    grid: { color: "#f1f5f9", borderDash: [5, 5] }
                  },
                },
              }} 
            />
          </div>
        </div>
        
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.05)] border border-gray-100">
          <h3 className="text-gray-800 text-sm sm:text-base font-bold mb-6 flex items-center gap-2">
             <span className="w-1 h-5 bg-pink-500 rounded-full"></span>
             Category Distribution
          </h3>
          <div className="h-48 sm:h-56 relative">
            <Doughnut 
              data={companyPie} 
              options={{ 
                maintainAspectRatio: false,
                responsive: true,
                cutout: '65%',
                plugins: { 
                  legend: { 
                    position: 'bottom',
                    labels: { 
                      color: "#475569",
                      padding: 15,
                      font: { size: 10, weight: '600' },
                      usePointStyle: true,
                      boxWidth: 8,
                    } 
                  } 
                } 
              }} 
            />
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="text-center">
                    <p className="text-xs text-gray-400 font-medium">Segments</p>
                 </div>
             </div>
          </div>
        </div>
      </div>

      {/* TOP LISTS */}
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        <ListBox title="Top Performing Products" items={topProducts} icon={<Box size={18} />} color="indigo" />
        <ListBox title="Top Customers" items={topCustomers} icon={<Users size={18} />} color="emerald" />
      </div>

      {/* RECENT TRANSACTIONS */}
      <div className="bg-white rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.05)] border border-gray-100 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
           <h3 className="text-gray-800 font-bold text-sm sm:text-base flex items-center gap-2">
             <List size={18} className="text-indigo-600" /> Recent Transactions
           </h3>
           <button className="text-xs text-indigo-600 font-semibold hover:underline">View All</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left">
            <thead className="text-gray-500 font-semibold bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="py-3 px-4">Vch No</th>
                <th className="py-3 px-4 hidden sm:table-cell">Date</th>
                <th className="py-3 px-4">Party</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.slice(0, 10).map((r, i) => {
                const inv = r["Vch No."] || "—";
                const date = r["Date"] || "—";
                const party = r["Party Name"] || "—";
                const amount = parseFloat(r["Amount"]) || 0;
                
                return (
                  <tr 
                    key={i} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                    onClick={() => openInvoice(r)}
                  >
                    <td className="py-3 px-4 font-medium text-gray-700">{inv}</td>
                    <td className="py-3 px-4 text-gray-500 hidden sm:table-cell">{date}</td>
                    <td className="py-3 px-4 text-gray-600 truncate max-w-[150px]">{party}</td>
                    <td className="text-right py-3 px-4 font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">
                      ₹{Number(amount).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openInvoice(r);
                        }}
                        className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:bg-indigo-100 hover:text-indigo-600 transition-all"
                      >
                        <Eye size={16} />
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

function MetricCard({ title, value, icon, trend, trendUp, color }) {
  const borderColors = {
    indigo: "border-l-4 border-l-indigo-500",
    emerald: "border-l-4 border-l-emerald-500",
    amber: "border-l-4 border-l-amber-500",
    rose: "border-l-4 border-l-rose-500",
  };

  return (
    <div className={`bg-white p-4 sm:p-5 rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow ${borderColors[color]}`}>
      <div className="flex justify-between items-start mb-3">
        <div>
           <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</p>
           <h3 className="text-lg sm:text-2xl font-bold text-gray-800 mt-1">{value}</h3>
        </div>
        {icon}
      </div>
      <div className="flex items-center gap-1.5 text-xs font-medium">
         <span className={`px-1.5 py-0.5 rounded ${trendUp ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
           {trend}
         </span>
         <span className="text-gray-400">since last month</span>
      </div>
    </div>
  );
}

function ListBox({ title, items = [], icon, color }) {
  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.05)] border border-gray-100 h-full">
      <h4 className={`text-gray-800 mb-4 text-sm sm:text-base font-bold flex items-center gap-2`}>
        <span className={`p-1.5 rounded-md ${color === 'indigo' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
            {icon}
        </span>
        {title}
      </h4>
      <ul className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
        {items.map(([name, amt], i) => (
          <li key={i} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
            <div className="flex items-center gap-3 overflow-hidden">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-bold">
                    {i + 1}
                </span>
                <span className="text-xs sm:text-sm text-gray-700 truncate font-medium">{name}</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-gray-900">₹{(amt || 0).toLocaleString("en-IN")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ==========================================
// OTHER SECTIONS (Masters, Trans, Reports, etc)
// ==========================================
function MastersSection({ data, openInvoice }) {
  const parties = [...new Set(data.map(r => r["Party Name"]))].filter(p => p !== "N/A").sort();
  const items = [...new Set(data.map(r => r["ItemName"]))].filter(i => i !== "N/A").sort();
  
  return (
    <div className="grid md:grid-cols-2 gap-4 sm:gap-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.05)] border border-gray-100">
        <h3 className="text-gray-800 mb-4 text-base font-bold flex items-center gap-2">
            <Users size={20} className="text-indigo-600" /> Parties Directory
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full ml-auto">{parties.length}</span>
        </h3>
        <ul className="space-y-1 max-h-[500px] overflow-auto pr-2">
          {parties.map((p, i) => (
            <li key={i} className="py-2 px-3 text-sm text-gray-600 border-b border-gray-50 hover:bg-indigo-50 hover:text-indigo-700 hover:pl-4 transition-all rounded cursor-default">
                {i + 1}. {p}
            </li>
          ))}
        </ul>
      </div>
      
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.05)] border border-gray-100">
        <h3 className="text-gray-800 mb-4 text-base font-bold flex items-center gap-2">
            <Box size={20} className="text-emerald-600" /> Item Master
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full ml-auto">{items.length}</span>
        </h3>
        <ul className="space-y-1 max-h-[500px] overflow-auto pr-2">
          {items.map((it, i) => (
            <li key={i} className="py-2 px-3 text-sm text-gray-600 border-b border-gray-50 hover:bg-emerald-50 hover:text-emerald-700 hover:pl-4 transition-all rounded cursor-default">
                {i + 1}. {it}
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
    <div className="bg-white rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.05)] border border-gray-100 animate-in fade-in duration-500">
      <div className="p-4 sm:p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h3 className="text-gray-800 text-sm sm:text-base font-bold flex items-center gap-2">
            <List size={20} className="text-indigo-600" /> 
            All Transactions <span className="text-gray-400 font-normal text-xs">({data.length})</span>
        </h3>
        <button 
          onClick={() => exportCSV(data, "Transactions")} 
          className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-semibold flex items-center gap-1.5 hover:bg-gray-50 shadow-sm"
        >
          <Download size={14} /> Export
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm text-left">
          <thead className="text-gray-500 font-semibold bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="py-3 px-4">Vch No</th>
              <th className="py-3 px-4 hidden sm:table-cell">Date</th>
              <th className="py-3 px-4">Party</th>
              <th className="py-3 px-4 text-right">Amount</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pageData.map((r, i) => (
              <tr 
                key={i} 
                className="hover:bg-indigo-50/30 transition-colors cursor-pointer"
                onClick={() => openInvoice(r)}
              >
                <td className="py-3 px-4 font-medium text-gray-700">{r["Vch No."] || "—"}</td>
                <td className="py-3 px-4 text-gray-500 hidden sm:table-cell">{r["Date"] || "—"}</td>
                <td className="py-3 px-4 text-gray-600 truncate max-w-[200px]">{r["Party Name"] || "—"}</td>
                <td className="text-right py-3 px-4 font-bold text-gray-800">
                  ₹{(r["Amount"] || 0).toLocaleString("en-IN")}
                </td>
                <td className="py-3 px-4 text-right">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      openInvoice(r);
                    }} 
                    className="px-3 py-1 rounded-md bg-white border border-gray-200 text-indigo-600 text-xs font-medium hover:bg-indigo-50 shadow-sm"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="p-3 border-t border-gray-100 flex justify-between items-center bg-gray-50/30">
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))} 
          disabled={page === 1} 
          className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 hover:bg-gray-50"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <span className="text-xs text-gray-500 font-medium">Page {page} of {pages}</span>
        <button 
          onClick={() => setPage(p => Math.min(pages, p + 1))} 
          disabled={page === pages} 
          className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 hover:bg-gray-50"
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
    <div className="bg-white p-6 rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.05)] border border-gray-100 animate-in fade-in duration-500">
      <h3 className="text-gray-800 mb-6 text-lg font-bold flex items-center gap-2">
        <FileBarChart size={24} className="text-indigo-600" /> Export Reports
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 border border-gray-200 rounded-xl bg-gray-50 hover:bg-white hover:shadow-lg transition-all text-center group cursor-pointer" onClick={() => exportCSV(data, "AllData")}>
            <div className="w-12 h-12 mx-auto bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FileSpreadsheet size={24} />
            </div>
            <h4 className="font-bold text-gray-800">Complete Dump</h4>
            <p className="text-xs text-gray-500 mt-1">{data.length} records</p>
        </div>

        <div className="p-5 border border-gray-200 rounded-xl bg-gray-50 hover:bg-white hover:shadow-lg transition-all text-center group cursor-pointer" onClick={() => exportCSV(salesData, "Sales")}>
            <div className="w-12 h-12 mx-auto bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Users size={24} />
            </div>
            <h4 className="font-bold text-gray-800">Sales Register</h4>
            <p className="text-xs text-gray-500 mt-1">{salesData.length} records</p>
        </div>

        <div className="p-5 border border-gray-200 rounded-xl bg-gray-50 hover:bg-white hover:shadow-lg transition-all text-center group cursor-pointer" onClick={() => exportCSV(purchaseData, "Purchase")}>
            <div className="w-12 h-12 mx-auto bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Box size={24} />
            </div>
            <h4 className="font-bold text-gray-800">Purchase Register</h4>
            <p className="text-xs text-gray-500 mt-1">{purchaseData.length} records</p>
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
    <div className="bg-white rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.05)] border border-gray-100 animate-in fade-in duration-500">
      <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-gray-800 font-bold flex items-center gap-2">
            <Users size={20} className="text-indigo-600" /> Party Ledger Summary
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm text-left">
          <thead className="text-gray-500 font-semibold bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="py-3 px-4">Party Name</th>
              <th className="py-3 px-4 text-right">Transactions</th>
              <th className="py-3 px-4 text-right">Total Volume</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {partyData.map((p, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-gray-700">{p.name}</td>
                <td className="py-3 px-4 text-right text-gray-500">{p.count}</td>
                <td className="text-right py-3 px-4 font-bold text-indigo-600">
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
    <div className="bg-white rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.05)] border border-gray-100 animate-in fade-in duration-500">
      <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50">
        <h3 className="text-gray-800 font-bold flex items-center gap-2">
            <Box size={20} className="text-emerald-600" /> Inventory Valuation
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm text-left">
          <thead className="text-gray-500 font-semibold bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="py-3 px-4">Item Description</th>
              <th className="py-3 px-4 text-right">Quantity Sold</th>
              <th className="py-3 px-4 text-right">Total Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {inv.map((item, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-gray-700">{item.name}</td>
                <td className="py-3 px-4 text-right text-gray-500">{item.qty.toFixed(2)}</td>
                <td className="text-right py-3 px-4 font-bold text-emerald-600">
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
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-gray-800 text-sm font-bold flex items-center gap-2">
            <FileText size={18} className="text-indigo-600" /> Master Data View
        </h3>
        <button 
          onClick={() => exportCSV(data, "AllData")} 
          className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-indigo-100 transition-colors"
        >
          <Download size={14} /> Export All
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_2px_15px_rgb(0,0,0,0.05)] border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
          <table className="w-full text-xs text-left">
            <thead className="text-gray-500 font-semibold bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-3 px-3 border-b border-gray-100 sticky left-0 bg-gray-50 z-20 min-w-[40px]">#</th>
                {importantColumns.map((col, idx) => (
                  <th 
                    key={idx} 
                    className={`py-3 px-3 border-b border-gray-100 whitespace-nowrap ${
                      col === "Amount" ? "text-right" : ""
                    }`}
                  >
                    {col}
                  </th>
                ))}
                <th className="py-3 px-3 text-right border-b border-gray-100">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedData.map((row, rowIdx) => (
                <tr 
                  key={rowIdx} 
                  className="hover:bg-indigo-50/30 cursor-pointer transition-colors"
                  onClick={() => openInvoice(row)}
                >
                  <td className="py-2 px-3 sticky left-0 bg-white font-medium text-gray-400 text-[10px] z-10">
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
                        className={`py-2 px-3 ${
                          col === "Amount" ? "text-right font-bold text-gray-800" : "text-gray-600"
                        } ${
                          col === "Qty" ? "text-right" : ""
                        }`}
                        title={displayValue}
                      >
                        <div className={`${
                          col === "ItemName" || col === "Party Name" 
                            ? "max-w-[180px] truncate" 
                            : col === "Company" 
                            ? "max-w-[100px] truncate"
                            : ""
                        }`}>
                          {displayValue}
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-2 px-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openInvoice(row);
                      }}
                      className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 p-1 rounded transition-colors"
                    >
                      <Eye size={14} />
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
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium disabled:opacity-50 flex items-center gap-1 hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft size={14} />
          <span className="hidden sm:inline">Previous</span>
        </button>
        <span className="text-xs text-gray-500 font-medium">
          Page {currentPage} of {totalPages}
        </span>
        <button 
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
          disabled={currentPage === totalPages} 
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-medium disabled:opacity-50 flex items-center gap-1 hover:bg-gray-50 transition-colors"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ==========================================
// TALLY-STYLE INVOICE MODAL
// ==========================================
function TallyInvoiceModal({ refObj, row, onClose, printSize, setPrintSize, onPrint, onShare, onCopy }) {
  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        ref={refObj} 
        className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col"
      >
        {/* HEADER */}
        <div className="bg-gray-800 p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 z-10 rounded-t-xl">
          <h3 className="text-white text-base font-bold flex items-center gap-2">
            <FileText size={20} className="text-indigo-400" />
            TAX INVOICE
          </h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* INVOICE CONTENT - TALLY STYLE */}
        <div className="p-6 sm:p-8 bg-white text-gray-900 font-mono text-sm leading-relaxed flex-1">
          {/* Company Header */}
          <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
            <h1 className="text-2xl font-bold text-gray-900 tracking-wide uppercase">
              COMMUNICATION WORLD INFOMATIC PVT. LTD.
            </h1>
            <p className="text-xs text-gray-600 mt-1 uppercase tracking-wider">
              Business Intelligence • Data Solutions • ERP Integration
            </p>
          </div>

          {/* Invoice Details Grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-xs sm:text-sm">
            <div className="flex">
              <span className="font-bold text-gray-700 w-24">Invoice No:</span>
              <span className="text-gray-900">{row["Invoice No"] || row["Vch No."] || "—"}</span>
            </div>
            <div className="flex">
              <span className="font-bold text-gray-700 w-24">Date:</span>
              <span className="text-gray-900">{row["Date"] || "—"}</span>
            </div>
            <div className="flex">
              <span className="font-bold text-gray-700 w-24">Type:</span>
              <span className="text-gray-900">{row["Voucher Type"] || "Sales"}</span>
            </div>
            <div className="flex">
              <span className="font-bold text-gray-700 w-24">Salesman:</span>
              <span className="text-gray-900">{row["Salesman"] || "—"}</span>
            </div>
          </div>

          {/* Party Details */}
          <div className="border border-gray-300 rounded p-4 mb-6 bg-gray-50">
            <h4 className="font-bold text-gray-900 mb-2 underline decoration-gray-400 underline-offset-4">Bill To:</h4>
            <p className="font-bold text-lg">{row["Party Name"] || "—"}</p>
            <p className="text-xs text-gray-600 mt-1">Group: {row["Party Group"] || "—"}</p>
            <p className="text-xs text-gray-600">Location: {row["City/Area"] || "—"}</p>
          </div>

          {/* Item Details Table */}
          <div className="border border-gray-800 mb-6">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gray-100 text-gray-900 border-b border-gray-800 font-bold uppercase">
                <tr>
                  <th className="border-r border-gray-800 px-3 py-2 text-left w-12">#</th>
                  <th className="border-r border-gray-800 px-3 py-2 text-left">Description of Goods</th>
                  <th className="border-r border-gray-800 px-3 py-2 text-right w-20">Qty</th>
                  <th className="border-r border-gray-800 px-3 py-2 text-right w-24">Rate</th>
                  <th className="px-3 py-2 text-right w-32">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-r border-gray-800 px-3 py-2 align-top text-center">1</td>
                  <td className="border-r border-gray-800 px-3 py-2 align-top">
                    <div className="font-bold">{row["ItemName"] || "—"}</div>
                    <div className="text-[10px] text-gray-500 mt-1 uppercase">
                      CAT: {row["Item Category"] || "—"}
                    </div>
                  </td>
                  <td className="border-r border-gray-800 px-3 py-2 align-top text-right">
                    {parseFloat(row["Qty"] || 0).toFixed(2)}
                  </td>
                  <td className="border-r border-gray-800 px-3 py-2 align-top text-right">
                    {parseFloat(row["Rate"] || 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-3 py-2 align-top text-right font-bold">
                    {parseFloat(row["Amount"] || 0).toLocaleString("en-IN")}
                  </td>
                </tr>
                {/* Spacer row to simulate full page height if needed */}
                <tr className="h-24">
                  <td className="border-r border-gray-800"></td>
                  <td className="border-r border-gray-800"></td>
                  <td className="border-r border-gray-800"></td>
                  <td className="border-r border-gray-800"></td>
                  <td></td>
                </tr>
              </tbody>
              <tfoot className="border-t border-gray-800 bg-gray-50">
                <tr>
                   <td colSpan="4" className="border-r border-gray-800 px-3 py-2 text-right font-bold uppercase text-gray-600">Total</td>
                   <td className="px-3 py-2 text-right font-bold text-lg">
                      ₹{parseFloat(row["Amount"] || 0).toLocaleString("en-IN")}
                   </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Narration */}
          {row["Narration"] && (
            <div className="text-xs italic text-gray-600 mb-6 border-l-2 border-gray-300 pl-3">
              Note: {row["Narration"]}
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-[10px] uppercase text-gray-400 mt-auto pt-6">
            Computer Generated Invoice • E. & O.E.
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="bg-gray-50 p-4 border-t border-gray-200 flex flex-wrap gap-3 rounded-b-xl">
          <select 
            value={printSize} 
            onChange={(e) => setPrintSize(e.target.value)} 
            className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          >
            <option value="A4">A4 Size</option>
            <option value="A5">A5 Size</option>
            <option value="Thermal">Thermal (80mm)</option>
          </select>
          
          <button 
            onClick={onPrint} 
            className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold flex items-center gap-2 hover:bg-black transition-colors shadow-sm ml-auto"
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
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Copy size={16} /> Copy
          </button>
        </div>
      </div>
    </div>
  );
}
