// src/pages/Analyst.jsx - SIMPLIFIED WORKING VERSION
import React, { useEffect, useState, useMemo } from "react";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
} from "chart.js";
import {
  Search,
  Filter,
  Download,
  Eye,
  RefreshCw,
  FileText,
  Users,
  Package,
  TrendingUp,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title
);

export default function Analyst() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [search, setSearch] = useState("");

  // Filters
  const [dateFilter, setDateFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [partyFilter, setPartyFilter] = useState("");

  // Fetch Data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the same backend as Dashboard
      const backendURL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
        ? "http://127.0.0.1:8787"
        : "https://selt-t-backend.selt-3232.workers.dev";

      const token = localStorage.getItem("token");
      
      console.log("Fetching from:", backendURL);
      
      const response = await fetch(`${backendURL}/api/vouchers?limit=1000`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // Transform data to match Dashboard format
        const formattedData = result.data.map(item => ({
          "Date": item.date || "",
          "Voucher Number": item.vch_no || item.voucher_number || "",
          "Voucher Type": item.vch_type || "Sales",
          "Party Name": item.party_name || "N/A",
          "Party Group": item.party_group || "N/A",
          "ItemName": item.name_item || item.item_name || "N/A",
          "Item Group": item.item_group || "N/A",
          "Item Category": item.item_category || "Sales",
          "Salesman": item.salesman || "N/A",
          "City/Area": item.city_area || "N/A",
          "Amount": parseFloat(item.amount) || 0,
          "Qty": parseFloat(item.qty) || 0,
          "Rate": parseFloat(item.rate) || 0,
          "Narration": item.narration || ""
        }));
        
        setData(formattedData);
        console.log("Data loaded:", formattedData.length, "records");
      } else {
        throw new Error(result.message || "Invalid response format");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message);
      
      // Try to load from Dashboard's cache
      try {
        const dashboardData = localStorage.getItem("dashboard_data");
        if (dashboardData) {
          const parsed = JSON.parse(dashboardData);
          setData(parsed);
          console.log("Loaded from Dashboard cache:", parsed.length, "records");
        }
      } catch (cacheErr) {
        console.error("Cache load failed:", cacheErr);
      }
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const filteredData = useMemo(() => {
    let result = [...data];
    
    // Search filter
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(item => 
        Object.values(item).some(val => 
          String(val).toLowerCase().includes(term)
        )
      );
    }
    
    // Category filter
    if (categoryFilter) {
      result = result.filter(item => item["Item Category"] === categoryFilter);
    }
    
    // Party filter
    if (partyFilter) {
      result = result.filter(item => item["Party Name"] === partyFilter);
    }
    
    return result;
  }, [data, search, categoryFilter, partyFilter]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalSales = filteredData.reduce((sum, item) => sum + (item.Amount || 0), 0);
    const partyCount = new Set(filteredData.map(item => item["Party Name"]).filter(Boolean)).size;
    const itemCount = new Set(filteredData.map(item => item["ItemName"]).filter(Boolean)).size;
    const voucherCount = new Set(filteredData.map(item => item["Voucher Number"]).filter(Boolean)).size;
    
    return {
      totalSales,
      partyCount,
      itemCount,
      voucherCount,
      recordCount: filteredData.length
    };
  }, [filteredData]);

  // Monthly trend data
  const monthlyTrend = useMemo(() => {
    const monthly = {};
    filteredData.forEach(item => {
      const date = item.Date;
      if (date) {
        const month = date.substring(0, 7); // YYYY-MM format
        monthly[month] = (monthly[month] || 0) + (item.Amount || 0);
      }
    });
    
    const labels = Object.keys(monthly).sort();
    const values = labels.map(label => monthly[label]);
    
    return { labels, values };
  }, [filteredData]);

  // Company distribution
  const companyDistribution = useMemo(() => {
    const distribution = {};
    filteredData.forEach(item => {
      const category = item["Item Category"] || "Other";
      distribution[category] = (distribution[category] || 0) + (item.Amount || 0);
    });
    
    const labels = Object.keys(distribution);
    const values = Object.values(distribution);
    
    return { labels, values };
  }, [filteredData]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Loading Analyst Dashboard</h2>
          <p className="text-gray-600 mb-2">Fetching real-time data from Tally...</p>
          <div className="flex items-center justify-center gap-2 text-sm text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Syncing with backend...</span>
          </div>
          <p className="text-xs text-gray-500 mt-6">Please wait while we load your data</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="text-red-600 text-2xl">⚠️</div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Connection Error</h2>
            <p className="text-gray-600">Unable to load analyst data. Check backend connection.</p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={fetchData}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              Retry Connection
            </button>
            
            <button
              onClick={() => {
                localStorage.removeItem("dashboard_data");
                window.location.reload();
              }}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
            >
              Clear Cache & Retry
            </button>
            
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-gray-500">Using backend: <code className="bg-gray-100 px-2 py-1 rounded text-xs">{window.location.hostname === "localhost" ? "localhost:8787" : "selt-t-backend"}</code></p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl text-white">
                <FileText size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ANALYST DASHBOARD</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-600">{metrics.recordCount} records found</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                    ✓ Live Data
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
              
              <button
                onClick={() => {
                  const csv = convertToCSV(filteredData);
                  downloadCSV(csv, "analyst_data.csv");
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 flex items-center gap-2"
              >
                <Download size={16} />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search anything..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-w-[140px]"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {[...new Set(data.map(item => item["Item Category"]).filter(Boolean))].map((cat, idx) => (
                  <option key={idx} value={cat}>{cat}</option>
                ))}
              </select>
              
              <select
                className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-w-[140px]"
                value={partyFilter}
                onChange={(e) => setPartyFilter(e.target.value)}
              >
                <option value="">All Parties</option>
                {[...new Set(data.map(item => item["Party Name"]).filter(Boolean))].map((party, idx) => (
                  <option key={idx} value={party}>{party}</option>
                ))}
              </select>
              
              {search || categoryFilter || partyFilter ? (
                <button
                  onClick={() => {
                    setSearch("");
                    setCategoryFilter("");
                    setPartyFilter("");
                  }}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium flex items-center gap-2"
                >
                  <X size={18} />
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2 mb-6 overflow-x-auto">
          <div className="flex space-x-1 min-w-max">
            {["dashboard", "transactions", "reports", "party", "inventory", "masters"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab === "dashboard" && "📊 Dashboard"}
                {tab === "transactions" && "💰 Transactions"}
                {tab === "reports" && "📈 Reports"}
                {tab === "party" && "👥 Party Analysis"}
                {tab === "inventory" && "📦 Inventory"}
                {tab === "masters" && "📋 Masters"}
              </button>
            ))}
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard 
                title="Total Sales" 
                value={`₹${metrics.totalSales.toLocaleString("en-IN")}`}
                color="blue"
                subtitle={`${metrics.recordCount} transactions`}
              />
              
              <MetricCard 
                title="Party Count" 
                value={metrics.partyCount}
                color="green"
                subtitle="Active Customers"
              />
              
              <MetricCard 
                title="Inventory Count" 
                value={metrics.itemCount}
                color="purple"
                subtitle="Unique Items"
              />
              
              <MetricCard 
                title="Billing Count" 
                value={metrics.voucherCount}
                color="orange"
                subtitle="Generated Bills"
              />
            </div>

            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Monthly Trend Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Monthly Sales Trend</h3>
                  <TrendingUp className="text-blue-600" size={24} />
                </div>
                <div className="h-64">
                  <Line
                    data={{
                      labels: monthlyTrend.labels,
                      datasets: [{
                        label: "Sales",
                        data: monthlyTrend.values,
                        borderColor: "#3B82F6",
                        backgroundColor: "rgba(59, 130, 246, 0.1)",
                        fill: true,
                        tension: 0.4
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
                            callback: function(value) {
                              return '₹' + (value / 1000).toFixed(0) + 'K';
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Company Distribution */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Company Split</h3>
                  <Package className="text-purple-600" size={24} />
                </div>
                <div className="h-64">
                  <Doughnut
                    data={{
                      labels: companyDistribution.labels,
                      datasets: [{
                        data: companyDistribution.values,
                        backgroundColor: [
                          "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", 
                          "#EC4899", "#6366F1", "#14B8A6", "#F97316"
                        ],
                        borderWidth: 1
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'right'
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b">
                <h3 className="text-lg font-bold text-gray-900">Recent Transactions</h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Voucher No</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Party</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Item</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredData.slice(0, 10).map((item, idx) => (
                      <tr key={idx} className="hover:bg-blue-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">{item["Voucher Number"] || "-"}</div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{item.Date || "-"}</td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{item["Party Name"] || "-"}</div>
                          <div className="text-sm text-gray-500">{item["Party Group"] || ""}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium">{item["ItemName"] || "-"}</div>
                          <div className="text-sm text-gray-500">{item["Item Category"] || ""}</div>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="font-bold text-gray-900">₹{item.Amount.toLocaleString("en-IN")}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  Showing {Math.min(10, filteredData.length)} of {filteredData.length} records
                </div>
                {filteredData.length > 10 && (
                  <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                    View All →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === "transactions" && (
          <TransactionsTab data={filteredData} />
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <ReportsTab data={filteredData} />
        )}

        {/* Party Analysis Tab */}
        {activeTab === "party" && (
          <PartyAnalysisTab data={filteredData} />
        )}

        {/* Inventory Tab */}
        {activeTab === "inventory" && (
          <InventoryTab data={filteredData} />
        )}

        {/* Masters Tab */}
        {activeTab === "masters" && (
          <MastersTab data={filteredData} />
        )}
      </div>
    </div>
  );
}

// Helper Components

function MetricCard({ title, value, color, subtitle }) {
  const colorClasses = {
    blue: "bg-gradient-to-br from-blue-500 to-blue-600",
    green: "bg-gradient-to-br from-emerald-500 to-emerald-600",
    purple: "bg-gradient-to-br from-purple-500 to-purple-600",
    orange: "bg-gradient-to-br from-orange-500 to-orange-600"
  };

  return (
    <div className={`${colorClasses[color]} rounded-xl p-6 text-white shadow-lg`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm opacity-90 font-medium">{title}</p>
          <h3 className="text-2xl font-bold mt-1">{value}</h3>
        </div>
      </div>
      <p className="text-sm opacity-80 mt-3">{subtitle}</p>
    </div>
  );
}

function TransactionsTab({ data }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900">All Transactions</h3>
        <div className="text-sm text-gray-600">
          Total: {data.length} records
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Voucher No</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Party</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Item</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Category</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Qty</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.map((item, idx) => (
              <tr key={idx} className="hover:bg-blue-50 transition-colors">
                <td className="py-3 px-4 font-medium">{item["Voucher Number"] || "-"}</td>
                <td className="py-3 px-4 text-gray-600">{item.Date || "-"}</td>
                <td className="py-3 px-4">
                  <div>{item["Party Name"] || "-"}</div>
                  <div className="text-sm text-gray-500">{item["Party Group"] || ""}</div>
                </td>
                <td className="py-3 px-4">{item["ItemName"] || "-"}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                    {item["Item Category"] || "-"}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">{item.Qty || 0}</td>
                <td className="py-3 px-4 text-right font-bold">₹{item.Amount.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 flex items-center gap-2"
        >
          <ChevronLeft size={16} /> Previous
        </button>
        
        <div className="text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </div>
        
        <button
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 flex items-center gap-2"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

function ReportsTab({ data }) {
  const reportTypes = [
    { name: "Sales Report", filter: (item) => item["Voucher Type"] === "Sales" },
    { name: "Purchase Report", filter: (item) => item["Voucher Type"] === "Purchase" },
    { name: "Party Ledger", filter: () => true },
    { name: "Item Summary", filter: () => true }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-6">Generate Reports</h3>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportTypes.map((report, idx) => {
            const count = data.filter(report.filter).length;
            return (
              <div key={idx} className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-md transition-all">
                <div className="font-bold text-gray-900 mb-2">{report.name}</div>
                <div className="text-sm text-gray-600 mb-4">{count} records</div>
                <button
                  onClick={() => {
                    const filtered = data.filter(report.filter);
                    const csv = convertToCSV(filtered);
                    downloadCSV(csv, `${report.name.replace(/\s+/g, '_')}.csv`);
                  }}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Export CSV
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PartyAnalysisTab({ data }) {
  const partySummary = useMemo(() => {
    const summary = {};
    data.forEach(item => {
      const party = item["Party Name"] || "Unknown";
      if (!summary[party]) {
        summary[party] = { total: 0, count: 0 };
      }
      summary[party].total += item.Amount;
      summary[party].count += 1;
    });

    return Object.entries(summary)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);
  }, [data]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b">
        <h3 className="text-lg font-bold text-gray-900">Party Analysis</h3>
        <p className="text-sm text-gray-600 mt-1">Top 20 parties by sales volume</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Party Name</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Transactions</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Total Amount</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Avg. Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {partySummary.map((party, idx) => (
              <tr key={idx} className="hover:bg-blue-50 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-medium">{party.name}</div>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                    {party.count}
                  </span>
                </td>
                <td className="py-3 px-4 text-right font-bold text-gray-900">
                  ₹{party.total.toLocaleString("en-IN")}
                </td>
                <td className="py-3 px-4 text-right text-gray-600">
                  ₹{Math.round(party.total / party.count).toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function InventoryTab({ data }) {
  const itemSummary = useMemo(() => {
    const summary = {};
    data.forEach(item => {
      const itemName = item["ItemName"] || "Unknown";
      if (!summary[itemName]) {
        summary[itemName] = { qty: 0, amount: 0, category: item["Item Category"] };
      }
      summary[itemName].qty += item.Qty;
      summary[itemName].amount += item.Amount;
    });

    return Object.entries(summary)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 20);
  }, [data]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-6 border-b">
        <h3 className="text-lg font-bold text-gray-900">Inventory Analysis</h3>
        <p className="text-sm text-gray-600 mt-1">Top 20 items by sales value</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Item Name</th>
              <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Category</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Total Qty</th>
              <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Total Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {itemSummary.map((item, idx) => (
              <tr key={idx} className="hover:bg-green-50 transition-colors">
                <td className="py-3 px-4">
                  <div className="font-medium">{item.name}</div>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                    {item.category}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="font-medium">{item.qty.toFixed(2)}</span>
                </td>
                <td className="py-3 px-4 text-right font-bold text-gray-900">
                  ₹{item.amount.toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MastersTab({ data }) {
  const parties = [...new Set(data.map(item => item["Party Name"]).filter(Boolean))].sort();
  const items = [...new Set(data.map(item => item["ItemName"]).filter(Boolean))].sort();
  const categories = [...new Set(data.map(item => item["Item Category"]).filter(Boolean))].sort();
  const groups = [...new Set(data.map(item => item["Item Group"]).filter(Boolean))].sort();

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="text-blue-600" size={20} />
          <h3 className="text-lg font-bold text-gray-900">Party Master</h3>
          <span className="ml-auto px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
            {parties.length}
          </span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {parties.map((party, idx) => (
            <div key={idx} className="py-2 px-3 border-b border-gray-100 hover:bg-blue-50">
              {party}
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="text-purple-600" size={20} />
          <h3 className="text-lg font-bold text-gray-900">Item Master</h3>
          <span className="ml-auto px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
            {items.length}
          </span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.map((item, idx) => (
            <div key={idx} className="py-2 px-3 border-b border-gray-100 hover:bg-purple-50">
              {item}
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Categories</h3>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat, idx) => (
            <span key={idx} className="px-3 py-1 bg-green-100 text-green-700 rounded-full">
              {cat}
            </span>
          ))}
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Item Groups</h3>
        <div className="flex flex-wrap gap-2">
          {groups.map((group, idx) => (
            <span key={idx} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full">
              {group}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper functions
function convertToCSV(data) {
  if (!data.length) return "";
  
  const headers = Object.keys(data[0]);
  const rows = data.map(row => 
    headers.map(header => {
      const value = row[header];
      return `"${String(value || "").replace(/"/g, '""')}"`;
    }).join(",")
  );
  
  return [headers.join(","), ...rows].join("\n");
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
