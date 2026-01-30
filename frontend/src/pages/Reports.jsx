// src/pages/Reports.jsx - COMPACT & FEATURE-RICH VERSION
import React, { useState, useEffect, useMemo } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { useAuth } from "../context/AuthContext";
import { 
  Download, Filter, Search, FileText, BarChart3, 
  RefreshCw, ChevronLeft, ChevronRight, X, Calendar,
  Printer, Eye, ChevronDown, ChevronUp, Settings,
  TrendingUp, Users, Package, CreditCard
} from "lucide-react";

export default function Reports({ isLight }) {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Filters State
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("All"); 
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [partyFilter, setPartyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [salesmanFilter, setSalesmanFilter] = useState("");
  const [itemGroupFilter, setItemGroupFilter] = useState("");

  // Sorting State
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  // View State
  const [viewMode, setViewMode] = useState("table");
  const [statementType, setStatementType] = useState("party");
  const [excelOpen, setExcelOpen] = useState(false);
  
  // Mobile State
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Data Range Info
  const [dataRangeInfo, setDataRangeInfo] = useState({ start: null, end: null });

  // Pagination
  const rowsPerPage = 30;
  const [page, setPage] = useState(1);

  // Display Columns
  const DISPLAY_COLUMNS = [
    "Sr.No",
    "Date",
    "Party Name",
    "Item Name",
    "Item Category",
    "City/Area",
    "Item Group",
    "Salesman", 
    "Qty",
    "Amount",
    "Sales %"
  ];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const backendURL =
        window.location.hostname.includes("localhost") || window.location.hostname === "127.0.0.1"
          ? "http://127.0.0.1:8787"
          : "https://selt-t-backend.selt-3232.workers.dev";

      const res = await fetch(`${backendURL}/api/vouchers?limit=50000`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });

      const json = await res.json();

      if (json.success && json.data) {
        const mapped = json.data.map((row, i) => ({
          _rawDate: row.date,
          "Sr.No": i + 1,
          "Date": row.date || "",
          "Party Name": row.party_name || "N/A",
          "Item Name": row.name_item || row.item_name || "N/A",
          "Item Category": row.item_category || row.category || "N/A",
          "City/Area": row.city_area || row.area || row.city || "N/A",
          "Item Group": row.item_group || "N/A",
          "Salesman": row.salesman || row.party_group || "N/A",
          "__party_group": row.party_group || "",
          "SalesmanRaw": row.salesman || "",
          "Qty": Number(row.qty) || 0,
          "Amount": Number(row.amount) || 0,
        }));

        setData(mapped);
        setFiltered(mapped);
        setDataLoaded(true);
        
        // Calculate data range
        if (mapped.length > 0) {
          const dates = mapped.map(d => new Date(d._rawDate)).filter(d => !isNaN(d));
          if (dates.length > 0) {
            const minDate = new Date(Math.min(...dates));
            const maxDate = new Date(Math.max(...dates));
            setDataRangeInfo({
              start: minDate.toLocaleDateString('en-IN'),
              end: maxDate.toLocaleDateString('en-IN')
            });
          }
        }
      } else {
        setData([]);
        setFiltered([]);
      }
    } catch (e) {
      console.error("Error loading data:", e);
      setData([]);
      setFiltered([]);
    }
    setLoading(false);
  }

  // --- DATE LOGIC ---
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

    if (dateRange === "Today") {
      return d.toDateString() === today.toDateString();
    }

    if (dateRange === "Yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      return d.toDateString() === yesterday.toDateString();
    }

    if (dateRange === "This Week") {
      const firstDay = new Date(today);
      const day = firstDay.getDay() || 7; 
      if (day !== 1) firstDay.setDate(firstDay.getDate() - (day - 1));
      firstDay.setHours(0, 0, 0, 0);
      return d >= firstDay && d <= new Date(today.setHours(23,59,59,999));
    }

    if (dateRange === "This Month") {
      return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    }

    if (dateRange === "Last Month") {
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return d.getMonth() === lastMonth.getMonth() && d.getFullYear() === lastMonth.getFullYear();
    }

    return true;
  };

  // --- FILTER ENGINE ---
  useEffect(() => {
    let rows = [...data];

    try {
      if (user) {
        if (user.companyLockEnabled && Array.isArray(user.allowedCompanies) && user.allowedCompanies.length) {
          rows = rows.filter(r => user.allowedCompanies.includes(r["Item Category"]));
        }
        if (user.partyLockEnabled && Array.isArray(user.allowedPartyGroups) && user.allowedPartyGroups.length) {
          rows = rows.filter(r => user.allowedPartyGroups.includes(r["__party_group"]));
        }
      }
    } catch (e) {
      console.warn("Lock filter error:", e);
    }

    rows = rows.filter(r => checkDateRange(r._rawDate));

    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter((r) =>
        Object.values(r).some((val) => String(val || "").toLowerCase().includes(s))
      );
    }

    if (partyFilter) rows = rows.filter((r) => r["Party Name"] === partyFilter);
    if (categoryFilter) rows = rows.filter((r) => r["Item Category"] === categoryFilter);
    if (salesmanFilter) rows = rows.filter((r) => r["Salesman"] === salesmanFilter);
    if (itemGroupFilter) rows = rows.filter((r) => r["Item Group"] === itemGroupFilter);

    if (sortConfig.key) {
      rows.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    const reindexed = rows.map((row, idx) => ({ ...row, "Sr.No": idx + 1 }));
    setFiltered(reindexed);
    setPage(1);
  }, [search, dateRange, customStart, customEnd, partyFilter, categoryFilter, salesmanFilter, itemGroupFilter, sortConfig, data, user]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // --- CALCULATIONS ---
  const totalAmount = filtered.reduce((a, b) => a + (b.Amount || 0), 0);
  const totalQty = filtered.reduce((a, b) => a + (b.Qty || 0), 0);

  // Pagination Logic
  const pageStart = (page - 1) * rowsPerPage;
  const pageRows = filtered.slice(pageStart, pageStart + rowsPerPage);
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));

  // Unique lists
  const parties = useMemo(() => {
    const set = new Set();
    data.forEach(d => { if (d["Party Name"]) set.add(d["Party Name"]); });
    return [...set].sort();
  }, [data]);

  const categories = useMemo(() => {
    const set = new Set();
    data.forEach(d => { if (d["Item Category"]) set.add(d["Item Category"]); });
    return [...set].sort();
  }, [data]);

  const itemGroups = useMemo(() => {
    const set = new Set();
    data.forEach(d => { if (d["Item Group"]) set.add(d["Item Group"]); });
    return [...set].sort();
  }, [data]);

  const salesmen = useMemo(() => {
    const set = new Set();
    data.forEach(d => { if (d["Salesman"]) set.add(d["Salesman"]); });
    return [...set].sort();
  }, [data]);

  // --- STATEMENT GENERATION ---
  const generateStatement = () => {
    let groupedData = {};

    if (statementType === "party") {
      filtered.forEach(row => {
        const key = row["Party Name"];
        if (!groupedData[key]) groupedData[key] = { qty: 0, amount: 0, items: 0 };
        groupedData[key].qty += row.Qty;
        groupedData[key].amount += row.Amount;
        groupedData[key].items += 1;
      });
    } else if (statementType === "salesman") {
      filtered.forEach(row => {
        const key = row["Salesman"];
        if (!groupedData[key]) groupedData[key] = { qty: 0, amount: 0, items: 0 };
        groupedData[key].qty += row.Qty;
        groupedData[key].amount += row.Amount;
        groupedData[key].items += 1;
      });
    } else if (statementType === "category") {
      filtered.forEach(row => {
        const key = row["Item Category"];
        if (!groupedData[key]) groupedData[key] = { qty: 0, amount: 0, items: 0 };
        groupedData[key].qty += row.Qty;
        groupedData[key].amount += row.Amount;
        groupedData[key].items += 1;
      });
    } else if (statementType === "itemgroup") {
      filtered.forEach(row => {
        const key = row["Item Group"];
        if (!groupedData[key]) groupedData[key] = { qty: 0, amount: 0, items: 0 };
        groupedData[key].qty += row.Qty;
        groupedData[key].amount += row.Amount;
        groupedData[key].items += 1;
      });
    }

    return Object.entries(groupedData).map(([name, stats]) => ({
      name,
      ...stats,
      percentage: totalAmount > 0 ? ((stats.amount / totalAmount) * 100).toFixed(2) : 0
    }));
  };

  const statementData = generateStatement();

  // Export Logic
  const exportExcel = () => {
    const exportData = filtered.map(row => ({
      ...row,
      "Sales %": totalAmount > 0 ? ((row.Amount / totalAmount) * 100).toFixed(2) + "%" : "0%"
    }));
    const cleanData = exportData.map(({ _rawDate, __party_group, SalesmanRaw, ...rest }) => rest);
    const ws = XLSX.utils.json_to_sheet(cleanData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master_Report");
    XLSX.writeFile(wb, "Sel-T_Report.xlsx");
  };

  const exportStatementExcel = () => {
    const ws = XLSX.utils.json_to_sheet(statementData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Statement_${statementType}`);
    XLSX.writeFile(wb, `Sel-T_Statement_${statementType}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF("l", "mm", "a3");
    doc.text("MASTER REPORT", 14, 15);
    const pdfRows = filtered.map(row => {
      const percent = totalAmount > 0 ? ((row.Amount / totalAmount) * 100).toFixed(2) + "%" : "0%";
      return [row["Sr.No"], row["Date"], row["Party Name"], row["Item Name"], row["Item Category"], row["City/Area"], row["Item Group"], row["Salesman"], row["Qty"], row["Amount"].toLocaleString("en-IN"), percent];
    });
    doc.autoTable({ head: [DISPLAY_COLUMNS], body: pdfRows, startY: 20, styles: { fontSize: 8 } });
    doc.save("Master_Report.pdf");
  };

  const exportStatementPDF = () => {
    const doc = new jsPDF("p", "mm", "a4");
    doc.text(`${statementType.toUpperCase()} STATEMENT`, 14, 15);
    
    const pdfRows = statementData.map(row => [
      row.name,
      row.qty,
      row.amount.toLocaleString("en-IN"),
      row.items,
      row.percentage + "%"
    ]);

    const headers = ["Name", "Qty", "Amount", "Items", "% of Total"];
    doc.autoTable({ head: [headers], body: pdfRows, startY: 25, styles: { fontSize: 10 } });
    doc.save(`Statement_${statementType}.pdf`);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearch("");
    setDateRange("All");
    setCustomStart("");
    setCustomEnd("");
    setPartyFilter("");
    setCategoryFilter("");
    setSalesmanFilter("");
    setItemGroupFilter("");
  };

  // Get current filter summary
  const getFilterSummary = () => {
    const filters = [];
    if (dateRange !== "All") filters.push(dateRange);
    if (partyFilter) filters.push(`Party: ${partyFilter}`);
    if (categoryFilter) filters.push(`Category: ${categoryFilter}`);
    if (salesmanFilter) filters.push(`Salesman: ${salesmanFilter}`);
    if (itemGroupFilter) filters.push(`Group: ${itemGroupFilter}`);
    return filters.length > 0 ? filters.join(", ") : "All Records";
  };

  return (
    <div className={`min-h-screen ${isLight ? 'bg-gray-50' : 'bg-gray-900'} p-2 sm:p-3 md:p-4 font-sans overflow-x-hidden`}>
      
      {/* HEADER - COMPACT */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-3 md:mb-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="p-1.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg shadow">
                <FileText className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
                <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">Master Report</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {dataLoaded && dataRangeInfo.start ? (
                    <span className="flex items-center gap-1">
                      <Calendar size={10} /> Data: {dataRangeInfo.start} to {dataRangeInfo.end}
                    </span>
                  ) : "Loading data..."}
                </p>
            </div>
        </div>

        {/* QUICK STATS - COMPACT */}
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto mt-2 md:mt-0">
           <div className="bg-white dark:bg-gray-800 px-2 py-1 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex items-center gap-2 flex-1 md:flex-none">
              <div className="p-1 bg-blue-100 dark:bg-blue-900/30 rounded text-blue-600 dark:text-blue-400 text-xs font-bold">REC</div>
              <div>
                 <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase">Records</p>
                 <p className="text-sm font-bold text-gray-800 dark:text-white">{filtered.length}</p>
              </div>
           </div>
           <div className="bg-white dark:bg-gray-800 px-2 py-1 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex items-center gap-2 flex-1 md:flex-none">
              <div className="p-1 bg-green-100 dark:bg-green-900/30 rounded text-green-600 dark:text-green-400 text-xs font-bold">AMT</div>
              <div>
                 <p className="text-[9px] text-gray-500 dark:text-gray-400 uppercase">Amount</p>
                 <p className="text-sm font-bold text-blue-600 dark:text-blue-400">₹{(totalAmount/100000).toFixed(1)}L</p>
              </div>
           </div>
        </div>
      </div>

      {/* VIEW TOGGLE & QUICK ACTIONS */}
      <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow border border-gray-200 dark:border-gray-700 mb-3 flex flex-wrap gap-1.5">
        <button 
          onClick={() => { setViewMode("table"); setPage(1); }}
          className={`px-3 py-1.5 rounded-md font-medium text-xs ${viewMode === "table" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}
        >
          <FileText size={12} className="inline mr-1" /> Table
        </button>
        <button 
          onClick={() => { setViewMode("statement"); setPage(1); }}
          className={`px-3 py-1.5 rounded-md font-medium text-xs ${viewMode === "statement" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"}`}
        >
          <BarChart3 size={12} className="inline mr-1" /> Statement
        </button>
        
        <div className="flex-1"></div>
        
        <button onClick={loadData} className="px-2 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs">
          <RefreshCw size={12} className="inline" />
        </button>
        <button onClick={exportExcel} className="px-2 py-1.5 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs">
          <Download size={12} className="inline" />
        </button>
        <button onClick={() => setShowFilters(!showFilters)} className="px-2 py-1.5 rounded-md bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs md:hidden">
          <Filter size={12} className="inline" />
        </button>
      </div>

      {/* FILTER SUMMARY BAR */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-2 mb-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium text-blue-700 dark:text-blue-300">Active Filters:</span>
            <span className="text-gray-600 dark:text-gray-400">{getFilterSummary()}</span>
          </div>
          <button onClick={clearFilters} className="text-red-600 dark:text-red-400 text-xs flex items-center gap-1">
            <X size={10} /> Clear All
          </button>
        </div>
      </div>

      {/* ADVANCED FILTERS PANEL */}
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 mb-3 ${showFilters ? 'block' : 'hidden md:block'}`}>
        <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Settings size={14} className="text-gray-500" />
            <span className="text-sm font-medium">Filters & Options</span>
          </div>
          <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-gray-500">
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
        
        {showAdvanced && (
          <div className="p-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 text-gray-400" size={14} />
                <input
                  placeholder="Search anything..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-sm rounded py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="All">All Dates</option>
                  <option value="Today">Today</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="This Week">This Week</option>
                  <option value="This Month">This Month</option>
                  <option value="Last Month">Last Month</option>
                  <option value="Custom">Custom Range</option>
                </select>
              </div>

              <div>
                <select value={partyFilter} onChange={(e) => setPartyFilter(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-sm rounded py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">All Parties</option>
                  {parties.slice(0, 50).map((p) => <option key={p} value={p}>{p.length > 20 ? p.substring(0, 20) + "..." : p}</option>)}
                </select>
              </div>

              <div>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-sm rounded py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">All Categories</option>
                  {categories.slice(0, 50).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Additional filters row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <div>
                <select value={itemGroupFilter} onChange={(e) => setItemGroupFilter(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-sm rounded py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">All Item Groups</option>
                  {itemGroups.slice(0, 50).map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div>
                <select value={salesmanFilter} onChange={(e) => setSalesmanFilter(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-sm rounded py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option value="">All Salesmen</option>
                  {salesmen.slice(0, 50).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {viewMode === "statement" && (
                <div>
                  <select value={statementType} onChange={(e) => setStatementType(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-sm rounded py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option value="party">Party Wise</option>
                    <option value="salesman">Salesman Wise</option>
                    <option value="category">Category Wise</option>
                    <option value="itemgroup">Group Wise</option>
                  </select>
                </div>
              )}
            </div>

            {dateRange === "Custom" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
                  <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-sm rounded py-1.5 px-2" />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">End Date</label>
                  <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-sm rounded py-1.5 px-2" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
        
        {/* TABLE VIEW */}
        {viewMode === "table" && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1024px] text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300">
                  <tr>
                    {DISPLAY_COLUMNS.map((col) => (
                      <th 
                        key={col} 
                        onClick={() => requestSort(col)}
                        className="px-3 py-2 font-medium text-left cursor-pointer border-b border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center gap-1">
                          {col}
                          {sortConfig.key === col && (
                            <span className="text-xs">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={DISPLAY_COLUMNS.length} className="text-center py-8 text-gray-500">Loading data...</td></tr>
                  ) : pageRows.length === 0 ? (
                    <tr><td colSpan={DISPLAY_COLUMNS.length} className="text-center py-8 text-gray-500">No records found</td></tr>
                  ) : (
                    pageRows.map((row, idx) => {
                      const percent = totalAmount > 0 ? ((row.Amount / totalAmount) * 100).toFixed(2) + "%" : "0%";
                      return (
                        <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-center">{row["Sr.No"]}</td>
                          <td className="px-3 py-2 text-gray-700 dark:text-gray-300">{row.Date}</td>
                          <td className="px-3 py-2 font-medium text-gray-800 dark:text-white">{row["Party Name"]}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row["Item Name"]}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row["Item Category"]}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{row["City/Area"]}</td>
                          <td className="px-3 py-2 text-blue-600 dark:text-blue-400">{row["Item Group"]}</td>
                          <td className="px-3 py-2 text-orange-600 dark:text-orange-400">{row["Salesman"]}</td>
                          <td className="px-3 py-2 text-right font-medium">{row.Qty}</td>
                          <td className="px-3 py-2 text-right font-bold text-green-600 dark:text-green-400">₹{row.Amount.toLocaleString("en-IN")}</td>
                          <td className="px-3 py-2 text-right font-bold">{percent}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {!loading && filtered.length > 0 && (
                  <tfoot className="bg-gray-50 dark:bg-gray-900 font-bold">
                    <tr>
                      <td colSpan="8" className="px-3 py-2 text-right">TOTAL:</td>
                      <td className="px-3 py-2 text-right">{totalQty.toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">₹{totalAmount.toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2 text-right">100.00%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row justify-between items-center p-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 sm:mb-0">
                Showing {pageStart + 1}-{Math.min(pageStart + rowsPerPage, filtered.length)} of {filtered.length} records
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => setPage(page - 1)} 
                  disabled={page === 1}
                  className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={12} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  if (totalPages <= 5 || Math.abs(page - pageNum) <= 2) {
                    return (
                      <button
                        key={i}
                        onClick={() => setPage(pageNum)}
                        className={`px-2 py-1 text-xs rounded ${page === pageNum ? 'bg-blue-600 text-white' : 'border border-gray-300 dark:border-gray-600'}`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                })}
                <button 
                  onClick={() => setPage(page + 1)} 
                  disabled={page === totalPages || totalPages === 0}
                  className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* STATEMENT VIEW */}
        {viewMode === "statement" && (
          <>
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white">
                    {statementType === "party" && "Party Wise Statement"}
                    {statementType === "salesman" && "Salesman Wise Statement"}
                    {statementType === "category" && "Category Wise Statement"}
                    {statementType === "itemgroup" && "Item Group Wise Statement"}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Period: {dataRangeInfo.start} to {dataRangeInfo.end} | 
                    Total Amount: ₹{totalAmount.toLocaleString("en-IN")} | 
                    Total Records: {filtered.length}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={exportStatementExcel} className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded flex items-center gap-1">
                    <Download size={12} /> Excel
                  </button>
                  <button onClick={exportStatementPDF} className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded flex items-center gap-1">
                    <FileText size={12} /> PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-700">Sr.No</th>
                    <th className="px-3 py-2 text-left border-b border-gray-200 dark:border-gray-700">
                      {statementType === "party" && "Party Name"}
                      {statementType === "salesman" && "Salesman"}
                      {statementType === "category" && "Category"}
                      {statementType === "itemgroup" && "Item Group"}
                    </th>
                    <th className="px-3 py-2 text-right border-b border-gray-200 dark:border-gray-700">Qty</th>
                    <th className="px-3 py-2 text-right border-b border-gray-200 dark:border-gray-700">Amount</th>
                    <th className="px-3 py-2 text-right border-b border-gray-200 dark:border-gray-700">Items</th>
                    <th className="px-3 py-2 text-right border-b border-gray-200 dark:border-gray-700">% Share</th>
                  </tr>
                </thead>
                <tbody>
                  {statementData.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium text-gray-800 dark:text-white">{row.name}</td>
                      <td className="px-3 py-2 text-right">{row.qty.toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2 text-right font-bold text-green-600 dark:text-green-400">₹{row.amount.toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2 text-right">{row.items}</td>
                      <td className="px-3 py-2 text-right font-bold">{row.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
                {statementData.length > 0 && (
                  <tfoot className="bg-gray-50 dark:bg-gray-900 font-bold">
                    <tr>
                      <td colSpan="2" className="px-3 py-2 text-right">TOTAL:</td>
                      <td className="px-3 py-2 text-right">{statementData.reduce((a, b) => a + b.qty, 0).toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2 text-right text-green-600 dark:text-green-400">₹{totalAmount.toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2 text-right">{statementData.reduce((a, b) => a + b.items, 0)}</td>
                      <td className="px-3 py-2 text-right">100.00%</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </>
        )}
      </div>

      {/* QUICK ACTION BAR */}
      <div className="flex justify-center gap-2 mt-3">
        <button 
          onClick={() => setExcelOpen(true)}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg flex items-center gap-1"
        >
          <Eye size={12} /> Quick Preview
        </button>
        <button 
          onClick={exportExcel}
          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg flex items-center gap-1"
        >
          <Download size={12} /> Export All
        </button>
        <button 
          onClick={() => window.print()}
          className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded-lg flex items-center gap-1"
        >
          <Printer size={12} /> Print
        </button>
      </div>

      {/* PREVIEW MODAL */}
      {excelOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center p-2 sm:p-4 z-50">
          <div className="bg-white dark:bg-gray-800 w-full h-full sm:w-full sm:max-w-6xl sm:h-[80vh] rounded-lg shadow-2xl flex flex-col">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 dark:text-white">Data Preview</h3>
              <button onClick={() => setExcelOpen(false)} className="text-red-500 hover:text-red-700">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-2">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-gray-300 dark:border-gray-600">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-900">
                      {DISPLAY_COLUMNS.map(c => 
                        <th key={c} className="p-2 border border-gray-300 dark:border-gray-600 text-left">{c}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 50).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="p-2 border border-gray-300 dark:border-gray-600">{row["Sr.No"]}</td>
                        <td className="p-2 border border-gray-300 dark:border-gray-600">{row["Date"]}</td>
                        <td className="p-2 border border-gray-300 dark:border-gray-600 font-medium">{row["Party Name"]}</td>
                        <td className="p-2 border border-gray-300 dark:border-gray-600">{row["Item Name"]}</td>
                        <td className="p-2 border border-gray-300 dark:border-gray-600">{row["Item Category"]}</td>
                        <td className="p-2 border border-gray-300 dark:border-gray-600">{row["City/Area"]}</td>
                        <td className="p-2 border border-gray-300 dark:border-gray-600">{row["Item Group"]}</td>
                        <td className="p-2 border border-gray-300 dark:border-gray-600">{row["Salesman"]}</td>
                        <td className="p-2 border border-gray-300 dark:border-gray-600 text-right">{row["Qty"]}</td>
                        <td className="p-2 border border-gray-300 dark:border-gray-600 text-right font-bold">₹{row["Amount"].toLocaleString("en-IN")}</td>
                        <td className="p-2 border border-gray-300 dark:border-gray-600 text-right">
                          {totalAmount > 0 ? ((row.Amount / totalAmount) * 100).toFixed(2) + "%" : "0%"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
