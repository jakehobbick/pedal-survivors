"""Layout QA on iPad viewports with touch emulation."""
import asyncio, sys
from playwright.async_api import async_playwright
DEV = {'mini_land':(1133,744),'air_land':(1180,820),'pro13_land':(1366,1024),'air_port':(820,1180)}
async def main():
    which = sys.argv[1:] or list(DEV)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'])
        for name in which:
            w,h = DEV[name]
            ctx = await b.new_context(viewport={'width':w,'height':h}, device_scale_factor=2, has_touch=True, is_mobile=True,
                user_agent='Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1 Bluefy')
            pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(1000)
            await pg.screenshot(path=f'scripts/out/ip_{name}_title.png')
            await pg.tap('#t-ride'); await pg.wait_for_timeout(600)
            await pg.screenshot(path=f'scripts/out/ip_{name}_setup.png')
            await pg.tap('#su-go'); await pg.wait_for_timeout(500)
            await pg.evaluate("()=>{ __ps.sim.bot=true; __ps.dbg.timeScale=8; }")
            await pg.wait_for_timeout(9000)
            await pg.evaluate("()=>{ __ps.dbg.timeScale=1; __ps.closeAll(); __ps.game.menuOpen=false; __ps.game.world.pendingLevels=0; }")
            await pg.wait_for_timeout(300)
            await pg.screenshot(path=f'scripts/out/ip_{name}_run.png')
            print(name, errs[:3])
            await ctx.close()
        await b.close()
asyncio.run(main())
