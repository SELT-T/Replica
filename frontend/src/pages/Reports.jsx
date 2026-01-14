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
  const [viewMode, setViewMode] = useState("table");
  const [statementType, setStatementType] = useState("party");
  const [excelOpen, setExcelOpen] = useState(false);

  // Pagination
  const rowsPerPage = 50;
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

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 p-4 font-sans">
      
      {/* HEADER & STATS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            </div>
            <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">Master Report</h2>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Detailed Analysis View</p>
            </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
           <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-blue-100 flex items-center gap-3 flex-1 md:flex-none">
              <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600 font-bold text-xs">REC</div>
              <div>
                 <p className="text-[10px] text-gray-500 uppercase font-bold">Records</p>
                 <p className="text-lg font-black text-slate-800 leading-none">{filtered.length}</p>
              </div>
           </div>
           <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-green-100 flex items-center gap-3 flex-1 md:flex-none">
              <div className="p-1.5 bg-green-100 rounded-lg text-green-600 font-bold text-xs">QTY</div>
              <div>
                 <p className="text-[10px] text-gray-500 uppercase font-bold">Quantity</p>
                 <p className="text-lg font-black text-slate-800 leading-none">{totalQty.toLocaleString("en-IN")}</p>
              </div>
           </div>
           <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-purple-100 flex items-center gap-3 flex-1 md:flex-none">
              <div className="p-1.5 bg-purple-100 rounded-lg text-purple-600 font-bold text-xs">AMT</div>
              <div>
                 <p className="text-[10px] text-gray-500 uppercase font-bold">Total Amount</p>
                 <p className="text-lg font-black text-blue-600 leading-none">₹{(totalAmount/100000).toFixed(2)}L</p>
              </div>
           </div>
        </div>
      </div>

      {/* VIEW MODE TOGGLE */}
      <div className="bg-white p-3 rounded-xl shadow-md border border-gray-100 mb-6 flex gap-2">
        <button 
          onClick={() => { setViewMode("table"); setPage(1); }}
          className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${viewMode === "table" ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        >
          📊 Table View
        </button>
        <button 
          onClick={() => { setViewMode("statement"); setPage(1); }}
          className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${viewMode === "statement" ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        >
          📈 Statement View
        </button>
      </div>

      {/* TOOLBAR: FILTERS & ACTIONS */}
      <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 mb-6 space-y-4">
         
         <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1">
                <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 transition-colors shadow-sm whitespace-nowrap">
                  🔄 Refresh
                </button>
                <button onClick={viewMode === "table" ? exportExcel : exportStatementExcel} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 text-green-700 font-bold text-xs hover:bg-green-100 transition-colors border border-green-200 shadow-sm whitespace-nowrap">
                  📊 Excel
                </button>
                <button onClick={viewMode === "table" ? exportPDF : exportStatementPDF} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-700 font-bold text-xs hover:bg-red-100 transition-colors border border-red-200 shadow-sm whitespace-nowrap">
                  📄 PDF
                </button>
                {viewMode === "table" && (
                  <button onClick={() => setExcelOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition-colors border border-indigo-200 shadow-sm whitespace-nowrap">
                    👁️ View
                  </button>
                )}
            </div>

            <div className="relative w-full md:w-64">
                <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
                <input
                    placeholder="Global Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg text-sm bg-gray-50 border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                />
            </div>
         </div>

         <hr className="border-gray-100" />

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            
            <div>
               <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Date Range</label>
               <select value={dateRange} onChange={(e) => setDateRange(e.target.value)} className="w-full mt-1 bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-2 outline-none">
                   <option>All</option><option>Today</option><option>Yesterday</option><option>This Week</option><option>This Month</option><option>Last Month</option><option>Custom</option>
               </select>
            </div>

            {dateRange === "Custom" && (
              <>
               <div>
                 <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Start Date</label>
                 <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-xs rounded-lg px-2 py-2 outline-none" />
               </div>
               <div>
                 <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">End Date</label>
                 <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-xs rounded-lg px-2 py-2 outline-none" />
               </div>
              </>
            )}

            <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Party</label>
                <select value={partyFilter} onChange={(e) => setPartyFilter(e.target.value)} className="w-full mt-1 bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-2 outline-none">
                   <option value="">All Parties</option>
                   {parties.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
            </div>

            <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Category</label>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full mt-1 bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-2 outline-none">
                   <option value="">All Categories</option>
                   {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Item Group</label>
                <select value={itemGroupFilter} onChange={(e) => setItemGroupFilter(e.target.value)} className="w-full mt-1 bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-2 outline-none">
                   <option value="">All Item Groups</option>
                   {itemGroups.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
            </div>

            <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Salesman</label>
                <select value={salesmanFilter} onChange={(e) => setSalesmanFilter(e.target.value)} className="w-full mt-1 bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-2 py-2 outline-none">
                   <option value="">All Salesmen</option>
                   {salesmen.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
         </div>

         {viewMode === "statement" && (
           <div className="flex gap-2 items-center pt-2 border-t border-gray-100">
             <label className="text-xs font-bold text-gray-600 uppercase">Statement Type:</label>
             <select value={statementType} onChange={(e) => setStatementType(e.target.value)} className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg px-3 py-2 outline-none">
               <option value="party">By Party</option>
               <option value="salesman">By Salesman</option>
               <option value="category">By Category</option>
               <option value="itemgroup">By Item Group</option>
             </select>
           </div>
         )}
      </div>

      {/* TABLE VIEW */}
      {viewMode === "table" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
                <tr>
                  {DISPLAY_COLUMNS.map((col) => (
                    <th 
                        key={col} 
                        onClick={() => requestSort(col)}
                        className="px-4 py-3 font-bold uppercase tracking-wider whitespace-nowrap cursor-pointer hover:bg-white/10"
                    >
                        <div className="flex items-center gap-1">
                            {col}
                            {sortConfig.key === col && (
                                <span>{sortConfig.direction === 'ascending' ? '▲' : '▼'}</span>
                            )}
                        </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={DISPLAY_COLUMNS.length} className="text-center py-12 text-gray-400 font-medium">Loading Data...</td></tr>
                ) : pageRows.length === 0 ? (
                  <tr><td colSpan={DISPLAY_COLUMNS.length} className="text-center py-12 text-gray-500 font-medium">No records found matching filters.</td></tr>
                ) : (
                  pageRows.map((row, idx) => {
                    const percent = totalAmount > 0 ? ((row.Amount / totalAmount) * 100).toFixed(2) + "%" : "0%";
                    return (
                      <tr key={idx} className="hover:bg-blue-50 even:bg-slate-50/50">
                        <td className="px-4 py-2.5 text-center text-gray-400 font-mono">{row["Sr.No"]}</td>
                        <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{row.Date}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-700">{row["Party Name"]}</td>
                        <td className="px-4 py-2.5 text-gray-600">{row["Item Name"]}</td>
                        <td className="px-4 py-2.5 text-gray-500">{row["Item Category"]}</td>
                        <td className="px-4 py-2.5 text-gray-500">{row["City/Area"]}</td>
                        <td className="px-4 py-2.5 text-indigo-600 font-medium">{row["Item Group"]}</td>
                        <td className="px-4 py-2.5 text-orange-600 font-medium">{row["Salesman"]}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-gray-700">{row.Qty}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-blue-600 font-mono">₹{row.Amount.toLocaleString("en-IN")}</td>
                        <td className="px-4 py-2.5 text-right font-bold text-emerald-600 font-mono">{percent}</td>
                      </tr>
                    );
                  })
                )}
                
                {!loading && filtered.length > 0 && (
                  <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t-2 border-blue-300 font-bold text-slate-800">
                    <td colSpan="8" className="px-4 py-3 text-right uppercase text-xs">TOTAL:</td>
                    <td className="px-4 py-3 text-right font-mono text-blue-700">{totalQty.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-right font-mono text-blue-700">₹{totalAmount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600">100.00%</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination Footer */}
          <div className="bg-white border-t border-gray-200 p-3 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs">
             <span className="text-gray-500">
                Showing <b className="text-slate-800">{pageRows.length}</b> rows | Page <b className="text-slate-800">{page}</b> of <b>{totalPages}</b>
             </span>
             <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-4 py-1.5 rounded-lg border border-gray-300 text-gray-600 font-bold hover:bg-gray-100 disabled:opacity-50">Previous</button>
                <button disabled={page === totalPages || totalPages === 0} onClick={() => setPage(page + 1)} className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50">Next</button>
             </div>
          </div>
        </div>
      )}

      {/* STATEMENT VIEW */}
      {viewMode === "statement" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-gradient-to-r from-green-600 to-emerald-700 text-white">
                <tr>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">Sr.No</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider">
                    {statementType === "party" && "Party Name"}
                    {statementType === "salesman" && "Salesman"}
                    {statementType === "category" && "Category"}
                    {statementType === "itemgroup" && "Item Group"}
                  </th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Quantity</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">Amount</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">No. of Items</th>
                  <th className="px-4 py-3 font-bold uppercase tracking-wider text-right">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-12 text-gray-400 font-medium">Loading Statement...</td></tr>
                ) : statementData.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-12 text-gray-500 font-medium">No data available for statement.</td></tr>
                ) : (
                  statementData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-green-50 even:bg-slate-50/50">
                      <td className="px-4 py-3 text-center text-gray-400 font-mono">{idx + 1}</td>
                      <td className="px-4 py-3 font-bold text-slate-700">{row.name}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">{row.qty.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-600 font-mono">₹{row.amount.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-right font-mono text-gray-600">{row.items}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 font-mono">{row.percentage}%</td>
                    </tr>
                  ))
                )}

                {!loading && statementData.length > 0 && (
                  <tr className="bg-gradient-to-r from-green-50 to-emerald-50 border-t-2 border-green-300 font-bold text-slate-800">
                    <td colSpan="2" className="px-4 py-3 text-right uppercase text-xs">TOTAL:</td>
                    <td className="px-4 py-3 text-right font-mono text-green-700">{totalQty.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-700">₹{totalAmount.toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-right font-mono text-green-700">{statementData.reduce((a, b) => a + b.items, 0)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600">100.00%</td>
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
          <div className="bg-white w-full max-w-7xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">📊 Excel Preview Mode</h3>
              <button onClick={() => setExcelOpen(false)} className="bg-red-50 text-red-500 w-8 h-8 rounded-full flex items-center justify-center font-bold hover:bg-red-500 hover:text-white">✕</button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300 text-xs">
                  <thead>
                    <tr className="bg-gray-100">
                      {DISPLAY_COLUMNS.map(c => <th key={c} className="border border-gray-300 px-3 py-2 text-left text-gray-600 uppercase font-bold">{c}</th>)}
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
                          <td className="border border-gray-300 px-3 py-1.5 text-right font-bold">₹{row["Amount"].toLocaleString("en-IN")}</td>
                          <td className="border border-gray-300 px-3 py-1.5 text-right">{percent}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {filtered.length > 100 && <p className="text-center mt-4 text-gray-500 italic">Preview limited to first 100 rows. Download Excel for full data.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
