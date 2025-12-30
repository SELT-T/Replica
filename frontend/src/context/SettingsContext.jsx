// src/context/SettingsContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const SettingsContext = createContext();

// Default Settings
const defaultSettings = {
  theme: { mode: "Dark", sidebar: "Left", logoUrl: "" },
  features: {
    Analyst: { salesOrder: true, invoice: true, whatsapp: true },
    Outstanding: { bulkReminder: false },
    Messaging: { whatsappInt: true }
  },
  userRole: {
      pendingUsers: [
        { id: 1, name: "shoaib", email: "shoaib@selt-t.com", status: "Pending" },
        { id: 2, name: "info", email: "info@selt-t.com", status: "Pending" }
      ],
      roles: ["Admin", "MIS", "Salesman", "User"],
      allowSignup: true
  },
  notifications: { channels: { email: true, whatsapp: true }, triggers: {} },
  security: { otpLogin: true, ipWhitelist: "" },
  integration: { tallyUrl: "http://localhost:9000", whatsappKey: "" }
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings);

  // Load Settings & Apply Theme
  useEffect(() => {
    const saved = localStorage.getItem("selt_pro_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
        applyTheme(parsed); // Load hote hi theme lagao
      } catch (e) { console.error(e); }
    }
  }, []);

  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem("selt_pro_config", JSON.stringify(newSettings));
    applyTheme(newSettings); // Save karte hi theme badlo
  };

  const applyTheme = (cfg) => {
    if (cfg.theme.mode === "Light") {
      document.documentElement.style.filter = "invert(1) hue-rotate(180deg)";
      // Note: Ye ek quick hack hai Dark to Light convert karne ka bina CSS likhe
      // Real light mode ke liye CSS classes best hoti hain
    } else {
      document.documentElement.style.filter = "none";
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, saveSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
