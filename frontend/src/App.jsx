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

  // --- GLOBAL SETTINGS STATE ---
  const [globalSettings, setGlobalSettings] = useState({
    theme: { mode: "Dark", sidebar: "Left", logoUrl: "" },
    // Default fallback values
  });

  // Load Settings
  useEffect(() => {
    const saved = localStorage.getItem("selt_full_config");
    if (saved) {
      try {
        setGlobalSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
      } catch (e) {}
    }
  }, []);

  const updateGlobalSettings = (newSettings) => {
    setGlobalSettings(newSettings);
    // Note: LocalStorage saving is done inside Setting.jsx, we just update state here for live view
  };

  // --- THEME LOGIC (REAL COLORS) ---
  const isLight = globalSettings.theme?.mode === "Light";
  const isRightSidebar = globalSettings.theme?.sidebar === "Right";

  // Dynamic Classes based on Theme
  const appBgClass = isLight ? "bg-[#F3F4F6]" : "bg-[#0A192F]"; // Light Gray vs Carbon Blue
  const appTextClass = isLight ? "text-[#111827]" : "text-gray-100"; // Dark Text vs Light Text

  if (authLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${appBgClass} text-[#64FFDA] text-xl`}>
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

    // Pass 'isLight' prop to pages if they need specific styling adjustments
    const props = { isLight };

    switch (route) {
      case "dashboard": return <Dashboard {...props} />;
      case "reports": return <Reports {...props} />;
      case "hierarchy": return <CompanyHierarchy {...props} />;
      case "outstanding": return <Outstanding {...props} />;
      case "analyst": return <Analyst {...props} />;
      case "messaging": return <Messaging {...props} />;
      case "usermanagement": return <UserManagement {...props} />;
      case "setting": return <Setting onSettingsChange={updateGlobalSettings} currentSettings={globalSettings} {...props} />;
      case "helpsupport": return <HelpSupport {...props} />;
      default: return <Dashboard {...props} />;
    }
  };

  return (
    <>
      <div className={`min-h-screen flex ${appBgClass} ${appTextClass} ${isRightSidebar ? "flex-row-reverse" : "flex-row"}`}>
        
        {/* Pass settings & isLight to Sidebar */}
        {user && <Sidebar onNavigate={setRoute} settings={globalSettings} isLight={isLight} />}

        <div
          className={`flex flex-col flex-1 min-h-screen transition-all duration-300 ${
            user ? (isRightSidebar ? "lg:mr-64" : "lg:ml-64") : ""
          }`}
        >
          <Header
            onNavigate={setRoute}
            openLogin={() => setShowLogin(true)}
            openSignup={() => setShowSignup(true)}
            isLight={isLight} // Pass theme to header if needed
          />

          <main className={`flex-1 p-4 md:p-6 mt-[70px] ${appBgClass}`}>
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
