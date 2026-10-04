import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { parseProject, serializeProject } from '../src/lib/projectFiles.js';
import { parseSceneParam, serializeScene } from '../src/lib/sceneUrl.js';
import { normalizeObject } from '../src/lib/objectCatalog.js';
import { DRAFT_STORAGE_KEY } from '../src/lib/draftStorage.js';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:4174/interior3d/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const evidence = process.env.EVIDENCE_DIR;
if (evidence) await mkdir(evidence, { recursive: true });
const project = {
  unitSystem: 'ft',
  objects: [
    normalizeObject({ type: 'door', position: [2, 0, -3], rotation: [0, 1.2, 0], isOpen: true, swing: 'right' }),
    normalizeObject({ type: 'pendantLamp', position: [0.25, 2.3, 1.5] }),
  ],
};
const empty = { unitSystem: 'cm', objects: [] };
const file = (scene) => ({ name: 'my-room.json', mimeType: 'application/json', buffer: Buffer.from(serializeProject(scene)) });
const sceneInUrl = (page) => parseSceneParam(new URL(page.url()).searchParams.get('scene'));
const openProject = async (page) => {
  await page.getByRole('button', { name: /^프로젝트/ }).click();
  await page.getByRole('dialog', { name: '프로젝트', exact: true }).waitFor();
  return page.getByRole('dialog', { name: '프로젝트', exact: true });
};
const importProject = async (page, scene) => {
  const dialog = await openProject(page);
  await dialog.getByLabel('JSON 파일 열기', { exact: true }).setInputFiles(file(scene));
  await dialog.getByRole('button', { name: '이 프로젝트로 교체', exact: true }).click();
  await dialog.waitFor({ state: 'detached' });
};
const waitForDraft = async (page, count, unit) => page.waitForFunction(({ key, count, unit }) => {
  const draft = JSON.parse(localStorage.getItem(key));
  if (!draft) return false;
  const scene = JSON.parse(draft.project);
  return scene.objects.length === count && scene.unitSystem === unit;
}, { key: DRAFT_STORAGE_KEY, count, unit });

try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'ko-KR', acceptDownloads: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(base);
    await page.getByRole('button', { name: /^프로젝트/ }).waitFor();
    const original = sceneInUrl(page);
    assert.ok(original.objects.length > 0);
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), DRAFT_STORAGE_KEY), null);

    // Real download payload, including a future importable schema.
    let dialog = await openProject(page);
    const downloadEvent = page.waitForEvent('download');
    await dialog.getByRole('button', { name: 'JSON 내려받기', exact: true }).click();
    const download = await downloadEvent;
    const downloaded = parseProject(await readFile(await download.path(), 'utf8'));
    assert.equal(downloaded.objects.length, original.objects.length);
    assert.equal(downloaded.unitSystem, original.unitSystem);
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    assert.match(await page.evaluate(() => document.activeElement.textContent), /^프로젝트/);

    // File preview is non-destructive, then one undo/redo restores scene + units.
    dialog = await openProject(page);
    await dialog.getByLabel('JSON 파일 열기', { exact: true }).setInputFiles(file(project));
    await dialog.getByText('my-room.json', { exact: true }).waitFor();
    assert.deepEqual(sceneInUrl(page), original);
    await page.keyboard.press('Delete');
    assert.deepEqual(sceneInUrl(page), original);
    await dialog.getByRole('button', { name: '이 프로젝트로 교체', exact: true }).click();
    await dialog.waitFor({ state: 'detached' });
    assert.deepEqual(sceneInUrl(page), project);
    await page.getByRole('button', { name: '되돌리기', exact: true }).click();
    assert.deepEqual(sceneInUrl(page), original);
    await page.getByRole('button', { name: '다시 실행', exact: true }).click();
    assert.deepEqual(sceneInUrl(page), project);
    await waitForDraft(page, 2, 'ft');

    dialog = await openProject(page);
    await dialog.getByLabel('JSON 파일 열기', { exact: true }).setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"objects":[]}') });
    await dialog.getByRole('alert').waitFor();
    assert.equal(await dialog.getByRole('button', { name: '이 프로젝트로 교체', exact: true }).count(), 0);
    assert.deepEqual(sceneInUrl(page), project);
    if (evidence) await page.screenshot({ path: join(evidence, `project-${width}.png`) });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });

    // A bare entry restores the draft. Opening an empty shared link preserves it.
    await page.goto(base);
    await page.getByRole('button', { name: /^프로젝트/ }).waitFor();
    assert.deepEqual(sceneInUrl(page), project);
    const oldDraft = await page.evaluate((key) => localStorage.getItem(key), DRAFT_STORAGE_KEY);
    await page.goto(`${base}?scene=${serializeScene(empty)}`);
    await page.getByRole('button', { name: /^프로젝트/ }).waitFor();
    assert.deepEqual(sceneInUrl(page), empty);
    await page.waitForTimeout(650);
    assert.equal(await page.evaluate((key) => localStorage.getItem(key), DRAFT_STORAGE_KEY), oldDraft);
    dialog = await openProject(page);
    await dialog.getByRole('button', { name: '자동 저장본 복구', exact: true }).click();
    await dialog.waitFor({ state: 'detached' });
    assert.deepEqual(sceneInUrl(page), project);

    // Explicit empty files survive a quick navigation via the pagehide flush.
    await importProject(page, empty);
    await page.goto(base);
    await page.getByRole('button', { name: /^프로젝트/ }).waitFor();
    assert.deepEqual(sceneInUrl(page), empty);
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: download, preview, import, undo/redo units, invalid file, modal shortcuts, draft reload, shared priority, empty/pagehide recovery`);
    await context.close();
  }

  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, locale: 'ko-KR', acceptDownloads: true });
  await context.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Storage full', 'QuotaExceededError'); };
  });
  const page = await context.newPage();
  await page.goto(base);
  await importProject(page, project);
  await page.getByRole('button', { name: '프로젝트 !', exact: true }).waitFor();
  const dialog = await openProject(page);
  await dialog.getByText(/브라우저 저장 공간을 쓸 수 없거나 가득 찼습니다/).waitFor();
  const downloadEvent = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'JSON 내려받기', exact: true }).click();
  const download = await downloadEvent;
  assert.deepEqual(parseProject(await readFile(await download.path(), 'utf8')), project);
  console.log('PASS blocked storage: visible failure and working file backup');
  await context.close();
} finally {
  await browser.close();
}
