/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tesla dark palette
        tesla: {
          bg:       '#0a0a0a',
          surface:  '#111111',
          card:     '#161616',
          border:   '#2a2a2a',
          muted:    '#3a3a3a',
          text:     '#e8e8e8',
          subtle:   '#8a8a8a',
          accent:   '#e31937',  // Tesla red
          blue:     '#3d9df3',
          green:    '#3dd68c',
          amber:    '#f5a623',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"SF Pro Display"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0,0,0,0.6)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.8)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
