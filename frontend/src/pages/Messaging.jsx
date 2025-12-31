// src/pages/Messaging.jsx
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  Save, Send, RefreshCw, X, Play, Pause, Square,
  QrCode, Image as ImageIcon, Settings, Clock, Minus, Maximize2, CheckCircle, AlertCircle, WifiOff,
  LayoutDashboard, Smartphone, MessageSquare
} from "lucide-react";
import dayjs from "dayjs";

// INTELLIGENT BACKEND URL DETECTION
// Tries to determine if we are running locally or in production to fix connection issues
const getBackendUrl = () => {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    // Assuming local Node.js server usually runs on 3000 or 8000. 
    // You can change this port if your local server is on a different port.
    return "http://localhost:3000"; 
  }
  return ""; // Empty string allows proxy in package.json to handle it, or use relative paths
};

const BACKEND_URL = getBackendUrl(); 

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
  
  // Floating Window States (Desktop Feel)
  const [showQrWindow, setShowQrWindow] = useState(false);
  const [isWindowMinimized, setIsWindowMinimized] = useState(false);
  const [backendError, setBackendError] = useState(false);

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
        setBackendError(false);
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
    setBackendError(false);
    
    try {
      // Thoda wait taki user ko loading dikhe
      await sleep(500);
      const res = await axios.post(`${BACKEND_URL}/api/whatsapp/start`);
      
      if (res.data?.qr) {
        setQrImage(res.data.qr); // QR string from backend
        setConnectStatus("qr");
      } else if (res.data?.connected) {
        setConnectStatus("connected");
      }
    } catch (err) {
      console.error("Connection Failed:", err);
      setBackendError(true); // Show error in window instead of endless loading
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
    <div className="p-4 min-h-screen bg-gray-50 text-gray-800 font-sans relative">
      
      {/* HEADER CARD */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border border-gray-200 mb-6 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="bg-green-100 p-2 rounded-lg text-green-600">
               <MessageSquare size={24} />
            </span>
            WhatsApp Hub Pro
          </h2>
          <p className="text-xs text-gray-500 mt-1 ml-1">Bulk Messenger • Anti-Ban Logic • Template Manager</p>
        </div>
        <div className="flex gap-3 mt-3 md:mt-0">
          <div className={`px-4 py-2 rounded-lg text-xs font-bold border flex items-center gap-2 transition-all ${
            connectStatus === "connected" 
            ? "bg-green-50 text-green-700 border-green-200" 
            : "bg-red-50 text-red-700 border-red-200"
          }`}>
            <div className={`w-2.5 h-2.5 rounded-full ${connectStatus === "connected" ? "bg-green-500 animate-pulse" : "bg-red-500"}`}></div>
            {connectStatus === "connected" ? "DEVICE CONNECTED" : "DISCONNECTED"}
          </div>
          
          {connectStatus !== "connected" ? (
             <button 
                onClick={handleConnectClick} 
                className="bg-gray-900 text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-gray-800 transition-colors shadow-sm"
             >
               <QrCode size={18} /> Link Device
             </button>
          ) : (
             <button 
                onClick={disconnectWhatsApp} 
                className="bg-white border border-red-200 text-red-600 px-5 py-2 rounded-lg font-bold text-sm hover:bg-red-50 transition-colors"
             >
                Disconnect
             </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Controls */}
        <div className="lg:col-span-4 space-y-6">
           
           {/* Campaign Status Card */}
           <div className={`p-6 rounded-xl border shadow-sm transition-all ${isSending ? "bg-white border-blue-500 ring-1 ring-blue-500" : "bg-white border-gray-200"}`}>
             <h3 className="text-gray-800 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                <Clock size={16} className="text-blue-600"/> Campaign Status
             </h3>
             
             {isSending ? (
               <div className="text-center">
                 <div className="flex items-end justify-center gap-1 mb-2">
                    <span className="text-4xl font-bold text-blue-600">{progress}</span>
                    <span className="text-xl text-gray-400 mb-1">%</span>
                 </div>
                 
                 <div className="h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
                   <div 
                      className="h-full bg-blue-600 transition-all duration-300 ease-out" 
                      style={{width: `${progress}%`}}
                   ></div>
                 </div>
                 
                 <p className="text-blue-600 text-sm font-medium mb-6 animate-pulse bg-blue-50 py-1 px-3 rounded-full inline-block">
                    {statusMessage}
                 </p>
                 
                 <div className="flex justify-center gap-3">
                   <button 
                      onClick={() => setIsPaused(!isPaused)} 
                      className={`p-3 rounded-full border shadow-sm transition-all ${
                        isPaused 
                        ? "bg-yellow-100 text-yellow-700 border-yellow-300" 
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                   >
                     {isPaused ? <Play size={24} fill="currentColor"/> : <Pause size={24} fill="currentColor"/>}
                   </button>
                   <button 
                      onClick={() => setStopFlag(true)} 
                      className="p-3 bg-white text-red-500 rounded-full border border-gray-200 hover:bg-red-50 hover:border-red-200 shadow-sm transition-all"
                   >
                     <Square size={24} fill="currentColor"/>
                   </button>
                 </div>
               </div>
             ) : (
               <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <div className="text-gray-400 mb-2">
                    <Send size={32} className="mx-auto opacity-20" />
                  </div>
                  <span className="text-gray-500 text-sm font-medium">System Idle • Ready to Launch</span>
               </div>
             )}
           </div>

           {/* Settings Card */}
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
             <h3 className="text-gray-800 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                <Settings size={16} className="text-gray-500"/> Anti-Ban Configuration
             </h3>
             <div className="grid grid-cols-2 gap-4 text-sm">
               <div>
                 <label className="text-gray-500 text-xs font-semibold mb-1 block">Min Delay (s)</label>
                 <input type="number" value={settings.minDelay} onChange={e=>setSettings({...settings, minDelay:+e.target.value})} className="w-full bg-gray-50 p-2 rounded-lg text-gray-800 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"/>
               </div>
               <div>
                 <label className="text-gray-500 text-xs font-semibold mb-1 block">Max Delay (s)</label>
                 <input type="number" value={settings.maxDelay} onChange={e=>setSettings({...settings, maxDelay:+e.target.value})} className="w-full bg-gray-50 p-2 rounded-lg text-gray-800 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"/>
               </div>
               <div>
                 <label className="text-gray-500 text-xs font-semibold mb-1 block">Batch Size</label>
                 <input type="number" value={settings.batchSize} onChange={e=>setSettings({...settings, batchSize:+e.target.value})} className="w-full bg-gray-50 p-2 rounded-lg text-gray-800 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"/>
               </div>
               <div>
                 <label className="text-gray-500 text-xs font-semibold mb-1 block">Break Time (s)</label>
                 <input type="number" value={settings.batchBreak} onChange={e=>setSettings({...settings, batchBreak:+e.target.value})} className="w-full bg-gray-50 p-2 rounded-lg text-gray-800 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"/>
               </div>
             </div>
             
             <div className="mt-4 pt-4 border-t border-gray-100">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input type="checkbox" checked={settings.waFallback} onChange={e=>setSettings({...settings, waFallback:e.target.checked})} className="peer h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
                  </div>
                  <div className="text-sm">
                     <span className="font-medium text-gray-700 group-hover:text-gray-900">Browser Fallback Mode</span>
                     <p className="text-xs text-gray-500 mt-0.5">Opens a new browser tab if backend API fails (Recommended).</p>
                  </div>
                </label>
             </div>
           </div>
        </div>

        {/* MIDDLE COLUMN: Composer */}
        <div className="lg:col-span-5 space-y-6">
           <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-full flex flex-col">
              <h3 className="text-gray-800 font-bold mb-4 text-sm uppercase tracking-wide flex justify-between items-center">
                 <span>Message Composer</span>
                 <span className="text-xs normal-case font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Markdown Supported</span>
              </h3>
              
              <div className="space-y-3 flex-1">
                  <input 
                    value={currentTemplateName} 
                    onChange={e=>setCurrentTemplateName(e.target.value)} 
                    placeholder="Enter Template Name (e.g., Promotion V1)" 
                    className="w-full bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-gray-400"
                  />
                  
                  <div className="relative">
                    <textarea 
                        value={currentTemplateBody} 
                        onChange={e=>setCurrentTemplateBody(e.target.value)} 
                        rows={8} 
                        placeholder="Type your message here... &#10;Hello {{Party}}, &#10;Your payment of {{Amount}} is pending." 
                        className="w-full bg-gray-50 p-4 rounded-lg border border-gray-200 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none placeholder:text-gray-400"
                    />
                    <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white px-2 py-1 rounded shadow-sm border border-gray-100">
                        {currentTemplateBody.length} chars
                    </div>
                  </div>
                  
                  {/* Variable Chips */}
                  <div className="flex flex-wrap gap-2 items-center">
                     <span className="text-xs text-gray-500 font-medium mr-1">Insert:</span>
                     {detectedVars.slice(0,5).map(v => (
                       <button 
                          key={v} 
                          onClick={()=>setCurrentTemplateBody(prev => prev + ` {{${v}}} `)} 
                          className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded text-xs font-medium hover:bg-blue-100 hover:border-blue-200 transition-all"
                        >
                          {v}
                       </button>
                     ))}
                  </div>

                  {/* Action Bar */}
                  <div className="flex gap-2 pt-2 border-t border-gray-100 mt-2">
                     <button 
                        onClick={()=>{
                          if(!currentTemplateName) return alert("Please enter a template name");
                          const t = [...templates, {id: Date.now(), name: currentTemplateName, body: currentTemplateBody}];
                          setTemplates(t);
                          localStorage.setItem("sel_templates_v3", JSON.stringify(t));
                          alert("Template Saved!");
                        }} 
                        className="p-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
                        title="Save Template"
                     >
                        <Save size={20}/>
                     </button>
                     
                     <label className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${attachment ? "bg-green-50 border-green-200 text-green-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                       <ImageIcon size={20}/> 
                       <span className="text-sm font-medium">{attachment ? "Image Attached" : "Attach Image"}</span>
                       <input type="file" className="hidden" onChange={e=>setAttachment(e.target.files[0])}/>
                       {attachment && <button onClick={(e)=>{e.preventDefault(); setAttachment(null)}} className="ml-2 hover:text-red-500"><X size={14}/></button>}
                     </label>
                  </div>

                  <button 
                    onClick={startCampaign} 
                    disabled={isSending} 
                    className={`w-full py-3.5 rounded-lg font-bold text-sm flex justify-center items-center gap-2 shadow-sm transition-all transform active:scale-[0.98] ${
                        isSending 
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed" 
                        : "bg-gray-900 text-white hover:bg-black"
                    }`}
                  >
                     <Send size={18}/> {isSending ? "Sending in progress..." : "Start Bulk Campaign"}
                  </button>
              </div>
           </div>

           {/* Saved Templates Scroller */}
           {templates.length > 0 && (
             <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Saved Templates</h4>
                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                   {templates.map(t => (
                     <div 
                        key={t.id} 
                        onClick={()=>{setCurrentTemplateName(t.name); setCurrentTemplateBody(t.body)}} 
                        className="bg-gray-50 p-3 rounded-lg border border-gray-200 min-w-[160px] max-w-[160px] cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all group"
                     >
                       <div className="font-bold text-xs text-gray-800 truncate mb-1 group-hover:text-blue-600">{t.name}</div>
                       <div className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed">{t.body}</div>
                     </div>
                   ))}
                </div>
             </div>
           )}
        </div>

        {/* RIGHT COLUMN: Data & Logs */}
        <div className="lg:col-span-3 space-y-6">
           
           {/* Preview List */}
           <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-[300px] flex flex-col overflow-hidden">
              <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                 <span className="text-gray-700 text-xs font-bold uppercase tracking-wide">Target List ({mappingPreview.length})</span>
                 <div className="flex gap-1">
                   <button onClick={()=>setSelectedRows(new Set(mappingPreview.map((_,i)=>i)))} className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-100 font-medium text-gray-600">All</button>
                   <button onClick={()=>setSelectedRows(new Set())} className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-100 font-medium text-gray-600">None</button>
                 </div>
              </div>
              <div className="flex-1 overflow-auto p-2 custom-scrollbar bg-white">
                 {mappingPreview.map((m,i) => (
                   <div 
                      key={i} 
                      className={`flex gap-3 p-2.5 mb-1.5 rounded-lg border transition-all ${
                          selectedRows.has(i) 
                          ? "bg-blue-50 border-blue-200" 
                          : "bg-white border-transparent hover:bg-gray-50 hover:border-gray-100"
                      }`}
                   >
                      <input 
                        type="checkbox" 
                        checked={selectedRows.has(i)} 
                        onChange={()=>{
                          const s = new Set(selectedRows);
                          s.has(i) ? s.delete(i) : s.add(i);
                          setSelectedRows(s);
                        }}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="overflow-hidden w-full">
                        <div className="text-gray-900 font-bold text-xs font-mono mb-0.5">{m.to}</div>
                        <div className="text-gray-500 text-xs truncate">{m.message}</div>
                      </div>
                   </div>
                 ))}
                 {mappingPreview.length === 0 && (
                    <div className="text-center py-10 text-gray-400 text-xs">No data loaded</div>
                 )}
              </div>
           </div>
           
           {/* Logs */}
           <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-[350px] flex flex-col overflow-hidden">
              <div className="p-3 border-b border-gray-100 bg-gray-50">
                 <span className="text-gray-700 text-xs font-bold uppercase tracking-wide">Live Execution Logs</span>
              </div>
              <div className="flex-1 overflow-auto p-3 custom-scrollbar bg-gray-900 text-gray-300 font-mono text-xs space-y-3">
                 {logs.length === 0 && <div className="text-center pt-20 text-gray-600 italic">Logs will appear here...</div>}
                 {logs.map(l => (
                   <div key={l.id} className="border-b border-gray-800 pb-2 last:border-0">
                      <div className="flex justify-between mb-1">
                         <span className="text-gray-500">{dayjs(l.time).format("HH:mm:ss")}</span>
                         <span className={`font-bold ${
                            l.status==='sent'?'text-green-400':
                            l.status==='failed'?'text-red-400':
                            l.status==='opened'?'text-blue-400':
                            'text-yellow-400'
                         }`}>
                            {l.status.toUpperCase()}
                         </span>
                      </div>
                      <div className="text-white">{l.to}</div>
                      {l.error && <div className="text-red-400 mt-1 pl-2 border-l-2 border-red-500">{l.error}</div>}
                   </div>
                 ))}
              </div>
           </div>
        </div>

      </div>

      {/* ================= FLOATING WINDOW (QR / STATUS) - IMPROVED UI ================= */}
      {showQrWindow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
           <div className={`transition-all duration-300 ease-in-out bg-white shadow-2xl overflow-hidden flex flex-col ${
             isWindowMinimized 
             ? "fixed bottom-4 right-4 w-72 h-14 rounded-t-xl border border-gray-300" 
             : "w-[90%] max-w-sm rounded-2xl h-auto border-none"
           }`}>
            
            {/* Window Header */}
            <div className={`p-3 flex justify-between items-center cursor-move select-none ${isWindowMinimized ? 'bg-white' : 'bg-gray-900'}`}>
               <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${connectStatus === "connected" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-red-500"}`}></div>
                  <span className={`text-sm font-bold ${isWindowMinimized ? 'text-gray-800' : 'text-white'}`}>WhatsApp Connection</span>
               </div>
               <div className="flex items-center gap-1">
                  <button onClick={() => setIsWindowMinimized(!isWindowMinimized)} className={`p-1.5 rounded transition-colors ${isWindowMinimized ? 'text-gray-500 hover:bg-gray-100' : 'text-gray-400 hover:bg-white/10'}`}>
                     {isWindowMinimized ? <Maximize2 size={16} /> : <Minus size={16} />}
                  </button>
                  <button onClick={() => setShowQrWindow(false)} className={`p-1.5 rounded transition-colors ${isWindowMinimized ? 'text-gray-500 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-white hover:bg-red-500/20'}`}>
                     <X size={16} />
                  </button>
               </div>
            </div>

            {/* Window Content */}
            {!isWindowMinimized && (
               <div className="p-8 flex flex-col items-center justify-center bg-white min-h-[350px]">
                  
                  {connectStatus === "connected" ? (
                     <div className="text-center animate-in zoom-in duration-300">
                        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                           <CheckCircle size={40} className="text-green-500" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Connected Successfully!</h3>
                        <p className="text-sm text-gray-500 mb-6">Your device is ready to send messages.</p>
                        <button onClick={() => setShowQrWindow(false)} className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-black transition-colors w-full">Done</button>
                     </div>
                  ) : backendError ? (
                      <div className="text-center w-full">
                         <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <WifiOff size={32} className="text-red-500" />
                         </div>
                         <h3 className="text-lg font-bold text-gray-900 mb-1">Backend Connection Failed</h3>
                         <p className="text-xs text-gray-500 mb-4 px-4">
                            Could not connect to local server at <br/>
                            <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-700 font-mono mt-1 inline-block">{BACKEND_URL || "Relative Path"}</code>
                         </p>
                         
                         <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 mb-4 text-left">
                            <div className="flex items-start gap-2">
                               <AlertCircle size={16} className="text-orange-600 mt-0.5 shrink-0" />
                               <div>
                                  <p className="text-orange-800 text-xs font-bold">Fallback Mode Active</p>
                                  <p className="text-orange-700 text-[10px] mt-0.5 leading-tight">
                                     You can still send messages! The system will open WhatsApp Web in new tabs for each message.
                                  </p>
                               </div>
                            </div>
                         </div>
                         
                         <div className="flex gap-2">
                             <button onClick={handleConnectClick} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-200">
                                Retry
                             </button>
                             <button onClick={() => setShowQrWindow(false)} className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-black">
                                Close
                             </button>
                         </div>
                      </div>
                  ) : qrImage ? (
                     <div className="text-center w-full">
                        <p className="text-sm font-semibold text-gray-700 mb-4">Scan QR code with WhatsApp</p>
                        <div className="p-2 border-2 border-dashed border-gray-200 rounded-xl inline-block mb-4 relative group">
                           <img src={qrImage} alt="QR Code" className="w-56 h-56 object-contain" />
                           <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                              <p className="text-xs font-bold text-gray-800">Scan to Link</p>
                           </div>
                        </div>
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                           <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                           Updates automatically
                        </div>
                     </div>
                  ) : (
                     <div className="text-center py-6">
                        <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <h3 className="text-base font-bold text-gray-900">Initializing...</h3>
                        <p className="text-xs text-gray-500 mt-1">Starting WhatsApp engine</p>
                     </div>
                  )}

               </div>
            )}
           </div>
        </div>
      )}

    </div>
  );
}
