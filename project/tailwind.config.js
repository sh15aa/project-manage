/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        obsidian: {
          950: '#06070a',
          900: '#0a0c10',
          850: '#0e1117',
          800: '#141821',
          700: '#1c212c',
          600: '#262d3b',
        },
      },
      boxShadow: {
        'glow-subtle': '0 0 50px -10px rgba(99, 102, 241, 0.08)',
        'glow-cyan': '0 0 40px -8px rgba(6, 182, 212, 0.12)',
        'inner-light': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
      },
    },
  },
  plugins: [],
};
