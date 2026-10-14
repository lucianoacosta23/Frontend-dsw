// Run against ng serve. Uses Playwright and intercepted API fixtures; never mutates the database.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const out = process.env.RESPONSIVE_OUTPUT || path.join(require('node:os').tmpdir(), 'jukeboxd-responsive');
const base = process.env.RESPONSIVE_URL || 'http://127.0.0.1:4300';
const date = '2026-10-01T12:00:00.000Z';
const username = 'usuario_con_nombre_muy_largo';
const user = { id: 1, username, fullName: 'Nombre completo de una persona con varios apellidos', category: 'ADMIN', status: 'ENABLED' };
const artist = { id: 1, name: 'Artista con nombre largo' };
const release = { id: 1, name: 'Un álbum con un título bastante largo', type: 'ALBUM', imageUrl: '/jukeboxd-logo.svg', artists: [artist], releaseDate: '2026-01-01', reviewCount: 12, averageRating: 4 };
const track = { id: 1, name: 'Canción con un título bastante largo', durationMs: 180000, artists: [artist], release, reviewCount: 12, averageRating: 4 };
const review = { id: 1, author: user, text: 'Una reseña detallada. '.repeat(18), rating: 4, reportCount: 10, createdAt: date, updatedAt: date, releaseId: 1, trackId: null, likeCount: 3, likedByMe: false, commentCount: 2, target: release };
const reports = Array.from({ length: 4 }, (_, id) => ({ id: id + 1, reason: 'HARASSMENT', details: 'Motivo detallado '.repeat(20), status: 'PENDING', createdAt: date, reporter: user }));
const profile = { ...user, avatarUrl: null, coverUrl: null, createdAt: date, favoriteReleases: Array.from({ length: 5 }, (_, i) => ({ ...release, id: i + 1 })), favoriteTracks: [track], followersCount: 123456, followingCount: 98765, isFollowing: false, followsMe: false, isOwnProfile: true };
const playlists = Array.from({ length: 4 }, (_, i) => ({ id: i + 1, name: 'Playlist de prueba con nombre largo '.repeat(2), trackCount: 2, saveCount: 3, author: user, isOwnPlaylist: true, savedByMe: false }));
const accounts = ['ENABLED', 'SUSPENDED', 'BANNED'].map((status, i) => ({ ...user, id: i + 2, status, pendingReportCount: 12, criticalReviewCount: 3, suspendedUntil: status === 'SUSPENDED' ? '2027-01-01T00:00:00.000Z' : null }));
function response(data, total = Array.isArray(data) ? data.length : 1) { return { message: 'OK', data, pagination: { page: 1, pageSize: 10, total, totalPages: 2 } }; }
async function main() {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage();
  let guest = false;
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', msg => { if (msg.type() === 'error' && msg.text().includes('ERROR')) errors.push(msg.text()); });
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.port !== '3000') return route.continue();
    const p = url.pathname;
    if (guest && p === '/auth/me') return route.fulfill({ status: 401, json: { message: 'Sin sesión' } });
    let body = response([]);
    if (p === '/auth/me') body = response(user);
    else if (p === '/users/me' || /\/users\/\d+\/profile$/.test(p)) body = response({ ...profile, isOwnProfile: p === '/users/me' });
    else if (p === '/users/search') body = response(user);
    else if (p === '/admin/users') body = response(accounts);
    else if (/\/admin\/users\/\d+\/sanctions$/.test(p)) body = response([{ id: 1, action: 'SUSPEND', reason: 'Motivo administrativo '.repeat(20), createdAt: date, administrator: user, suspendedUntil: '2027-01-01T00:00:00.000Z' }]);
    else if (/\/admin\/users\/\d+\/review-reports$/.test(p)) body = response([{ review, reports }]);
    else if (/\/admin\/users\/\d+$/.test(p)) body = response({ ...accounts[0], removedReviewCount: 3, activeSanction: null });
    else if (p === '/admin/reports/critical' || p === '/admin/reports/minor') body = response([{ ...review, reportCount: p.endsWith('minor') ? 2 : 10 }]);
    else if (p.endsWith('/reviewreport')) body = response(reports);
    else if (p === '/releases/popular' || p === '/releases') body = response([release]);
    else if (p === '/tracks/popular') body = response([{ track, reviewCount: 12 }]);
    else if (p === '/activity') body = { ...response([{ ...review, type: 'REVIEW_CREATED', reviewId: 1, target: { ...release, type: 'release' } }]), scope: 'following' };
    else if (p === '/reviews/stats') body = response({ averageRating: 4, totalReviews: 12, distribution: [] });
    else if (p === '/reviews' || p === '/reviews/popular') body = response([review]);
    else if (/^\/reviews\/\d+$/.test(p)) body = response({ ...review, target: { ...release, kind: 'release' } });
    else if (/^\/playlist\/\d+$/.test(p)) body = response({ ...playlists[0], tracks: [track] });
    else if (p.startsWith('/playlist') || p.endsWith('/playlists')) body = response(playlists);
    await route.fulfill({ json: body, headers: { 'Access-Control-Allow-Origin': base, 'Access-Control-Allow-Credentials': 'true' } });
  });
  async function check(label) {
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      return { width, scroll: document.documentElement.scrollWidth, elements: [...document.querySelectorAll('main *, .navbar *')].filter(el => {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) return false;
        if (el.closest('.rail') || el.closest('details:not([open]) .dropdown')) return false;
        return r.right > width + 1 || r.left < -1;
      }).slice(0, 12).map(el => ({ tag: el.tagName, class: el.className })) };
    });
    assert.ok(overflow.scroll <= overflow.width + 1, `${label}: ${JSON.stringify(overflow)}`);
    console.log(`OK ${label} (${overflow.width}px)`);
  }
  try {
    const widths = process.env.RESPONSIVE_WIDTHS?.split(',').map(Number) || [320, 375, 390, 430, 740, 768, 1024, 1440];
    for (const width of widths) {
      await page.setViewportSize({ width, height: width === 740 ? 360 : width < 500 ? 740 : 900 });
      for (const route of ['/dashboard', '/profile', '/users/other', '/profile/edit', '/admin', '/admin/critical-reviews', '/admin/reports/minor', '/admin/users', '/playlists/new', '/playlists/1', '/activity']) {
        await page.goto(base + route);
        await page.waitForLoadState('networkidle');
        if (route === '/dashboard') {
          await page.locator('.popular-reviews-grid app-review-card').waitFor();
          await page.locator('.playlist-card').first().waitFor();
          await page.locator('.song-row').first().waitFor();
        }
        await check(route);
        if (width === 390) await page.screenshot({ path: path.join(out, route.replaceAll('/', '_') + '.png'), fullPage: true, animations: 'disabled' });
        const menu = page.locator('.user-menu');
        await menu.locator('summary').click();
        await assert.doesNotReject(() => menu.locator('.dropdown').waitFor({ state: 'visible' }));
        await check(route + ' menu');
        const rect = await menu.locator('.dropdown').boundingBox();
        assert.ok(rect.x >= 0 && rect.x + rect.width <= width + 1, 'Dropdown outside viewport');
        await page.locator('main').click({ position: { x: 5, y: 5 } });
        assert.equal(await menu.getAttribute('open'), null, 'Outside click closes menu');
        if (route === '/admin/users') {
          await page.getByRole('button', { name: 'Gestionar', exact: true }).first().click();
          await page.getByRole('button', { name: 'Suspender', exact: true }).click();
          await check('admin sanction form');
          if (width === 390) await page.screenshot({ path: path.join(out, 'admin-form.png'), fullPage: true, animations: 'disabled' });
        }
        if (route === '/admin/critical-reviews' || route === '/admin/reports/minor') {
          await page.locator('.review-preview').first().click();
          await page.locator('mat-dialog-container').waitFor();
          await page.locator('mat-dialog-container .report-list li').first().waitFor();
          await check('reports dialog');
          const dialog = await page.locator('mat-dialog-container').boundingBox();
          assert.ok(dialog.x >= 0 && dialog.x + dialog.width <= width + 1);
          if (width === 390) await page.screenshot({ path: path.join(out, 'reports-dialog.png'), animations: 'disabled' });
          await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
        }
      }
    }
    await page.goto(base + '/admin');
    const menu = page.locator('.user-menu');
    await menu.locator('summary').click();
    await page.keyboard.press('Escape');
    assert.equal(await menu.getAttribute('open'), null);
    await menu.locator('summary').click();
    await page.getByRole('link', { name: 'Mi perfil', exact: true }).click();
    await page.waitForURL('**/profile');
    assert.equal(await page.locator('.user-menu').getAttribute('open'), null);
    guest = true;
    for (const width of [320, 390, 430, 768]) {
      await page.setViewportSize({ width, height: 740 });
      await page.goto(base);
      await page.waitForLoadState('networkidle');
      await check('guest home');
      await page.locator('.guest-menu summary').click();
      await check('guest menu');
      const rect = await page.locator('.guest-menu .dropdown').boundingBox();
      assert.ok(rect.x >= 0 && rect.x + rect.width <= width + 1);
      if (width === 390) await page.screenshot({ path: path.join(out, 'guest-menu.png'), animations: 'disabled' });
      await page.keyboard.press('Escape');
      for (const route of ['/login', '/register']) {
        await page.goto(base + route);
        await page.waitForLoadState('networkidle');
        await check(route);
      }
    }
    assert.deepEqual([...new Set(errors)], [], 'No runtime errors');
    console.log(`Screenshots: ${out}`);
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
