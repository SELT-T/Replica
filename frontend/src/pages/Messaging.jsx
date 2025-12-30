// src/pages/Messaging.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, Title, Tooltip, Legend, Filler
} from "chart.js";
import { 
  Save, Send, RefreshCw, X, Play, Pause, Square, 
  QrCode, Image as ImageIcon, Settings, Clock, Trash2, AlertTriangle, CheckCircle 
} from "lucide-react";
import dayjs from "dayjs";
import jsPDF from "jspdf";
import "jspdf-autotable";

// Backend URL (Agar proxy set hai package.json me to empty rakho)
const BACKEND_URL = ""; 

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, 
  BarElement, Title, Tooltip, Legend, Filler
);

/* -------------- Helper Utilities ---------------- */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getRandomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

export default function Messaging() {
  // --- Data & UI State ---
  const [importsData, setImportsData] = useState([]);
  const [previewRows, setPreviewRows] = useState([]); 
  const [selectedRows, setSelectedRows] = useState(new Set());
  
  // --- WhatsApp Status ---
  const [connectStatus, setConnectStatus] = useState("disconnected");
  const [qrImage, setQrImage] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);

  // --- Templates & Composer ---
  const [templates, setTemplates] = useState([]); 
  const [currentTemplateName, setCurrentTemplateName] = useState("");
  const [currentTemplateBody, setCurrentTemplateBody] = useState("");
  const [detectedVars, setDetectedVars] = useState([]);
  const [mappingPreview, setMappingPreview] = useState([]); 
  const [attachment, setAttachment] = useState(null);

  // --- Campaign Execution ---
  const [logs, setLogs] = useState([]); 
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stopFlag, setStopFlag] = useState(false);
  const [countdown, setCountdown] = useState(0); 
  const [statusMessage, setStatusMessage] = useState("Ready to start");
  const [progress, setProgress] = useState(0);

  // --- ADVANCED SETTINGS (Anti-Ban) ---
  const [settings, setSettings] = useState({
    minDelay: 5,     // Min gap (seconds)
    maxDelay: 15,    // Max gap (seconds)
    batchSize: 10,   // Messages before long break
    batchBreak: 30,  // Long break duration (seconds)
    waFallback: true // Backend fail hone par wa.me use kare
  });

  const intervalRef = useRef(null);

  /* ----------------- 1. Initialization & Fixes ----------------- */

  // FIX: Function defined BEFORE useEffect
  const loadSavedTemplates = () => {
    try {
      const s = localStorage.getItem("sel_templates_v2");
      if (s) setTemplates(JSON.parse(s));
    } catch (err) {
      console.error("Template Load Error", err);
    }
  };

  useEffect(() => {
    loadSavedTemplates(); // Ab ye error nahi dega
    loadAllSources();
    
    // Poll WhatsApp status every 10 seconds
    intervalRef.current = setInterval(checkWhatsAppStatus, 10000);
    return () => clearInterval(intervalRef.current);
  }, []);

  async function loadAllSources() {
    try {
        // Example: Fetch imported excel data
        const res = await axios.get(`${BACKEND_URL}/api/imports/latest`);
        const rows = res.data?.data || [];
        setImportsData(rows);
        // Default load to preview
        if(rows.length > 0) {
            const clean = rows.slice(0, 50); // Load first 50
            setPreviewRows(clean);
            detectVariables(clean);
        }
    } catch (e) { 
        console.warn("Backend API not connected for imports. Using Empty Data."); 
    }
  }

  function detectVariables(rows) {
      if(!rows || rows.length === 0) return;
      const keys = Object.keys(rows[0]);
      setDetectedVars(keys);
  }

  /* ----------------- 2. WhatsApp Logic ----------------- */

  async function checkWhatsAppStatus() {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/whatsapp/status`);
      if (res.data?.connected) {
        setConnectStatus("connected");
        setShowQrModal(false);
      } else {
        setConnectStatus("disconnected");
      }
    } catch (err) {
        // Backend not running handled gracefully
    }
  }

  const handleQRConnect = async () => {
    setShowQrModal(true);
    setQrImage(null); // Clear old QR
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
      console.error("QR Fetch Error:", err);
      // alert("Backend connection failed. Make sure server is running.");
    }
  };

  /* ----------------- 3. Template Management ----------------- */

  const saveTemplate = () => {
      if(!currentTemplateName || !currentTemplateBody) return alert("Name and Body required");
      const newTpl = { id: Date.now(), name: currentTemplateName, body: currentTemplateBody };
      const updated = [newTpl, ...templates];
      setTemplates(updated);
      localStorage.setItem("sel_templates_v2", JSON.stringify(updated));
      alert("Template Saved!");
  };

  const deleteTemplate = (id) => {
      const updated = templates.filter(t => t.id !== id);
      setTemplates(updated);
      localStorage.setItem("sel_templates_v2", JSON.stringify(updated));
  };

  // Live Mapping Preview Update
  useEffect(() => {
    if(previewRows.length === 0) return;
    
    const mapped = previewRows.map(row => {
        let msg = currentTemplateBody;
        detectedVars.forEach(v => {
            const val = row[v] || "";
            // Regex to replace {{Variable}} case-insensitively
            const regex = new RegExp(`{{${v}}}`, "gi");
            msg = msg.replace(regex, val);
        });
        return { 
            to: normalizePhone(row["Phone"] || row["Mobile"] || row["Contact"] || ""), 
            message: msg, 
            row: row 
        };
    });
    setMappingPreview(mapped);
  }, [previewRows, currentTemplateBody, detectedVars]);

  function normalizePhone(num) {
      let digits = String(num).replace(/\D/g, "");
      if(digits.length === 10) return "91" + digits; // India Default
      return digits;
  }

  /* ----------------- 4. The "PRO" Campaign Engine ----------------- */

  const startCampaign = async () => {
      const rowsToSend = selectedRows.size > 0 
          ? mappingPreview.filter((_, i) => selectedRows.has(i))
          : mappingPreview;

      if(rowsToSend.length === 0) return alert("No rows selected for sending.");
      
      if(!window.confirm(`Start sending to ${rowsToSend.length} numbers?\nMode: ${connectStatus === 'connected' ? 'Backend API' : 'Browser Mode'}`)) return;

      setIsSending(true);
      setStopFlag(false);
      setIsPaused(false);
      setProgress(0);
      
      // Initialize Logs
      const newLogs = rowsToSend.map(r => ({
          id: Date.now() + Math.random(),
          to: r.to,
          message: r.message,
          status: "pending",
          time: new Date().toISOString()
      }));
      setLogs(prev => [...newLogs, ...prev]);

      let sentCount = 0;

      for (let i = 0; i < rowsToSend.length; i++) {
          if(stopFlag) { setStatusMessage("Stopped."); break; }

          // Handle Pause
          while(isPaused) {
              setStatusMessage("Paused... Click Play to Resume");
              await sleep(1000);
              if(stopFlag) break;
          }

          const item = rowsToSend[i];
          const logId = newLogs[i].id; // Track this specific log

          // 1. Send Message
          setStatusMessage(`Sending ${i+1}/${rowsToSend.length}...`);
          await sendMessageLogic(item, logId);
          
          sentCount++;
          setProgress(Math.round((sentCount / rowsToSend.length) * 100));

          // 2. Anti-Ban Delay Logic (Skip delay after last message)
          if(i < rowsToSend.length - 1) {
              
              // Check Batch Break
              if(sentCount % settings.batchSize === 0) {
                  const breakTime = settings.batchBreak;
                  for(let t = breakTime; t > 0; t--) {
                      if(stopFlag) break;
                      setStatusMessage(`☕ Batch Break... Resuming in ${t}s`);
                      setCountdown(t);
                      await sleep(1000);
                  }
              } else {
                  // Random Short Delay
                  const delay = getRandomDelay(settings.minDelay, settings.maxDelay);
                  for(let t = delay; t > 0; t--) {
                      if(stopFlag) break;
                      setStatusMessage(`⏳ Waiting... Next in ${t}s`);
                      setCountdown(t);
                      await sleep(1000);
                  }
              }
          }
      }

      setIsSending(false);
      setStatusMessage("Campaign Completed ✅");
  };

  const sendMessageLogic = async (item, logId) => {
      try {
          if(connectStatus === "connected") {
              // Use Backend API
              const payload = { to: item.to, message: item.message };
              // if(attachment) payload.image = attachment; // Handle image upload if needed
              
              const res = await axios.post(`${BACKEND_URL}/api/whatsapp/send`, payload);
              if(res.data.success) updateLog(logId, "sent");
              else updateLog(logId, "failed", res.data.error);
          
          } else if (settings.waFallback) {
              // Browser Fallback (Opens Tab)
              const url = `https://wa.me/${item.to}?text=${encodeURIComponent(item.message)}`;
              
              // Trick to open in new tab without popup blocker sometimes blocking it
              const win = window.open(url, '_blank');
              if(win) win.focus();
              
              updateLog(logId, "opened"); // We assume opened = likely sent
          } else {
              updateLog(logId, "failed", "No Connection");
          }
      } catch (error) {
          updateLog(logId, "failed", "Network Error");
      }
  };

  const updateLog = (id, status, error=null) => {
      setLogs(prev => prev.map(l => l.id === id ? { ...l, status, error } : l));
  };

  /* ----------------- 5. Render UI ----------------- */

  return (
    <div className="p-4 md:p-6 min-h-screen bg-[#0A192F] text-gray-100 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-[#112240] p-4 rounded-xl border border-[#1E2D45] shadow-lg">
            <div>
                <h2 className="text-2xl font-bold text-[#64FFDA] flex items-center gap-2">
                    <Send className="animate-pulse" size={24} /> WhatsApp Hub Pro
                </h2>
                <p className="text-xs text-gray-400">Bulk Sender • Anti-Ban System Active</p>
            </div>
            
            <div className="flex items-center gap-4 mt-4 md:mt-0">
                {/* Status Badge */}
                <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 ${
                    connectStatus === "connected" ? "bg-green-500/10 text-green-400 border-green-500" : 
                    "bg-red-500/10 text-red-400 border-red-500"
                }`}>
                    <div className={`w-2 h-2 rounded-full ${connectStatus === "connected" ? "bg-green-400 animate-ping" : "bg-red-400"}`}></div>
                    {connectStatus === "connected" ? "System Online" : "Disconnected (Using Fallback)"}
                </div>
                
                {connectStatus !== "connected" && (
                    <button onClick={handleQRConnect} className="flex items-center gap-2 px-4 py-2 bg-[#64FFDA] text-[#0A192F] font-bold rounded-lg hover:bg-[#4CDBB3] transition">
                        <QrCode size={18} /> Scan QR
                    </button>
                )}
            </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT: Controls (4 Cols) */}
            <div className="lg:col-span-4 space-y-6">
                
                {/* 1. Live Status & Controls */}
                <div className={`p-6 rounded-xl border transition-all ${isSending ? "bg-[#0d1b33] border-[#64FFDA] shadow-[0_0_20px_rgba(100,255,218,0.1)]" : "bg-[#112240] border-[#1E2D45]"}`}>
                    <h3 className="text-[#64FFDA] font-semibold mb-4 flex items-center gap-2">
                        <Clock size={18} /> Live Campaign
                    </h3>

                    {isSending ? (
                        <div className="text-center">
                            {/* Circular Progress */}
                            <div className="relative w-24 h-24 mx-auto mb-4">
                                <svg className="w-full h-full" viewBox="0 0 36 36">
                                    <path className="text-[#1E2D45]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                    <path className="text-[#64FFDA] transition-all duration-500" strokeDasharray={`${progress}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white">{progress}%</div>
                            </div>
                            
                            <p className="text-sm text-yellow-400 font-mono mb-4 min-h-[1.5rem]">{statusMessage}</p>
                            
                            <div className="flex justify-center gap-4">
                                <button onClick={() => setIsPaused(!isPaused)} className="p-3 bg-yellow-600/20 text-yellow-500 rounded-full hover:bg-yellow-600/30 border border-yellow-600">
                                    {isPaused ? <Play size={24} fill="currentColor"/> : <Pause size={24} fill="currentColor"/>}
                                </button>
                                <button onClick={() => setStopFlag(true)} className="p-3 bg-red-600/20 text-red-500 rounded-full hover:bg-red-600/30 border border-red-600">
                                    <Square size={24} fill="currentColor"/>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6 text-gray-500">
                            <CheckCircle size={40} className="mx-auto mb-2 opacity-20" />
                            <p>System Ready</p>
                        </div>
                    )}
                </div>

                {/* 2. Anti-Ban Settings */}
                <div className="bg-[#112240] p-5 rounded-xl border border-[#1E2D45]">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <Settings size={18} /> Anti-Ban Configuration
                    </h3>
                    <div className="space-y-4 text-sm">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-gray-400 text-xs">Min Delay (sec)</label>
                                <input type="number" value={settings.minDelay} onChange={e=>setSettings({...settings, minDelay: +e.target.value})} className="w-full bg-[#0A192F] border border-[#1E2D45] rounded p-2 mt-1 text-white" />
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs">Max Delay (sec)</label>
                                <input type="number" value={settings.maxDelay} onChange={e=>setSettings({...settings, maxDelay: +e.target.value})} className="w-full bg-[#0A192F] border border-[#1E2D45] rounded p-2 mt-1 text-white" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-gray-400 text-xs">Batch Size (Msgs)</label>
                                <input type="number" value={settings.batchSize} onChange={e=>setSettings({...settings, batchSize: +e.target.value})} className="w-full bg-[#0A192F] border border-[#1E2D45] rounded p-2 mt-1 text-white" />
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs">Break Time (sec)</label>
                                <input type="number" value={settings.batchBreak} onChange={e=>setSettings({...settings, batchBreak: +e.target.value})} className="w-full bg-[#0A192F] border border-[#1E2D45] rounded p-2 mt-1 text-white" />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-[#1E2D45]">
                            <input type="checkbox" checked={settings.waFallback} onChange={e=>setSettings({...settings, waFallback: e.target.checked})} className="rounded bg-[#0A192F] border-gray-600" />
                            <span className="text-gray-400 text-xs">Enable Frontend Fallback (Open Tabs)</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* MIDDLE: Composer & Preview (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
                
                {/* Composer */}
                <div className="bg-[#112240] p-5 rounded-xl border border-[#1E2D45]">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-[#64FFDA] font-semibold">Message Composer</h3>
                        {attachment && <span className="text-xs text-green-400 flex items-center gap-1"><ImageIcon size={12}/> Image Attached</span>}
                    </div>

                    <div className="space-y-3">
                        <input 
                            value={currentTemplateName} onChange={e=>setCurrentTemplateName(e.target.value)}
                            placeholder="Template Name (e.g., Payment Reminder)" 
                            className="w-full bg-[#0A192F] border border-[#1E2D45] p-2 rounded text-sm text-white focus:border-[#64FFDA] outline-none"
                        />
                        <textarea 
                            value={currentTemplateBody} onChange={e=>setCurrentTemplateBody(e.target.value)}
                            rows={6}
                            placeholder="Hi {{Party Name}}, your bill of {{Amount}} is pending."
                            className="w-full bg-[#0A192F] border border-[#1E2D45] p-3 rounded text-sm text-white focus:border-[#64FFDA] outline-none resize-none"
                        />
                        
                        {/* Variables & Actions */}
                        <div className="flex flex-wrap gap-2 items-center justify-between">
                            <div className="flex gap-1 flex-wrap">
                                {detectedVars.slice(0, 4).map(v => (
                                    <span key={v} onClick={()=>setCurrentTemplateBody(prev=>prev+` {{${v}}} `)} className="text-[10px] bg-[#1E2D45] border border-gray-600 px-2 py-1 rounded cursor-pointer hover:bg-[#64FFDA] hover:text-black transition">
                                        {v}
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <label className="cursor-pointer p-2 bg-[#0A192F] rounded hover:bg-[#1E2D45] text-gray-300">
                                    <ImageIcon size={16} />
                                    <input type="file" className="hidden" accept="image/*" onChange={(e)=>setAttachment(e.target.files[0])} />
                                </label>
                                <button onClick={saveTemplate} className="p-2 bg-[#0A192F] rounded hover:bg-[#1E2D45] text-gray-300" title="Save Template"><Save size={16}/></button>
                            </div>
                        </div>

                        <button onClick={startCampaign} disabled={isSending} className={`w-full py-3 rounded-lg font-bold flex justify-center items-center gap-2 transition ${isSending ? "bg-gray-600 cursor-not-allowed text-gray-400" : "bg-[#64FFDA] text-[#0A192F] hover:bg-[#4CDBB3]"}`}>
                            <Send size={18} /> {isSending ? "Sending..." : "Start Bulk Campaign"}
                        </button>
                    </div>

                    {/* Saved Templates List */}
                    {templates.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-[#1E2D45]">
                            <p className="text-xs text-gray-500 mb-2">Saved Templates</p>
                            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                {templates.map(t => (
                                    <div key={t.id} className="flex-shrink-0 bg-[#0A192F] p-2 rounded border border-[#1E2D45] w-40 relative group">
                                        <div className="font-bold text-xs truncate text-white mb-1">{t.name}</div>
                                        <div className="text-[10px] text-gray-400 truncate">{t.body}</div>
                                        <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                                            <button onClick={()=>{setCurrentTemplateName(t.name); setCurrentTemplateBody(t.body)}} className="bg-green-600 text-white p-1 rounded-full"><CheckCircle size={10}/></button>
                                            <button onClick={()=>deleteTemplate(t.id)} className="bg-red-600 text-white p-1 rounded-full"><Trash2 size={10}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: Preview & Logs (3 Cols) */}
            <div className="lg:col-span-3 space-y-6">
                
                {/* Preview */}
                <div className="bg-[#112240] rounded-xl border border-[#1E2D45] h-[300px] flex flex-col">
                    <div className="p-3 border-b border-[#1E2D45] flex justify-between items-center bg-[#0d1b33] rounded-t-xl">
                        <span className="text-sm font-semibold text-gray-300">Data Preview</span>
                        <div className="flex gap-1">
                            <button onClick={()=>setSelectedRows(new Set(mappingPreview.map((_,i)=>i)))} className="text-[10px] bg-[#1E2D45] px-2 py-1 rounded">All</button>
                            <button onClick={()=>setSelectedRows(new Set())} className="text-[10px] bg-[#1E2D45] px-2 py-1 rounded">None</button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar p-2">
                        {mappingPreview.map((row, i) => (
                            <div key={i} className={`flex items-start gap-2 p-2 mb-1 rounded text-xs border border-transparent ${selectedRows.has(i) ? "bg-[#1E2D45] border-[#64FFDA]/30" : "hover:bg-[#1E2D45]/50"}`}>
                                <input type="checkbox" checked={selectedRows.has(i)} onChange={()=>{
                                    const s = new Set(selectedRows);
                                    if(s.has(i)) s.delete(i); else s.add(i);
                                    setSelectedRows(s);
                                }} className="mt-1 bg-[#0A192F] border-gray-600" />
                                <div className="overflow-hidden">
                                    <div className="font-mono text-[#64FFDA]">{row.to}</div>
                                    <div className="text-gray-400 truncate w-full">{row.message}</div>
                                </div>
                            </div>
                        ))}
                        {mappingPreview.length === 0 && <div className="text-center text-gray-500 mt-10">No Data Loaded</div>}
                    </div>
                </div>

                {/* Logs */}
                <div className="bg-[#112240] rounded-xl border border-[#1E2D45] h-[400px] flex flex-col">
                    <div className="p-3 border-b border-[#1E2D45]">
                        <h3 className="text-[#64FFDA] font-semibold text-sm">Execution Logs</h3>
                    </div>
                    <div className="flex-1 overflow-auto p-3 space-y-2 custom-scrollbar">
                        {logs.map((l) => (
                            <div key={l.id} className="text-xs border-b border-[#1E2D45]/50 pb-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 font-mono">{dayjs(l.time).format("HH:mm:ss")}</span>
                                    <span className={l.status === 'sent' ? 'text-green-400' : l.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}>{l.status.toUpperCase()}</span>
                                </div>
                                <div className="text-gray-300">{l.to}</div>
                                {l.error && <div className="text-red-400 text-[10px]">{l.error}</div>}
                            </div>
                        ))}
                        {logs.length === 0 && <div className="text-center text-gray-600 mt-10">Logs empty</div>}
                    </div>
                    <div className="p-2 border-t border-[#1E2D45] flex justify-end">
                        <button onClick={()=>setLogs([])} className="text-xs text-red-400 hover:underline">Clear Logs</button>
                    </div>
                </div>

            </div>

        </div>

        {/* QR MODAL */}
        {showQrModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-[#112240] border border-[#64FFDA] rounded-2xl p-6 w-full max-w-sm flex flex-col items-center shadow-2xl relative">
                    <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24}/></button>
                    <h3 className="text-xl font-bold text-white mb-2">Scan QR</h3>
                    <div className="bg-white p-4 rounded-xl my-4">
                        {qrImage ? <img src={qrImage} className="w-56 h-56 object-contain"/> : <div className="w-56 h-56 flex items-center justify-center text-black"><RefreshCw className="animate-spin"/></div>}
                    </div>
                    <p className="text-xs text-gray-400">Open WhatsApp > Linked Devices > Link Device</p>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}
