import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./App.css";
import "./styles.css";

// Mobile viewport height fix
function setMobileHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Initial call
setMobileHeight();

// Update on resize and orientation change
window.addEventListener('resize', setMobileHeight);
window.addEventListener('orientationchange', setMobileHeight);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
