/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./upload/index.html",
    "./library/index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        cream: "rgb(var(--cream) / <alpha-value>)",
        sand: "rgb(var(--sand) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        accent2: "rgb(var(--accent-2) / <alpha-value>)",
        rose: "rgb(var(--rose) / <alpha-value>)"
      },
      fontFamily: {
        sans: ["Manrope", "sans-serif"]
      },
      boxShadow: {
        soft: "0 16px 32px rgba(0, 0, 0, 0.08)",
        lift: "0 10px 20px rgba(0, 0, 0, 0.08)"
      },
      keyframes: {
        breathe: {
          "0%, 100%": { boxShadow: "0 10px 24px rgba(90, 76, 59, 0.12)" },
          "50%": { boxShadow: "0 16px 30px rgba(90, 76, 59, 0.2)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" }
        },
        pulseSoft: {
          "0%": { boxShadow: "0 0 0 0 rgba(84, 125, 92, 0.35)" },
          "70%": { boxShadow: "0 0 0 10px rgba(84, 125, 92, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(84, 125, 92, 0)" }
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" }
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        breathe: "breathe 3.6s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
        "pulse-soft": "pulseSoft 2s ease-out infinite",
        "float-slow": "floatSlow 6s ease-in-out infinite",
        "fade-up": "fadeUp 0.6s ease-out both"
      }
    }
  },
  plugins: []
};
