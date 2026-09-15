module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
    },
  },
  plugins: [
    function({ addComponents }) {
      addComponents({
        '.btn-square-64': {
          width: '64px',
          height: '64px',
          minWidth: '64px',
          minHeight: '64px',
        },
        '.btn-square-48': {
          width: '48px',
          height: '48px',
          minWidth: '48px',
          minHeight: '48px',
        },
        '.btn-square-56': {
          width: '56px',
          height: '56px',
          minWidth: '56px',
          minHeight: '56px',
        },
      })
    }
  ],
}
