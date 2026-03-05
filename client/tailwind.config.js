export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        bg: '#F5F5F7',
        surface: '#FFFFFF',
        border: '#E8E8ED',
        'border-strong': '#D1D1D6',
        'text-primary': '#1C1C1E',
        'text-secondary': '#636366',
        'text-tertiary': '#AEAEB2',
        accent: '#0071E3',
        'accent-soft': '#EAF2FF',
        'green-status': '#28CD41',
        'green-soft': '#EDFAF0',
        'orange-status': '#FF9500',
        'orange-soft': '#FFF4E5',
        'red-status': '#FF3B30',
        'red-soft': '#FFF0EF',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        md: '0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
      }
    }
  },
  plugins: [],
}
