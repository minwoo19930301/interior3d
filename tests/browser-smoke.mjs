import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:4174/interior3d/';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const evidence = process.env.EVIDENCE_DIR;
if (evidence) await mkdir(evidence, {recursive:true});
try {
  for (const width of [1440, 390, 820]) {
    const page = await browser.newPage({viewport:{width,height:900},locale:'ko-KR'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.__drawCalls = 0;
      for (const Type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
        if (!Type) continue;
        for (const key of ['drawElements','drawArrays']) {
          const original = Type.prototype[key];
          Type.prototype[key] = function(...args) { window.__drawCalls++; return original.apply(this,args); };
        }
      }
    });
    await page.goto(base);
    await page.evaluate(async () => { window.editorStore = (await import('/interior3d/src/store/useStore.js')).default; });
    if (width <= 960) await page.getByRole('button',{name:'구조',exact:true}).click();
    await page.getByRole('button',{name:/소파/}).click();
    if (width <= 960) await page.getByRole('button',{name:'닫기',exact:true}).click();
    await page.waitForFunction(() => window.__drawCalls > 0);
    assert.equal(await page.evaluate(()=>window.editorStore.getState().objects.length), 1);
    await page.getByRole('button',{name:'되돌리기',exact:true}).click();
    assert.equal(await page.evaluate(()=>window.editorStore.getState().objects.length), 0);
    await page.getByRole('button',{name:'다시 실행',exact:true}).click();
    assert.equal(await page.evaluate(()=>window.editorStore.getState().objects.length), 1);
    // Modal shortcuts must not delete the underlying selected furniture.
    await page.getByRole('button', {name: width <= 960 ? '집 템플릿' : /집 템플릿/, exact:width<=960}).click();
    const dialog = page.getByRole('dialog');
    await dialog.waitFor();
    await page.keyboard.press('Delete');
    assert.equal(await page.evaluate(()=>window.editorStore.getState().objects.length), 1);
    await dialog.locator('input').first().focus();
    await page.keyboard.press('Escape');
    await dialog.waitFor({state:'detached'});
    // Orbit changes redraw, then the static scene stops consuming GPU frames.
    const canvas = await page.locator('canvas').boundingBox();
    const draws = await page.evaluate(()=>window.__drawCalls);
    await page.mouse.move(canvas.x+canvas.width/2, 600);
    await page.mouse.down();
    await page.mouse.move(canvas.x+canvas.width/2+50, 640, {steps:8});
    await page.mouse.up();
    await page.waitForFunction(previous=>window.__drawCalls>previous,draws);
    await page.waitForFunction(() => {
      const sample = window.__idleSample;
      const unchanged = sample?.draws === window.__drawCalls;
      window.__idleSample = {draws:window.__drawCalls, stable:unchanged ? sample.stable + 1 : 0};
      return window.__idleSample.stable >= 3;
    }, null, {polling:200,timeout:15000});
    const idleDraws = await page.evaluate(()=>window.__drawCalls);
    await page.waitForTimeout(400);
    assert.equal(await page.evaluate(()=>window.__drawCalls),idleDraws,'idle scene must stop drawing');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
    if(evidence) await page.screenshot({path:join(evidence,`interior-${width}.png`)});
    assert.deepEqual(errors,[]);
    console.log(`PASS ${width}px: add, undo/redo, modal isolation, Escape, orbit, idle draw, viewport`);
    if(width===1440) {
      for(const template of ['59A','84A','84B']) {
        await page.getByRole('button',{name:/집 템플릿/}).click();
        await page.getByRole('dialog').getByRole('button',{name:new RegExp(template)}).click();
        await page.getByRole('button',{name:'집 만들기',exact:true}).click();
        const count = await page.evaluate(()=>window.editorStore.getState().objects.length);
        assert.ok(count>=20);
        assert.equal(await page.evaluate(()=>window.editorStore.getState().objects.filter(o=>o.type==='wall').every(o=>Math.min(o.dimensions[0],o.dimensions[2])===0.08)),true);
        await page.waitForTimeout(350);
        const share = page.url();
        assert.ok(new URL(share).searchParams.get('scene'));
        if(evidence) await page.screenshot({path:join(evidence,`interior-${template}.png`)});
        await page.goto(share);
        await page.evaluate(async()=>{window.editorStore=(await import('/interior3d/src/store/useStore.js')).default});
        assert.equal(await page.evaluate(()=>window.editorStore.getState().objects.length),count);
        assert.deepEqual(errors,[]);
        console.log(`PASS ${template}: ${count} objects, share/reload`);
      }
    }
    await page.close();
  }
} finally { await browser.close(); }
