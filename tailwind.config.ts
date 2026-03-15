import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        calm: {
          50: '#f5fbff',
          100: '#eaf7ff',
          200: '#c8e9ff',
          300: '#a0d7ff',
          400: '#65b9ff',
          500: '#3b9cff',
          600: '#247bcf',
          700: '#1a5ea0',
          800: '#164b7c',
          900: '#123b60'
        },
        sage: {
          50: '#f7fbf6',
          100: '#eef7ee',
          200: '#d6ebd6',
          300: '#b0d7b0',
          400: '#7bbf80',
          500: '#57a75f',
          600: '#3e8b48',
          700: '#2f6b36',
          800: '#25542d',
          900: '#1f4426'
        }
      }
    }
  },
  plugins: [],
};

export default config;
