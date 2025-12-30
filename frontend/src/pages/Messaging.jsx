// src/pages/Messaging.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  Save, Send, RefreshCw, X, Play, Pause, Square,
  QrCode, Image as ImageIcon, Settings, Clock, Minus, Maximize2, CheckCircle, AlertCircle
} from "lucide-react";
import dayjs from "dayjs";

// BACKEND URL (Apne server ka URL dalein agar alag port par hai)
// e.g., "http://localhost:5000"
const BACKEND_URL = ""; 

// Utility: Sleep function
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getRandomDelay = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

export default function Messaging() {
  // --- Data States ---
  const [previewRows, setPreviewRows] = useState([]);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [detectedVars, setDetectedVars] = useState([]);

  // --- WhatsApp & Popup States ---
  const [connectStatus, setConnectStatus] = useState("disconnected");
  const [qrImage, setQrImage] = useState(null);
  
  // Floating Window States
  const [showQrWindow, setShowQrWindow] = useState(false);
  const [isWindowMinimized, setIsWindowMinimized] = useState(false);

  // --- Template States ---
  const [templates, setTemplates] = useState([]);
  const [currentTemplateName, setCurrentTemplateName] = useState("");
  const [currentTemplateBody, setCurrentTemplateBody] = useState("");
  const [mappingPreview, setMappingPreview] = useState([]);
  const [attachment, setAttachment] = useState(null);

  // --- Campaign Execution States ---
  const [logs, setLogs] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stopFlag, setStopFlag] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready to launch");
  const [progress, setProgress] = useState(0);

  // --- Anti-Ban Settings ---
  const [settings, setSettings] = useState({
    minDelay: 5,
    maxDelay: 15,
    batchSize: 10,
    batchBreak: 30,
    waFallback: true // Important: Frontend fallback
  });

  const intervalRef = useRef(null);

  /* ================= Initialization ================= */

  // 1. Load Templates (Defined BEFORE useEffect to fix ReferenceError)
  const loadSavedTemplates = () => {
    try {
      const s = localStorage.getItem("sel_templates_v3");
      if (s) setTemplates(JSON.parse(s));
    } catch (e) { console.error("Template error", e); }
  };

  // 2. Load Data (Mock/API)
  const loadAllSources = async () => {
    try {
      // API call to get imported data
      const res = await axios.get(`${BACKEND_URL}/api/imports/latest`);
      const rows = res.data?.data || [];
      if (rows.length > 0) {
        const clean = rows.slice(0, 50); // Preview first 50
        setPreviewRows(clean);
        setDetectedVars(Object.keys(clean[0] || {}));
      }
    } catch (e) {
      console.log("Using Empty Data (Backend not found)");
    }
  };

  useEffect(() => {
    loadSavedTemplates();
    loadAllSources();
    
    // Status Poll
    intervalRef.current = setInterval(checkWhatsAppStatus, 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  /* ================= WhatsApp Logic ================= */

  const checkWhatsAppStatus = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/api/whatsapp/status`);
      if (res.data?.connected) {
        setConnectStatus("connected");
        setQrImage(null);
        // Agar connected hai to window band mat karo, bas status dikhao
      } else {
        setConnectStatus("disconnected");
      }
    } catch (err) {
      // Backend Down
      setConnectStatus("disconnected");
    }
  };

  const handleConnectClick = async () => {
    setShowQrWindow(true);
    setIsWindowMinimized(false);
    setQrImage(null); // Reset QR
    
    try {
      const res = await axios.post(`${BACKEND_URL}/api/whatsapp/start`);
      if (res.data?.qr) {
        setQrImage(res.data.qr); // QR string from backend
        setConnectStatus("qr");
      } else if (res.data?.connected) {
        setConnectStatus("connected");
      }
    } catch (err) {
      console.error("Connection Failed:", err);
      // Agar backend nahi chala to user ko batao
      alert("Backend API Error: Ensure Node server is running.");
    }
  };

  const disconnectWhatsApp = async () => {
      try { await axios.post(`${BACKEND_URL}/api/whatsapp/logout`); } catch(e){}
      setConnectStatus("disconnected");
      setQrImage(null);
  };

  /* ================= Preview & Mapping ================= */

  useEffect(() => {
    if (previewRows.length === 0) return;
    const mapped = previewRows.map(row => {
      let msg = currentTemplateBody;
      detectedVars.forEach(v => {
        const val = row[v] || "";
        // Replace {{Key}} case insensitive
        msg = msg.replace(new RegExp(`{{${v}}}`, "gi"), val);
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
    if (digits.length === 10) return "91" + digits;
    return digits;
  }

  /* ================= Campaign Engine ================= */

  const startCampaign = async () => {
    const targets = selectedRows.size > 0 
      ? mappingPreview.filter((_, i) => selectedRows.has(i)) 
      : mappingPreview;

    if (targets.length === 0) return alert("No numbers selected!");

    if (!window.confirm(`Start sending to ${targets.length} contacts?`)) return;

    setIsSending(true);
    setStopFlag(false);
    setIsPaused(false);
    setProgress(0);

    // Init Logs
    const newLogs = targets.map(t => ({
      id: Date.now() + Math.random(),
      to: t.to,
      message: t.message,
      status: "pending",
      time: new Date().toISOString()
    }));
    setLogs(prev => [...newLogs, ...prev]);

    let count = 0;

    for (let i = 0; i < targets.length; i++) {
      if (stopFlag) break;
      
      // Pause Check
      while (isPaused) {
        setStatusMessage("Paused... Waiting for resume");
        await sleep(1000);
        if (stopFlag) break;
      }

      const item = targets[i];
      const logId = newLogs[i].id;

      setStatusMessage(`Sending ${i + 1}/${targets.length}...`);
      
      // SEND LOGIC
      await sendMessage(item, logId);
      
      count++;
      setProgress(Math.round((count / targets.length) * 100));

      // DELAY LOGIC
      if (i < targets.length - 1) {
        if (count % settings.batchSize === 0) {
          // Long Break
          for (let t = settings.batchBreak; t > 0; t--) {
            if (stopFlag) break;
            setStatusMessage(`Batch Break: ${t}s remaining`);
            await sleep(1000);
          }
        } else {
          // Short Delay
          const d = getRandomDelay(settings.minDelay, settings.maxDelay);
          for (let t = d; t > 0; t--) {
            if (stopFlag) break;
            setStatusMessage(`Anti-Ban Delay: ${t}s`);
            await sleep(1000);
          }
        }
      }
    }

    setIsSending(false);
    setStatusMessage("Campaign Completed.");
  };

  const sendMessage = async (item, logId) => {
    try {
      if (connectStatus === "connected") {
        // Backend Send
        const res = await axios.post(`${BACKEND_URL}/api/whatsapp/send`, {
          to: item.to,
          message: item.message
        });
        if (res.data.success) updateLog(logId, "sent");
        else updateLog(logId, "failed", res.data.error);
      } 
      else if (settings.waFallback) {
        // Frontend Fallback
        const url = `https://wa.me/${item.to}?text=${encodeURIComponent(item.message)}`;
        const win = window.open(url, '_blank');
        if (win) win.focus(); // Try to focus new tab
        updateLog(logId, "opened");
      } 
      else {
        updateLog(logId, "failed", "No Connection");
      }
    } catch (e) {
      updateLog(logId, "failed", "Error");
    }
  };

  const updateLog = (id, status, error) => {
    setLogs(prev => prev.map(l => l.id === id ? { ...l, status, error } : l));
  };

  /* ================= Render ================= */

  return (
    <div className="p-4 min-h-screen bg-[#0A192F] text-gray-100 font-sans relative overflow-hidden">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-[#112240] p-4 rounded-xl border border-[#1E2D45] mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[#64FFDA] flex items-center gap-2">
            <Send size={24} /> WhatsApp Hub Pro
          </h2>
          <p className="text-xs text-gray-400">Bulk Messenger with Anti-Ban Logic</p>
        </div>
        <div className="flex gap-3 mt-3 md:mt-0">
          <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 ${connectStatus === "connected" ? "bg-green-500/20 text-green-400 border-green-500" : "bg-red-500/20 text-red-400 border-red-500"}`}>
            <div className={`w-2 h-2 rounded-full ${connectStatus === "connected" ? "bg-green-400 animate-ping" : "bg-red-400"}`}></div>
            {connectStatus.toUpperCase()}
          </div>
          {connectStatus !== "connected" ? (
             <button onClick={handleConnectClick} className="bg-[#64FFDA] text-[#0A192F] px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-[#4CDBB3]">
               <QrCode size={18} /> Link Device
             </button>
          ) : (
             <button onClick={disconnectWhatsApp} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Disconnect</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-4 space-y-6">
           {/* Live Status */}
           <div className={`p-6 rounded-xl border ${isSending ? "bg-[#0d1b33] border-[#64FFDA]" : "bg-[#112240] border-[#1E2D45]"}`}>
             <h3 className="text-[#64FFDA] font-semibold mb-4 flex gap-2"><Clock size={18}/> Campaign Status</h3>
             {isSending ? (
               <div className="text-center">
                 <div className="text-4xl font-bold text-white mb-2">{progress}%</div>
                 <div className="h-2 bg-gray-700 rounded-full mb-4 overflow-hidden">
                   <div className="h-full bg-[#64FFDA] transition-all duration-300" style={{width: `${progress}%`}}></div>
                 </div>
                 <p className="text-yellow-400 text-sm font-mono mb-4 animate-pulse">{statusMessage}</p>
                 <div className="flex justify-center gap-4">
                   <button onClick={() => setIsPaused(!isPaused)} className="p-3 bg-yellow-500/20 text-yellow-500 rounded-full border border-yellow-500">
                     {isPaused ? <Play size={24} fill="currentColor"/> : <Pause size={24} fill="currentColor"/>}
                   </button>
                   <button onClick={() => setStopFlag(true)} className="p-3 bg-red-500/20 text-red-500 rounded-full border border-red-500">
                     <Square size={24} fill="currentColor"/>
                   </button>
                 </div>
               </div>
             ) : (
               <div className="text-center text-gray-500 py-6">Idle - Ready to start</div>
             )}
           </div>

           {/* Settings */}
           <div className="bg-[#112240] p-5 rounded-xl border border-[#1E2D45]">
             <h3 className="text-white font-semibold mb-3 flex gap-2"><Settings size={18}/> Anti-Ban Config</h3>
             <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="text-gray-400 text-xs">Min Delay (s)</label>
                  <input type="number" value={settings.minDelay} onChange={e=>setSettings({...settings, minDelay:+e.target.value})} className="w-full bg-[#0A192F] p-2 rounded text-white border border-[#1E2D45]"/>
                </div>
                <div>
                  <label className="text-gray-400 text-xs">Max Delay (s)</label>
                  <input type="number" value={settings.maxDelay} onChange={e=>setSettings({...settings, maxDelay:+e.target.value})} className="w-full bg-[#0A192F] p-2 rounded text-white border border-[#1E2D45]"/>
                </div>
                <div>
                  <label className="text-gray-400 text-xs">Batch Size</label>
                  <input type="number" value={settings.batchSize} onChange={e=>setSettings({...settings, batchSize:+e.target.value})} className="w-full bg-[#0A192F] p-2 rounded text-white border border-[#1E2D45]"/>
                </div>
                <div>
                  <label className="text-gray-400 text-xs">Break Time (s)</label>
                  <input type="number" value={settings.batchBreak} onChange={e=>setSettings({...settings, batchBreak:+e.target.value})} className="w-full bg-[#0A192F] p-2 rounded text-white border border-[#1E2D45]"/>
                </div>
             </div>
             <div className="mt-3 pt-3 border-t border-[#1E2D45]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={settings.waFallback} onChange={e=>setSettings({...settings, waFallback:e.target.checked})} className="rounded bg-[#0A192F]"/>
                  <span className="text-gray-300 text-xs">Browser Fallback (Opens Tabs if backend fails)</span>
                </label>
             </div>
           </div>
        </div>

        {/* MIDDLE COLUMN */}
        <div className="lg:col-span-5 space-y-6">
           <div className="bg-[#112240] p-5 rounded-xl border border-[#1E2D45]">
              <h3 className="text-[#64FFDA] font-semibold mb-3">Composer</h3>
              <input value={currentTemplateName} onChange={e=>setCurrentTemplateName(e.target.value)} placeholder="Template Name" className="w-full bg-[#0A192F] p-2 rounded border border-[#1E2D45] text-white mb-2"/>
              <textarea value={currentTemplateBody} onChange={e=>setCurrentTemplateBody(e.target.value)} rows={6} placeholder="Hello {{Party}}, your amount {{Amount}} is due." className="w-full bg-[#0A192F] p-3 rounded border border-[#1E2D45] text-white resize-none"/>
              
              <div className="flex flex-wrap gap-2 my-2">
                 {detectedVars.slice(0,5).map(v => (
                   <span key={v} onClick={()=>setCurrentTemplateBody(prev => prev + ` {{${v}}} `)} className="bg-[#1E2D45] px-2 py-1 rounded text-[10px] cursor-pointer hover:bg-[#64FFDA] hover:text-black border border-gray-600">{v}</span>
                 ))}
              </div>

              <div className="flex gap-2 mb-4">
                 <button onClick={()=>{
                   const t = [...templates, {id: Date.now(), name: currentTemplateName, body: currentTemplateBody}];
                   setTemplates(t);
                   localStorage.setItem("sel_templates_v3", JSON.stringify(t));
                 }} className="bg-[#1E2D45] p-2 rounded text-gray-300 hover:bg-[#64FFDA] hover:text-black"><Save size={18}/></button>
                 <label className="bg-[#1E2D45] p-2 rounded text-gray-300 hover:bg-[#64FFDA] hover:text-black cursor-pointer">
                   <ImageIcon size={18}/> <input type="file" className="hidden" onChange={e=>setAttachment(e.target.files[0])}/>
                 </label>
                 {attachment && <span className="text-xs text-green-400 flex items-center">Image Attached</span>}
              </div>

              <button onClick={startCampaign} disabled={isSending} className={`w-full py-3 rounded-lg font-bold flex justify-center items-center gap-2 ${isSending ? "bg-gray-600" : "bg-[#64FFDA] text-black hover:bg-[#4CDBB3]"}`}>
                 <Send size={18}/> {isSending ? "Sending..." : "Start Campaign"}
              </button>
           </div>

           {/* Saved Templates */}
           {templates.length > 0 && (
             <div className="flex gap-2 overflow-x-auto pb-2">
                {templates.map(t => (
                  <div key={t.id} onClick={()=>{setCurrentTemplateName(t.name); setCurrentTemplateBody(t.body)}} className="bg-[#112240] p-3 rounded-lg border border-[#1E2D45] min-w-[150px] cursor-pointer hover:border-[#64FFDA]">
                    <div className="font-bold text-xs text-white truncate">{t.name}</div>
                    <div className="text-[10px] text-gray-400 truncate">{t.body}</div>
                  </div>
                ))}
             </div>
           )}
        </div>

        {/* RIGHT COLUMN (Logs & Data) */}
        <div className="lg:col-span-3 space-y-6">
           {/* Preview List */}
           <div className="bg-[#112240] rounded-xl border border-[#1E2D45] h-[250px] flex flex-col">
              <div className="p-3 border-b border-[#1E2D45] bg-[#0d1b33] rounded-t-xl flex justify-between">
                 <span className="text-gray-300 text-sm font-semibold">Preview</span>
                 <div>
                   <button onClick={()=>setSelectedRows(new Set(mappingPreview.map((_,i)=>i)))} className="text-[10px] bg-[#1E2D45] px-2 py-1 rounded mr-1">All</button>
                   <button onClick={()=>setSelectedRows(new Set())} className="text-[10px] bg-[#1E2D45] px-2 py-1 rounded">None</button>
                 </div>
              </div>
              <div className="flex-1 overflow-auto p-2 custom-scrollbar">
                 {mappingPreview.map((m,i) => (
                   <div key={i} className={`flex gap-2 p-2 mb-1 rounded text-xs ${selectedRows.has(i) ? "bg-[#1E2D45] border border-[#64FFDA]" : "hover:bg-[#1E2D45]"}`}>
                      <input type="checkbox" checked={selectedRows.has(i)} onChange={()=>{
                        const s = new Set(selectedRows);
                        s.has(i) ? s.delete(i) : s.add(i);
                        setSelectedRows(s);
                      }}/>
                      <div className="overflow-hidden">
                        <div className="text-[#64FFDA] font-mono">{m.to}</div>
                        <div className="text-gray-400 truncate">{m.message}</div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
           
           {/* Logs */}
           <div className="bg-[#112240] rounded-xl border border-[#1E2D45] h-[300px] flex flex-col">
              <div className="p-3 border-b border-[#1E2D45] bg-[#0d1b33] rounded-t-xl"><span className="text-gray-300 text-sm font-semibold">Execution Logs</span></div>
              <div className="flex-1 overflow-auto p-2 custom-scrollbar space-y-2">
                 {logs.map(l => (
                   <div key={l.id} className="text-xs border-b border-[#1E2D45] pb-1">
                      <div className="flex justify-between">
                         <span className="text-gray-500">{dayjs(l.time).format("HH:mm:ss")}</span>
                         <span className={l.status==='sent'?'text-green-400':l.status==='failed'?'text-red-400':'text-yellow-400'}>{l.status}</span>
                      </div>
                      <div className="text-gray-300">{l.to}</div>
                      {l.error && <div className="text-red-500">{l.error}</div>}
                   </div>
                 ))}
              </div>
           </div>
        </div>

      </div>

      {/* ================= FLOATING WINDOW (QR / STATUS) ================= */}
      {showQrWindow && (
        <div className={`fixed z-50 transition-all duration-300 ease-in-out shadow-2xl border border-[#64FFDA] bg-[#0A192F] overflow-hidden ${
           isWindowMinimized 
           ? "bottom-4 right-4 w-64 h-12 rounded-t-lg" // Minimized State
           : "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md rounded-lg h-auto" // Maximized State
        }`}>
           
           {/* Window Header */}
           <div className="bg-[#112240] p-2 flex justify-between items-center border-b border-[#1E2D45] cursor-move">
              <div className="flex items-center gap-2">
                 <div className={`w-3 h-3 rounded-full ${connectStatus === "connected" ? "bg-green-500" : "bg-red-500"}`}></div>
                 <span className="text-sm font-bold text-white">WhatsApp Connection</span>
              </div>
              <div className="flex items-center gap-1">
                 <button onClick={() => setIsWindowMinimized(!isWindowMinimized)} className="p-1 hover:bg-[#1E2D45] rounded text-gray-300">
                    {isWindowMinimized ? <Maximize2 size={16} /> : <Minus size={16} />}
                 </button>
                 <button onClick={() => setShowQrWindow(false)} className="p-1 hover:bg-red-900/50 rounded text-red-400">
                    <X size={16} />
                 </button>
              </div>
           </div>

           {/* Window Content */}
           {!isWindowMinimized && (
              <div className="p-6 flex flex-col items-center justify-center bg-[#0A192F]">
                 
                 {connectStatus === "connected" ? (
                    <div className="text-center py-10">
                       <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
                       <h3 className="text-xl font-bold text-white">Connected Successfully!</h3>
                       <p className="text-gray-400 mt-2">You can minimize this window.</p>
                       <button onClick={disconnectWhatsApp} className="mt-6 px-4 py-2 bg-red-600/20 text-red-400 rounded border border-red-600">Disconnect</button>
                    </div>
                 ) : qrImage ? (
                    <div className="text-center">
                       <div className="bg-white p-4 rounded-lg inline-block mb-4">
                          <img src={qrImage} alt="QR Code" className="w-64 h-64 object-contain" />
                       </div>
                       <p className="text-sm text-gray-300">Open WhatsApp &gt; Linked Devices &gt; Link Device</p>
                       <div className="mt-4 flex gap-2 justify-center">
                          <span className="animate-pulse text-[#64FFDA] text-xs">Waiting for scan...</span>
                       </div>
                    </div>
                 ) : (
                    <div className="text-center py-10">
                       <AlertCircle size={48} className="text-yellow-500 mx-auto mb-4" />
                       <h3 className="text-lg font-bold text-white">Connecting to Backend...</h3>
                       <p className="text-xs text-gray-400 mt-2 max-w-xs mx-auto">
                          Trying to fetch QR Code from {BACKEND_URL || "Localhost"}...
                       </p>
                       <div className="mt-6 w-8 h-8 border-4 border-[#64FFDA] border-t-transparent rounded-full animate-spin mx-auto"></div>
                       <p className="text-[10px] text-red-400 mt-4">If this takes too long, your backend is likely offline.</p>
                    </div>
                 )}

              </div>
           )}
        </div>
      )}

    </div>
  );
}
