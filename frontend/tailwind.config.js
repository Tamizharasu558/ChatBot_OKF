/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Segoe UI"',
          'Roboto',
          'Inter',
          'sans-serif'
        ],
        mono: [
          '"SF Mono"',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace'
        ]
      },
      colors: {
        apple: {
          bg: '#f5f5f7',
          card: '#ffffff',
          darkBg: '#000000',
          darkCard: '#1c1c1e',
          darkSidebar: '#121214',
          accent: '#0071e3',
          accentHover: '#0077ed',
          border: 'rgba(0,0,0,0.08)',
          darkBorder: 'rgba(255,255,255,0.1)'
        }
      }
    },
  },
  plugins: [],
}
