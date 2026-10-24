
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blood: {
          50: "#fff1f2",
          100: "#ffe4e6",
          500: "#e11d48",
          600: "#dc2626",
          700: "#b91c1c",
          900: "#881337",
        },
      },
    },
  },
  plugins: [],
};
