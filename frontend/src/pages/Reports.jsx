// src/pages/Reports.jsx
import React, { useState, useEffect, useMemo } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { useAuth } from "../context/AuthContext";

export default function Reports() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);

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
  const [viewMode, setViewMode] = useState("table"); // "table" or "statement"
  const [statementType, setStatementType] = useState("party"); // "party", "salesman", "category", "itemgroup"
  const [excelOpen, setExcelOpen] = useState(false);

  // Pagination
  const rowsPerPage = 50;
  const [page, setPage] = useState(1);

  // Display Columns Configuration
  const DISPLAY_COLUMNS = [
    { label: "Sr.No", key: "Sr.No", width: "w-16" },
    { label: "Date", key: "Date", width: "w-28" },
    { label: "Party Name", key: "Party Name", width: "w-64" },
    { label: "Item Name", key: "Item Name", width: "w-64" },
    { label: "Item Category", key: "Item Category", width: "w-40" },
    { label: "City/Area", key: "City/Area", width: "w-40" },
    { label: "Item Group", key: "Item Group", width: "w-40" },
    { label: "Salesman", key: "Salesman", width: "w-40" }, 
    { label: "Qty", key: "Qty", width: "w-24" },
    { label: "Amount", key: "Amount", width: "w-32" },
    { label: "Sales %", key: "Sales %", width: "w-24" }
  ];

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          // Data mapping fix: checking multiple possible keys based on your issue
          "Item Category": row.item_category || row.category || row.parent || "N/A",
          "City/Area": row.city_area || row.area || row.station || "N/A",
          "Item Group": row.item_group || row.group_item || "N/A",
          "Salesman": row.salesman || row.party_group || "N/A",
          "__party_group": row.party_group || "",
          "SalesmanRaw": row.salesman || "",
          "Qty": Number(row.qty) || 0,
          "Amount": Number(row.amount) || 0,
        }));

        setData(mapped);
        setFiltered(mapped);
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

    if (dateRange === "This Quarter") {
      const currentQuarter = Math.floor((today.getMonth()) / 3);
      const dateQuarter = Math.floor((d.getMonth()) / 3);
      return currentQuarter === dateQuarter && d.getFullYear() === today.getFullYear();
    }

    if (dateRange === "This Year") {
      return d.getFullYear() === today.getFullYear();
    }

    if (dateRange === "Last Year") {
      return d.getFullYear() === today.getFullYear() - 1;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const updateGroup = (key, row) => {
        if (!key) return;
        if (!groupedData[key]) groupedData[key] = { qty: 0, amount: 0, items: 0 };
        groupedData[key].qty += row.Qty;
        groupedData[key].amount += row.Amount;
        groupedData[key].items += 1;
    }

    filtered.forEach(row => {
        if (statementType === "party") updateGroup(row["Party Name"], row);
        else if (statementType === "salesman") updateGroup(row["Salesman"], row);
        else if (statementType === "category") updateGroup(row["Item Category"], row);
        else if (statementType === "itemgroup") updateGroup(row["Item Group"], row);
    });

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
    const headers = DISPLAY_COLUMNS.map(c => c.key);
    doc.autoTable({ head: [headers], body: pdfRows, startY: 20, styles: { fontSize: 8 } });
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

  return (
    <div className="h-screen flex flex-col bg-[#F1F5F9] text-slate-800 font-sans overflow-hidden">
      
      {/* HEADER & STATS */}
      <div className="flex-none p-4 pb-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-lg shadow-lg shadow-indigo-200">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Master Report</h2>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Detailed Analysis View</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-3">
               <div className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 flex flex-col justify-center items-center min-w-[80px]">
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Records</p>
                  <p className="text-base font-black text-slate-800 leading-none">{filtered.length}</p>
               </div>
               <div className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 flex flex-col justify-center items-center min-w-[100px]">
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Total Qty</p>
                  <p className="text-base font-black text-slate-800 leading-none">{totalQty.toLocaleString("en-IN")}</p>
               </div>
               <div className="bg-white px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 flex flex-col justify-center items-center min-w-[120px]">
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Total Amt</p>
                  <p className="text-base font-black text-blue-600 leading-none">₹{(totalAmount/100000).toFixed(2)}L</p>
               </div>
            </div>
          </div>

          {/* CONTROLS BAR */}
          <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 mb-4 space-y-3">
             <div className="flex flex-col xl:flex-row gap-3 justify-between">
                
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 items-center">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button 
                            onClick={() => { setViewMode("table"); setPage(1); }}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === "table" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            Table
                        </button>
                        <button 
                            onClick={() => { setViewMode("statement"); setPage(1); }}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === "statement" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            Statement
                        </button>
                    </div>

                    <div className="h-6 w-px bg-gray-300 mx-1 hidden md:block"></div>

                    <button onClick={loadData} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 border border-gray-200">
                       Refresh
                    </button>
                    <button onClick={viewMode === "table" ? exportExcel : exportStatementExcel} className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700 font-bold text-xs hover:bg-green-100 border border-green-200">
                       Excel
                    </button>
                    <button onClick={viewMode === "table" ? exportPDF : exportStatementPDF} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 font-bold text-xs hover:bg-red-100 border border-red-200">
                       PDF
                    </button>
                    {viewMode === "table" && (
                        <button onClick={() => setExcelOpen(true)} className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs hover:bg-indigo-100 border border-indigo-200 hidden md:block">
                           View
                        </button>
                    )}
                </div>

                {/* Global Search */}
                <div className="relative w-full xl:w-64">
                    <span className="absolute left-3 top-2 text-gray-400">🔍</span>
                    <input
                        placeholder="Search anything..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 rounded-lg text-sm bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                    />
                </div>
             </div>

             {/* Filters Grid */}
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                 <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-blue-500">
                    <option>All</option><option>Today</option><option>Yesterday</option><option>This Week</option><option>This Month</option><option>Last Month</option><option>This Year</option><option>Custom</option>
                 </select>
                 
                 {dateRange === "Custom" && (
                   <>
                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="bg-gray-50 border border-gray-200 text-xs rounded-lg px-2 py-1.5" />
                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="bg-gray-50 border border-gray-200 text-xs rounded-lg px-2 py-1.5" />
                   </>
                 )}

                 <select value={partyFilter} onChange={(e) => setPartyFilter(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-1.5 outline-none">
                    <option value="">All Parties</option>
                    {parties.map((p) => <option key={p} value={p}>{p}</option>)}
                 </select>

                 <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-1.5 outline-none">
                    <option value="">All Categories</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                 </select>

                 <select value={itemGroupFilter} onChange={(e) => setItemGroupFilter(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-1.5 outline-none">
                    <option value="">All Item Groups</option>
                    {itemGroups.map((g) => <option key={g} value={g}>{g}</option>)}
                 </select>

                 <select value={salesmanFilter} onChange={(e) => setSalesmanFilter(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-1.5 outline-none">
                    <option value="">All Salesmen</option>
                    {salesmen.map((s) => <option key={s} value={s}>{s}</option>)}
                 </select>

                 {viewMode === "statement" && (
                    <select value={statementType} onChange={(e) => setStatementType(e.target.value)} className="bg-blue-50 border border-blue-200 text-blue-800 font-bold text-xs rounded-lg px-2 py-1.5 outline-none">
                        <option value="party">Statement: Party</option>
                        <option value="salesman">Statement: Salesman</option>
                        <option value="category">Statement: Category</option>
                        <option value="itemgroup">Statement: Item Group</option>
                    </select>
                 )}
             </div>
          </div>
      </div>

      {/* TABLE CONTENT AREA */}
      <div className="flex-1 overflow-hidden px-4 pb-4">
        
        {/* TABLE VIEW */}
        {viewMode === "table" && (
          <div className="h-full rounded-xl border border-gray-300 bg-white shadow-lg flex flex-col">
            {/* The wrapper div below handles the scroll without breaking layout */}
            <div className="flex-1 overflow-auto w-full relative">
                <table className="text-xs text-left border-collapse min-w-max w-full">
                  <thead className="bg-slate-800 text-white sticky top-0 z-20 shadow-md h-10">
                    <tr>
                      {DISPLAY_COLUMNS.map((col) => (
                        <th 
                            key={col.key} 
                            onClick={() => requestSort(col.key)}
                            className={`px-3 py-2 font-semibold uppercase tracking-wider cursor-pointer hover:bg-slate-700 transition-colors select-none border-r border-slate-600 ${col.width}`}
                        >
                            <div className="flex items-center gap-1">
                                {col.label}
                                {sortConfig.key === col.key && (
                                    <span className="text-[10px]">{sortConfig.direction === 'ascending' ? '▲' : '▼'}</span>
                                )}
                            </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr><td colSpan={DISPLAY_COLUMNS.length} className="text-center py-20 text-gray-400 font-medium text-sm">Loading Data...</td></tr>
                    ) : pageRows.length === 0 ? (
                      <tr><td colSpan={DISPLAY_COLUMNS.length} className="text-center py-20 text-gray-500 font-medium text-sm">No records found matching filters.</td></tr>
                    ) : (
                      pageRows.map((row, idx) => {
                        const percent = totalAmount > 0 ? ((row.Amount / totalAmount) * 100).toFixed(2) + "%" : "0%";
                        return (
                          <tr key={idx} className="hover:bg-blue-50 transition-colors even:bg-slate-50/60">
                            <td className="px-3 py-2 text-center text-gray-400 font-mono border-r border-gray-100">{row["Sr.No"]}</td>
                            <td className="px-3 py-2 text-gray-600 border-r border-gray-100 whitespace-nowrap">{row.Date}</td>
                            <td className="px-3 py-2 font-bold text-slate-700 border-r border-gray-100 truncate max-w-[200px]" title={row["Party Name"]}>{row["Party Name"]}</td>
                            <td className="px-3 py-2 text-gray-600 border-r border-gray-100 truncate max-w-[200px]" title={row["Item Name"]}>{row["Item Name"]}</td>
                            <td className="px-3 py-2 text-gray-500 border-r border-gray-100 truncate max-w-[150px]">{row["Item Category"]}</td>
                            <td className="px-3 py-2 text-gray-500 border-r border-gray-100 truncate max-w-[150px]">{row["City/Area"]}</td>
                            <td className="px-3 py-2 text-indigo-600 font-medium border-r border-gray-100 truncate max-w-[150px]">{row["Item Group"]}</td>
                            <td className="px-3 py-2 text-orange-600 font-medium border-r border-gray-100 truncate max-w-[150px]">{row["Salesman"]}</td>
                            <td className="px-3 py-2 text-right font-mono text-gray-700 border-r border-gray-100">{row.Qty}</td>
                            <td className="px-3 py-2 text-right font-bold text-blue-600 font-mono border-r border-gray-100">₹{row.Amount.toLocaleString("en-IN")}</td>
                            <td className="px-3 py-2 text-right font-bold text-emerald-600 font-mono">{percent}</td>
                          </tr>
                        );
                      })
                    )}
                    
                    {/* TOTALS ROW */}
                    {!loading && filtered.length > 0 && (
                      <tr className="bg-yellow-50 border-t-2 border-yellow-200 font-bold text-slate-800 sticky bottom-0 z-20 shadow-inner">
                        <td colSpan="8" className="px-3 py-2.5 text-right uppercase text-xs tracking-wider">TOTAL:</td>
                        <td className="px-3 py-2.5 text-right font-mono text-blue-700">{totalQty.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-blue-700">₹{totalAmount.toLocaleString("en-IN")}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-emerald-600">100.00%</td>
                      </tr>
                    )}
                  </tbody>
                </table>
            </div>
            
            {/* Pagination Footer */}
            <div className="bg-gray-50 border-t border-gray-200 p-2 flex justify-between items-center text-xs">
                <span className="text-gray-500">
                  Showing <b className="text-slate-800">{pageRows.length}</b> rows | Page <b className="text-slate-800">{page}</b> of <b>{totalPages}</b>
                </span>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-600 font-bold hover:bg-gray-100 disabled:opacity-50 transition-all">Previous</button>
                  <button disabled={page === totalPages || totalPages === 0} onClick={() => setPage(page + 1)} className="px-3 py-1 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm">Next</button>
                </div>
            </div>
          </div>
        )}

        {/* STATEMENT VIEW */}
        {viewMode === "statement" && (
          <div className="h-full rounded-xl border border-gray-300 bg-white shadow-lg flex flex-col">
            <div className="flex-1 overflow-auto w-full relative">
              <table className="text-xs text-left border-collapse w-full">
                <thead className="bg-emerald-700 text-white sticky top-0 z-20 shadow-md h-10">
                  <tr>
                    <th className="px-4 py-2 font-semibold uppercase tracking-wider w-16">Sr.No</th>
                    <th className="px-4 py-2 font-semibold uppercase tracking-wider">
                      {statementType === "party" && "Party Name"}
                      {statementType === "salesman" && "Salesman"}
                      {statementType === "category" && "Category"}
                      {statementType === "itemgroup" && "Item Group"}
                    </th>
                    <th className="px-4 py-2 font-semibold uppercase tracking-wider text-right w-32">Quantity</th>
                    <th className="px-4 py-2 font-semibold uppercase tracking-wider text-right w-40">Amount</th>
                    <th className="px-4 py-2 font-semibold uppercase tracking-wider text-right w-24">Items</th>
                    <th className="px-4 py-2 font-semibold uppercase tracking-wider text-right w-24">% Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan="6" className="text-center py-20 text-gray-400 font-medium">Loading Statement...</td></tr>
                  ) : statementData.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-20 text-gray-500 font-medium">No data available.</td></tr>
                  ) : (
                    statementData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-emerald-50 transition-colors even:bg-slate-50/60">
                        <td className="px-4 py-2 text-center text-gray-400 font-mono border-r border-gray-100">{idx + 1}</td>
                        <td className="px-4 py-2 font-bold text-slate-700 border-r border-gray-100">{row.name}</td>
                        <td className="px-4 py-2 text-right font-mono text-gray-700 border-r border-gray-100">{row.qty.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-2 text-right font-bold text-blue-600 font-mono border-r border-gray-100">₹{row.amount.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-2 text-right font-mono text-gray-600 border-r border-gray-100">{row.items}</td>
                        <td className="px-4 py-2 text-right font-bold text-emerald-600 font-mono">{row.percentage}%</td>
                      </tr>
                    ))
                  )}
                  {!loading && statementData.length > 0 && (
                    <tr className="bg-emerald-50 border-t-2 border-emerald-200 font-bold text-slate-800 sticky bottom-0 z-20">
                      <td colSpan="2" className="px-4 py-2 text-right uppercase text-xs">TOTAL:</td>
                      <td className="px-4 py-2 text-right font-mono text-green-700">{totalQty.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-2 text-right font-mono text-green-700">₹{totalAmount.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-2 text-right font-mono text-green-700">{statementData.reduce((a, b) => a + b.items, 0)}</td>
                      <td className="px-4 py-2 text-right font-mono text-emerald-600">100.00%</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EXCEL PREVIEW MODAL */}
        {excelOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4 z-50">
            <div className="bg-white w-full max-w-7xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
              <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">📊 Excel Preview Mode</h3>
                <button onClick={() => setExcelOpen(false)} className="bg-red-50 text-red-500 w-8 h-8 rounded-full flex items-center justify-center font-bold hover:bg-red-500 hover:text-white transition-all">✕</button>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-white">
                <table className="min-w-full border-collapse border border-gray-300 text-xs">
                  <thead>
                    <tr className="bg-gray-100">
                      {DISPLAY_COLUMNS.map(c => <th key={c.key} className="border border-gray-300 px-3 py-2 text-left text-gray-600 uppercase font-bold">{c.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, 100).map((row, i) => {
                      const percent = totalAmount > 0 ? ((row.Amount / totalAmount) * 100).toFixed(2) + "%" : "0%";
                      return (
                        <tr key={i} className="hover:bg-blue-50">
                          <td className="border border-gray-300 px-3 py-1.5 text-center">{row["Sr.No"]}</td>
                          <td className="border border-gray-300 px-3 py-1.5">{row["Date"]}</td>
                          <td className="border border-gray-300 px-3 py-1.5 font-medium">{row["Party Name"]}</td>
                          <td className="border border-gray-300 px-3 py-1.5">{row["Item Name"]}</td>
                          <td className="border border-gray-300 px-3 py-1.5">{row["Item Category"]}</td>
                          <td className="border border-gray-300 px-3 py-1.5">{row["City/Area"]}</td>
                          <td className="border border-gray-300 px-3 py-1.5">{row["Item Group"]}</td>
                          <td className="border border-gray-300 px-3 py-1.5">{row["Salesman"]}</td>
                          <td className="border border-gray-300 px-3 py-1.5 text-right">{row["Qty"]}</td>
                          <td className="border border-gray-300 px-3 py-1.5 text-right font-bold">{row["Amount"]}</td>
                          <td className="border border-gray-300 px-3 py-1.5 text-right">{percent}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length > 100 && <p className="text-center mt-4 text-gray-500 italic">Preview limited to first 100 rows. Download Excel for full data.</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
