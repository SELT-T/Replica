// src/pages/Reports.jsx
import React, { useState, useEffect, useMemo } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import { useAuth } from "../context/AuthContext";

export default function Reports() {
  const { user } = useAuth(); // used for frontend lock filtering
  const [data, setData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters State
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("All"); // default: All
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [partyFilter, setPartyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [salesmanFilter, setSalesmanFilter] = useState("");

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
    "Salesman", // label kept as Salesman, will display party_group values
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
          _rawDate: row.date, // for filtering
          "Sr.No": i + 1,
          "Date": row.date || "",
          "Party Name": row.party_name || "N/A",
          // backend column is name_item — use that
          "Item Name": row.name_item || row.item_name || "N/A",
          "Item Category": row.item_category || "N/A",
          "City/Area": row.city_area || "N/A",
          "Item Group": row.item_group || "N/A",
          // show party_group under Salesman header (user requested)
          "Salesman": row.party_group || row.salesman || "N/A",
          // keep raw salesman and party_group for frontend lock usage if needed
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
      const day = firstDay.getDay() || 7; // convert Sun(0) to 7
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

    // FRONTEND LOCKS (mirror backend locks)
    try {
      if (user) {
        // companyLock -> item_category
        if (user.companyLockEnabled && Array.isArray(user.allowedCompanies) && user.allowedCompanies.length) {
          rows = rows.filter(r => user.allowedCompanies.includes(r["Item Category"]));
        }
        // partyLock -> party_group (we stored __party_group)
        if (user.partyLockEnabled && Array.isArray(user.allowedPartyGroups) && user.allowedPartyGroups.length) {
          rows = rows.filter(r => user.allowedPartyGroups.includes(r["__party_group"]));
        }
      }
    } catch (e) {
      console.warn("Lock filter error:", e);
    }

    // 1. Date Filter
    rows = rows.filter(r => checkDateRange(r._rawDate));

    // 2. Global Search
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter((r) =>
        Object.values(r).some((val) => String(val || "").toLowerCase().includes(s))
      );
    }

    // 3. Dropdown Filters
    if (partyFilter) rows = rows.filter((r) => r["Party Name"] === partyFilter);
    if (categoryFilter) rows = rows.filter((r) => r["Item Category"] === categoryFilter);
    if (salesmanFilter) rows = rows.filter((r) => r["Salesman"] === salesmanFilter);

    // re-index Sr.No for visual ordering
    const reindexed = rows.map((row, idx) => ({ ...row, "Sr.No": idx + 1 }));

    setFiltered(reindexed);
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, dateRange, customStart, customEnd, partyFilter, categoryFilter, salesmanFilter, data, user]);

  // --- CALCULATIONS ---
  const totalAmount = filtered.reduce((a, b) => a + (b.Amount || 0), 0);
  const totalQty = filtered.reduce((a, b) => a + (b.Qty || 0), 0);

  // Pagination Logic
  const pageStart = (page - 1) * rowsPerPage;
  const pageRows = filtered.slice(pageStart, pageStart + rowsPerPage);
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));

  // Unique lists for dropdowns (respect locks)
  const parties = useMemo(() => {
    const set = new Set();
    data.forEach(d => {
      // apply frontend lock when building options too
      if (user && user.partyLockEnabled && Array.isArray(user.allowedPartyGroups) && user.allowedPartyGroups.length) {
        if (!user.allowedPartyGroups.includes(d["__party_group"])) return;
      }
      if (user && user.companyLockEnabled && Array.isArray(user.allowedCompanies) && user.allowedCompanies.length) {
        if (!user.allowedCompanies.includes(d["Item Category"])) return;
      }
      if (d["Party Name"]) set.add(d["Party Name"]);
    });
    return [...set].sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, user]);

  const categories = useMemo(() => {
    const set = new Set();
    data.forEach(d => {
      // same locks
      if (user && user.partyLockEnabled && Array.isArray(user.allowedPartyGroups) && user.allowedPartyGroups.length) {
        if (!user.allowedPartyGroups.includes(d["__party_group"])) return;
      }
      if (user && user.companyLockEnabled && Array.isArray(user.allowedCompanies) && user.allowedCompanies.length) {
        if (!user.allowedCompanies.includes(d["Item Category"])) return;
      }
      if (d["Item Category"]) set.add(d["Item Category"]);
    });
    return [...set].sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, user]);

  // Salesmen dropdown should show party_group values (as requested)
  const salesmen = useMemo(() => {
    const set = new Set();
    data.forEach(d => {
      if (user && user.partyLockEnabled && Array.isArray(user.allowedPartyGroups) && user.allowedPartyGroups.length) {
        if (!user.allowedPartyGroups.includes(d["__party_group"])) return;
      }
      if (user && user.companyLockEnabled && Array.isArray(user.allowedCompanies) && user.allowedCompanies.length) {
        if (!user.allowedCompanies.includes(d["Item Category"])) return;
      }
      const val = d["Salesman"] || d["SalesmanRaw"] || d["__party_group"] || "";
      if (val) set.add(val);
    });
    return [...set].sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, user]);

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

  const exportPDF = () => {
    const doc = new jsPDF("l", "mm", "a3");
    doc.text("MASTER REPORT", 14, 15);

    const pdfRows = filtered.map(row => {
      const percent = totalAmount > 0 ? ((row.Amount / totalAmount) * 100).toFixed(2) + "%" : "0%";
      return [
        row["Sr.No"], row["Date"], row["Party Name"], row["Item Name"],
        row["Item Category"], row["City/Area"], row["Item Group"],
        row["Salesman"], row["Qty"], row["Amount"].toLocaleString("en-IN"), percent
      ];
    });

    doc.autoTable({
      head: [DISPLAY_COLUMNS],
      body: pdfRows,
      startY: 20,
      styles: { fontSize: 8 },
    });
    doc.save("Master_Report.pdf");
  };

  return (
    <div className="min-h-screen bg-[#0a1628] text-white p-3 font-sans">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-[#00f5ff] flex items-center gap-2">📊 MASTER REPORT</h2>
          <div className="flex gap-2 text-xs">
            <span className="px-3 py-1 bg-[#112233] border border-[#1e3553] rounded text-gray-300">Rec: <b className="text-white">{filtered.length}</b></span>
            <span className="px-3 py-1 bg-[#112233] border border-[#1e3553] rounded text-gray-300">Qty: <b className="text-yellow-400">{totalQty}</b></span>
            <span className="px-3 py-1 bg-[#112233] border border-[#1e3553] rounded text-gray-300">Amt: <b className="text-[#00f5ff]">₹{totalAmount.toLocaleString("en-IN")}</b></span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-[#112233] p-2 rounded-lg border border-[#1e3553] w-full overflow-x-auto">
          <button onClick={loadData} className="px-3 py-1.5 rounded bg-[#00f5ff] text-black font-bold text-xs hover:bg-[#00dcec]">🔄</button>
          <button onClick={exportExcel} className="px-3 py-1.5 rounded bg-green-600 text-white font-bold text-xs hover:bg-green-700">Excel</button>
          <button onClick={exportPDF} className="px-3 py-1.5 rounded bg-orange-500 text-white font-bold text-xs hover:bg-orange-600">PDF</button>
          <button onClick={() => setExcelOpen(true)} className="px-3 py-1.5 rounded bg-blue-600 text-white font-bold text-xs hover:bg-blue-700">View</button>

          <div className="h-6 w-[1px] bg-[#1e3553] mx-1"></div>

          <input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-2 py-1.5 rounded text-xs bg-[#0a1628] border border-[#1e3553] text-white w-32 focus:border-[#00f5ff] outline-none"
          />

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-2 py-1.5 bg-[#0a1628] border border-[#1e3553] rounded text-xs text-white focus:border-[#00f5ff] outline-none"
          >
            <option>Today</option>
            <option>Yesterday</option>
            <option>This Week</option>
            <option>This Month</option>
            <option>Last Month</option>
            <option>This Quarter</option>
            <option>This Year</option>
            <option>Last Year</option>
            <option>All</option>
            <option>Custom</option>
          </select>

          {dateRange === "Custom" && (
            <div className="flex gap-1">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="px-1 py-1 bg-[#0a1628] border border-[#1e3553] rounded text-[10px] text-white" />
              <span className="text-gray-400">-</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="px-1 py-1 bg-[#0a1628] border border-[#1e3553] rounded text-[10px] text-white" />
            </div>
          )}

          <div className="h-6 w-[1px] bg-[#1e3553] mx-1"></div>

          <select value={partyFilter} onChange={(e) => setPartyFilter(e.target.value)} className="px-2 py-1.5 bg-[#0a1628] border border-[#1e3553] rounded text-xs text-white w-32 outline-none">
            <option value="">All Parties</option>
            {parties.map((p) => <option key={p}>{p}</option>)}
          </select>

          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-2 py-1.5 bg-[#0a1628] border border-[#1e3553] rounded text-xs text-white w-28 outline-none">
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>

          <select value={salesmanFilter} onChange={(e) => setSalesmanFilter(e.target.value)} className="px-2 py-1.5 bg-[#0a1628] border border-[#1e3553] rounded text-xs text-white w-28 outline-none">
            <option value="">All Salesmen</option>
            {salesmen.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-[#1e3553] bg-[#0b1220]" style={{ height: "calc(100vh - 180px)" }}>
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-[#132a4a] text-[#00f5ff] sticky top-0 z-10 font-semibold shadow-sm">
            <tr>
              {DISPLAY_COLUMNS.map((col) => (
                <th key={col} className="px-3 py-2.5 border-r border-[#1e3553] border-b whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e3553]">
            {loading ? (
              <tr><td colSpan={DISPLAY_COLUMNS.length} className="text-center py-10 text-gray-400">Loading Data...</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={DISPLAY_COLUMNS.length} className="text-center py-10 text-gray-500">No records found</td></tr>
            ) : (
              pageRows.map((row, idx) => {
                const percent = totalAmount > 0 ? ((row.Amount / totalAmount) * 100).toFixed(2) + "%" : "0%";
                return (
                  <tr key={idx} className="hover:bg-[#1b3a5c] transition-colors odd:bg-[#0f1e33] even:bg-[#112233]">
                    <td className="px-3 py-1.5 border-r border-[#1e3553] text-center text-gray-400">{row["Sr.No"]}</td>
                    <td className="px-3 py-1.5 border-r border-[#1e3553] whitespace-nowrap">{row.Date}</td>
                    <td className="px-3 py-1.5 border-r border-[#1e3553] font-medium text-white">{row["Party Name"]}</td>
                    <td className="px-3 py-1.5 border-r border-[#1e3553] text-gray-300">{row["Item Name"]}</td>
                    <td className="px-3 py-1.5 border-r border-[#1e3553] text-gray-400">{row["Item Category"]}</td>
                    <td className="px-3 py-1.5 border-r border-[#1e3553] text-gray-400">{row["City/Area"]}</td>
                    <td className="px-3 py-1.5 border-r border-[#1e3553] text-gray-400">{row["Item Group"]}</td>
                    <td className="px-3 py-1.5 border-r border-[#1e3553] text-yellow-500">{row["Salesman"]}</td>
                    <td className="px-3 py-1.5 border-r border-[#1e3553] text-right font-mono">{row.Qty}</td>
                    <td className="px-3 py-1.5 border-r border-[#1e3553] text-right text-[#00f5ff] font-mono">₹{row.Amount.toLocaleString("en-IN")}</td>
                    <td className="px-3 py-1.5 text-right font-bold text-green-400 font-mono">{percent}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex justify-between items-center text-xs bg-[#112233] p-2 rounded border border-[#1e3553]">
        <button disabled={page === 1} onClick={() => setPage(page - 1)} className="px-3 py-1 bg-[#00f5ff] text-black rounded font-bold disabled:opacity-40 disabled:cursor-not-allowed">Previous</button>
        <span className="text-gray-300">Page <b className="text-white">{page}</b> of <b>{totalPages}</b></span>
        <button disabled={page === totalPages || totalPages === 0} onClick={() => setPage(page + 1)} className="px-3 py-1 bg-[#00f5ff] text-black rounded font-bold disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
      </div>

      {excelOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white w-full max-w-7xl h-[80vh] rounded-lg shadow-2xl flex flex-col overflow-hidden">
            <div className="p-3 bg-gray-100 border-b flex justify-between items-center">
              <h3 className="font-bold text-gray-800">Excel View Preview</h3>
              <button onClick={() => setExcelOpen(false)} className="text-red-500 font-bold hover:text-red-700">✖ Close</button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              <table className="min-w-full border-collapse border border-gray-400 text-xs text-black bg-white">
                <thead>
                  <tr className="bg-gray-200">
                    {DISPLAY_COLUMNS.map(c => <th key={c} className="border border-gray-400 px-2 py-1">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => {
                    const percent = totalAmount > 0 ? ((row.Amount / totalAmount) * 100).toFixed(2) + "%" : "0%";
                    return (
                      <tr key={i}>
                        <td className="border border-gray-400 px-2 py-1">{row["Sr.No"]}</td>
                        <td className="border border-gray-400 px-2 py-1">{row["Date"]}</td>
                        <td className="border border-gray-400 px-2 py-1">{row["Party Name"]}</td>
                        <td className="border border-gray-400 px-2 py-1">{row["Item Name"]}</td>
                        <td className="border border-gray-400 px-2 py-1">{row["Item Category"]}</td>
                        <td className="border border-gray-400 px-2 py-1">{row["City/Area"]}</td>
                        <td className="border border-gray-400 px-2 py-1">{row["Item Group"]}</td>
                        <td className="border border-gray-400 px-2 py-1">{row["Salesman"]}</td>
                        <td className="border border-gray-400 px-2 py-1">{row["Qty"]}</td>
                        <td className="border border-gray-400 px-2 py-1">{row["Amount"]}</td>
                        <td className="border border-gray-400 px-2 py-1">{percent}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
