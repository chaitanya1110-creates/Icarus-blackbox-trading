import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const assetsDir = path.join(distDir, 'assets');

if (!fs.existsSync(assetsDir)) {
  console.error('dist/assets directory does not exist. Run vite build first.');
  process.exit(1);
}

const files = fs.readdirSync(assetsDir);
const cssFile = files.find((f) => f.endsWith('.css'));
const jsFile = files.find((f) => f.endsWith('.js'));

if (!cssFile || !jsFile) {
  console.error('Could not find bundled CSS or JS file in dist/assets.');
  process.exit(1);
}

const css = fs.readFileSync(path.join(assetsDir, cssFile), 'utf8');
const js = fs.readFileSync(path.join(assetsDir, jsFile), 'utf8');

// 1. Generate standalone.html in dist
const standaloneHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <title>ICARUS TRADING - Black Box Swing Terminal</title>
    <meta name="description" content="ICARUS TRADING: Minimalist 4H swing trading terminal with algorithmic Black Box trend reversal detection, volume analysis, AI sentiment intelligence, and high-conviction (>90%) order triggers." />
    <meta property="og:title" content="ICARUS TRADING - Black Box Swing Terminal" />
    <meta property="og:description" content="ICARUS TRADING: Minimalist 4H swing trading terminal with algorithmic Black Box trend reversal detection, volume analysis, AI sentiment intelligence, and high-conviction (>90%) order triggers." />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="theme-color" content="#090a0f" />
    <style>
${css}
    </style>
  </head>
  <body class="antialiased selection:bg-emerald-500/30 selection:text-emerald-400 bg-[#090a0f] text-slate-100">
    <div id="root"></div>
    <script type="module">
${js}
    </script>
  </body>
</html>`;

fs.writeFileSync(path.join(distDir, 'standalone.html'), standaloneHtml);
console.log('Successfully generated dist/standalone.html (Size:', Math.round(standaloneHtml.length / 1024), 'KB)');

// 2. Also update index.html with universal support (works on GitHub Pages AND in Vite dev)
const universalHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
    <title>ICARUS TRADING - Black Box Swing Terminal</title>
    <meta name="description" content="ICARUS TRADING: Minimalist 4H swing trading terminal with algorithmic Black Box trend reversal detection, volume analysis, AI sentiment intelligence, and high-conviction (>90%) order triggers." />
    <meta property="og:title" content="ICARUS TRADING - Black Box Swing Terminal" />
    <meta property="og:description" content="ICARUS TRADING: Minimalist 4H swing trading terminal with algorithmic Black Box trend reversal detection, volume analysis, AI sentiment intelligence, and high-conviction (>90%) order triggers." />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="theme-color" content="#090a0f" />
    <style>
${css}
    </style>
  </head>
  <body class="antialiased selection:bg-emerald-500/30 selection:text-emerald-400 bg-[#090a0f] text-slate-100">
    <div id="root"></div>
    <!-- Vite entry for dev and build environments -->
    <script type="module" src="/src/main.tsx"></script>
    <!-- Standalone fallback for GitHub Pages when /src/main.tsx is not served -->
    <script type="module">
      setTimeout(() => {
        if (!window.__ICARUS_LOADED__) {
          console.log('[Icarus Trading] Activating standalone client bundle for GitHub Pages...');
          const s = document.createElement('script');
          s.type = 'module';
          s.textContent = ${JSON.stringify(js)};
          document.body.appendChild(s);
        }
      }, 120);
    </script>
  </body>
</html>`;

fs.writeFileSync(path.resolve('index.html'), universalHtml);
console.log('Successfully updated root index.html with standalone GitHub Pages fallback (Size:', Math.round(universalHtml.length / 1024), 'KB)');
