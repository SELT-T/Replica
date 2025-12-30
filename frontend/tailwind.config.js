/** @type {import('tailwindcss').Config} */
export default {
  // 'class' strategy allow karega ki hum parent div par theme set kar sakein
  darkMode: 'class', 
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Hum colours direct HEX nahi denge, balki CSS Variables use karenge
        // Taaki Theme change karne par ye apne aap badal jayein
        
        primary: "var(--bg-primary)",       // Main App Background (Black/DarkBlue)
        secondary: "var(--bg-secondary)",   // Cards & Sidebar Background
        tertiary: "var(--bg-tertiary)",     // Inputs / Hover States
        
        accent: "var(--color-accent)",         // Main Action Color (Carbon Blue/Teal)
        "accent-hover": "var(--color-accent-hover)", 
        
        // Text Colors
        "text-main": "var(--text-main)",       // Headings & Main Text
        "text-muted": "var(--text-muted)",     // Descriptions
        "text-inv": "var(--text-inv)",         // Text on Accent Buttons
        
        // Borders
        border: "var(--border-color)",
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],       // Clean Professional Text
        display: ['Poppins', 'sans-serif'],  // Stylish Headers
      },
      boxShadow: {
        'premium': '0 4px 20px -2px rgba(0, 0, 0, 0.5)', // Premium Glow Effect
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)', // Glassmorphism
      }
    },
  },
  plugins: [],
}
