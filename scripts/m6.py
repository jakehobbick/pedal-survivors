"""Full-run + meta screens test: python3 scripts/m6.py <tpl> <min> <ts>"""
import sys, asyncio, json
from playwright.async_api import async_playwright
async def main():
    tpl, mins, ts = sys.argv[1], int(sys.argv[2]), float(sys.argv[3])
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'])
        pg = await b.new_page(viewport={'width':1180,'height':820})
        logs=[]; pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type=='error' else None)
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(800)
        await pg.evaluate(f"()=>{{ __ps.autoTest=true; __ps.sim.bot=true; __ps.startRun({{char:'mira',arena:'sakura',tpl:'{tpl}',min:{mins}}}); __ps.closeAll(); __ps.dbg.timeScale={ts}; }}")
        for i in range(400):
            await pg.wait_for_timeout(2000)
            st = await pg.evaluate("()=>({s:__ps.game.state,t:Math.round(__ps.game.wk.elapsed),b:__ps.game.boss.phase,lv:__ps.game.world.player.level})")
            if i%10==0: print(st)
            if st['s']!='run': break
        await pg.wait_for_timeout(1000)
        await pg.screenshot(path='scripts/out/m6_post.png', full_page=True)
        print(await pg.evaluate("()=>JSON.stringify({gold:__ps.save.gold, ach:Object.keys(__ps.save.ach), life:__ps.save.life, hist:__ps.save.history.map(h=>h.title)})"))
        for btn,name in [('#pr-ok',None),('#t-meta','meta'),('#m-done',None),('#t-ach','ach'),('#a-done',None),('#t-stats','stats'),('#st-done',None)]:
            await pg.click(btn); await pg.wait_for_timeout(500)
            if name: await pg.screenshot(path=f'scripts/out/m6_{name}.png')
        for l in logs[-20:]: print(l)
        await b.close()
asyncio.run(main())
