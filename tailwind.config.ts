import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        wdc: {
          gold:              '#ECBB56',
          'gold-soft':       '#F5DC9A',
          cream:             '#F5E9C8',
          'cream-soft':      '#FAF3DF',
          purple:            '#B295D9',
          'cta-purple':      '#7C5CA8',
          'cta-purple-press':'#6B4D9C',
          charcoal:          '#3D3D3D',
          'body-text':       '#4B494A',
          paper:             '#FBF7F6',
        },
        status: {
          available:   '#4A7A5A',
          limited:     '#C98A2B',
          full:        '#C24040',
          unavailable: '#9A9A9A',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'cursive'],
        label:   ['var(--font-label)',   'sans-serif'],
        body:    ['var(--font-body)',     'sans-serif'],
      },
      boxShadow: {
        'card':      '0 2px 10px rgba(0,0,0,0.06)',
        'cta':       '0 3px 10px rgba(124,92,168,0.35)',
        'cta-hover': '0 6px 16px rgba(124,92,168,0.45)',
        'hero':      '0 4px 20px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        'pill': '50px',
      },
    },
  },
  plugins: [],
}
export default config
