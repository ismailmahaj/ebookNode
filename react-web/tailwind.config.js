/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        body: ['Source Sans 3', 'system-ui', 'sans-serif'],
      },
      colors: {
        netflix: {
          black: '#141414',
          dark: '#181818',
          red: '#e50914',
          'red-hover': '#f40612',
          gray: '#808080',
        },
      },
    },
  },
  plugins: [],
}
