import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'])
        pg = await b.new_page(viewport={'width':1180,'height':820})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        for q in sys.argv[1:]:
            await pg.goto('http://localhost:4173/?'+q); await pg.wait_for_timeout(1500)
            await pg.screenshot(path=f'scripts/out/gal_{q.replace("&","_")}.png')
        print(errs); await b.close()
asyncio.run(main())
