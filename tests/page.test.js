// Behaviour tests for the rest of the page: text, pause, contact, slider visibility.
// Run with `npm test`.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png' };

let server, browser, baseURL;

before(async () => {
  server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(resolve => server.listen(0, resolve));
  baseURL = `http://localhost:${server.address().port}/`;
  browser = await chromium.launch({ channel: 'chrome' });
});

after(async () => {
  await browser?.close();
  server?.close();
});

async function openDesktop(contextOptions = {}) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 }, ...contextOptions });
  const page = await context.newPage();
  await page.goto(baseURL);
  await page.waitForFunction(() => document.getElementById('clickable-circle').style.left !== '');
  return { context, page };
}

test('each line is spelled out one letter per span', async () => {
  const { context, page } = await openDesktop();
  const lines = await page.evaluate(() => ['who', 'what', 'how', 'contact', 'work', 'vespucci', 'frisenda', 'somewhere'].map(id => {
    const el = document.getElementById(id);
    return { text: el.textContent, spans: el.querySelectorAll('span').length };
  }));
  await context.close();
  const expected = ['Willie Shaw', 'Graphic Design', 'Research, narrative, user experience, visual systems.', 'Contact ⎘', 'Work:', 'Vespucci Group', 'Frisenda Architects', 'Somewhere'];
  assert.deepEqual(lines.map(l => l.text), expected);
  assert.deepEqual(lines.map(l => l.spans), expected.map(t => [...t].length));
});

test('clicking the target pauses the letters and whitens the text, clicking again resumes', async () => {
  const { context, page } = await openDesktop();
  const result = await page.evaluate(() => new Promise(resolve => {
    const circle = document.getElementById('clickable-circle');
    const span = document.querySelector('#how span:nth-child(5)');
    const svg = document.getElementById('target').contentDocument;
    const fills = () => [...svg.documentElement.querySelectorAll('[fill]')].filter(el => el.getAttribute('fill')).map(el => el.style.fill);
    const move = (x, y) => window.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y }));
    move(100, 100);
    setTimeout(() => {
      circle.click();
      const paused = { body: document.body.style.color, link: document.querySelector('a').style.color, fills: fills() };
      const before = span.getBoundingClientRect();
      move(900, 600);
      setTimeout(() => {
        const after = span.getBoundingClientRect();
        circle.click();
        const resumed = { body: document.body.style.color, fills: fills() };
        move(300, 500);
        setTimeout(() => {
          const resumedMove = span.getBoundingClientRect();
          resolve({ paused, resumed,
            movedWhilePaused: Math.hypot(after.left - before.left, after.top - before.top),
            movedAfterResume: Math.hypot(resumedMove.left - after.left, resumedMove.top - after.top) });
        }, 800);
      }, 800);
    }, 1500);  // Let the letters finish easing before pausing
  }));
  await context.close();
  assert.equal(result.paused.body, 'white');
  assert.equal(result.paused.link, 'white');
  assert.ok(result.paused.fills.length > 0 && result.paused.fills.every(f => f === 'white'), `svg fills ${result.paused.fills}`);
  assert.ok(result.movedWhilePaused < 0.5, `letters moved ${result.movedWhilePaused}px while paused`);
  assert.equal(result.resumed.body, 'rgb(208, 208, 208)');
  assert.ok(result.resumed.fills.every(f => f === 'rgb(208, 208, 208)'), `svg fills ${result.resumed.fills}`);
  assert.ok(result.movedAfterResume > 20, `letters moved ${result.movedAfterResume}px after resuming`);
});

test('contact copies the email address and shows a note', async () => {
  const { context, page } = await openDesktop({ permissions: ['clipboard-read', 'clipboard-write'] });
  // Scattered letters can land on top of the link, so click it directly
  await page.locator('#contact-link').dispatchEvent('click');
  const shown = await page.waitForFunction(() => document.getElementById('copy-message').classList.contains('show'), null, { timeout: 1500 })
    .then(() => true, () => false);
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  await context.close();
  assert.equal(copied, 'hello@willieshaw.com');
  assert.ok(shown, 'copy note should show');
});

test('desktop hides the slider and tic mark; touch shows them with the target hidden', async () => {
  const { context, page } = await openDesktop();
  const desktop = await page.evaluate(() => ({
    slider: getComputedStyle(document.getElementById('slider')).display,
    tic: getComputedStyle(document.getElementById('tic-mark')).display,
    target: getComputedStyle(document.getElementById('target')).display,
  }));
  await context.close();
  assert.deepEqual(desktop, { slider: 'none', tic: 'none', target: 'block' });

  const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const touchPage = await touchContext.newPage();
  await touchPage.goto(baseURL);
  const touch = await touchPage.evaluate(() => ({
    slider: getComputedStyle(document.getElementById('slider')).display,
    tic: getComputedStyle(document.getElementById('tic-mark')).display,
    target: getComputedStyle(document.getElementById('target')).display,
    ticLeft: document.getElementById('tic-mark').style.left,
  }));
  await touchContext.close();
  assert.equal(touch.slider, 'inline-block');
  assert.equal(touch.tic, 'block');
  assert.equal(touch.target, 'none');
  assert.match(touch.ticLeft, /^\d+(\.\d+)?px$/);
});
