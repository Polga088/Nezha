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
        "2xl": "1440px",
      },
    },
    extend: {
      fontSize: {
        "display-lg": ["2.5rem", { lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "700" }],
        "display-md": ["2rem", { lineHeight: "1.15", letterSpacing: "-0.025em", fontWeight: "600" }],
        "headline": ["1.5rem", { lineHeight: "1.25", letterSpacing: "-0.02em", fontWeight: "600" }],
        "label-sm": ["0.6875rem", { lineHeight: "1.4", letterSpacing: "0.08em", fontWeight: "600" }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        surface: "rgb(var(--clinical-surface-rgb) / <alpha-value>)",
        container: {
          low: "rgb(var(--clinical-container-low-rgb) / <alpha-value>)",
          lowest: "rgb(var(--clinical-container-lowest-rgb) / <alpha-value>)",
          high: "rgb(var(--clinical-container-high-rgb) / <alpha-value>)",
        },
        "on-surface": {
          DEFAULT: "rgb(var(--clinical-on-surface-rgb) / <alpha-value>)",
          variant: "rgb(var(--clinical-on-surface-variant-rgb) / <alpha-value>)",
        },
        "outline-variant": "rgb(var(--clinical-outline-variant-rgb) / <alpha-value>)",
        clinical: {
          deep: "rgb(var(--clinical-primary-deep) / <alpha-value>)",
          bright: "rgb(var(--clinical-primary-bright) / <alpha-value>)",
        },
      },
      boxShadow: {
        "medical-xs": "0 1px 2px rgba(15, 23, 42, 0.04)",
        "medical-sm": "0 2px 8px -2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)",
        medical: "0 8px 32px -8px rgba(15, 23, 42, 0.1), 0 2px 8px -2px rgba(15, 23, 42, 0.04)",
        "medical-lg": "0 20px 50px -12px rgba(15, 23, 42, 0.15), 0 8px 20px -8px rgba(15, 23, 42, 0.08)",
        "medical-xl": "0 32px 64px -16px rgba(15, 23, 42, 0.18)",
        "medical-blue": "0 12px 36px -8px rgba(37, 99, 235, 0.4)",
        "medical-blue-sm": "0 4px 16px -4px rgba(37, 99, 235, 0.3)",
        "inner-glow": "inset 0 1px 0 0 rgba(255, 255, 255, 0.6)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-in": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        "fade-in-up": {
          from: { opacity: 0, transform: "translateY(12px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: 0, transform: "scale(0.96)" },
          to: { opacity: 1, transform: "scale(1)" },
        },
        "slide-in-left": {
          from: { opacity: 0, transform: "translateX(-8px)" },
          to: { opacity: 1, transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out both",
        "fade-in-up": "fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scale-in": "scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-in-left": "slide-in-left 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
