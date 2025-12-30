// src/pages/Messaging.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import Papa from "papaparse";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Save, Send, RefreshCw, X, Play, QrCode } from "lucide-react";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import "jspdf-autotable";

// Agar config file hai to thik, nahi to empty object
// import config from "../config.js"; 
const BACKEND_URL = ""; // Relative path use karein agar proxy set hai, warna apna URL dalein

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/* -------------- Helper utilities ---------------- */

// Safe delay function for "Slow Speed" sending
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function Messaging() {
  // --- Data Sources ---
  const [importsData, setImportsData] = useState([]);
  const [outstandingData, setOutstandingData] = useState([]);
  const [billingData, setBillingData] = useState([]);

  // --- UI State ---
  const [loading, setLoading] = useState(false);
  const [connectStatus, setConnectStatus] = useState("disconnected"); // disconnected | connected | qr
  const [qrImage, setQrImage] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false); // Popup Control
  
  const [selectedSource, setSelectedSource] = useState("imports"); 
  const [previewRows, setPreviewRows] = useState([]); 
  const [selectedRows, setSelectedRows] = useState(new Set());
  
  const [templates, setTemplates] = useState([]); 
  const [currentTemplateName, setCurrentTemplateName] = useState("");
  const [currentTemplateBody, setCurrentTemplateBody] = useState("");
  const [detectedVars, setDetectedVars] = useState([]);
  const [mappingPreview, setMappingPreview] = useState([]); 
  
  const [logs, setLogs] = useState([]); 
  const [delaySeconds, setDelaySeconds] = useState(10); // Default 10 seconds gap (Anti-Ban)
  const [scheduleAt, setScheduleAt] = useState(""); 
  const [sending, setSending] = useState(false);
  const [waFallbackEnabled, setWaFallbackEnabled] = useState(true); 
  const [filterText, setFilterText] = useState("");
  
  const [chartData, setChartData] = useState({
    labels: [],
    sent: [],
    failed: [],
    pending: [],
  });
  
  const fileInputRef = useRef();
  const intervalRef = useRef(null);

  /* ----------------- Boot/load data ----------------- */

  useEffect(() => {
    loadAllSources();
    loadSavedTemplates();
    loadLogsFromBackend();
    
    // Check status every 5 seconds
    intervalRef.current = setInterval(checkWhatsAppStatus, 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  async function loadAllSources() {
    setLoading(true);
    try {
      // 1. Imports
      try {
        const res = await axios.get(`${BACKEND_URL}/api/imports/latest`);
        const clean = sanitizeRows(res?.data?.data || []);
        setImportsData(clean);
      } catch (e) { console.log("Imports fetch failed, using empty"); }

      // 2. Outstanding
      try {
        const res = await axios.get(`${BACKEND_URL}/api/outstanding`);
        const clean = sanitizeRows(res?.data?.data || []);
        setOutstandingData(clean);
      } catch (e) { console.log("Outstanding fetch failed"); }

      // 3. Billing
      try {
        const res = await axios.get(`${BACKEND_URL}/api/billing/list`);
        const clean = sanitizeRows(res?.data?.data || []);
        setBillingData(clean);
      } catch (e) { console.log("Billing fetch failed"); }

    } finally {
      setLoading(false);
      // Default load preview from imports or outstanding if available
      buildPreviewFromSource(selectedSource);
    }
  }

  /* ----------------- WhatsApp Connection (QR & Status) ----------------- */

  async function checkWhatsAppStatus() {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/whatsapp/status`);
      if (res.data?.connected) {
        setConnectStatus("connected");
        setShowQrModal(false); // Close popup if connected
        setQrImage(null);
      } else if (res.data?.qr) {
        setConnectStatus("qr");
        setQrImage(res.data.qr);
        // Note: Don't auto-open modal here to avoid annoyance, user clicks button
      } else {
        setConnectStatus("disconnected");
      }
    } catch (err) {
      // console.error("Status check failed");
    }
  }

  const handleQRConnect = async () => {
    setShowQrModal(true); // Open Popup immediately
    try {
      const res = await axios.post(`${BACKEND_URL}/api/whatsapp/start`);
      if (res.data?.qr) {
        setQrImage(res.data.qr);
        setConnectStatus("qr");
      } else if (res.data?.message === "Already connected") {
        setConnectStatus("connected");
        alert("WhatsApp already connected!");
        setShowQrModal(false);
      }
    } catch (err) {
      alert("Error starting WhatsApp session. Check Backend Console.");
      setShowQrModal(false);
    }
  };

  async function logoutWhatsApp() {
    try {
      await axios.post(`${BACKEND_URL}/api/whatsapp/logout`);
      setConnectStatus("disconnected");
      setQrImage(null);
    } catch (e) { alert("Logout failed"); }
  }

  /* ----------------- Data Handling ----------------- */

  function sanitizeRows(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.filter((r) => {
      const vals = Object.values(r).join(" ").toLowerCase();
      return !vals.includes("total") && vals.trim() !== "";
    });
  }

  function handleSourceChange(e) {
    const val = e.target.value;
    setSelectedSource(val);
    setFilterText("");
    buildPreviewFromSource(val);
  }

  function getCurrentSourceArray(src) {
    if (src === "imports") return importsData;
    if (src === "outstanding") return outstandingData;
    if (src === "billing") return billingData;
    return previewRows; // manual/csv
  }

  function buildPreviewFromSource(src = selectedSource) {
    const arr = getCurrentSourceArray(src) || [];
    const cleaned = arr.slice(0, 100); // Limit preview to 100 for performance
    setPreviewRows(cleaned);
    setSelectedRows(new Set());
    detectVariables(cleaned);
    buildMappingPreview(cleaned);
  }

  function detectVariables(rows) {
    const keys = new Set();
    (rows || []).slice(0, 5).forEach((r) => {
      Object.keys(r || {}).forEach((k) => keys.add(k));
    });
    setDetectedVars(Array.from(keys));
  }

  /* ----------------- Template Logic ----------------- */

  function loadSavedTemplates() {
    const s = localStorage.getItem("sel_templates");
    if (s) setTemplates(JSON.parse(s));
  }

  function saveTemplate() {
    const tpl = {
      id: Date.now(),
      name: currentTemplateName || "Untitled",
      body: currentTemplateBody,
      createdAt: new Date().toISOString(),
    };
    const newList = [tpl, ...templates];
    setTemplates(newList);
    localStorage.setItem("sel_templates", JSON.stringify(newList));
    alert("Template Saved!");
  }

  function deleteTemplate(id) {
    const newList = templates.filter(t => t.id !== id);
    setTemplates(newList);
    localStorage.setItem("sel_templates", JSON.stringify(newList));
  }

  function buildMappingPreview(rows = previewRows, body = currentTemplateBody) {
    const map = (r) => {
        return body.replace(/{{\s*([^}]+)\s*}}/g, (m, key) => {
            const k = key.trim();
            // Case insensitive search
            const foundKey = Object.keys(r).find(x => x.toLowerCase() === k.toLowerCase());
            return foundKey ? String(r[foundKey]) : "";
        });
    };

    const out = (rows || []).map((r) => ({
      message: body ? map(r) : "",
      to: normalizePhone(r["Phone"] || r["Mobile"] || r["Number"] || r["Contact"] || r["Mob"] || ""),
      row: r,
    }));
    setMappingPreview(out);
  }

  useEffect(() => {
    buildMappingPreview(previewRows, currentTemplateBody);
  }, [previewRows, currentTemplateBody]);

  /* ----------------- Sending Logic ----------------- */

  function normalizePhone(num) {
    if (!num) return "";
    let digits = String(num).replace(/\D/g, "");
    if (digits.length === 10) return "91" + digits; // Auto add 91 for India
    return digits;
  }

  async function startBulkSend(useSelected = true) {
    const rows = previewRows || [];
    const indices = useSelected ? Array.from(selectedRows) : rows.map((_, i) => i);
    
    if (indices.length === 0) return alert("No rows selected!");
    
    // Prepare payloads
    const queue = indices.map(i => {
        const item = mappingPreview[i];
        return { to: item.to, message: item.message, meta: item.row, id: Date.now() + Math.random() };
    });

    if (!window.confirm(`Start sending ${queue.length} messages? \nGap: ${delaySeconds} seconds.`)) return;

    setSending(true);

    // Initial Logs
    const newLogs = queue.map(q => ({
        id: q.id, to: q.to, message: q.message, status: "pending", time: new Date().toISOString()
    }));
    setLogs(prev => [...newLogs, ...prev]);

    // Process Queue
    for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        await processOneMessage(item);
        
        // Update Progress in Chart
        rebuildCharts();

        // Wait for delay (Slow Speed Logic)
        if (i < queue.length - 1) {
            await sleep(delaySeconds * 1000);
        }
    }
    
    setSending(false);
    alert("Campaign Finished!");
    saveLogsToBackend();
  }

  async function processOneMessage(item) {
    // 1. Try Backend WhatsApp
    if (connectStatus === "connected") {
        try {
            const res = await axios.post(`${BACKEND_URL}/api/whatsapp/send`, {
                to: item.to,
                message: item.message
            });
            if (res.data.success) {
                updateLog(item.id, "sent");
                return;
            } else {
                updateLog(item.id, "failed", res.data.error || "API Error");
            }
        } catch (err) {
            updateLog(item.id, "failed", "Network Error");
        }
    } 
    // 2. Fallback to wa.me (opens tab)
    else if (waFallbackEnabled) {
        const url = `https://wa.me/${item.to}?text=${encodeURIComponent(item.message)}`;
        window.open(url, "_blank");
        updateLog(item.id, "opened");
    } 
    else {
        updateLog(item.id, "failed", "Disconnected");
    }
  }

  function updateLog(id, status, error = null) {
    setLogs(prev => prev.map(l => l.id === id ? { ...l, status, error, time: new Date().toISOString() } : l));
  }

  /* ----------------- Logs & Charts ----------------- */

  function rebuildCharts(currentLogs = logs) {
    const sent = currentLogs.filter(l => l.status === "sent" || l.status === "opened").length;
    const failed = currentLogs.filter(l => l.status === "failed").length;
    const pending = currentLogs.filter(l => l.status === "pending").length;
    
    setChartData({
        labels: ["Sent", "Failed", "Pending"],
        sent: [sent, 0, 0],
        failed: [0, failed, 0],
        pending: [0, 0, pending]
    });
  }

  async function loadLogsFromBackend() {
    // Implement backend fetch if needed
    // const res = await axios.get(...)
  }
  
  async function saveLogsToBackend() {
      // Implement save to DB
  }

  /* ----------------- CSV Import ----------------- */
  function handleCSV(e) {
      const f = e.target.files[0];
      if(f) {
          Papa.parse(f, {
              header: true,
              complete: (res) => {
                  setPreviewRows(sanitizeRows(res.data));
                  setSelectedSource("csv");
              }
          });
      }
  }

  /* ----------------- RENDER ----------------- */

  return (
    <div className="p-6 min-h-screen bg-[#0A192F] text-gray-100">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-[#112240] p-4 rounded-xl shadow-lg border border-[#1E2D45]">
            <div>
                <h2 className="text-2xl font-bold text-[#64FFDA] flex items-center gap-2">
                    <Send size={24} /> Messaging Hub
                </h2>
                <p className="text-sm text-gray-400">Bulk WhatsApp Sender (Anti-Ban Safe)</p>
            </div>
            
            <div className="flex items-center gap-3 mt-4 md:mt-0">
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                    connectStatus === "connected" ? "bg-green-500/20 text-green-400 border-green-500" : 
                    "bg-red-500/20 text-red-400 border-red-500"
                }`}>
                    {connectStatus}
                </div>
                
                {connectStatus !== "connected" ? (
                    <button onClick={handleQRConnect} className="flex items-center gap-2 px-4 py-2 bg-[#64FFDA] text-[#0A192F] font-bold rounded-lg hover:bg-[#4CDBB3] transition">
                        <QrCode size={18} /> Connect WhatsApp
                    </button>
                ) : (
                    <button onClick={logoutWhatsApp} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                        Disconnect
                    </button>
                )}
            </div>
        </div>

        {/* --- MAIN GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT: Config & Template */}
            <div className="lg:col-span-1 space-y-6">
                {/* Data Source */}
                <div className="bg-[#112240] p-5 rounded-xl border border-[#1E2D45]">
                    <h3 className="text-[#64FFDA] font-semibold mb-4">1. Select Data</h3>
                    <select 
                        value={selectedSource} 
                        onChange={handleSourceChange}
                        className="w-full bg-[#0A192F] border border-[#1E2D45] text-white p-2 rounded mb-3 focus:border-[#64FFDA] outline-none"
                    >
                        <option value="imports">Uploaded Files (Imports)</option>
                        <option value="outstanding">Outstanding Parties</option>
                        <option value="billing">Sales / Billing Data</option>
                        <option value="csv">Upload CSV File</option>
                    </select>

                    {selectedSource === "csv" && (
                        <input type="file" accept=".csv" onChange={handleCSV} className="text-xs text-gray-400" />
                    )}
                    
                    <div className="flex justify-between mt-2 text-xs text-gray-400">
                        <span>Loaded Rows: {previewRows.length}</span>
                        <button onClick={() => buildPreviewFromSource()} className="text-[#64FFDA] hover:underline">Refresh Data</button>
                    </div>
                </div>

                {/* Send Config */}
                <div className="bg-[#112240] p-5 rounded-xl border border-[#1E2D45]">
                    <h3 className="text-[#64FFDA] font-semibold mb-4">2. Send Configuration</h3>
                    
                    <label className="block text-sm text-gray-300 mb-1">Gap between messages (Seconds)</label>
                    <input 
                        type="number" 
                        value={delaySeconds} 
                        onChange={(e) => setDelaySeconds(Number(e.target.value))}
                        className="w-full bg-[#0A192F] border border-[#1E2D45] text-white p-2 rounded mb-3 focus:border-[#64FFDA]"
                        min="2"
                    />
                    <p className="text-xs text-yellow-500 mb-4">Recommended: 10+ seconds to avoid Ban.</p>

                    <div className="flex items-center gap-2 mb-4">
                        <input 
                            type="checkbox" 
                            checked={waFallbackEnabled} 
                            onChange={(e) => setWaFallbackEnabled(e.target.checked)}
                            className="rounded bg-[#0A192F]"
                        />
                        <span className="text-sm text-gray-300">Fallback to Web (wa.me) if Disconnected</span>
                    </div>

                    <div className="flex gap-2">
                        <button 
                            onClick={() => startBulkSend(true)} 
                            disabled={sending}
                            className={`flex-1 py-3 rounded-lg font-bold text-[#0A192F] transition ${sending ? "bg-gray-500" : "bg-[#64FFDA] hover:bg-[#4CDBB3]"}`}
                        >
                            {sending ? "Sending..." : "Send Selected"}
                        </button>
                        <button 
                            onClick={() => startBulkSend(false)} 
                            disabled={sending}
                            className="px-4 py-3 bg-[#1E2D45] text-white rounded-lg font-bold hover:bg-[#2A3F5F]"
                        >
                            Send All
                        </button>
                    </div>
                </div>

                {/* Template Builder */}
                <div className="bg-[#112240] p-5 rounded-xl border border-[#1E2D45]">
                    <h3 className="text-[#64FFDA] font-semibold mb-2">3. Message Template</h3>
                    <input 
                        placeholder="Template Name" 
                        value={currentTemplateName}
                        onChange={(e) => setCurrentTemplateName(e.target.value)}
                        className="w-full bg-[#0A192F] border border-[#1E2D45] p-2 rounded mb-2 text-sm text-white"
                    />
                    <textarea 
                        rows={5}
                        value={currentTemplateBody}
                        onChange={(e) => setCurrentTemplateBody(e.target.value)}
                        placeholder="Hi {{Party}}, your balance is {{Amount}}."
                        className="w-full bg-[#0A192F] border border-[#1E2D45] p-2 rounded text-sm text-white focus:border-[#64FFDA] outline-none"
                    />
                    <div className="flex flex-wrap gap-1 mt-2 mb-3">
                        {detectedVars.map(v => (
                            <span key={v} onClick={() => setCurrentTemplateBody(prev => prev + ` {{${v}}} `)} className="text-xs bg-[#1E2D45] px-2 py-1 rounded cursor-pointer hover:bg-[#64FFDA] hover:text-black">
                                {v}
                            </span>
                        ))}
                    </div>
                    <div className="flex justify-between">
                        <button onClick={saveTemplate} className="text-xs bg-green-600 px-3 py-1 rounded text-white">Save Template</button>
                        <button onClick={() => setCurrentTemplateBody("")} className="text-xs bg-red-500 px-3 py-1 rounded text-white">Clear</button>
                    </div>
                    
                    {/* Saved Templates List */}
                    {templates.length > 0 && (
                        <div className="mt-4 border-t border-[#1E2D45] pt-2">
                            <p className="text-xs text-gray-500 mb-2">Saved Templates:</p>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                                {templates.map(t => (
                                    <div key={t.id} className="flex justify-between bg-[#0A192F] p-2 rounded text-xs">
                                        <span onClick={() => {setCurrentTemplateName(t.name); setCurrentTemplateBody(t.body)}} className="cursor-pointer hover:text-[#64FFDA]">{t.name}</span>
                                        <X size={12} className="cursor-pointer text-red-400" onClick={() => deleteTemplate(t.id)} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: Preview & Logs */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* Preview Table */}
                <div className="bg-[#112240] p-5 rounded-xl border border-[#1E2D45] h-[500px] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-[#64FFDA] font-semibold">Message Preview</h3>
                        <div className="flex gap-2">
                            <button onClick={() => setSelectedRows(new Set(previewRows.map((_, i) => i)))} className="text-xs bg-[#2A3F5F] px-3 py-1 rounded text-white">Select All</button>
                            <button onClick={() => setSelectedRows(new Set())} className="text-xs bg-[#2A3F5F] px-3 py-1 rounded text-white">Unselect All</button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-auto border border-[#1E2D45] rounded-lg">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[#0A192F] text-gray-400 sticky top-0">
                                <tr>
                                    <th className="p-3 w-10">#</th>
                                    <th className="p-3">To (Phone)</th>
                                    <th className="p-3">Message Preview</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1E2D45]">
                                {mappingPreview.map((row, i) => (
                                    <tr key={i} className={`hover:bg-[#1E2D45] ${selectedRows.has(i) ? "bg-[#1E2D45]/50" : ""}`}>
                                        <td className="p-3">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedRows.has(i)} 
                                                onChange={() => {
                                                    const newSet = new Set(selectedRows);
                                                    if(newSet.has(i)) newSet.delete(i); else newSet.add(i);
                                                    setSelectedRows(newSet);
                                                }}
                                            />
                                        </td>
                                        <td className="p-3 font-mono text-[#64FFDA]">{row.to}</td>
                                        <td className="p-3 text-gray-300 truncate max-w-xs" title={row.message}>{row.message}</td>
                                    </tr>
                                ))}
                                {mappingPreview.length === 0 && (
                                    <tr><td colSpan="3" className="p-4 text-center text-gray-500">No data loaded. Select a source.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Logs Area */}
                <div className="bg-[#112240] p-5 rounded-xl border border-[#1E2D45]">
                     <h3 className="text-[#64FFDA] font-semibold mb-4">Live Logs</h3>
                     <div className="h-48 overflow-y-auto space-y-2 font-mono text-xs">
                         {logs.map((l) => (
                             <div key={l.id} className="flex gap-3 border-b border-[#1E2D45] pb-1">
                                 <span className="text-gray-500">{dayjs(l.time).format("HH:mm:ss")}</span>
                                 <span className={l.status === 'sent' ? 'text-green-400' : l.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}>
                                     [{l.status.toUpperCase()}]
                                 </span>
                                 <span className="text-gray-300">{l.to}</span>
                                 {l.error && <span className="text-red-400">- {l.error}</span>}
                             </div>
                         ))}
                         {logs.length === 0 && <p className="text-gray-600 text-center mt-10">Ready to start...</p>}
                     </div>
                </div>

            </div>
        </div>

      </div>

      {/* --- QR MODAL (POPUP) --- */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#112240] border border-[#64FFDA] rounded-2xl p-6 w-full max-w-md flex flex-col items-center shadow-2xl relative">
                <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                    <X size={24} />
                </button>
                
                <h3 className="text-xl font-bold text-white mb-2">Scan QR Code</h3>
                <p className="text-sm text-gray-400 mb-6 text-center">Open WhatsApp on your phone > Linked Devices > Link a Device</p>
                
                <div className="bg-white p-4 rounded-lg">
                    {qrImage ? (
                        <img src={qrImage} alt="WhatsApp QR" className="w-64 h-64 object-contain" />
                    ) : (
                        <div className="w-64 h-64 flex items-center justify-center text-gray-800">
                            <span className="animate-pulse">Loading QR...</span>
                        </div>
                    )}
                </div>

                <p className="mt-4 text-xs text-yellow-500">Do not close this window until connected.</p>
            </div>
        </div>
      )}

    </div>
  );
}
