import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0052FF',
          50: '#E6EDFF',
          100: '#CCE0FF',
          200: '#99C0FF',
          300: '#66A0FF',
          400: '#3380FF',
          500: '#0052FF',
          600: '#0042CC',
          700: '#003399',
          800: '#002266',
          900: '#001133',
        },
        celo: {
          DEFAULT: '#35D07F',
          50: '#E8F8EF',
          100: '#D1F1DF',
          200: '#A3E3BF',
          300: '#75D59F',
          400: '#47C77F',
          500: '#35D07F',
          600: '#2AA666',
          700: '#207D4C',
          800: '#155333',
          900: '#0B2A19',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
