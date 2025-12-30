// src/App.jsx
import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import CompanyHierarchy from "./pages/CompanyHierarchy";
import Outstanding from "./pages/Outstanding";
import Analyst from "./pages/Analyst";
import Messaging from "./pages/Messaging";
import UserManagement from "./pages/UserManagement";
import Setting from "./pages/Setting";
import HelpSupport from "./pages/HelpSupport";

import LoginPopup from "./components/LoginPopup";
import SignupPopup from "./components/SignupPopup";

import { AuthProvider, useAuth } from "./context/AuthContext";

function MainApp() {
  const [route, setRoute] = useState("dashboard");
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  const { user, canAccess, authLoading } = useAuth();

  // --- 1. GLOBAL SETTINGS STATE (Lifted Up) ---
  const [globalSettings, setGlobalSettings] = useState({
    theme: { mode: "Dark", sidebar: "Left", logoUrl: "" },
    // ... (other default settings can be added here if needed for initialization)
  });

  // Load settings on mount
  useEffect(() => {
    const saved = localStorage.getItem("selt_full_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaults to avoid crashes if keys are missing
        setGlobalSettings(prev => ({ ...prev, ...parsed }));
        applyTheme(parsed);
      } catch (e) { console.error("Settings load error", e); }
    }
  }, []);

  // Helper to apply theme instantly
  const applyTheme = (cfg) => {
    if (cfg?.theme?.mode === "Light") {
      document.documentElement.style.filter = "invert(1) hue-rotate(180deg)";
    } else {
      document.documentElement.style.filter = "none";
    }
  };

  // Function to update settings (passed down to Setting page)
  const updateGlobalSettings = (newSettings) => {
    setGlobalSettings(newSettings);
    applyTheme(newSettings);
    // LocalStorage save is handled inside Setting.jsx, but we update state here to reflect changes instantly
  };

  // Sidebar Position Logic
  const isRightSidebar = globalSettings.theme?.sidebar === "Right";

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A192F] text-[#64FFDA] text-xl">
        Loading...
      </div>
    );
  }

  const renderPage = () => {
    if (user && !canAccess(route)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-[#64FFDA] mb-2">Access Denied</h2>
          <p className="text-gray-400">You don't have permission to view this page.</p>
        </div>
      );
    }

    switch (route) {
      case "dashboard": return <Dashboard />;
      case "reports": return <Reports />;
      case "hierarchy": return <CompanyHierarchy />;
      case "outstanding": return <Outstanding />;
      case "analyst": return <Analyst />;
      case "messaging": return <Messaging />;
      case "usermanagement": return <UserManagement />;
      // Pass the updater function and current settings to the Setting page
      case "setting": return <Setting onSettingsChange={updateGlobalSettings} currentSettings={globalSettings} />;
      case "helpsupport": return <HelpSupport />;
      default: return <Dashboard />;
    }
  };

  return (
    <>
      {/* LAYOUT LOGIC: 
          If Right Sidebar: flex-row-reverse
          If Left Sidebar: flex-row (default)
      */}
      <div className={`min-h-screen flex bg-[#0A192F] text-gray-100 ${isRightSidebar ? "flex-row-reverse" : "flex-row"}`}>
        
        {/* Pass settings to Sidebar so it can display the correct logo/styles */}
        {user && <Sidebar onNavigate={setRoute} settings={globalSettings} />}

        <div
          className={`flex flex-col flex-1 min-h-screen transition-all duration-300 ${
            user ? (isRightSidebar ? "lg:mr-64" : "lg:ml-64") : ""
          }`}
        >
          <Header
            onNavigate={setRoute}
            openLogin={() => setShowLogin(true)}
            openSignup={() => setShowSignup(true)}
          />

          <main className="flex-1 p-4 md:p-6 mt-[70px] bg-[#0A192F]">
            {renderPage()}
          </main>
        </div>
      </div>

      {showLogin && (
        <LoginPopup
          onClose={() => setShowLogin(false)}
          onSwitchToSignup={() => { setShowLogin(false); setShowSignup(true); }}
        />
      )}

      {showSignup && (
        <SignupPopup
          onClose={() => setShowSignup(false)}
          onSwitchToLogin={() => { setShowSignup(false); setShowLogin(true); }}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
