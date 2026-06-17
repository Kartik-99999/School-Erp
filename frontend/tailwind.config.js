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
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // --- SchoolERP design system (single source of truth) ---
        primary: {
          DEFAULT: "#2563EB", // maps shadcn `bg-primary` onto brand blue
          foreground: "#FFFFFF",
          50: "#EFF6FF",
          100: "#DBEAFE",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
        },
        accent: {
          500: "#F97316",
          600: "#EA6C0A",
        },
        surface: {
          DEFAULT: "#F8FAFC",
          card: "#FFFFFF",
        },
        ink: {
          DEFAULT: "#1E293B",
          muted: "#64748B",
          faint: "#94A3B8",
        },
        border: {
          DEFAULT: "hsl(var(--border))", // == #E2E8F0
          strong: "#CBD5E1",
        },
        success: { bg: "#ECFDF5", text: "#065F46", border: "#A7F3D0" },
        warning: { bg: "#FFFBEB", text: "#92400E", border: "#FDE68A" },
        danger: { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA" },
        info: { bg: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        // shadcn legacy
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        // SchoolERP scale
        card: "12px",
        input: "8px",
        badge: "6px",
        btn: "8px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        dropdown: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)",
        modal: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(-4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.15s ease-out",
        "slide-in-right": "slide-in-right 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
