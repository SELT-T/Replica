// src/pages/Outstanding.jsx
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Bar, Pie, Line } from "react-chartjs-2";
import config from "../config.js";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import {
  Search,
  Calendar,
  Filter,
  CheckCircle,
  Bell,
  FileSpreadsheet,
  AlertTriangle,
  TrendingUp,
  Clock,
  Layout,
  Download
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
  Title
);

// Accept isLight prop for consistency
export default function Outstanding({ isLight = true }) {
  const [excelData, setExcelData] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [activeTab, setActiveTab] = useState("Overview"); // Overview, Invoices, Ageing
  
  const [filters, setFilters] = useState({
    search: "",
    status: "All",
    daysFilter: "All", // 0-15, 15-30, 30+
  });

  // --- THEME COLORS (Professional White Theme) ---
  const theme = {
    bg: "bg-[#F8F9FA]", // White Background
    cardBg: "bg-white",
    textMain: "text-slate-800",
    textMuted: "text-slate-500",
    border: "border-gray-200",
    inputBg: "bg-white border-gray-300",
    accent: "text-blue-700",
    tableHeader: "bg-[#1E3A8A] text-white", // Navy Blue like Excel
    dangerRow: "bg-red-50 text-red-900", // For overdue
  };

  useEffect(() => {
    fetchOutstanding();
  }, []);

  // 🔹 Load data & Calculate Days
  const fetchOutstanding = async () => {
    try {
      // Backend Call (Kept your original logic)
      const res = await axios.get(`${config.BACKEND_URL}/api/imports/latest`, {
        headers: { "Content-Type": "application/json" },
        withCredentials: false,
      });

      const jsonData = res.data?.data || [];
      processData(jsonData);

    } catch (err) {
      console.error("❌ Error loading outstanding data:", err);
      // Fallback to local storage
      const saved = localStorage.getItem("uploadedExcelData");
      if (saved) {
        processData(JSON.parse(saved));
      }
    }
  };

  const processData = (rawData) => {
    const clean = rawData.filter(
      (r) => !JSON.stringify(r).toLowerCase().includes("total")
    );

    const today = new Date();

    const formatted = clean.map((r) => {
      const amount = parseFloat(r["Amount"]) || 0;
      const dateStr = r["Date"];
      let daysDiff = 0;
      
      // Calculate Days Overdue
      if (dateStr) {
         const datePart = new Date(dateStr);
         if(!isNaN(datePart)) {
            const timeDiff = Math.abs(today - datePart);
            daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); 
         }
      }

      return {
        client: r["Party Name"] || "Unknown",
        invoice: r["Vch No"] || "N/A",
        date: dateStr || "N/A",
        amount: amount,
        city: r["City/Area"] || "N/A",
        salesman: r["Salesman"] || "N/A",
        status: amount > 0 ? "Pending" : "Settled",
        days: daysDiff,
        remark: daysDiff > 30 ? "Over Due" : "Regular"
      };
    });

    setExcelData(formatted);
    setFiltered(formatted);
  };

  // 🔍 Filter Logic
  useEffect(() => {
    let data = excelData;

    // Search
    if (filters.search) {
      const s = filters.search.toLowerCase();
      data = data.filter(
        (r) =>
          r.client.toLowerCase().includes(s) ||
          r.invoice.toLowerCase().includes(s) ||
          r.city.toLowerCase().includes(s)
      );
    }

    // Status
    if (filters.status !== "All") {
      data = data.filter((r) => r.status === filters.status);
    }

    // Days Filter
    if (filters.daysFilter !== "All") {
        if (filters.daysFilter === "0-15 Days") data = data.filter(r => r.days <= 15);
        if (filters.daysFilter === "15-30 Days") data = data.filter(r => r.days > 15 && r.days <= 30);
        if (filters.daysFilter === "30+ Days") data = data.filter(r => r.days > 30);
    }

    setFiltered(data);
  }, [filters, excelData]);

  // 💰 Summary Calculations
  const totalOutstanding = filtered.reduce((sum, r) => sum + r.amount, 0);
  const totalClients = new Set(filtered.map((r) => r.client)).size;
  const overdueAmount = filtered.filter(r => r.days > 30).reduce((sum, r) => sum + r.amount, 0);
  
  // Charts Data
  const monthlyTrend = {
    labels: filtered.slice(0, 8).map((r) => r.date),
    datasets: [{
      label: "Outstanding (₹)",
      data: filtered.slice(0, 8).map((r) => r.amount),
      backgroundColor: "#2563EB",
      borderRadius: 4
    }],
  };

  const ageingData = {
    labels: ["0-15 Days", "15-30 Days", "30-60 Days", "60+ Days"],
    datasets: [{
       data: [
         filtered.filter(r => r.days <= 15).reduce((s,r)=>s+r.amount,0),
         filtered.filter(r => r.days > 15 && r.days <= 30).reduce((s,r)=>s+r.amount,0),
         filtered.filter(r => r.days > 30 && r.days <= 60).reduce((s,r)=>s+r.amount,0),
         filtered.filter(r => r.days > 60).reduce((s,r)=>s+r.amount,0),
       ],
       backgroundColor: ["#10B981", "#FBBF24", "#F97316", "#EF4444"],
       borderWidth: 0
    }]
  };

  return (
    <div className={`p-4 md:p-6 min-h-screen ${theme.bg} ${theme.textMain} font-sans transition-all`}>
      <div className="max-w-[1600px] mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl shadow-lg shadow-rose-200">
                    <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className={`text-2xl md:text-3xl font-extrabold ${theme.textMain} tracking-tight`}>Outstanding Dashboard</h2>
                    <p className={`text-xs font-medium ${theme.textMuted} uppercase tracking-wide`}>Receivables & Ageing Analysis</p>
                </div>
            </div>
            
            <div className="flex gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                {["Overview", "Invoice Wise", "Ageing Report"].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${activeTab === tab ? "bg-slate-800 text-white shadow-md" : "text-gray-500 hover:bg-gray-100"}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>
        </div>

        {/* 🔹 SUMMARY CARDS (Double Color Gradient Style) */}
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <SummaryCard title="Total Outstanding" value={totalOutstanding} gradient="from-blue-600 to-blue-800" icon={<FileSpreadsheet size={24} />} subtitle="Total Dues" />
            <SummaryCard title="Overdue Amount (>30 Days)" value={overdueAmount} gradient="from-red-500 to-rose-600" icon={<AlertTriangle size={24} />} subtitle="Critical Attention" />
            <SummaryCard title="Active Clients" value={totalClients} gradient="from-emerald-500 to-teal-600" icon={<CheckCircle size={24} />} subtitle="With Pending Dues" />
            <SummaryCard title="Avg. Collection Days" value="24 Days" gradient="from-amber-500 to-orange-600" icon={<Clock size={24} />} subtitle="Performance Metric" />
        </div>

        {/* MAIN CONTENT AREA */}
        {activeTab === "Overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className={`${theme.cardBg} col-span-2 rounded-xl shadow-sm border ${theme.border} p-5`}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><TrendingUp size={18}/> Monthly Outstanding Trend</h3>
                    </div>
                    <div className="h-[300px]">
                        <Bar data={monthlyTrend} options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
                    </div>
                </div>
                <div className={`${theme.cardBg} rounded-xl shadow-sm border ${theme.border} p-5`}>
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2"><PieChartIcon size={18}/> Ageing Analysis</h3>
                    </div>
                    <div className="h-[300px]">
                        <Pie data={ageingData} options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} />
                    </div>
                </div>
            </div>
        )}

        {/* FILTERS BAR (Visible for List Views) */}
        {(activeTab === "Invoice Wise" || activeTab === "Ageing Report") && (
            <div className={`${theme.cardBg} p-4 rounded-xl border ${theme.border} mb-6 flex flex-wrap gap-4 items-center shadow-sm`}>
                <div className="flex items-center bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg w-full sm:w-auto">
                    <Search size={16} className="text-gray-400 mr-2" />
                    <input
                        type="text"
                        placeholder="Search Client, Invoice..."
                        className="bg-transparent text-sm outline-none text-slate-700 w-full"
                        value={filters.search}
                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    />
                </div>

                <select
                    value={filters.daysFilter}
                    onChange={(e) => setFilters({ ...filters, daysFilter: e.target.value })}
                    className={`bg-gray-50 border border-gray-200 text-slate-700 px-3 py-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100`}
                >
                    <option>All Days</option>
                    <option>0-15 Days</option>
                    <option>15-30 Days</option>
                    <option>30+ Days</option>
                </select>

                <button onClick={fetchOutstanding} className="ml-auto bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-900 transition-all shadow-md">
                    <Filter size={16} /> Refresh
                </button>
                <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-green-700 transition-all shadow-md">
                    <Download size={16} /> Export
                </button>
            </div>
        )}

        {/* 🔹 EXCEL STYLE TABLE */}
        {(activeTab === "Invoice Wise" || activeTab === "Ageing Report") && (
            <div className="overflow-hidden bg-white rounded-xl border border-gray-300 shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-xs md:text-sm border-collapse">
                        <thead className={`${theme.tableHeader}`}>
                            <tr>
                                <th className="p-3 text-left border-r border-blue-800">Ref. No.</th>
                                <th className="p-3 text-left border-r border-blue-800">Date</th>
                                <th className="p-3 text-left border-r border-blue-800">Party Name</th>
                                <th className="p-3 text-left border-r border-blue-800">City</th>
                                <th className="p-3 text-right border-r border-blue-800">Amount</th>
                                <th className="p-3 text-center border-r border-blue-800">Days</th>
                                <th className="p-3 text-center">Remark</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr><td colSpan="7" className="p-8 text-center text-gray-400">No outstanding records found.</td></tr>
                            )}
                            {filtered.slice(0, 50).map((r, i) => {
                                const isOverdue = r.days > 30;
                                return (
                                    <tr key={i} className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${isOverdue ? "bg-red-50" : "bg-white"}`}>
                                        <td className="p-2.5 border-r border-gray-200 font-medium text-slate-700">{r.invoice}</td>
                                        <td className="p-2.5 border-r border-gray-200 text-slate-600">{r.date}</td>
                                        <td className="p-2.5 border-r border-gray-200 font-bold text-slate-800">{r.client}</td>
                                        <td className="p-2.5 border-r border-gray-200 text-slate-500">{r.city}</td>
                                        <td className="p-2.5 border-r border-gray-200 text-right font-bold text-slate-900">₹{r.amount.toLocaleString("en-IN")}</td>
                                        <td className={`p-2.5 border-r border-gray-200 text-center font-bold ${isOverdue ? "text-red-600" : "text-green-600"}`}>{r.days}</td>
                                        <td className="p-2.5 text-center">
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${isOverdue ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                                                {r.remark}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        <div className="text-center text-xs text-gray-400 mt-8 pt-3">
          Showing top 50 records for optimal performance. Download Report for full data.
        </div>
      </div>
    </div>
  );
}

// 🔹 New "Double Color" Gradient Card
function SummaryCard({ title, value, gradient, icon, subtitle }) {
  return (
    <div className={`bg-gradient-to-r ${gradient} p-5 rounded-xl shadow-xl text-white relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
      <div className="absolute right-[-10px] top-[-10px] opacity-20 rotate-12 group-hover:scale-125 transition-transform duration-500">
          {icon}
      </div>
      <div className="flex flex-col justify-between h-full relative z-10">
         <div>
            <h4 className="text-xs font-bold uppercase tracking-wider opacity-90 mb-1">{title}</h4>
            <h3 className="text-2xl md:text-3xl font-black tracking-tight">
                {typeof value === "number" ? `₹${value.toLocaleString("en-IN")}` : value}
            </h3>
         </div>
         <div className="mt-4 pt-3 border-t border-white/20 flex items-center gap-2">
            {icon}
            <span className="text-xs font-medium opacity-90">{subtitle}</span>
         </div>
      </div>
    </div>
  );
}

// Icon Helper
const PieChartIcon = ({size}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
);
