/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        // --- existing SchoolERP design system (unchanged — used by the app) ---
        primary: { DEFAULT: "#2563EB", foreground: "#FFFFFF", 50: "#EFF6FF", 100: "#DBEAFE", 500: "#3B82F6", 600: "#2563EB", 700: "#1D4ED8" },
        accent: { 500: "#F97316", 600: "#EA6C0A" },
        surface: { DEFAULT: "#F8FAFC", card: "#FFFFFF" },
        ink: { DEFAULT: "#1E293B", muted: "#64748B", faint: "#94A3B8" },
        border: { DEFAULT: "hsl(var(--border))", strong: "#CBD5E1" },
        success: { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" },
        warning: { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A" },
        danger: { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA" },
        info: { bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE" },
        // --- erpcore landing: AURORA premium (deep night + violet/blue/teal glow) ---
        night: { DEFAULT: "#0A0E1A", 900: "#0A0E1A", 800: "#0E1426", 700: "#141C32", 600: "#1C2746", 500: "#26345E" },
        iris: { DEFAULT: "#8B5CF6", 300: "#C4B5FD", 400: "#A78BFA", 500: "#8B5CF6", 600: "#7C3AED" },
        azure: { DEFAULT: "#3B82F6", 300: "#93C5FD", 400: "#60A5FA", 500: "#3B82F6", 600: "#2563EB" },
        aqua: { DEFAULT: "#2DD4BF", 300: "#5EEAD4", 400: "#2DD4BF", 500: "#14B8A6", 600: "#0D9488" },
        mist: { DEFAULT: "#EDEFF5", 400: "#A6AEC4", 600: "#6B7390" },
        // --- erpcore landing v2: clean LIGHT premium ---
        paper: { DEFAULT: "#FBFBFE", 100: "#F2F3F9", 200: "#E7E9F2" },
        navy: { DEFAULT: "#0E1426", 600: "#3C4257", 400: "#727A90" },
        brand: { DEFAULT: "#4F46E5", 50: "#EEF0FE", 100: "#E0E3FD", 200: "#C7CCFB", 500: "#4F46E5", 600: "#4338CA" },
        // --- erpcore landing v3: cinematic dark + gold dust ---
        void: { DEFAULT: "#08090D", 900: "#08090D", 800: "#0C0E14", 700: "#12141C", 600: "#1A1D27" },
        gold: { DEFAULT: "#EBCB87", 300: "#F3DEAB", 400: "#EBCB87", 500: "#D9B266", 600: "#B8923F" },
        warm: { DEFAULT: "#F4F2EC", 400: "#A8A595", 600: "#75736A" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Bricolage Grotesque", "ui-serif", "Georgia", "serif"],
        body: ["var(--font-body)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)", card: "12px", input: "8px", badge: "6px", btn: "8px" },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        dropdown: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)",
        modal: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
        aurora: "0 0 0 1px rgba(124,58,237,0.22), 0 24px 70px -16px rgba(37,99,235,0.45)",
        lift: "0 30px 70px -24px rgba(15,23,42,0.22)",
        soft: "0 1px 2px rgba(16,24,40,0.05), 0 8px 24px -12px rgba(16,24,40,0.12)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { from: { opacity: "0", transform: "translateY(-4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "slide-in-right": { from: { opacity: "0", transform: "translateX(16px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        "float-slow": { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-8px)" } },
        "aurora-pan": { "0%,100%": { transform: "translate3d(0,0,0) scale(1)" }, "50%": { transform: "translate3d(4%,-3%,0) scale(1.08)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.15s ease-out",
        "slide-in-right": "slide-in-right 0.2s ease-out",
        "float-slow": "float-slow 6s ease-in-out infinite",
        "aurora-pan": "aurora-pan 16s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
