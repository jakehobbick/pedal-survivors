import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = await b.new_context(viewport={'width':1180,'height':820}, has_touch=True, is_mobile=True, device_scale_factor=2)
        pg = await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(800)
        await pg.tap('#t-ride'); await pg.wait_for_timeout(300); await pg.tap('[data-tpl="free"]'); await pg.wait_for_timeout(300); await pg.tap('#su-go'); await pg.wait_for_timeout(1500)
        g = lambda: pg.evaluate("()=>({dash:__ps.game.world.stats.dashes, gear:__ps.trainer.gear, mode:__ps.trainer.mode, paused:__ps.game.paused, hx:__ps.game.world.player.hx.toFixed(2), hy:__ps.game.world.player.hy.toFixed(2)})")
        print('start', await g())
        await pg.tap('#tb-dash'); await pg.wait_for_timeout(300); print('after dash', await g())
        await pg.tap('#tb-up'); await pg.wait_for_timeout(200); await pg.tap('#tb-up'); await pg.wait_for_timeout(200); print('after 2x gear up', await g())
        # joystick drag on left half: steer up-left
        cdp = await ctx.new_cdp_session(pg)
        async def touch(t, x, y): await cdp.send('Input.dispatchTouchEvent', {'type': t, 'touchPoints': ([{'x': x, 'y': y}] if t!='touchEnd' else [])})
        await touch('touchStart', 300, 500)
        for k in range(1,8): await touch('touchMove', 300-k*8, 500-k*8); await pg.wait_for_timeout(30)
        await pg.wait_for_timeout(400); print('steering up-left', await g()); await touch('touchEnd', 0, 0)
        await pg.tap('#tb-pause'); await pg.wait_for_timeout(300); print('after pause', await g())
        await pg.tap('#pa-res'); await pg.wait_for_timeout(300); print('after resume', await g())
        print('errors', errs); await b.close()
asyncio.run(main())
