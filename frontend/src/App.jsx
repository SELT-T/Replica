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

// Dictionary (Language)
const translations = {
  English: {
    dashboard: "Dashboard", reports: "Reports", hierarchy: "Company Hierarchy", outstanding: "Outstanding",
    analyst: "Analyst", messaging: "Messaging", usermanagement: "User Management", settings: "Settings",
    helpsupport: "Help & Support", searchPlaceholder: "Search analytics, invoices...", welcome: "Welcome",
    notifications: "Notifications", markRead: "Mark all read", newEntry: "New Entry", logout: "Sign Out",
    myProfile: "My Profile", billing: "Billing & Plans", overview: "Overview", Top: "Top",
    "Total Sales": "Total Sales", "Parties": "Parties", "Vouchers": "Vouchers", "Products": "Products",
    "Sales Trend": "Sales Trend", "Category": "Category", "Top Products": "Top Products",
    "Companies": "Companies", "Groups": "Groups", "Areas": "Areas", "Date": "Date", "Group": "Group",
    "Party Wise": "Party Wise", "Salesman Wise": "Salesman Wise", "Area Wise": "Area Wise", "Product Wise": "Product Wise", "Group Wise": "Group Wise",
    "View": "View", "TOTAL": "TOTAL", "Export": "Export", "Details": "Details", "Close": "Close"
  },
  Hindi: {
    dashboard: "डैशबोर्ड", reports: "रिपोर्ट्स", hierarchy: "कंपनी संरचना", outstanding: "बकाया राशि",
    analyst: "एनालिस्ट", messaging: "मैसेजिंग", usermanagement: "यूज़र मैनेजमेंट", settings: "सेटिंग्स",
    helpsupport: "सहायता", searchPlaceholder: "एनालिटिक्स खोजें...", welcome: "स्वागत है",
    notifications: "सूचनाएं", markRead: "सभी पढ़ी गई", newEntry: "नई प्रविष्टि", logout: "साइन आउट",
    myProfile: "मेरी प्रोफाइल", billing: "बिलिंग और प्लान", overview: "अवलोकन", Top: "शीर्ष",
    "Total Sales": "कुल बिक्री", "Parties": "पार्टियां", "Vouchers": "वाउचर", "Products": "उत्पाद",
    "Sales Trend": "बिक्री का रुझान", "Category": "श्रेणी", "Top Products": "शीर्ष उत्पाद",
    "Companies": "कंपनियां", "Groups": "समूह", "Areas": "क्षेत्र", "Date": "दिनांक", "Group": "समूह",
    "Party Wise": "पार्टी वार", "Salesman Wise": "सेल्समैन वार", "Area Wise": "क्षेत्र वार", "Product Wise": "उत्पाद वार", "Group Wise": "समूह वार",
    "View": "देंखे", "TOTAL": "कुल योग", "Export": "निर्यात", "Details": "विवरण", "Close": "बंद करें"
  }
};

function MainApp() {
  const [route, setRoute] = useState("dashboard");
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  
  const [globalSettings, setGlobalSettings] = useState({
    theme: { mode: "Dark", sidebar: "Left", logoUrl: "" },
    language: "English"
  });

  const { user, canAccess, authLoading } = useAuth();

  useEffect(() => {
    const saved = localStorage.getItem("selt_full_config");
    if (saved) { try { setGlobalSettings(prev => ({ ...prev, ...JSON.parse(saved) })); } catch (e) {} }
  }, []);

  const updateGlobalSettings = (newSettings) => setGlobalSettings(newSettings);
  const changeLanguage = (lang) => setGlobalSettings(prev => ({ ...prev, language: lang }));
  const t = (key) => translations[globalSettings.language]?.[key] || key;

  const isLight = globalSettings.theme?.mode === "Light";
  const isRightSidebar = globalSettings.theme?.sidebar === "Right";
  const appBgClass = isLight ? "bg-[#F0F2F5]" : "bg-[#0A192F]"; 
  const appTextClass = isLight ? "text-[#0A192F]" : "text-gray-100";

  if (authLoading) return <div className={`min-h-screen flex items-center justify-center ${appBgClass} text-[#64FFDA] text-xl`}>Loading...</div>;

  const renderPage = () => {
    if (user && !canAccess(route)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-[#64FFDA] mb-2">Access Denied</h2>
        </div>
      );
    }

    const props = { isLight, t };

    switch (route) {
      // IMPORTANT: Pass openLogin/openSignup to Dashboard so buttons work
      case "dashboard": return <Dashboard {...props} openLogin={() => setShowLogin(true)} openSignup={() => setShowSignup(true)} />;
      case "reports": return <Reports {...props} />;
      case "hierarchy": return <CompanyHierarchy {...props} />;
      case "outstanding": return <Outstanding {...props} />;
      case "analyst": return <Analyst {...props} />;
      case "messaging": return <Messaging {...props} />;
      case "usermanagement": return <UserManagement {...props} />;
      case "setting": return <Setting onSettingsChange={updateGlobalSettings} currentSettings={globalSettings} isLight={isLight} t={t} />;
      case "helpsupport": return <HelpSupport {...props} />;
      default: return <Dashboard {...props} openLogin={() => setShowLogin(true)} openSignup={() => setShowSignup(true)} />;
    }
  };

  return (
    <>
      <div className={`min-h-screen flex ${appBgClass} ${appTextClass} ${isRightSidebar ? "flex-row-reverse" : "flex-row"}`} data-theme={isLight ? "light" : "dark"}>
        {user && <Sidebar onNavigate={setRoute} settings={globalSettings} isLight={isLight} t={t} />}
        <div className={`flex flex-col flex-1 min-h-screen transition-all duration-300 ${user ? (isRightSidebar ? "lg:mr-64" : "lg:ml-64") : "w-full"}`}>
          <Header onNavigate={setRoute} openLogin={() => setShowLogin(true)} openSignup={() => setShowSignup(true)} isLight={isLight} currentLang={globalSettings.language} onLanguageChange={changeLanguage} t={t} />
          <main className={`flex-1 p-4 md:p-6 ${appBgClass}`}>{renderPage()}</main>
        </div>
      </div>
      {showLogin && <LoginPopup onClose={() => setShowLogin(false)} />}
      {showSignup && <SignupPopup onClose={() => setShowSignup(false)} />}
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
