const { chromium, devices } = require('playwright');

async function open(url, phone) {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext(phone ? { ...devices['iPhone 13'], browserName: undefined, defaultBrowserType: undefined } : { viewport: { width: 1366, height: 860 } });
  const p = await ctx.newPage();
  await p.route(/aframe.*\.js$/, (r) => r.fulfill({ path: 'process.env.AFRAME_JS || 'aframe-master.min.js'', contentType: 'application/javascript' }));
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.request().url().includes('aframe') ? r.fallback() : r.abort());
  p.on('pageerror', (e) => console.log('PAGEERR', e.message));
  await p.goto(url); return { b, p };
}
module.exports = { open };
