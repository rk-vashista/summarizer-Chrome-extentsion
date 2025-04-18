/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte}'],
  darkMode: 'class', // Enable dark mode with class-based approach
  theme: {
    extend: {
      colors: {
        primary: '#0078d7',
        secondary: '#f3f3f3',
        'text-main': '#333',
        'text-light': '#757575',
        error: '#d32f2f',
        border: '#e0e0e0'
      },
      spacing: {
        panel: '350px',
        popup: '400px'
      }
    },
  },
  plugins: [],
}