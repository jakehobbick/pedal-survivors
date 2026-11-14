"""Headless play-test helper: python3 scripts/shot.py <url> <out.png> [js-to-run ...] [--wait ms]"""
import sys, asyncio
from playwright.async_api import async_playwright
async def main():
    url, out = sys.argv[1], sys.argv[2]
    steps = sys.argv[3:]
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'])
        pg = await b.new_page(viewport={'width':1180,'height':820}, device_scale_factor=1)
        logs=[]
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        await pg.goto(url); await pg.wait_for_timeout(1500)
        for s in steps:
            if s.startswith('wait:'): await pg.wait_for_timeout(int(s[5:])); continue
            if s.startswith('shot:'): await pg.screenshot(path=s[5:]); continue
            if s.startswith('key:'): await pg.keyboard.press(s[4:]); continue
            if s.startswith('down:'): await pg.keyboard.down(s[5:]); continue
            if s.startswith('up:'): await pg.keyboard.up(s[3:]); continue
            r = await pg.evaluate(s)
            if r is not None: print('eval:', str(r)[:3000])
        await pg.screenshot(path=out)
        for l in logs[-40:]: print(l)
        await b.close()
asyncio.run(main())
