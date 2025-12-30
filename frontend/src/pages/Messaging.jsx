// src/pages/Messaging.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import Papa from "papaparse";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, Title, Tooltip, Legend, Filler
} from "chart.js";
import { 
  Save, Send, RefreshCw, X, Play, Pause, Square, 
  QrCode, Image as ImageIcon, Settings, Clock, AlertTriangle 
} from "lucide-react";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import "jspdf-autotable";

// Backend URL configuration
const BACKEND_URL = ""; // Proxy set hai to empty rakhein, nahi to full URL

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, Title, Tooltip, Legend, Filler
);

/* -------------- Helper: Sleep & Random ---------------- */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getRandomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

export default function Messaging() {
  // --- Data Sources ---
  const [importsData, setImportsData] = useState([]);
  const [outstandingData, setOutstandingData] = useState([]);
  const [billingData, setBillingData] = useState([]);

  // --- UI State ---
  const [connectStatus, setConnectStatus] = useState("disconnected");
  const [qrImage, setQrImage] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  
  const [selectedSource, setSelectedSource] = useState("imports"); 
  const [previewRows, setPreviewRows] = useState([]); 
  const [selectedRows, setSelectedRows] = useState(new Set());
  
  // --- Template & Message ---
  const [templates, setTemplates] = useState([]); 
  const [currentTemplateName, setCurrentTemplateName] = useState("");
  const [currentTemplateBody, setCurrentTemplateBody] = useState("");
  const [detectedVars, setDetectedVars] = useState([]);
  const [mappingPreview, setMappingPreview] = useState([]); 
  const [attachment, setAttachment] = useState(null); // New Image State

  // --- Campaign Execution State ---
  const [logs, setLogs] = useState([]); 
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stopFlag, setStopFlag] = useState(false);
  const [countdown, setCountdown] = useState(0); // For visual timer
  const [statusMessage, setStatusMessage] = useState("Ready");

  // --- PRO SETTINGS (Inspired by Electron Code) ---
  const [settings, setSettings] = useState({
    minDelay: 15,    // Min seconds between messages
    maxDelay: 30,    // Max seconds between messages
    batchSize: 10,   // How many msgs before taking a long break
    batchBreak: 60,  // Break time in seconds (Anti-Ban)
    waFallback: true // Fallback to wa.me if backend fails
  });
  
  const [chartData, setChartData] = useState({ labels: [], sent: [], failed: [], pending: [] });
  const intervalRef = useRef(null);

  /* ----------------- Boot/load ----------------- */
  useEffect(() => {
    loadAllSources();
    loadSavedTemplates();
    
    intervalRef.current = setInterval(checkWhatsAppStatus, 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  async function loadAllSources() {
    // Mock logic for demo - replace with your actual API calls
    try {
      const res = await axios.get(`${BACKEND_URL}/api/imports/latest`);
      setImportsData(sanitizeRows(res.data?.data || []));
    } catch (e) { /* Ignore */ }
  }

  /* ----------------- WhatsApp Connection ----------------- */
  async function checkWhatsAppStatus() {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/whatsapp/status`);
      if (res.data?.connected) {
        setConnectStatus("connected");
        setShowQrModal(false);
        setQrImage(null);
      } else {
        setConnectStatus("disconnected");
      }
    } catch (err) {}
  }

  const handleQRConnect = async () => {
    setShowQrModal(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/whatsapp/start`);
      if (res.data?.qr) {
        setQrImage(res.data.qr);
        setConnectStatus("qr");
      } else if (res.data?.message === "Already connected") {
        setConnectStatus("connected");
        setShowQrModal(false);
      }
    } catch (err) {
      console.error("QR Error", err);
    }
  };

  /* ----------------- Smart Campaign Logic (The Core) ----------------- */

  // This function mimics the Electron logic but runs in the browser
  async function startCampaign(useSelected = true) {
    if (connectStatus !== "connected" && !settings.waFallback) {
        alert("WhatsApp is disconnected. Connect QR first.");
        return;
    }

    const rows = previewRows || [];
    const indices = useSelected ? Array.from(selectedRows) : rows.map((_, i) => i);
    
    if (indices.length === 0) return alert("No rows selected!");

    // Build Queue
    const queue = indices.map(i => {
        const item = mappingPreview[i];
        return { 
          to: item.to, 
          message: item.message, 
          meta: item.row, 
          id: Date.now() + Math.random() 
        };
    });

    if (!window.confirm(`Start Smart Campaign?\n\nMessages: ${queue.length}\nDelay: ${settings.minDelay}-${settings.maxDelay}s\nBatch Break: Every ${settings.batchSize} msgs`)) return;

    // Reset States
    setIsSending(true);
    setStopFlag(false);
    setIsPaused(false);
    setStatusMessage("Initializing Campaign...");

    // Initialize Logs
    const newLogs = queue.map(q => ({
        id: q.id, to: q.to, message: q.message, status: "pending", time: new Date().toISOString()
    }));
    setLogs(prev => [...newLogs, ...prev]);

    let sentInBatch = 0;

    // --- LOOP START ---
    for (let i = 0; i < queue.length; i++) {
        // 1. Check Stop Flag
        if (stopFlag) {
            setStatusMessage("Campaign Stopped by User.");
            break;
        }

        // 2. Check Pause
        while (isPaused) {
            setStatusMessage("Campaign Paused. Waiting...");
            await sleep(1000);
            if (stopFlag) break;
        }

        const item = queue[i];
        
        // 3. Update Status
        setStatusMessage(`Sending ${i + 1}/${queue.length} to ${item.to}...`);

        // 4. Send Message (Backend or Fallback)
        await processOneMessage(item);
        
        sentInBatch++;
        rebuildCharts(); // Update UI

        // 5. Anti-Ban Logic (Delays)
        if (i < queue.length - 1) {
            // Check for Batch Break
            if (sentInBatch >= settings.batchSize) {
                sentInBatch = 0; // Reset batch count
                const breakTime = settings.batchBreak;
                for (let t = breakTime; t > 0; t--) {
                    if (stopFlag) break;
                    setStatusMessage(`⚠️ Batch Cooling Down... Resuming in ${t}s`);
                    setCountdown(t);
                    await sleep(1000);
                }
            } else {
                // Regular Random Delay
                const waitTime = getRandomDelay(settings.minDelay, settings.maxDelay);
                for (let t = waitTime; t > 0; t--) {
                    if (stopFlag) break;
                    setStatusMessage(`Waiting random delay... Next in ${t}s`);
                    setCountdown(t);
                    await sleep(1000);
                }
            }
        }
    }
    // --- LOOP END ---

    setIsSending(false);
    setCountdown(0);
    setStatusMessage("Campaign Finished ✅");
    alert("Campaign Finished!");
  }

  async function processOneMessage(item) {
    // Logic to send image + text
    try {
        if (connectStatus === "connected") {
            const payload = { to: item.to, message: item.message };
            // If attachment exists (handle file upload logic in backend)
            // if (attachment) payload.image = attachment; 

            const res = await axios.post(`${BACKEND_URL}/api/whatsapp/send`, payload);
            
            if (res.data.success) updateLog(item.id, "sent");
            else updateLog(item.id, "failed", res.data.error);

        } else if (settings.waFallback) {
            // Web Fallback
            const url = `https://wa.me/${item.to}?text=${encodeURIComponent(item.message)}`;
            window.open(url, "_blank");
            updateLog(item.id, "opened");
        } else {
            updateLog(item.id, "failed", "Disconnected");
        }
    } catch (err) {
        updateLog(item.id, "failed", "Net Error");
    }
  }

  /* ----------------- Utilities ----------------- */
  function updateLog(id, status, error = null) {
    setLogs(prev => prev.map(l => l.id === id ? { ...l, status, error, time: new Date().toISOString() } : l));
  }

  function rebuildCharts(currentLogs = logs) {
    const sent = currentLogs.filter(l => l.status === "sent" || l.status === "opened").length;
    const failed = currentLogs.filter(l => l.status === "failed").length;
    setChartData({ labels: ["Sent", "Failed"], sent: [sent, 0], failed: [0, failed], pending: [] });
  }
  
  function sanitizeRows(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.filter(r => !Object.values(r).join(" ").toLowerCase().includes("total"));
  }

  function handleSourceChange(e) {
    const val = e.target.value;
    setSelectedSource(val);
    // Mock logic: switch data based on source
    let data = [];
    if(val === 'imports') data = importsData;
    else if(val === 'outstanding') data = outstandingData;
    
    const cleaned = data.slice(0, 100);
    setPreviewRows(cleaned);
    buildMappingPreview(cleaned);
  }

  function buildMappingPreview(rows = previewRows, body = currentTemplateBody) {
    const out = (rows || []).map((r) => {
        let msg = body;
        detectedVars.forEach(v => {
             // Simple replace logic
             const val = r[v] || r[Object.keys(r).find(k => k.toLowerCase() === v.toLowerCase())] || "";
             msg = msg.replace(new RegExp(`{{${v}}}`, 'gi'), val);
        });
        return { message: msg, to: normalizePhone(r["Phone"] || r["Mobile"] || r["Contact"] || ""), row: r };
    });
    setMappingPreview(out);
  }

  function normalizePhone(num) {
    let digits = String(num).replace(/\D/g, "");
    if (digits.length === 10) return "91" + digits;
    return digits;
  }
  
  useEffect(() => {
    if(previewRows.length > 0) {
        const keys = Object.keys(previewRows[0]);
        setDetectedVars(keys);
    }
    buildMappingPreview(previewRows, currentTemplateBody);
  }, [previewRows, currentTemplateBody]);

  /* ----------------- RENDER ----------------- */
  return (
    <div className="p-4 md:p-6 min-h-screen bg-[#0A192F] text-gray-100 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-[#112240] p-4 rounded-xl border border-[#1E2D45] shadow-xl">
            <div>
                <h2 className="text-2xl font-bold text-[#64FFDA] flex items-center gap-2">
                    <Send className="animate-pulse" size={24} /> Smart Messaging Hub
                </h2>
                <p className="text-sm text-gray-400">Bulk WhatsApp Sender • Safe Mode Enabled</p>
            </div>
            
            <div className="flex items-center gap-3 mt-4 md:mt-0">
                {/* Status Indicator */}
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide border flex items-center gap-2 ${
                    connectStatus === "connected" ? "bg-green-500/10 text-green-400 border-green-500" : 
                    "bg-red-500/10 text-red-400 border-red-500"
                }`}>
                    <div className={`w-2 h-2 rounded-full ${connectStatus === "connected" ? "bg-green-400 animate-ping" : "bg-red-400"}`}></div>
                    {connectStatus}
                </div>
                
                {connectStatus !== "connected" && (
                    <button onClick={handleQRConnect} className="flex items-center gap-2 px-4 py-2 bg-[#64FFDA] text-[#0A192F] font-bold rounded-lg hover:bg-[#4CDBB3] transition shadow-[0_0_15px_rgba(100,255,218,0.3)]">
                        <QrCode size={18} /> Connect Device
                    </button>
                )}
            </div>
        </div>

        {/* --- MAIN GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* LEFT COLUMN: Controls (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
                
                {/* 1. Live Status Panel (If Sending) */}
                <div className={`p-5 rounded-xl border transition-all duration-300 ${isSending ? "bg-[#112240] border-[#64FFDA] shadow-[0_0_20px_rgba(100,255,218,0.1)]" : "bg-[#112240] border-[#1E2D45]"}`}>
                    <h3 className="text-[#64FFDA] font-semibold mb-3 flex items-center gap-2">
                        <Clock size={18} /> Live Campaign Status
                    </h3>
                    
                    {isSending ? (
                        <div className="text-center space-y-4">
                            <div className="text-3xl font-mono font-bold text-white">{countdown}s</div>
                            <p className="text-sm text-yellow-400 animate-pulse">{statusMessage}</p>
                            
                            <div className="flex justify-center gap-3 pt-2">
                                <button onClick={() => setIsPaused(!isPaused)} className="p-3 bg-yellow-600/20 text-yellow-500 rounded-full hover:bg-yellow-600/40 border border-yellow-600">
                                    {isPaused ? <Play size={20} fill="currentColor"/> : <Pause size={20} fill="currentColor"/>}
                                </button>
                                <button onClick={() => setStopFlag(true)} className="p-3 bg-red-600/20 text-red-500 rounded-full hover:bg-red-600/40 border border-red-600">
                                    <Square size={20} fill="currentColor"/>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4 text-gray-500">
                            <p>System Idle. Ready to launch.</p>
                        </div>
                    )}
                </div>

                {/* 2. Settings (Anti-Ban) */}
                <div className="bg-[#112240] p-5 rounded-xl border border-[#1E2D45]">
                    <h3 className="text-[#64FFDA] font-semibold mb-4 flex items-center gap-2">
                        <Settings size={18} /> Anti-Ban Settings
                    </h3>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-400">Min Delay (s)</label>
                                <input type="number" value={settings.minDelay} onChange={e=>setSettings({...settings, minDelay: +e.target.value})} className="w-full bg-[#0A192F] border border-[#1E2D45] p-2 rounded text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Max Delay (s)</label>
                                <input type="number" value={settings.maxDelay} onChange={e=>setSettings({...settings, maxDelay: +e.target.value})} className="w-full bg-[#0A192F] border border-[#1E2D45] p-2 rounded text-white" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-400">Batch Size</label>
                                <input type="number" value={settings.batchSize} onChange={e=>setSettings({...settings, batchSize: +e.target.value})} className="w-full bg-[#0A192F] border border-[#1E2D45] p-2 rounded text-white" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-400">Break Time (s)</label>
                                <input type="number" value={settings.batchBreak} onChange={e=>setSettings({...settings, batchBreak: +e.target.value})} className="w-full bg-[#0A192F] border border-[#1E2D45] p-2 rounded text-white" />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <input type="checkbox" checked={settings.waFallback} onChange={e=>setSettings({...settings, waFallback: e.target.checked})} className="rounded bg-[#0A192F] border-gray-600" />
                            <span className="text-xs text-gray-300">Enable Web Fallback (if API fails)</span>
                        </div>
                    </div>
                </div>

                {/* 3. Data Source */}
                <div className="bg-[#112240] p-5 rounded-xl border border-[#1E2D45]">
                    <h3 className="text-white font-semibold mb-3">Data Source</h3>
                    <select value={selectedSource} onChange={handleSourceChange} className="w-full bg-[#0A192F] border border-[#1E2D45] text-white p-2.5 rounded-lg mb-3 focus:border-[#64FFDA] outline-none">
                        <option value="imports">Uploaded Files (Imports)</option>
                        <option value="outstanding">Outstanding Parties</option>
                        <option value="billing">Sales Data</option>
                    </select>
                    <div className="text-xs text-gray-400 flex justify-between">
                        <span>Loaded: {previewRows.length} rows</span>
                        <span className="text-[#64FFDA] cursor-pointer">Refresh</span>
                    </div>
                </div>
            </div>

            {/* MIDDLE COLUMN: Template & Preview (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
                
                {/* Template Builder */}
                <div className="bg-[#112240] p-5 rounded-xl border border-[#1E2D45] relative">
                    <h3 className="text-[#64FFDA] font-semibold mb-3">Message Composer</h3>
                    
                    <input 
                        value={currentTemplateName} onChange={e=>setCurrentTemplateName(e.target.value)}
                        placeholder="Template Title" 
                        className="w-full bg-[#0A192F] border border-[#1E2D45] p-2 rounded mb-2 text-sm text-white focus:border-[#64FFDA] outline-none"
                    />
                    
                    <textarea 
                        rows={6}
                        value={currentTemplateBody} onChange={e=>setCurrentTemplateBody(e.target.value)}
                        placeholder="Hello {{Party Name}}, your invoice {{Vch No}} is pending."
                        className="w-full bg-[#0A192F] border border-[#1E2D45] p-3 rounded text-sm text-white focus:border-[#64FFDA] outline-none resize-none"
                    />

                    {/* Variable Pills */}
                    <div className="flex flex-wrap gap-1 mt-2 mb-4">
                        {detectedVars.slice(0,6).map(v => (
                            <span key={v} onClick={() => setCurrentTemplateBody(prev => prev + ` {{${v}}} `)} className="text-[10px] bg-[#1E2D45] border border-gray-600 px-2 py-1 rounded cursor-pointer hover:bg-[#64FFDA] hover:text-black hover:border-[#64FFDA] transition">
                                {v}
                            </span>
                        ))}
                    </div>

                    {/* Attach Image */}
                    <div className="flex items-center gap-3 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer bg-[#0A192F] border border-[#1E2D45] px-3 py-2 rounded hover:border-gray-500">
                            <ImageIcon size={16} className="text-[#64FFDA]" />
                            <span className="text-xs text-gray-300">{attachment ? "Image Attached" : "Attach Image"}</span>
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => setAttachment(e.target.files[0])} />
                        </label>
                        {attachment && <X size={16} className="text-red-400 cursor-pointer" onClick={()=>setAttachment(null)} />}
                    </div>

                    <button onClick={() => startCampaign(true)} disabled={isSending} className={`w-full py-3 rounded-lg font-bold text-[#0A192F] flex justify-center items-center gap-2 transition ${isSending ? "bg-gray-600 cursor-not-allowed" : "bg-[#64FFDA] hover:bg-[#4CDBB3] shadow-lg"}`}>
                        <Send size={18} /> {isSending ? "Campaign Running..." : "Start Campaign"}
                    </button>
                </div>

                {/* Preview Table */}
                <div className="bg-[#112240] rounded-xl border border-[#1E2D45] h-[350px] flex flex-col">
                    <div className="p-3 border-b border-[#1E2D45] flex justify-between items-center bg-[#0d1b33] rounded-t-xl">
                        <span className="text-sm font-semibold text-gray-300">Preview</span>
                        <div className="flex gap-2">
                             <button onClick={() => setSelectedRows(new Set(previewRows.map((_, i) => i)))} className="text-[10px] bg-[#1E2D45] px-2 py-1 rounded hover:bg-white/10">Select All</button>
                             <button onClick={() => setSelectedRows(new Set())} className="text-[10px] bg-[#1E2D45] px-2 py-1 rounded hover:bg-white/10">Clear</button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-[#0A192F] text-gray-400 sticky top-0 z-10">
                                <tr>
                                    <th className="p-3 w-8">#</th>
                                    <th className="p-3 w-24">To</th>
                                    <th className="p-3">Message</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1E2D45]">
                                {mappingPreview.map((row, i) => (
                                    <tr key={i} className={`hover:bg-[#1E2D45] transition ${selectedRows.has(i) ? "bg-[#1E2D45]/60" : ""}`}>
                                        <td className="p-3">
                                            <input type="checkbox" checked={selectedRows.has(i)} onChange={() => {
                                                const newSet = new Set(selectedRows);
                                                if(newSet.has(i)) newSet.delete(i); else newSet.add(i);
                                                setSelectedRows(newSet);
                                            }} className="rounded bg-[#0A192F] border-gray-600" />
                                        </td>
                                        <td className="p-3 font-mono text-[#64FFDA]">{row.to}</td>
                                        <td className="p-3 text-gray-400 truncate max-w-[200px]" title={row.message}>{row.message}</td>
                                    </tr>
                                ))}
                                {mappingPreview.length === 0 && <tr><td colSpan="3" className="p-6 text-center text-gray-500">No Data</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: Logs (3 cols) */}
            <div className="lg:col-span-3 bg-[#112240] rounded-xl border border-[#1E2D45] flex flex-col h-[800px]">
                <div className="p-4 border-b border-[#1E2D45]">
                    <h3 className="text-[#64FFDA] font-semibold">Execution Logs</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {logs.map((l, idx) => (
                        <div key={idx} className="text-xs border-b border-[#1E2D45]/50 pb-2">
                            <div className="flex justify-between mb-1">
                                <span className="font-mono text-gray-400">{dayjs(l.time).format("HH:mm:ss")}</span>
                                <span className={`font-bold ${l.status === 'sent' ? 'text-green-400' : l.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}`}>
                                    {l.status.toUpperCase()}
                                </span>
                            </div>
                            <div className="text-gray-300 truncate">{l.to}</div>
                            {l.error && <div className="text-red-400 text-[10px] mt-1">{l.error}</div>}
                        </div>
                    ))}
                    {logs.length === 0 && <div className="text-center text-gray-600 mt-10">Logs will appear here...</div>}
                </div>
                <div className="p-3 border-t border-[#1E2D45] bg-[#0d1b33] rounded-b-xl flex justify-between">
                     <span className="text-xs text-gray-400">Total: {logs.length}</span>
                     <button onClick={() => setLogs([])} className="text-xs text-red-400 hover:text-red-300">Clear Logs</button>
                </div>
            </div>

        </div>

        {/* --- QR MODAL (Fixed) --- */}
        {showQrModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                <div className="bg-[#112240] border border-[#64FFDA] rounded-2xl p-6 w-full max-w-sm flex flex-col items-center shadow-[0_0_50px_rgba(100,255,218,0.2)] relative animate-in fade-in zoom-in duration-300">
                    <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white transition">
                        <X size={24} />
                    </button>
                    
                    <h3 className="text-xl font-bold text-white mb-2">Scan QR Code</h3>
                    <p className="text-xs text-gray-400 mb-6 text-center">Open WhatsApp > Linked Devices > Link a Device</p>
                    
                    <div className="bg-white p-4 rounded-xl shadow-inner">
                        {qrImage ? (
                            <img src={qrImage} alt="WhatsApp QR" className="w-56 h-56 object-contain" />
                        ) : (
                            <div className="w-56 h-56 flex flex-col items-center justify-center text-gray-800 bg-gray-100 rounded">
                                <RefreshCw className="animate-spin mb-2" size={24} />
                                <span className="text-xs font-semibold">Generating QR...</span>
                            </div>
                        )}
                    </div>

                    <p className="mt-6 text-[10px] text-[#64FFDA] uppercase tracking-widest font-bold">Secure Connection</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
