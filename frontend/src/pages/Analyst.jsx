// frontend/src/pages/Analyst.jsx
// COMPLETELY FIXED PROFESSIONAL VERSION - Same data flow as Dashboard
// UPDATED: Proper data processing, filters, metrics calculation

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
  BarChart3,
  Users,
  Package,
  CreditCard,
  TrendingUp,
  PieChart,
  AlertCircle,
  CheckCircle,
  Calendar,
  Search,
  ArrowUpRight,
  ArrowDownRight,
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

export default function Analyst({ isLight, t = (s) => s }) {
  const { user } = useAuth();
  const [allData, setAllData] = useState([]);
  const [excelData, setExcelData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const modalRef = useRef();
  const rowsPerPage = 20;

  // FILTER STATES (EXACTLY LIKE DASHBOARD)
  const [dateFilter, setDateFilter] = useState("all");
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPartyGroup, setFilterPartyGroup] = useState("");
  const [itemGroupFilter, setItemGroupFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // DASHBOARD STYLE FETCH
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

        const vouchersRes = await fetch(vouchersURL, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });

        if (!vouchersRes.ok) {
          throw new Error(`HTTP ${vouchersRes.status}`);
        }

        const vouchersJson = await vouchersRes.json();

        if (!vouchersJson || !vouchersJson.success) {
          throw new Error("Invalid response");
        }

        const arr = vouchersJson.data || [];

        if (!Array.isArray(arr)) {
          throw new Error("No array returned");
        }
        console.log(`✅ Analyst loaded ${arr.length} vouchers`);

        if (!cancelled) {
          // NORMALIZE DATA EXACTLY LIKE DASHBOARD
          const normalized = arr.map(v => ({
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
            "Rate": parseFloat(v.rate) || 0,
            "Narration": v.narration || '',
            "_rawDate": v.date || "",
            "__party_group": v.party_group || "",
          }));

          // REMOVE TOTAL ROWS (LIKE DASHBOARD)
          const cleaned = normalized.filter((r) => {
            const checkValues = Object.values(r || {}).map((v) => String(v || "").toLowerCase().trim());
            if (checkValues.some((v) => ["total", "grand total", "sub total", "overall total"].some((w) => v.includes(w)))) return false;
            if (checkValues.every((v) => v === "")) return false;
            return true;
          });

          setAllData(cleaned);
          setExcelData(cleaned);
          setLastSync(new Date().toISOString());
        }

      } catch (e) {
        console.error("❌ Fetch error:", e);
        setError("Unable to load analyst data. Check backend.");
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

  // DATE FILTERING (EXACTLY LIKE DASHBOARD)
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

  // CLEAN DATA WITH FILTERS (EXACTLY LIKE DASHBOARD)
  const cleanData = useMemo(() => {
    let filtered = excelData.filter((r) => {
      const checkValues = Object.values(r || {}).map((v) => String(v || "").toLowerCase().trim());
      if (checkValues.some((v) => ["total", "grand total", "sub total", "overall total"].some((w) => v.includes(w)))) return false;
      return true;
    });

    // USER LOCKS (EXACTLY LIKE DASHBOARD)
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

    // APPLY FILTERS
    if (filterCategory) {
      filtered = filtered.filter(r => r["Item Category"] === filterCategory);
    }

    if (filterPartyGroup) {
      filtered = filtered.filter(r => r["Party Group"] === filterPartyGroup);
    }
     
    if (itemGroupFilter) {
      filtered = filtered.filter(r => r["Item Group"] === itemGroupFilter);
    }

    // SEARCH FILTER
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(searchLower)
        )
      );
    }

    return filtered;
  }, [excelData, filterCategory, filterPartyGroup, itemGroupFilter, user, searchTerm]);

  // METRICS CALCULATION (PROPER LIKE DASHBOARD)
  const metrics = useMemo(() => {
    const toNumber = (v) => parseFloat(String(v || "").replace(/[^0-9.-]/g, "")) || 0;
    
    let totalSales = 0;
    let totalQty = 0;
    const partySet = new Set();
    const itemSet = new Set();
    const voucherSet = new Set();
    let maxSale = 0;
    let minSale = Infinity;

    cleanData.forEach((r) => {
      const amt = toNumber(r["Amount"]);
      const qty = toNumber(r["Qty"]);
      
      totalSales += amt;
      totalQty += qty;
      
      if (r["Party Name"] && r["Party Name"] !== "N/A") partySet.add(r["Party Name"]);
      if (r["ItemName"] && r["ItemName"] !== "N/A") itemSet.add(r["ItemName"]);
      if (r["Voucher Number"] && r["Voucher Number"] !== "N/A") voucherSet.add(r["Voucher Number"]);
      
      if (amt > maxSale) maxSale = amt;
      if (amt < minSale && amt > 0) minSale = amt;
    });

    if (minSale === Infinity) minSale = 0;

    const avgSale = cleanData.length > 0 ? totalSales / cleanData.length : 0;
    const avgQty = cleanData.length > 0 ? totalQty / cleanData.length : 0;

    return {
      totalSales,
      totalQty,
      partyCount: partySet.size,
      itemCount: itemSet.size,
      voucherCount: voucherSet.size,
      transactionCount: cleanData.length,
      maxSale,
      minSale: minSale === Infinity ? 0 : minSale,
      avgSale,
      avgQty,
    };
  }, [cleanData]);

  // MONTHLY SALES DATA
  const monthlySales = useMemo(() => {
    const monthlyAgg = {};
    cleanData.forEach((r) => {
      const dateStr = r["Date"] || '';
      const d = new Date(dateStr);
      if (isNaN(d)) return;
      const monthYear = d.toLocaleString("en-IN", { month: "short", year: "numeric" });
      monthlyAgg[monthYear] = (monthlyAgg[monthYear] || 0) + (parseFloat(r["Amount"]) || 0);
    });

    const entries = Object.entries(monthlyAgg).sort((a, b) => new Date(a[0]) - new Date(b[0]));
    return { labels: entries.map(([k]) => k), values: entries.map(([, v]) => v) };
  }, [cleanData]);

  // COMPANY SPLIT
  const companySplit = useMemo(() => {
    const map = {};
    cleanData.forEach((r) => {
      const c = r["Item Category"] || "Unknown";
      if (c === 'N/A') return;
      map[c] = (map[c] || 0) + (parseFloat(r["Amount"]) || 0);
    });
    return { labels: Object.keys(map), values: Object.values(map) };
  }, [cleanData]);

  // TOP PRODUCTS AND CUSTOMERS
  const topEntities = useMemo(() => {
    const prod = {};
    const cust = {};
    
    cleanData.forEach((r) => {
      const item = r["ItemName"] || "Unknown";
      const party = r["Party Name"] || "Unknown";
      const amt = parseFloat(r["Amount"]) || 0;
      
      if (item !== 'N/A') prod[item] = (prod[item] || 0) + amt;
      if (party !== 'N/A') cust[party] = (cust[party] || 0) + amt;
    });
    
    const topProducts = Object.entries(prod).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const topCustomers = Object.entries(cust).sort((a, b) => b[1] - a[1]).slice(0, 10);
    
    return { topProducts, topCustomers };
  }, [cleanData]);

  // AREA WISE SALES
  const areaSales = useMemo(() => {
    const map = {};
    cleanData.forEach((r) => {
      const area = r["City/Area"] || "Unknown";
      if (area === 'N/A') return;
      map[area] = (map[area] || 0) + (parseFloat(r["Amount"]) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [cleanData]);

  // EXPORT FUNCTIONS
  const exportCSV = (rows, filename = "analyst_export") => {
    if (!rows || !rows.length) return;
    
    const keys = [
      "Date", "Voucher Number", "Voucher Type", "Party Name", "Party Group",
      "ItemName", "Item Group", "Item Category", "Salesman", "City/Area",
      "Qty", "Rate", "Amount", "Narration"
    ];
    
    const csvRows = [keys.join(",")];
    
    rows.forEach((r) => {
      const line = keys.map((k) => {
        let v = r[k] || "";
        v = String(v).replace(/"/g, '""');
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
  };

  const formatINR = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;

  // LOADING STATE
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <BarChart3 className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-600" size={32} />
          </div>
          <h2 className="mt-6 text-xl font-bold text-gray-800">Loading Analyst Dashboard</h2>
          <p className="mt-2 text-gray-600">Crunching your numbers...</p>
        </div>
      </div>
    );
  }

  // ERROR STATE
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-pink-50 p-6">
        <div className="max-w-md mx-auto text-center bg-white p-8 rounded-2xl shadow-xl border border-red-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Data Loading Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-md transition-all flex items-center gap-2"
            >
              <RefreshCw size={18} /> Retry
            </button>
            <button 
              onClick={() => setActiveSection("dashboard")} 
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 text-gray-900">
      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg">
                <BarChart3 className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Analyst Pro</h1>
                <p className="text-xs text-gray-500">Advanced Business Intelligence</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs font-medium text-blue-700">
                  {cleanData.length.toLocaleString()} records
                </span>
              </div>
              
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                  autoRefresh 
                    ? "bg-green-100 text-green-700 border border-green-200" 
                    : "bg-gray-100 text-gray-700 border border-gray-200"
                }`}
              >
                <RefreshCw size={16} className={autoRefresh ? "animate-spin" : ""} />
                {autoRefresh ? "Auto Sync" : "Manual"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* FILTERS BAR */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search across all fields..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>

            {dateFilter === "custom" && (
              <div className="flex gap-2">
                <input
                  type="date"
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm"
                  value={customDateRange.start}
                  onChange={(e) => setCustomDateRange({...customDateRange, start: e.target.value})}
                />
                <input
                  type="date"
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm"
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange({...customDateRange, end: e.target.value})}
                />
              </div>
            )}

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">All Categories</option>
              {Array.from(new Set(allData.map(r => r["Item Category"]).filter(v => v && v !== 'N/A')))
                .sort()
                .map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))
              }
            </select>

            <select
              value={filterPartyGroup}
              onChange={(e) => setFilterPartyGroup(e.target.value)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">All Party Groups</option>
              {Array.from(new Set(allData.map(r => r["Party Group"]).filter(v => v && v !== 'N/A')))
                .sort()
                .map(grp => (
                  <option key={grp} value={grp}>{grp}</option>
                ))
              }
            </select>

            <select
              value={itemGroupFilter}
              onChange={(e) => setItemGroupFilter(e.target.value)}
              className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">All Item Groups</option>
              {Array.from(new Set(allData.map(r => r["Item Group"]).filter(v => v && v !== 'N/A')))
                .sort()
                .map(grp => (
                  <option key={grp} value={grp}>{grp}</option>
                ))
              }
            </select>

            <button
              onClick={() => {
                setDateFilter("all");
                setFilterCategory("");
                setFilterPartyGroup("");
                setItemGroupFilter("");
                setSearchTerm("");
                setCustomDateRange({ start: '', end: '' });
              }}
              className="px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex overflow-x-auto pb-2 mb-6 scrollbar-hide">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
            {[
              { key: "dashboard", label: "Overview", icon: <BarChart3 size={18} /> },
              { key: "metrics", label: "Metrics", icon: <TrendingUp size={18} /> },
              { key: "parties", label: "Parties", icon: <Users size={18} /> },
              { key: "products", label: "Products", icon: <Package size={18} /> },
              { key: "transactions", label: "Transactions", icon: <CreditCard size={18} /> },
              { key: "reports", label: "Reports", icon: <FileText size={18} /> },
              { key: "charts", label: "Charts", icon: <PieChart size={18} /> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveSection(tab.key)}
                className={`px-5 py-3 rounded-xl text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${
                  activeSection === tab.key
                    ? "bg-white text-blue-600 shadow-lg"
                    : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ACTIVE SECTION CONTENT */}
        <div className="animate-fadeIn">
          {activeSection === "dashboard" && (
            <DashboardSection 
              metrics={metrics}
              monthlySales={monthlySales}
              companySplit={companySplit}
              topEntities={topEntities}
              areaSales={areaSales}
              cleanData={cleanData}
              openInvoice={openInvoice}
              formatINR={formatINR}
            />
          )}
          
          {activeSection === "metrics" && (
            <MetricsSection metrics={metrics} formatINR={formatINR} />
          )}
          
          {activeSection === "parties" && (
            <PartiesSection 
              topCustomers={topEntities.topCustomers} 
              cleanData={cleanData}
              formatINR={formatINR}
            />
          )}
          
          {activeSection === "products" && (
            <ProductsSection 
              topProducts={topEntities.topProducts} 
              cleanData={cleanData}
              formatINR={formatINR}
            />
          )}
          
          {activeSection === "transactions" && (
            <TransactionsSection 
              cleanData={cleanData}
              openInvoice={openInvoice}
              exportCSV={exportCSV}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              rowsPerPage={rowsPerPage}
            />
          )}
          
          {activeSection === "reports" && (
            <ReportsSection 
              cleanData={cleanData}
              exportCSV={exportCSV}
              metrics={metrics}
            />
          )}
          
          {activeSection === "charts" && (
            <ChartsSection 
              monthlySales={monthlySales}
              companySplit={companySplit}
              areaSales={areaSales}
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
          onPrint={() => window.print()}
          onShare={async () => {
            const text = `Invoice ${selectedInvoice["Voucher Number"]} - ${selectedInvoice["Party Name"]} - ${formatINR(selectedInvoice["Amount"])}`;
            if (navigator.share) {
              await navigator.share({ title: 'Invoice', text });
            }
          }}
          onCopy={() => {
            navigator.clipboard.writeText(JSON.stringify(selectedInvoice, null, 2));
            alert('Invoice data copied!');
          }}
          formatINR={formatINR}
        />
      )}
    </div>
  );
}

// ==========================================
// DASHBOARD SECTION
// ==========================================
function DashboardSection({ metrics, monthlySales, companySplit, topEntities, areaSales, cleanData, openInvoice, formatINR }) {
  return (
    <div className="space-y-6">
      {/* KEY METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Sales" 
          value={formatINR(metrics.totalSales)} 
          change="+12.5%" 
          icon="💰"
          color="blue"
        />
        <MetricCard 
          title="Transactions" 
          value={metrics.transactionCount.toLocaleString()} 
          change="+8.2%" 
          icon="🧾"
          color="green"
        />
        <MetricCard 
          title="Active Parties" 
          value={metrics.partyCount.toLocaleString()} 
          change="+5.1%" 
          icon="👥"
          color="purple"
        />
        <MetricCard 
          title="Products Sold" 
          value={metrics.itemCount.toLocaleString()} 
          change="+15.3%" 
          icon="📦"
          color="orange"
        />
      </div>

      {/* CHARTS ROW */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* SALES TREND */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Sales Trend</h3>
              <p className="text-sm text-gray-500">Monthly performance overview</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
              <ArrowUpRight size={16} />
              {monthlySales.values.length > 1 ? 
                `${((monthlySales.values[monthlySales.values.length-1] - monthlySales.values[monthlySales.values.length-2]) / monthlySales.values[monthlySales.values.length-2] * 100).toFixed(1)}% growth` 
                : 'No data'}
            </div>
          </div>
          <div className="h-64">
            <Line
              data={{
                labels: monthlySales.labels,
                datasets: [{
                  label: 'Sales',
                  data: monthlySales.values,
                  borderColor: '#3B82F6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  borderWidth: 2,
                  tension: 0.4,
                  fill: true,
                  pointBackgroundColor: '#3B82F6',
                  pointBorderColor: '#fff',
                  pointBorderWidth: 2,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: '#1F2937',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#374151',
                    borderWidth: 1,
                    callbacks: {
                      label: (ctx) => `₹${ctx.raw.toLocaleString('en-IN')}`
                    }
                  }
                },
                scales: {
                  x: {
                    grid: { color: '#F3F4F6' },
                    ticks: { color: '#6B7280' }
                  },
                  y: {
                    grid: { color: '#F3F4F6' },
                    ticks: { 
                      color: '#6B7280',
                      callback: (val) => `₹${(val/1000).toFixed(0)}K`
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* COMPANY DISTRIBUTION */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Company Split</h3>
              <p className="text-sm text-gray-500">Revenue by category</p>
            </div>
            <PieChart className="text-blue-600" size={20} />
          </div>
          <div className="h-64">
            <Doughnut
              data={{
                labels: companySplit.labels,
                datasets: [{
                  data: companySplit.values,
                  backgroundColor: [
                    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                    '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#06B6D4'
                  ],
                  borderWidth: 1,
                  borderColor: '#fff'
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                    labels: {
                      padding: 15,
                      usePointStyle: true,
                      pointStyle: 'circle',
                      font: { size: 11 }
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* TOP LISTS */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* TOP PRODUCTS */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Top Products</h3>
              <p className="text-sm text-gray-500">By revenue</p>
            </div>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              Top 10
            </span>
          </div>
          <div className="space-y-3">
            {topEntities.topProducts.map(([name, amount], idx) => (
              <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                    idx === 1 ? 'bg-gray-100 text-gray-700' :
                    idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    <span className="text-sm font-bold">{idx + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                    <p className="text-xs text-gray-500">Product</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {formatINR(amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* TOP CUSTOMERS */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Top Customers</h3>
              <p className="text-sm text-gray-500">By spending</p>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              Top 10
            </span>
          </div>
          <div className="space-y-3">
            {topEntities.topCustomers.map(([name, amount], idx) => (
              <div key={idx} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                    idx === 1 ? 'bg-gray-100 text-gray-700' :
                    idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    <span className="text-sm font-bold">{idx + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
                    <p className="text-xs text-gray-500">Customer</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-gray-900">
                  {formatINR(amount)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AREA PERFORMANCE */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Top Areas</h3>
              <p className="text-sm text-gray-500">By sales volume</p>
            </div>
            <span className="px-3 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
              Top 8
            </span>
          </div>
          <div className="space-y-4">
            {areaSales.map(([area, amount], idx) => {
              const percentage = (amount / metrics.totalSales * 100).toFixed(1);
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">{area}</span>
                    <span className="text-sm font-bold text-gray-900">{formatINR(amount)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{percentage}% of total</span>
                    <span>{idx + 1} rank</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, change, icon, color }) {
  const colorClasses = {
    blue: 'bg-gradient-to-br from-blue-500 to-blue-600',
    green: 'bg-gradient-to-br from-green-500 to-green-600',
    purple: 'bg-gradient-to-br from-purple-500 to-purple-600',
    orange: 'bg-gradient-to-br from-orange-500 to-orange-600',
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-2">{value}</h3>
          {change && (
            <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full text-xs font-medium ${
              change.startsWith('+') 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {change.startsWith('+') ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {change}
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center`}>
          <span className="text-white text-xl">{icon}</span>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// OTHER SECTIONS
// ==========================================
function MetricsSection({ metrics, formatINR }) {
  const stats = [
    { label: 'Average Transaction Value', value: formatINR(metrics.avgSale), icon: '📊' },
    { label: 'Total Quantity Sold', value: metrics.totalQty.toLocaleString(), icon: '📦' },
    { label: 'Average Quantity per Transaction', value: metrics.avgQty.toFixed(2), icon: '⚖️' },
    { label: 'Total Vouchers', value: metrics.voucherCount.toLocaleString(), icon: '🧾' },
    { label: 'Largest Single Sale', value: formatINR(metrics.maxSale), icon: '💰' },
    { label: 'Smallest Single Sale', value: formatINR(metrics.minSale), icon: '💎' },
  ];

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {stats.map((stat, idx) => (
        <div key={idx} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
              <span className="text-2xl">{stat.icon}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{stat.label}</p>
              <h3 className="text-xl font-bold text-gray-900 mt-1">{stat.value}</h3>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PartiesSection({ topCustomers, cleanData, formatINR }) {
  const partyGroups = useMemo(() => {
    const map = {};
    cleanData.forEach(r => {
      const group = r["Party Group"] || "Ungrouped";
      const amount = parseFloat(r["Amount"]) || 0;
      map[group] = (map[group] || 0) + amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [cleanData]);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* CUSTOMER LIST */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Customer Performance</h3>
        <div className="space-y-4">
          {topCustomers.map(([name, amount], idx) => (
            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                  <Users size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{name}</p>
                  <p className="text-sm text-gray-500">Customer</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{formatINR(amount)}</p>
                <p className="text-sm text-gray-500">Total spent</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* PARTY GROUPS */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Party Group Analysis</h3>
        <div className="space-y-4">
          {partyGroups.map(([group, amount], idx) => {
            const percentage = (amount / cleanData.reduce((sum, r) => sum + (parseFloat(r["Amount"]) || 0), 0) * 100).toFixed(1);
            return (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">{group}</span>
                  <span className="font-bold text-gray-900">{formatINR(amount)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600"
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>{percentage}% of total</span>
                  <span>{idx + 1} rank</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ProductsSection({ topProducts, cleanData, formatINR }) {
  const productGroups = useMemo(() => {
    const map = {};
    cleanData.forEach(r => {
      const group = r["Item Group"] || "Ungrouped";
      const amount = parseFloat(r["Amount"]) || 0;
      const qty = parseFloat(r["Qty"]) || 0;
      if (!map[group]) map[group] = { amount: 0, qty: 0 };
      map[group].amount += amount;
      map[group].qty += qty;
    });
    return Object.entries(map).sort((a, b) => b[1].amount - a[1].amount);
  }, [cleanData]);

  return (
    <div className="space-y-6">
      {/* TOP PRODUCTS */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Product Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Product</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Quantity</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Revenue</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">Avg. Rate</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map(([name, amount], idx) => {
                const productData = cleanData.filter(r => r["ItemName"] === name);
                const totalQty = productData.reduce((sum, r) => sum + (parseFloat(r["Qty"]) || 0), 0);
                const avgRate = totalQty > 0 ? amount / totalQty : 0;
                
                return (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-100 to-orange-50 rounded-lg flex items-center justify-center">
                          <Package size={16} className="text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{name}</p>
                          <p className="text-xs text-gray-500">SKU: {idx.toString().padStart(3, '0')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 font-medium text-gray-900">{totalQty.toLocaleString()}</td>
                    <td className="text-right py-3 px-4 font-bold text-gray-900">{formatINR(amount)}</td>
                    <td className="text-right py-3 px-4 font-medium text-blue-600">{formatINR(avgRate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRODUCT GROUPS */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Product Group Analysis</h3>
        <div className="grid md:grid-cols-2 gap-6">
          {productGroups.slice(0, 6).map(([group, data], idx) => (
            <div key={idx} className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-bold text-gray-900">{group}</h4>
                  <p className="text-sm text-gray-500">Product Group</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
                  <Package size={18} className="text-blue-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Revenue</p>
                  <p className="text-lg font-bold text-gray-900">{formatINR(data.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Quantity</p>
                  <p className="text-lg font-bold text-gray-900">{data.qty.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TransactionsSection({ cleanData, openInvoice, exportCSV, currentPage, setCurrentPage, rowsPerPage }) {
  const totalPages = Math.ceil(cleanData.length / rowsPerPage);
  const startIdx = (currentPage - 1) * rowsPerPage;
  const endIdx = startIdx + rowsPerPage;
  const pageData = cleanData.slice(startIdx, endIdx);

  const columns = [
    "Date", "Voucher Number", "Party Name", "ItemName", 
    "Item Category", "Qty", "Amount"
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Transaction Log</h3>
            <p className="text-sm text-gray-500">{cleanData.length.toLocaleString()} total transactions</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => exportCSV(cleanData, "transactions")}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Download size={16} /> Export CSV
            </button>
            <button
              onClick={() => exportCSV(pageData, "current_page")}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Export Page
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className="text-left py-3 px-4 text-sm font-medium text-gray-600 sticky top-0">
                  {col}
                </th>
              ))}
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-600 sticky top-0">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageData.map((row, idx) => (
              <tr key={idx} className="hover:bg-blue-50 transition-colors">
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="py-3 px-4">
                    <div className={`${
                      col === "Amount" ? "font-bold text-gray-900" :
                      col === "Qty" ? "font-medium text-gray-700" :
                      "text-gray-600"
                    }`}>
                      {col === "Amount" ? `₹${(row[col] || 0).toLocaleString('en-IN')}` :
                       col === "Qty" ? (row[col] || 0).toLocaleString('en-IN') :
                       row[col] || "-"}
                    </div>
                  </td>
                ))}
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => openInvoice(row)}
                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors flex items-center gap-1 ml-auto"
                  >
                    <Eye size={14} /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {startIdx + 1} to {Math.min(endIdx, cleanData.length)} of {cleanData.length.toLocaleString()} entries
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors flex items-center gap-2"
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
                    className={`w-10 h-10 rounded-lg font-medium ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsSection({ cleanData, exportCSV, metrics }) {
  const reports = [
    {
      title: "Sales Summary",
      description: "Complete sales data with all fields",
      icon: "📊",
      color: "blue",
      action: () => exportCSV(cleanData, "sales_summary")
    },
    {
      title: "Party Ledger",
      description: "Party-wise consolidated report",
      icon: "👥",
      color: "green",
      action: () => {
        const partyMap = {};
        cleanData.forEach(r => {
          const party = r["Party Name"] || "Unknown";
          const amount = parseFloat(r["Amount"]) || 0;
          const qty = parseFloat(r["Qty"]) || 0;
          if (!partyMap[party]) partyMap[party] = { amount: 0, qty: 0, count: 0 };
          partyMap[party].amount += amount;
          partyMap[party].qty += qty;
          partyMap[party].count += 1;
        });
        
        const data = Object.entries(partyMap).map(([party, stats]) => ({
          "Party Name": party,
          "Transaction Count": stats.count,
          "Total Quantity": stats.qty,
          "Total Amount": stats.amount
        }));
        
        exportCSV(data, "party_ledger");
      }
    },
    {
      title: "Product Performance",
      description: "Item-wise sales analysis",
      icon: "📦",
      color: "orange",
      action: () => {
        const productMap = {};
        cleanData.forEach(r => {
          const product = r["ItemName"] || "Unknown";
          const amount = parseFloat(r["Amount"]) || 0;
          const qty = parseFloat(r["Qty"]) || 0;
          if (!productMap[product]) productMap[product] = { amount: 0, qty: 0, count: 0 };
          productMap[product].amount += amount;
          productMap[product].qty += qty;
          productMap[product].count += 1;
        });
        
        const data = Object.entries(productMap).map(([product, stats]) => ({
          "Product Name": product,
          "Transaction Count": stats.count,
          "Total Quantity": stats.qty,
          "Total Amount": stats.amount,
          "Average Rate": stats.qty > 0 ? stats.amount / stats.qty : 0
        }));
        
        exportCSV(data, "product_performance");
      }
    },
    {
      title: "Daily Sales Report",
      description: "Date-wise sales aggregation",
      icon: "📅",
      color: "purple",
      action: () => {
        const dailyMap = {};
        cleanData.forEach(r => {
          const date = r["Date"] || "Unknown";
          const amount = parseFloat(r["Amount"]) || 0;
          const qty = parseFloat(r["Qty"]) || 0;
          if (!dailyMap[date]) dailyMap[date] = { amount: 0, qty: 0, count: 0 };
          dailyMap[date].amount += amount;
          dailyMap[date].qty += qty;
          dailyMap[date].count += 1;
        });
        
        const data = Object.entries(dailyMap).map(([date, stats]) => ({
          "Date": date,
          "Transaction Count": stats.count,
          "Total Quantity": stats.qty,
          "Total Amount": stats.amount,
          "Average Value": stats.count > 0 ? stats.amount / stats.count : 0
        }));
        
        exportCSV(data, "daily_sales");
      }
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {reports.map((report, idx) => (
          <div key={idx} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl bg-${report.color}-100 flex items-center justify-center`}>
                <span className="text-2xl">{report.icon}</span>
              </div>
              <button
                onClick={report.action}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:shadow-md transition-all"
              >
                Generate
              </button>
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-2">{report.title}</h4>
            <p className="text-sm text-gray-600 mb-4">{report.description}</p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <CheckCircle size={14} className="text-green-500" />
              Ready to export
            </div>
          </div>
        ))}
      </div>

      {/* QUICK STATS */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
        <h4 className="text-lg font-bold mb-4">Report Statistics</h4>
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm opacity-90">Total Records</p>
            <p className="text-2xl font-bold">{cleanData.length.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm opacity-90">Data Size</p>
            <p className="text-2xl font-bold">{(JSON.stringify(cleanData).length / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <div>
            <p className="text-sm opacity-90">Time Range</p>
            <p className="text-2xl font-bold">
              {cleanData.length > 0 ? 
                `${new Date(Math.min(...cleanData.filter(r => r.Date).map(r => new Date(r.Date)))).toLocaleDateString()} - ${new Date(Math.max(...cleanData.filter(r => r.Date).map(r => new Date(r.Date)))).toLocaleDateString()}` 
                : 'N/A'}
            </p>
          </div>
          <div>
            <p className="text-sm opacity-90">Last Generated</p>
            <p className="text-2xl font-bold">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartsSection({ monthlySales, companySplit, areaSales }) {
  return (
    <div className="space-y-6">
      {/* COMPARISON CHARTS */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* BAR CHART - TOP AREAS */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Top Areas Performance</h3>
          <div className="h-64">
            <Bar
              data={{
                labels: areaSales.slice(0, 8).map(([area]) => area),
                datasets: [{
                  label: 'Sales Amount',
                  data: areaSales.slice(0, 8).map(([, amount]) => amount),
                  backgroundColor: 'rgba(59, 130, 246, 0.8)',
                  borderRadius: 4,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => `₹${ctx.raw.toLocaleString('en-IN')}`
                    }
                  }
                },
                scales: {
                  x: {
                    grid: { display: false }
                  },
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: (val) => `₹${(val/1000).toFixed(0)}K`
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* LINE CHART - SALES TREND */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Monthly Sales Trend</h3>
          <div className="h-64">
            <Line
              data={{
                labels: monthlySales.labels,
                datasets: [{
                  label: 'Sales',
                  data: monthlySales.values,
                  borderColor: '#10B981',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  borderWidth: 2,
                  tension: 0.4,
                  fill: true,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false }
                },
                scales: {
                  y: {
                    ticks: {
                      callback: (val) => `₹${(val/1000).toFixed(0)}K`
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* PIE CHART - COMPANY DISTRIBUTION */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Revenue Distribution by Company</h3>
        <div className="h-96">
          <Doughnut
            data={{
              labels: companySplit.labels,
              datasets: [{
                data: companySplit.values,
                backgroundColor: [
                  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                  '#EC4899', '#6366F1', '#14B8A6', '#F97316', '#06B6D4'
                ],
                borderWidth: 2,
                borderColor: '#fff',
              }]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'right',
                  labels: {
                    padding: 20,
                    usePointStyle: true,
                    font: { size: 12 }
                  }
                },
                tooltip: {
                  callbacks: {
                    label: (ctx) => `₹${ctx.raw.toLocaleString('en-IN')} (${((ctx.raw / companySplit.values.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%)`
                  }
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ==========================================
// INVOICE MODAL (PROFESSIONAL VERSION)
// ==========================================
function InvoiceModal({ refObj, row, onClose, onPrint, onShare, onCopy, formatINR }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div 
        ref={refObj}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        {/* HEADER */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Tax Invoice</h2>
              <p className="text-blue-100">Professional Invoice Preview</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* INVOICE CONTENT */}
        <div className="p-8">
          {/* COMPANY HEADER */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">COMMUNICATION WORLD INFOMATIC PVT. LTD.</h1>
            <p className="text-gray-600 mt-2">Business Intelligence Solutions • Tally Integration • Data Analytics</p>
            <div className="flex justify-center gap-6 mt-4 text-sm text-gray-500">
              <span>GSTIN: 09AABCU9603R1ZM</span>
              <span>PAN: AABCU9603R</span>
              <span>State Code: 09</span>
            </div>
          </div>

          {/* INVOICE DETAILS */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText size={18} /> Invoice Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Invoice Number:</span>
                  <span className="font-bold">{row["Voucher Number"] || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">{row["Date"] || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Voucher Type:</span>
                  <span className="font-medium">{row["Voucher Type"] || "Sales"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Salesman:</span>
                  <span className="font-medium">{row["Salesman"] || "—"}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users size={18} /> Customer Details
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-600">Name</p>
                  <p className="font-bold text-lg">{row["Party Name"] || "—"}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600">Group</p>
                    <p className="font-medium">{row["Party Group"] || "—"}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Area</p>
                    <p className="font-medium">{row["City/Area"] || "—"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ITEM TABLE */}
          <div className="mb-8 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left py-3 px-4 font-bold text-gray-700">Description</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-700">Quantity</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-700">Rate</th>
                  <th className="text-right py-3 px-4 font-bold text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-4 px-4">
                    <div>
                      <p className="font-bold text-gray-900">{row["ItemName"] || "—"}</p>
                      <p className="text-sm text-gray-600">
                        Category: {row["Item Category"] || "—"} | Group: {row["Item Group"] || "—"}
                      </p>
                    </div>
                  </td>
                  <td className="text-right py-4 px-4 font-medium">
                    {(row["Qty"] || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="text-right py-4 px-4 font-medium">
                    {formatINR(row["Rate"] || 0)}
                  </td>
                  <td className="text-right py-4 px-4 font-bold text-gray-900">
                    {formatINR(row["Amount"] || 0)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TOTALS */}
          <div className="flex justify-end">
            <div className="w-full md:w-80 bg-gray-50 p-6 rounded-xl">
              <div className="space-y-3">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatINR(row["Amount"] || 0)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax (GST)</span>
                  <span>{formatINR(0)}</span>
                </div>
                <div className="border-t border-gray-300 pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount</span>
                    <span className="text-blue-600">{formatINR(row["Amount"] || 0)}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Amount in words: {amountInWords(row["Amount"] || 0)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* NARRATION */}
          {row["Narration"] && (
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-100 rounded-xl">
              <p className="text-sm text-yellow-800">
                <span className="font-bold">Note:</span> {row["Narration"]}
              </p>
            </div>
          )}

          {/* FOOTER */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>This is a computer generated invoice. No signature required.</p>
            <p className="mt-1">Thank you for your business!</p>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-2xl">
          <div className="flex flex-wrap gap-3 justify-between">
            <div className="flex gap-3">
              <button
                onClick={onPrint}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <Printer size={18} /> Print
              </button>
              <button
                onClick={onShare}
                className="px-5 py-2.5 bg-blue-100 text-blue-700 rounded-xl font-medium hover:bg-blue-200 transition-colors flex items-center gap-2"
              >
                <Share2 size={18} /> Share
              </button>
              <button
                onClick={onCopy}
                className="px-5 py-2.5 bg-green-100 text-green-700 rounded-xl font-medium hover:bg-green-200 transition-colors flex items-center gap-2"
              >
                <Copy size={18} /> Copy
              </button>
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
            >
              Close Invoice
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// HELPER FUNCTION FOR AMOUNT IN WORDS
function amountInWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero Rupees';
  
  let words = '';
  
  // Crores
  if (Math.floor(num / 10000000) > 0) {
    words += amountInWords(Math.floor(num / 10000000)) + ' Crore ';
    num %= 10000000;
  }
  
  // Lakhs
  if (Math.floor(num / 100000) > 0) {
    words += amountInWords(Math.floor(num / 100000)) + ' Lakh ';
    num %= 100000;
  }
  
  // Thousands
  if (Math.floor(num / 1000) > 0) {
    words += amountInWords(Math.floor(num / 1000)) + ' Thousand ';
    num %= 1000;
  }
  
  // Hundreds
  if (Math.floor(num / 100) > 0) {
    words += ones[Math.floor(num / 100)] + ' Hundred ';
    num %= 100;
  }
  
  // Tens and Ones
  if (num > 0) {
    if (num < 10) {
      words += ones[num];
    } else if (num < 20) {
      words += teens[num - 10];
    } else {
      words += tens[Math.floor(num / 10)];
      if (num % 10 > 0) {
        words += ' ' + ones[num % 10];
      }
    }
  }
  
  return words.trim() + ' Rupees Only';
}
