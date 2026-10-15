/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'comic-bg': '#F4F4F0',
        'comic-yellow': '#FFE600',
        'comic-blue': '#3A86FF',
        'comic-teal': '#2A9D8F',
        'comic-red': '#E63946',
        'comic-orange': '#F4A261',
        'comic-purple': '#8338EC',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        comic: ['Space Grotesk', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
