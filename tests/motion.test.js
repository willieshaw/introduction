// Motion tests for the scattered-letter animation.
// Run with `npm test`. Opens the installed Google Chrome through Playwright, in a real
// window, because frame timing is what's under test. The window goes on the slowest
// connected screen: the old CSS-transition animation only stuttered at 60Hz.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png' };

let server, browser, baseURL;

// Top-left corner of the macOS screen with the lowest refresh rate, as Chrome's --window-position.
function slowestScreenPosition() {
  try {
    const script = `ObjC.import("AppKit"); const s = $.NSScreen.screens, out = [];
      for (let i = 0; i < s.count; i++) { const f = s.objectAtIndex(i).frame;
        out.push([s.objectAtIndex(i).maximumFramesPerSecond, f.origin.x, f.origin.y, f.size.height]); }
      JSON.stringify(out)`;
    const screens = JSON.parse(execFileSync('osascript', ['-l', 'JavaScript', '-e', script], { encoding: 'utf8' }));
    const primaryHeight = screens[0][3];
    const [, x, y, h] = screens.sort((a, b) => a[0] - b[0])[0];
    return `${x + 40},${primaryHeight - (y + h) + 40}`;
  } catch {
    return null;
  }
}

before(async () => {
  server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, resolve));
  baseURL = `http://localhost:${server.address().port}/`;
  const position = slowestScreenPosition();
  browser = await chromium.launch({ channel: 'chrome', headless: false, args: position ? [`--window-position=${position}`] : [] });
});

after(async () => {
  await browser?.close();
  server?.close();
});

async function openDesktop() {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await page.goto(baseURL);
  await page.waitForFunction(() => document.getElementById('clickable-circle').style.left !== '');
  await page.waitForTimeout(300);
  return page;
}

// Fraction of animation frames in which a letter did not move while input was changing steadily.
function stallStats(samples) {
  const moves = samples.slice(1).map((s, i) => Math.hypot(s.x - samples[i].x, s.y - samples[i].y));
  const core = moves.slice(5, -5);
  return { stalls: core.filter(d => d < 0.05).length, frames: core.length };
}

test('letters move on every frame while the mouse moves', async () => {
  const page = await openDesktop();
  const samples = await page.evaluate(() => new Promise(resolve => {
    const span = document.querySelector('#how span:nth-child(5)');
    const t0 = performance.now(), DURATION = 1500, samples = [];
    // A real mouse reports about 125 times a second, faster than the screen refreshes.
    const timer = setInterval(() => {
      const t = (performance.now() - t0) / DURATION;
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 150 + 600 * t, clientY: 120 + 300 * t }));
    }, 8);
    (function frame(now) {
      const r = span.getBoundingClientRect();
      samples.push({ x: r.left, y: r.top });
      if (now - t0 < DURATION) requestAnimationFrame(frame);
      else { clearInterval(timer); resolve(samples); }
    })(performance.now());
  }));
  await page.close();
  const { stalls, frames } = stallStats(samples);
  assert.ok(frames > 60, `expected a full sweep of frames, got ${frames}`);
  assert.ok(stalls <= 2, `letter stood still in ${stalls} of ${frames} frames`);
});

test('letters glide to a stop after the mouse stops', async () => {
  const page = await openDesktop();
  const travel = await page.evaluate(() => new Promise(resolve => {
    const span = document.querySelector('#how span:nth-child(5)');
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
    setTimeout(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 900, clientY: 600 }));
      const start = span.getBoundingClientRect();
      setTimeout(() => {
        const mid = span.getBoundingClientRect();
        setTimeout(() => {
          const end = span.getBoundingClientRect();
          resolve({
            firstFrames: Math.hypot(mid.left - start.left, mid.top - start.top),
            total: Math.hypot(end.left - start.left, end.top - start.top),
          });
        }, 1500);
      }, 50);
    }, 1500);
  }));
  await page.close();
  assert.ok(travel.total > 50, `letter should travel to its new spot, moved ${travel.total.toFixed(1)}px`);
  assert.ok(travel.firstFrames < travel.total * 0.9, 'letter should ease toward its new spot, not jump there');
});

test('letters assemble the text exactly when the cursor reaches the target', async () => {
  const page = await openDesktop();
  const offsets = await page.evaluate(() => new Promise(resolve => {
    const c = document.getElementById('clickable-circle').getBoundingClientRect();
    const cx = c.left + c.width / 2, cy = c.top + c.height / 2;
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: cx + 200, clientY: cy + 150 }));
    setTimeout(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: cx, clientY: cy }));
      setTimeout(() => {
        const spans = [...document.querySelectorAll('.text-container span')];
        resolve(Math.max(...spans.map(s => Math.max(Math.abs(parseFloat(getComputedStyle(s).top)), Math.abs(parseFloat(getComputedStyle(s).left))))));
      }, 2000);
    }, 500);
  }));
  await page.close();
  assert.ok(offsets < 0.5, `letters should settle at their typeset spots, worst offset ${offsets}px`);
});

test('letters still follow the mouse if it moved before the target finished loading', async () => {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  let releaseSvg;
  const svgHeld = new Promise(resolve => { releaseSvg = resolve; });
  await page.route('**/senarium.svg', async route => { await svgHeld; await route.continue(); });
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.dispatchEvent(new MouseEvent('mousemove', { clientX: 300, clientY: 300 })));
  releaseSvg();
  await page.waitForFunction(() => document.getElementById('clickable-circle').style.left !== '');
  const moved = await page.evaluate(() => new Promise(resolve => {
    const span = document.querySelector('#how span:nth-child(5)');
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 100 }));
    setTimeout(() => {
      const a = span.getBoundingClientRect();
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 900, clientY: 600 }));
      setTimeout(() => {
        const b = span.getBoundingClientRect();
        resolve(Math.hypot(b.left - a.left, b.top - a.top));
      }, 1000);
    }, 1000);
  }));
  await page.close();
  assert.ok(moved > 50, `letter should follow the mouse, moved ${moved.toFixed(1)}px`);
});

test('letters move on every frame while the slider is dragged on a phone', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto(baseURL);
  await page.waitForTimeout(300);
  const samples = await page.evaluate(() => new Promise(resolve => {
    const slider = document.getElementById('slider');
    const span = document.querySelector('#how span:nth-child(5)');
    const start = Number(slider.value), t0 = performance.now(), DURATION = 1500, samples = [];
    const timer = setInterval(() => {
      const t = (performance.now() - t0) / DURATION;
      slider.value = Math.round(start + (t < 0.5 ? -1 : 1) * 300 * Math.min(t, 1 - t) * 2);
      slider.dispatchEvent(new Event('input'));
    }, 8);
    (function frame(now) {
      const r = span.getBoundingClientRect();
      samples.push({ x: r.left, y: r.top });
      if (now - t0 < DURATION * 0.45) requestAnimationFrame(frame);
      else { clearInterval(timer); resolve(samples); }
    })(performance.now());
  }));
  await context.close();
  const { stalls, frames } = stallStats(samples);
  assert.ok(frames > 30, `expected a full drag of frames, got ${frames}`);
  assert.ok(stalls <= 2, `letter stood still in ${stalls} of ${frames} frames`);
});
