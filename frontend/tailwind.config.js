/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12141A',      // app background
        surface: '#1B1F27',  // cards / panels
        line: '#2A2F3A',     // borders
        paper: '#ECEEF2',    // light text on dark bg
        muted: '#8B93A7',    // secondary text
        accent: '#6C7BFF',   // primary actions
        sent: '#3ED598',     // sent status
        pending: '#F2B84B',  // queued/sending status
        failed: '#FF6B5E',   // failed status
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
