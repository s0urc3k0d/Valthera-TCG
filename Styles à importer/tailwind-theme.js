// Extrait prêt à coller dans tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        valthera: {
          950: '#0D0705',
          900: '#1A0F08',
          800: '#2D1B0E',
          700: '#4A2C17',
          600: '#6B3D1F',
          500: '#8B5A2B',
          400: '#C9A227',
          300: '#D4AF37',
          200: '#E8D5A3',
          100: '#F5ECD7',
        },
        blood: { 600: '#8B0000', 500: '#A52A2A', 400: '#CD5C5C' },
        forest: { 700: '#1B4D3E', 600: '#2E5A4B', 500: '#3D7A5A' },
        steel: { 600: '#4A5568', 500: '#6B7280', 400: '#9CA3AF' },
        rarity: { common: '#9CA3AF', uncommon: '#22C55E', rare: '#3B82F6', epic: '#A855F7', legendary: '#D4AF37' }
      },
      fontFamily: {
        medieval: ['Cinzel', 'serif'],
        body: ['Crimson Text', 'Georgia', 'serif'],
      }
    }
  }
};