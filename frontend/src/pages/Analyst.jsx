// src/pages/Analyst.jsx - FIXED VERSION (Dashboard jaisi filtering + Professional UI)
import React, { useEffect, useState, useMemo, useRef } from "react";
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
  Calendar,
  TrendingUp,
  PieChart,
  FileText,
  Search,
  Settings,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  DownloadCloud,
  Database,
  Layers,
  Target
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
  const [allData, setAllData] = useState([]); // Complete data from API
  const [cleanData, setCleanData] = useState([]); // Filtered data (dashboard logic)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");
  const [lastSync, setLastSync] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Filters (Dashboard jaisa)
  const [dateFilter, setDateFilter] = useState("all");
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPartyGroup, setFilterPartyGroup] = useState("");
  const [itemGroupFilter, setItemGroupFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Reports filters
  const [partyFilter, setPartyFilter] = useState("");
  const [salesmanFilter, setSalesmanFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  // Modal states
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const modalRef = useRef();

  // Format functions
  const fmt = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  const toNumber = (v) => parseFloat(String(v || "").replace(/[^0-9.-]/g, "")) || 0;

  // ==================== DATA FETCHING (DASHBOARD LOGIC) ====================
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

        // Fetch vouchers (same as dashboard)
        const vouchersURL = `${backendURL}/api/vouchers?limit=10000`;
        const vouchersRes = await fetch(vouchersURL, {
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        });

        const vouchersJson = await vouchersRes.json();

        if (vouchersJson.success && vouchersJson.data) {
          const normalized = vouchersJson.data.map(v => ({
            // Display fields
            "Date": v.date || '',
            "Voucher Number": v.vch_no || v.voucher_number || '',
            "Voucher No": v.vch_no || '',
            "Vch No.": v.vch_no || '',
            "Invoice No": v.vch_no || '',
            "Voucher Type": v.vch_type || v.voucher_type || 'Sales',
            "Type": v.vch_type || 'Sales',
            "Vch Type": v.vch_type || 'Sales',
            "Party Name": v.party_name || 'N/A',
            "Party": v.party_name || 'N/A',
            "Customer": v.party_name || 'N/A',
            "Party Group": v.party_group || 'N/A',
            "ItemName": v.name_item || v.item_name || 'N/A',
            "Item Name": v.name_item || 'N/A',
            "Description": v.name_item || 'N/A',
            "Narration": v.narration || '',
            "Item Group": v.item_group || 'N/A',
            "Item Category": v.item_category || 'Sales',
            "Company": v.item_category || 'Sales',
            "Salesman": v.salesman || v.party_group || 'N/A',
            "City/Area": v.city_area || 'N/A',
            "Amount": parseFloat(v.amount) || 0,
            "Net Amount": parseFloat(v.amount) || 0,
            "Qty": parseFloat(v.qty) || 0,
            "Quantity": parseFloat(v.qty) || 0,
            "Rate": parseFloat(v.rate) || 0,
            "Price": parseFloat(v.rate) || 0,
            "Outstanding": 0,
          }));

          // Remove total rows (same as dashboard)
          const cleaned = normalized.filter((r) => {
            const checkValues = Object.values(r || {}).map((v) => String(v || "").toLowerCase().trim());
            if (checkValues.some((v) => ["total", "grand total", "sub total", "overall total"].some((w) => v.includes(w)))) return false;
            if (checkValues.every((v) => v === "")) return false;
            return true;
          });

          if (!cancelled) {
            setAllData(cleaned);
            setLastSync(new Date().toISOString());
            console.log(`✅ Analyst loaded ${cleaned.length} vouchers`);
          }
        } else {
          throw new Error("Invalid response from server");
        }
      } catch (err) {
        console.error("❌ Fetch error:", err);
        setError("Unable to load data. Check backend connection.");
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

  // ==================== DATA FILTERING (DASHBOARD LOGIC) ====================
  useEffect(() => {
    if (!allData.length) {
      setCleanData([]);
      return;
    }

    let filtered = [...allData];

    // 1. DATE FILTER (Dashboard logic)
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
        case "this_year":
          startDate = new Date(today.getFullYear(), 0, 1);
          startDate.setHours(0,0,0,0);
          endDate = new Date();
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

    // 2. USER LOCKS (Dashboard logic)
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

    // 3. CATEGORY FILTER
    if (filterCategory) {
      filtered = filtered.filter(r => r["Item Category"] === filterCategory);
    }

    // 4. PARTY GROUP FILTER
    if (filterPartyGroup) {
      filtered = filtered.filter(r => r["Party Group"] === filterPartyGroup);
    }

    // 5. ITEM GROUP FILTER
    if (itemGroupFilter) {
      filtered = filtered.filter(r => r["Item Group"] === itemGroupFilter);
    }

    // 6. SEARCH TERM
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        Object.values(r).some(v =>
          String(v || "").toLowerCase().includes(term)
        )
      );
    }

    // 7. REPORT FILTERS
    if (partyFilter) {
      filtered = filtered.filter(r => r["Party Name"] === partyFilter);
    }

    if (salesmanFilter) {
      filtered = filtered.filter(r => r["Salesman"] === salesmanFilter);
    }

    if (areaFilter) {
      filtered = filtered.filter(r => r["City/Area"] === areaFilter);
    }

    setCleanData(filtered);
    setCurrentPage(1);
  }, [
    allData, 
    user, 
    dateFilter, 
    customDateRange, 
    filterCategory, 
    filterPartyGroup, 
    itemGroupFilter, 
    searchTerm,
    partyFilter,
    salesmanFilter,
    areaFilter
  ]);

  // ==================== METRICS CALCULATION ====================
  const metrics = useMemo(() => {
    if (!cleanData.length) {
      return {
        totalSales: 0,
        partyCount: 0,
        inventoryCount: 0,
        billingCount: 0,
        avgTransaction: 0,
        voucherCount: 0
      };
    }

    let totalSales = 0;
    const partySet = new Set();
    const inventorySet = new Set();
    const voucherSet = new Set();
    let billingCount = 0;

    cleanData.forEach((r) => {
      const amt = toNumber(r["Amount"]);
      totalSales += amt;

      const party = r["Party Name"];
      if (party && party !== 'N/A') partySet.add(party);

      const item = r["ItemName"];
      if (item && item !== 'N/A') inventorySet.add(item);

      const vchNo = r["Voucher Number"];
      if (vchNo && vchNo !== 'N/A') voucherSet.add(vchNo);

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
      voucherCount: voucherSet.size,
      avgTransaction: totalSales / cleanData.length
    };
  }, [cleanData]);

  // ==================== CHART DATA ====================
  const monthlySalesData = useMemo(() => {
    const monthlyAgg = {};
    
    cleanData.forEach((r) => {
      const dateStr = r["Date"] || '';
      if (!dateStr) return;
      
      const d = new Date(dateStr);
      if (isNaN(d)) return;
      
      const monthYear = d.toLocaleString("en-IN", { month: "short", year: "numeric" });
      monthlyAgg[monthYear] = (monthlyAgg[monthYear] || 0) + toNumber(r["Amount"]);
    });

    const entries = Object.entries(monthlyAgg).sort((a, b) => new Date(a[0]) - new Date(b[0]));
    return {
      labels: entries.map(([k]) => k),
      values: entries.map(([, v]) => v)
    };
  }, [cleanData]);

  const categoryDistribution = useMemo(() => {
    const catAgg = {};
    
    cleanData.forEach((r) => {
      const cat = r["Item Category"] || "Unknown";
      if (cat === 'N/A') return;
      
      catAgg[cat] = (catAgg[cat] || 0) + toNumber(r["Amount"]);
    });

    const sorted = Object.entries(catAgg).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return {
      labels: sorted.map(([name]) => name),
      values: sorted.map(([, val]) => val)
    };
  }, [cleanData]);

  const topProductsData = useMemo(() => {
    const prodAgg = {};
    
    cleanData.forEach((r) => {
      const item = r["ItemName"] || "";
      if (!item || item === 'N/A') return;
      
      prodAgg[item] = (prodAgg[item] || 0) + toNumber(r["Amount"]);
    });

    const sorted = Object.entries(prodAgg).sort((a, b) => b[1] - a[1]).slice(0, 8);
    return {
      labels: sorted.map(([name]) => name.length > 20 ? name.substring(0, 20) + '...' : name),
      values: sorted.map(([, val]) => val)
    };
  }, [cleanData]);

  const topCustomersData = useMemo(() => {
    const custAgg = {};
    
    cleanData.forEach((r) => {
      const party = r["Party Name"] || "";
      if (!party || party === 'N/A') return;
      
      custAgg[party] = (custAgg[party] || 0) + toNumber(r["Amount"]);
    });

    const sorted = Object.entries(custAgg).sort((a, b) => b[1] - a[1]).slice(0, 8);
    return {
      labels: sorted.map(([name]) => name.length > 20 ? name.substring(0, 20) + '...' : name),
      values: sorted.map(([, val]) => val)
    };
  }, [cleanData]);

  // ==================== EXPORT FUNCTIONS ====================
  const exportCSV = (data, filename = "analyst_export") => {
    if (!data.length) return;
    
    const keys = Object.keys(data[0] || {});
    const csvRows = [keys.join(",")];
    
    data.forEach((r) => {
      const line = keys.map((k) => {
        let v = r[k];
        if (v === undefined || v === null) v = "";
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
    a.download = `${filename}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportExcel = (data, filename = "analyst_export") => {
    if (!data.length) return;
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const exportPDF = async () => {
    const input = document.getElementById("analyst-dashboard");
    if (!input) return;
    
    const canvas = await html2canvas(input, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const imgHeight = canvas.height * imgWidth / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`analyst_report_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  // ==================== INVOICE FUNCTIONS ====================
  const openInvoice = (row) => {
    setSelectedInvoice(row);
    setInvoiceModalOpen(true);
  };

  const handlePrintInvoice = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${selectedInvoice?.InvoiceNo || selectedInvoice?.['Voucher Number']}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .invoice { border: 2px solid #000; padding: 20px; max-width: 800px; margin: 0 auto; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .table th, .table td { border: 1px solid #000; padding: 8px; text-align: left; }
            .total { text-align: right; font-size: 18px; font-weight: bold; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; }
          </style>
        </head>
        <body>
          <div class="invoice">
            <div class="header">
              <h1>TAX INVOICE</h1>
              <h2>COMMUNICATION WORLD INFOMATIC PVT. LTD.</h2>
            </div>
            <div class="details">
              <div>
                <p><strong>Invoice No:</strong> ${selectedInvoice?.['Invoice No'] || selectedInvoice?.['Voucher Number'] || ''}</p>
                <p><strong>Date:</strong> ${selectedInvoice?.Date || ''}</p>
                <p><strong>Type:</strong> ${selectedInvoice?.['Voucher Type'] || ''}</p>
              </div>
              <div>
                <p><strong>Customer:</strong> ${selectedInvoice?.['Party Name'] || ''}</p>
                <p><strong>Group:</strong> ${selectedInvoice?.['Party Group'] || ''}</p>
                <p><strong>Area:</strong> ${selectedInvoice?.['City/Area'] || ''}</p>
              </div>
            </div>
            <table class="table">
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${selectedInvoice?.ItemName || ''}</td>
                  <td>${selectedInvoice?.Qty || 0}</td>
                  <td>₹${parseFloat(selectedInvoice?.Rate || 0).toLocaleString('en-IN')}</td>
                  <td>₹${parseFloat(selectedInvoice?.Amount || 0).toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
            <div class="total">
              <p>Grand Total: ₹${parseFloat(selectedInvoice?.Amount || 0).toLocaleString('en-IN')}</p>
            </div>
            <div class="footer">
              <p>Thank you for your business!</p>
              <p>Computer generated invoice</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // ==================== PAGINATION ====================
  const totalPages = Math.ceil(cleanData.length / rowsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return cleanData.slice(startIndex, startIndex + rowsPerPage);
  }, [cleanData, currentPage, rowsPerPage]);

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-32 h-32 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <BarChart3 className="w-16 h-16 text-blue-600 animate-pulse" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Loading Analyst</h2>
            <p className="text-gray-600">Fetching business intelligence data...</p>
          </div>
        </div>
      </div>
    );
  }

  // ==================== ERROR STATE ====================
  if (error && allData.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Data Load Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Retry Connection
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("analyst_latest_rows");
                window.location.reload();
              }}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Clear Cache & Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== MAIN RENDER ====================
  return (
    <div id="analyst-dashboard" className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Business Analyst</h1>
                <p className="text-gray-600 flex items-center gap-2 mt-2">
                  <Database className="w-4 h-4" />
                  {cleanData.length} transactions • Last sync: {lastSync ? new Date(lastSync).toLocaleTimeString() : 'Never'}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                  autoRefresh 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'Auto On' : 'Auto Off'}
              </button>
              
              <button
                onClick={() => exportExcel(cleanData, 'analyst_data')}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:shadow-lg transition-all hover:scale-105"
              >
                <DownloadCloud className="w-4 h-4" />
                Export Data
              </button>
            </div>
          </div>

          {/* FILTER BAR */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Date Filter */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Date Range
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="all">All Dates</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="this_year">This Year</option>
                  <option value="custom">Custom Range</option>
                </select>
                
                {dateFilter === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input
                      type="date"
                      value={customDateRange.start}
                      onChange={(e) => setCustomDateRange({...customDateRange, start: e.target.value})}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="date"
                      value={customDateRange.end}
                      onChange={(e) => setCustomDateRange({...customDateRange, end: e.target.value})}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Layers className="w-4 h-4" /> Category
                </label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="">All Categories</option>
                  {Array.from(new Set(allData.map(r => r["Item Category"]).filter(v => v && v !== 'N/A')))
                    .sort()
                    .map((cat, i) => (
                      <option key={i} value={cat}>{cat}</option>
                    ))}
                </select>
              </div>

              {/* Party Group Filter */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Users className="w-4 h-4" /> Party Group
                </label>
                <select
                  value={filterPartyGroup}
                  onChange={(e) => setFilterPartyGroup(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="">All Groups</option>
                  {Array.from(new Set(allData.map(r => r["Party Group"]).filter(v => v && v !== 'N/A')))
                    .sort()
                    .map((grp, i) => (
                      <option key={i} value={grp}>{grp}</option>
                    ))}
                </select>
              </div>

              {/* Item Group Filter */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Package className="w-4 h-4" /> Item Group
                </label>
                <select
                  value={itemGroupFilter}
                  onChange={(e) => setItemGroupFilter(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="">All Item Groups</option>
                  {Array.from(new Set(allData.map(r => r["Item Group"]).filter(v => v && v !== 'N/A')))
                    .sort()
                    .map((grp, i) => (
                      <option key={i} value={grp}>{grp}</option>
                    ))}
                </select>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search transactions, parties, items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="mb-8">
          <div className="flex overflow-x-auto scrollbar-hide space-x-1 bg-white rounded-2xl shadow-md p-1">
            {[
              { id: "dashboard", label: "Dashboard", icon: BarChart3 },
              { id: "transactions", label: "Transactions", icon: CreditCard },
              { id: "customers", label: "Customers", icon: Users },
              { id: "products", label: "Products", icon: Package },
              { id: "categories", label: "Categories", icon: Layers },
              { id: "reports", label: "Reports", icon: FileText },
              { id: "export", label: "Export", icon: DownloadCloud },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl whitespace-nowrap transition-all ${
                  activeSection === tab.id
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-semibold">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="animate-fadeIn">
          {activeSection === "dashboard" && (
            <DashboardSection
              metrics={metrics}
              monthlySalesData={monthlySalesData}
              categoryDistribution={categoryDistribution}
              topProductsData={topProductsData}
              topCustomersData={topCustomersData}
              cleanData={cleanData}
              openInvoice={openInvoice}
              fmt={fmt}
            />
          )}

          {activeSection === "transactions" && (
            <TransactionsSection
              data={paginatedData}
              totalPages={totalPages}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              cleanData={cleanData}
              openInvoice={openInvoice}
              exportCSV={exportCSV}
              fmt={fmt}
            />
          )}

          {activeSection === "customers" && (
            <CustomersSection
              data={cleanData}
              fmt={fmt}
            />
          )}

          {activeSection === "products" && (
            <ProductsSection
              data={cleanData}
              fmt={fmt}
            />
          )}

          {activeSection === "categories" && (
            <CategoriesSection
              data={cleanData}
              fmt={fmt}
            />
          )}

          {activeSection === "reports" && (
            <ReportsSection
              data={cleanData}
              exportCSV={exportCSV}
              exportExcel={exportExcel}
              exportPDF={exportPDF}
              fmt={fmt}
            />
          )}

          {activeSection === "export" && (
            <ExportSection
              data={cleanData}
              exportCSV={exportCSV}
              exportExcel={exportExcel}
              exportPDF={exportPDF}
            />
          )}
        </div>
      </div>

      {/* INVOICE MODAL */}
      {invoiceModalOpen && selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={() => setInvoiceModalOpen(false)}
          onPrint={handlePrintInvoice}
        />
      )}
    </div>
  );
}

// ==================== DASHBOARD SECTION ====================
function DashboardSection({ metrics, monthlySalesData, categoryDistribution, topProductsData, topCustomersData, cleanData, openInvoice, fmt }) {
  return (
    <div className="space-y-8">
      {/* METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Sales"
          value={fmt(metrics.totalSales)}
          icon={CreditCard}
          color="blue"
          subtitle={`${cleanData.length} transactions`}
        />
        
        <MetricCard
          title="Active Parties"
          value={metrics.partyCount}
          icon={Users}
          color="green"
          subtitle={`${metrics.voucherCount} vouchers`}
        />
        
        <MetricCard
          title="Products Sold"
          value={metrics.inventoryCount}
          icon={Package}
          color="purple"
          subtitle={`${metrics.billingCount} invoices`}
        />
        
        <MetricCard
          title="Avg Transaction"
          value={fmt(metrics.avgTransaction)}
          icon={TrendingUp}
          color="orange"
          subtitle={`${cleanData.length > 0 ? 'per transaction' : 'No data'}`}
        />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Trend */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              Sales Trend
            </h3>
            <span className="text-sm text-gray-500 font-medium">
              {monthlySalesData.labels.length} months
            </span>
          </div>
          <div className="h-72">
            <Line
              data={{
                labels: monthlySalesData.labels,
                datasets: [{
                  label: 'Sales (₹)',
                  data: monthlySalesData.values,
                  borderColor: '#3B82F6',
                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  borderWidth: 3,
                  tension: 0.4,
                  fill: true,
                  pointBackgroundColor: '#fff',
                  pointBorderColor: '#3B82F6',
                  pointBorderWidth: 2,
                  pointRadius: 4,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: '#1F2937',
                    padding: 12,
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    callbacks: {
                      label: (ctx) => `₹${ctx.raw.toLocaleString('en-IN')}`
                    }
                  }
                },
                scales: {
                  x: {
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: { color: '#6B7280', font: { size: 11 } }
                  },
                  y: {
                    grid: { color: 'rgba(0,0,0,0.05)' },
                    ticks: { 
                      color: '#6B7280',
                      font: { size: 11 },
                      callback: (value) => `₹${(value/1000).toFixed(0)}K`
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <PieChart className="w-6 h-6 text-purple-600" />
              Category Distribution
            </h3>
            <span className="text-sm text-gray-500 font-medium">
              {categoryDistribution.labels.length} categories
            </span>
          </div>
          <div className="h-72">
            <Doughnut
              data={{
                labels: categoryDistribution.labels,
                datasets: [{
                  data: categoryDistribution.values,
                  backgroundColor: [
                    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
                    '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'
                  ],
                  borderWidth: 2,
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
                      font: { size: 11 },
                      usePointStyle: true
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* TOP LISTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-6 h-6 text-indigo-600" />
              Top Selling Products
            </h3>
            <span className="text-sm text-gray-500 font-medium">
              By sales value
            </span>
          </div>
          <div className="space-y-4">
            {topProductsData.labels.map((label, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{label}</h4>
                    <p className="text-sm text-gray-500">Product</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{fmt(topProductsData.values[index])}</p>
                  <p className="text-sm text-gray-500">Sales</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-600" />
              Top Customers
            </h3>
            <span className="text-sm text-gray-500 font-medium">
              By purchase value
            </span>
          </div>
          <div className="space-y-4">
            {topCustomersData.labels.map((label, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{label}</h4>
                    <p className="text-sm text-gray-500">Customer</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{fmt(topCustomersData.values[index])}</p>
                  <p className="text-sm text-gray-500">Spending</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RECENT TRANSACTIONS */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-blue-600" />
              Recent Transactions
            </h3>
            <span className="text-sm text-gray-500 font-medium">
              Last {Math.min(10, cleanData.length)} of {cleanData.length}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Date</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Voucher No</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Party</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Item</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Amount</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cleanData.slice(0, 10).map((row, index) => (
                <tr key={index} className="hover:bg-blue-50 transition-colors">
                  <td className="py-4 px-6 text-sm text-gray-900">{row.Date || '-'}</td>
                  <td className="py-4 px-6 text-sm font-medium text-gray-900">{row['Voucher No'] || '-'}</td>
                  <td className="py-4 px-6 text-sm text-gray-900">{row['Party Name'] || '-'}</td>
                  <td className="py-4 px-6 text-sm text-gray-900">{row.ItemName || '-'}</td>
                  <td className="py-4 px-6 text-sm font-bold text-blue-600">{fmt(row.Amount)}</td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => openInvoice(row)}
                      className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg font-medium hover:bg-blue-200 transition-colors flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
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

function MetricCard({ title, value, icon: Icon, color, subtitle }) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-emerald-100 text-emerald-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-2">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className={`h-1 rounded-full ${colorClasses[color]}`}></div>
    </div>
  );
}

// ==================== TRANSACTIONS SECTION ====================
function TransactionsSection({ data, totalPages, currentPage, setCurrentPage, cleanData, openInvoice, exportCSV, fmt }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Transaction Log</h3>
            <p className="text-gray-600 mt-2">
              Showing {data.length} of {cleanData.length} transactions
            </p>
          </div>
          <button
            onClick={() => exportCSV(cleanData, 'transactions')}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all hover:scale-105 flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">S.No</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Date</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Voucher No</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Type</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Party</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Item</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Qty</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Amount</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((row, index) => (
                <tr key={index} className="hover:bg-blue-50 transition-colors">
                  <td className="py-4 px-6 text-sm text-gray-900 font-medium">
                    {(currentPage - 1) * 15 + index + 1}
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-900">{row.Date || '-'}</td>
                  <td className="py-4 px-6 text-sm font-medium text-blue-600">{row['Voucher No'] || '-'}</td>
                  <td className="py-4 px-6 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      row.Type?.toLowerCase().includes('sales') 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {row.Type || '-'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-900">{row['Party Name'] || '-'}</td>
                  <td className="py-4 px-6 text-sm text-gray-900">{row.ItemName || '-'}</td>
                  <td className="py-4 px-6 text-sm text-gray-900 font-medium">{row.Qty || 0}</td>
                  <td className="py-4 px-6 text-sm font-bold text-blue-600">{fmt(row.Amount)}</td>
                  <td className="py-4 px-6">
                    <button
                      onClick={() => openInvoice(row)}
                      className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg font-medium hover:bg-blue-200 transition-colors flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>
          
          <div className="flex items-center gap-2">
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
                  className={`w-10 h-10 rounded-lg font-medium transition-all ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== CUSTOMERS SECTION ====================
function CustomersSection({ data, fmt }) {
  const customerSummary = useMemo(() => {
    const summary = {};
    
    data.forEach(row => {
      const party = row['Party Name'];
      if (!party || party === 'N/A') return;
      
      if (!summary[party]) {
        summary[party] = {
          total: 0,
          count: 0,
          lastDate: row.Date,
          category: row['Item Category']
        };
      }
      
      summary[party].total += parseFloat(row.Amount) || 0;
      summary[party].count += 1;
    });
    
    return Object.entries(summary)
      .map(([name, info]) => ({ name, ...info }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Customer Analysis</h3>
          <p className="text-gray-600 mt-2">
            {customerSummary.length} unique customers
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customerSummary.slice(0, 12).map((customer, index) => (
          <div key={index} className="bg-gray-50 rounded-xl p-5 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{customer.name}</h4>
                    <p className="text-sm text-gray-500">{customer.category || 'No category'}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  {customer.count} transactions
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Value:</span>
                <span className="font-bold text-blue-600">{fmt(customer.total)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg. Transaction:</span>
                <span className="font-medium text-gray-900">
                  {fmt(customer.total / customer.count)}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Last transaction: {customer.lastDate || 'Unknown'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== PRODUCTS SECTION ====================
function ProductsSection({ data, fmt }) {
  const productSummary = useMemo(() => {
    const summary = {};
    
    data.forEach(row => {
      const item = row.ItemName;
      if (!item || item === 'N/A') return;
      
      if (!summary[item]) {
        summary[item] = {
          total: 0,
          quantity: 0,
          count: 0,
          category: row['Item Category'],
          group: row['Item Group']
        };
      }
      
      summary[item].total += parseFloat(row.Amount) || 0;
      summary[item].quantity += parseFloat(row.Qty) || 0;
      summary[item].count += 1;
    });
    
    return Object.entries(summary)
      .map(([name, info]) => ({ name, ...info }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Product Analysis</h3>
          <p className="text-gray-600 mt-2">
            {productSummary.length} unique products
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Product Name</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Category</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Group</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Total Qty</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Transactions</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Total Value</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Avg. Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {productSummary.slice(0, 20).map((product, index) => (
              <tr key={index} className="hover:bg-blue-50 transition-colors">
                <td className="py-4 px-6 text-sm font-medium text-gray-900">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <span>{product.name}</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-sm text-gray-900">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                    {product.category || '-'}
                  </span>
                </td>
                <td className="py-4 px-6 text-sm text-gray-900">{product.group || '-'}</td>
                <td className="py-4 px-6 text-sm font-bold text-gray-900">{product.quantity.toFixed(2)}</td>
                <td className="py-4 px-6 text-sm text-gray-900">{product.count}</td>
                <td className="py-4 px-6 text-sm font-bold text-blue-600">{fmt(product.total)}</td>
                <td className="py-4 px-6 text-sm font-medium text-gray-900">
                  {fmt(product.quantity > 0 ? product.total / product.quantity : 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== CATEGORIES SECTION ====================
function CategoriesSection({ data, fmt }) {
  const categorySummary = useMemo(() => {
    const summary = {};
    
    data.forEach(row => {
      const category = row['Item Category'];
      if (!category || category === 'N/A') return;
      
      if (!summary[category]) {
        summary[category] = {
          total: 0,
          count: 0,
          products: new Set(),
          parties: new Set()
        };
      }
      
      summary[category].total += parseFloat(row.Amount) || 0;
      summary[category].count += 1;
      if (row.ItemName && row.ItemName !== 'N/A') summary[category].products.add(row.ItemName);
      if (row['Party Name'] && row['Party Name'] !== 'N/A') summary[category].parties.add(row['Party Name']);
    });
    
    return Object.entries(summary)
      .map(([name, info]) => ({ 
        name, 
        ...info,
        productCount: info.products.size,
        partyCount: info.parties.size
      }))
      .sort((a, b) => b.total - a.total);
  }, [data]);

  // Prepare chart data
  const chartData = {
    labels: categorySummary.slice(0, 8).map(c => c.name),
    datasets: [{
      data: categorySummary.slice(0, 8).map(c => c.total),
      backgroundColor: [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
        '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6'
      ]
    }]
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Category Performance</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="h-96">
              <Doughnut
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                      labels: {
                        padding: 20,
                        font: { size: 12 }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            {categorySummary.slice(0, 5).map((category, index) => (
              <div key={index} className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-900">{category.name}</h4>
                  <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Sales:</span>
                    <span className="font-bold">{fmt(category.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Transactions:</span>
                    <span className="font-medium">{category.count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Products:</span>
                    <span className="font-medium">{category.productCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Customers:</span>
                    <span className="font-medium">{category.partyCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Category</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Total Sales</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Transactions</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Products</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Customers</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Avg. Transaction</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Share %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categorySummary.map((category, index) => {
                const totalAll = categorySummary.reduce((sum, c) => sum + c.total, 0);
                const share = totalAll > 0 ? (category.total / totalAll * 100) : 0;
                
                return (
                  <tr key={index} className="hover:bg-blue-50 transition-colors">
                    <td className="py-4 px-6 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
                          style={{ backgroundColor: chartData.datasets[0].backgroundColor[index % 8] + '20' }}>
                          <span style={{ color: chartData.datasets[0].backgroundColor[index % 8] }}>
                            {index + 1}
                          </span>
                        </div>
                        <span>{category.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-blue-600">{fmt(category.total)}</td>
                    <td className="py-4 px-6 text-sm text-gray-900">{category.count}</td>
                    <td className="py-4 px-6 text-sm text-gray-900">{category.productCount}</td>
                    <td className="py-4 px-6 text-sm text-gray-900">{category.partyCount}</td>
                    <td className="py-4 px-6 text-sm font-medium text-gray-900">
                      {fmt(category.total / category.count)}
                    </td>
                    <td className="py-4 px-6 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.min(100, share)}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-gray-900">{share.toFixed(1)}%</span>
                      </div>
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

// ==================== REPORTS SECTION ====================
function ReportsSection({ data, exportCSV, exportExcel, exportPDF, fmt }) {
  const [selectedReport, setSelectedReport] = useState('summary');

  const reports = [
    { id: 'summary', name: 'Executive Summary', desc: 'Key metrics and overview' },
    { id: 'sales', name: 'Sales Report', desc: 'Detailed sales analysis' },
    { id: 'customers', name: 'Customer Report', desc: 'Customer-wise breakdown' },
    { id: 'products', name: 'Product Report', desc: 'Product performance analysis' },
    { id: 'categories', name: 'Category Report', desc: 'Category-wise performance' },
    { id: 'periodic', name: 'Periodic Report', desc: 'Time-based analysis' },
  ];

  const generateReport = () => {
    switch(selectedReport) {
      case 'summary':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-xl p-6">
                <h4 className="font-bold text-blue-900 mb-4">Total Sales</h4>
                <p className="text-3xl font-bold text-blue-600">
                  {fmt(data.reduce((sum, row) => sum + (parseFloat(row.Amount) || 0), 0))}
                </p>
                <p className="text-sm text-blue-700 mt-2">{data.length} transactions</p>
              </div>
              
              <div className="bg-green-50 rounded-xl p-6">
                <h4 className="font-bold text-green-900 mb-4">Unique Customers</h4>
                <p className="text-3xl font-bold text-green-600">
                  {new Set(data.map(r => r['Party Name']).filter(Boolean)).size}
                </p>
                <p className="text-sm text-green-700 mt-2">Active parties</p>
              </div>
              
              <div className="bg-purple-50 rounded-xl p-6">
                <h4 className="font-bold text-purple-900 mb-4">Products Sold</h4>
                <p className="text-3xl font-bold text-purple-600">
                  {new Set(data.map(r => r.ItemName).filter(Boolean)).size}
                </p>
                <p className="text-sm text-purple-700 mt-2">Unique items</p>
              </div>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-gray-200">
              <h4 className="font-bold text-gray-900 mb-4">Top 5 Categories</h4>
              <div className="space-y-4">
                {(() => {
                  const catSummary = {};
                  data.forEach(row => {
                    const cat = row['Item Category'];
                    if (!cat) return;
                    catSummary[cat] = (catSummary[cat] || 0) + (parseFloat(row.Amount) || 0);
                  });
                  
                  return Object.entries(catSummary)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([cat, value], index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">
                            {index + 1}
                          </div>
                          <span className="font-medium">{cat}</span>
                        </div>
                        <span className="font-bold text-blue-600">{fmt(value)}</span>
                      </div>
                    ));
                })()}
              </div>
            </div>
          </div>
        );
      
      case 'sales':
        return (
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-6">Sales Analysis Report</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-3 font-semibold text-gray-700">Period</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Transactions</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Total Sales</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Avg. Transaction</th>
                    <th className="text-left p-3 font-semibold text-gray-700">Growth %</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    // Group by month
                    const monthly = {};
                    data.forEach(row => {
                      const date = new Date(row.Date);
                      if (isNaN(date)) return;
                      const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                      if (!monthly[key]) monthly[key] = { total: 0, count: 0 };
                      monthly[key].total += parseFloat(row.Amount) || 0;
                      monthly[key].count += 1;
                    });
                    
                    return Object.entries(monthly)
                      .sort((a, b) => b[0].localeCompare(a[0]))
                      .slice(0, 6)
                      .map(([month, stats], index, arr) => {
                        const prevMonth = arr[index + 1];
                        const growth = prevMonth ? 
                          ((stats.total - prevMonth[1].total) / prevMonth[1].total * 100) : 0;
                        
                        return (
                          <tr key={month} className="border-b border-gray-100">
                            <td className="p-3 text-gray-900 font-medium">{month}</td>
                            <td className="p-3 text-gray-700">{stats.count}</td>
                            <td className="p-3 font-bold text-blue-600">{fmt(stats.total)}</td>
                            <td className="p-3 text-gray-700">{fmt(stats.total / stats.count)}</td>
                            <td className="p-3">
                              <span className={`font-medium ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {growth.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h4 className="font-bold text-gray-900 mb-4">{reports.find(r => r.id === selectedReport)?.name}</h4>
            <p className="text-gray-600">Report preview for {selectedReport} will be displayed here.</p>
            <p className="text-sm text-gray-500 mt-4">
              Total records: {data.length} | Use export buttons to download complete report.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map(report => (
          <button
            key={report.id}
            onClick={() => setSelectedReport(report.id)}
            className={`p-6 rounded-2xl border-2 text-left transition-all ${
              selectedReport === report.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-blue-300'
            }`}
          >
            <h4 className="font-bold text-gray-900 mb-2">{report.name}</h4>
            <p className="text-sm text-gray-600">{report.desc}</p>
            <div className={`mt-4 h-1 rounded-full ${
              selectedReport === report.id ? 'bg-blue-500' : 'bg-gray-200'
            }`}></div>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">
            {reports.find(r => r.id === selectedReport)?.name}
          </h3>
          <div className="flex gap-3">
            <button
              onClick={() => exportCSV(data, selectedReport)}
              className="px-4 py-2.5 bg-blue-100 text-blue-600 rounded-lg font-medium hover:bg-blue-200 transition-colors flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              CSV
            </button>
            <button
              onClick={() => exportExcel(data, selectedReport)}
              className="px-4 py-2.5 bg-green-100 text-green-600 rounded-lg font-medium hover:bg-green-200 transition-colors flex items-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Excel
            </button>
            <button
              onClick={exportPDF}
              className="px-4 py-2.5 bg-red-100 text-red-600 rounded-lg font-medium hover:bg-red-200 transition-colors flex items-center gap-2"
            >
              <Printer className="w-5 h-5" />
              PDF
            </button>
          </div>
        </div>

        {generateReport()}
      </div>
    </div>
  );
}

// ==================== EXPORT SECTION ====================
function ExportSection({ data, exportCSV, exportExcel, exportPDF }) {
  const [exportFormat, setExportFormat] = useState('csv');
  const [includeAll, setIncludeAll] = useState(true);
  const [selectedFields, setSelectedFields] = useState([
    'Date', 'Voucher Number', 'Party Name', 'ItemName', 'Item Category', 'Qty', 'Amount'
  ]);

  const allFields = data.length > 0 ? Object.keys(data[0]) : [];

  const handleExport = () => {
    const fieldsToExport = includeAll ? allFields : selectedFields;
    const filteredData = data.map(row => {
      const filteredRow = {};
      fieldsToExport.forEach(field => {
        filteredRow[field] = row[field];
      });
      return filteredRow;
    });

    switch(exportFormat) {
      case 'csv':
        exportCSV(filteredData, 'analyst_export');
        break;
      case 'excel':
        exportExcel(filteredData, 'analyst_export');
        break;
      case 'pdf':
        exportPDF();
        break;
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
        <h3 className="text-3xl font-bold text-gray-900 mb-2">Data Export</h3>
        <p className="text-gray-600 mb-8">
          Export your analyzed data in various formats for further processing or sharing.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Format Selection */}
          <div className="space-y-6">
            <h4 className="font-bold text-gray-900 text-lg">Export Format</h4>
            {[
              { id: 'csv', name: 'CSV File', desc: 'Comma separated values', icon: '📊' },
              { id: 'excel', name: 'Excel Workbook', desc: 'Microsoft Excel format', icon: '📈' },
              { id: 'pdf', name: 'PDF Report', desc: 'Printable document', icon: '📄' },
            ].map(format => (
              <button
                key={format.id}
                onClick={() => setExportFormat(format.id)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  exportFormat === format.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{format.icon}</span>
                  <div>
                    <h5 className="font-bold text-gray-900">{format.name}</h5>
                    <p className="text-sm text-gray-600">{format.desc}</p>
                  </div>
                  {exportFormat === format.id && (
                    <CheckCircle className="w-6 h-6 text-blue-500 ml-auto" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Fields Selection */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-gray-900 text-lg">Select Fields</h4>
              <button
                onClick={() => setIncludeAll(!includeAll)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                {includeAll ? 'Select Specific' : 'Select All'}
              </button>
            </div>

            {!includeAll && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-2">
                {allFields.map(field => (
                  <label key={field} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFields([...selectedFields, field]);
                        } else {
                          setSelectedFields(selectedFields.filter(f => f !== field));
                        }
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">{field}</span>
                  </label>
                ))}
              </div>
            )}

            {includeAll && (
              <div className="bg-blue-50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                  <div>
                    <h5 className="font-bold text-blue-900">All Fields Selected</h5>
                    <p className="text-sm text-blue-700">All {allFields.length} fields will be exported</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allFields.slice(0, 8).map(field => (
                    <span key={field} className="px-3 py-1 bg-white text-blue-600 rounded-full text-sm font-medium">
                      {field}
                    </span>
                  ))}
                  {allFields.length > 8 && (
                    <span className="px-3 py-1 bg-white text-blue-600 rounded-full text-sm font-medium">
                      +{allFields.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h5 className="font-bold text-gray-900 mb-4">Export Summary</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Format</p>
                  <p className="font-bold text-gray-900">{exportFormat.toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Records</p>
                  <p className="font-bold text-gray-900">{data.length.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fields</p>
                  <p className="font-bold text-gray-900">
                    {includeAll ? allFields.length : selectedFields.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Size (approx)</p>
                  <p className="font-bold text-gray-900">
                    {Math.round(data.length * (includeAll ? allFields.length : selectedFields.length) * 0.1).toLocaleString()} KB
                  </p>
                </div>
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center gap-3"
            >
              <DownloadCloud className="w-6 h-6" />
              Export Data Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== INVOICE MODAL ====================
function InvoiceModal({ invoice, onClose, onPrint }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold text-white">TAX INVOICE</h3>
              <p className="text-gray-300">Communication World Infomatic Pvt. Ltd.</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Invoice Content */}
        <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
          {/* Company Header */}
          <div className="text-center border-b-2 border-gray-100 pb-6">
            <h1 className="text-3xl font-bold text-gray-900">COMMUNICATION WORLD INFOMATIC PVT. LTD.</h1>
            <p className="text-gray-600 mt-2">Registered Office: [Your Address] • GSTIN: [Your GSTIN]</p>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase">Invoice To</h4>
                <p className="text-lg font-bold text-gray-900 mt-2">{invoice['Party Name'] || '—'}</p>
                <p className="text-gray-600">{invoice['Party Group'] || '—'}</p>
                <p className="text-gray-600">{invoice['City/Area'] || '—'}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-gray-500">Invoice No</h4>
                  <p className="font-bold text-gray-900">{invoice['Invoice No'] || invoice['Voucher Number'] || '—'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-500">Date</h4>
                  <p className="font-bold text-gray-900">{invoice.Date || '—'}</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-500">Salesman</h4>
                <p className="font-medium text-gray-900">{invoice.Salesman || '—'}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4 font-semibold text-gray-700">Description</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Qty</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Rate</th>
                  <th className="text-left p-4 font-semibold text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-200">
                  <td className="p-4">
                    <div>
                      <p className="font-bold text-gray-900">{invoice.ItemName || '—'}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Category: {invoice['Item Category'] || '—'} • Group: {invoice['Item Group'] || '—'}
                      </p>
                    </div>
                  </td>
                  <td className="p-4 font-medium text-gray-900">{invoice.Qty || 0}</td>
                  <td className="p-4 font-medium text-gray-900">₹{parseFloat(invoice.Rate || 0).toLocaleString('en-IN')}</td>
                  <td className="p-4 font-bold text-blue-600">₹{parseFloat(invoice.Amount || 0).toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full md:w-96 bg-gray-50 rounded-xl p-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">₹{parseFloat(invoice.Amount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (GST)</span>
                  <span className="font-medium">₹0.00</span>
                </div>
                <div className="border-t border-gray-300 pt-4">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-gray-900">Grand Total</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ₹{parseFloat(invoice.Amount || 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.Narration && (
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
              <p className="text-sm text-yellow-800"><strong>Note:</strong> {invoice.Narration}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 border-t border-gray-200 pt-6">
            <p>This is a computer generated invoice and does not require signature.</p>
            <p className="mt-2">Thank you for your business!</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="flex gap-3">
              <button
                onClick={onPrint}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Printer className="w-5 h-5" />
                Print Invoice
              </button>
              <button
                onClick={() => {
                  const text = `Invoice: ${invoice['Invoice No']}\nCustomer: ${invoice['Party Name']}\nAmount: ₹${parseFloat(invoice.Amount || 0).toLocaleString('en-IN')}`;
                  navigator.clipboard.writeText(text);
                  alert('Invoice details copied to clipboard!');
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors flex items-center gap-2"
              >
                <Copy className="w-5 h-5" />
                Copy Details
              </button>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add some global styles
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
  
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
`;

// Add styles to document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

export default Analyst;
