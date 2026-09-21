/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        launcher: {
          green: '#78a239',
          yellow: '#f3c53e',
          yellowHover: '#e3b632',
          yellowShadow: '#cda32b',
          blueHeading: '#007cc3',
          greenHeading: '#339933',
          sidebarBase: '#2a4c78',
        }
      }
    }
  },
  plugins: [],
}