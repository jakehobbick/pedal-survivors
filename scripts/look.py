"""python3 scripts/look.py <char> <tpl> <min> <arena> <ts> <tag> : screenshots mid-run + boss fight; checks audio"""
import sys, asyncio, json
from playwright.async_api import async_playwright
async def main():
    ch, tpl, mins, arena, ts, tag = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4], float(sys.argv[5]), sys.argv[6]
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width':1180,'height':820})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(800)
        await pg.evaluate("()=>{ Object.assign(__ps.save.upgrades,{maxhp:3,armor:2,regen:2,might:3,area:1}); }")
        await pg.evaluate(f"()=>{{ __ps.autoTest=true; __ps.sim.bot=true; __ps.startRun({{char:'{ch}',arena:'{arena}',tpl:'{tpl}',min:{mins}}}); __ps.closeAll(); __ps.dbg.timeScale={ts}; }}")
        shot=0; fight=False
        while True:
            await pg.wait_for_timeout(1000)
            st = await pg.evaluate("()=>({s:__ps.game.state,t:Math.round(__ps.game.wk.elapsed),tot:__ps.game.wk.total,b:__ps.game.boss.phase,ac:(window.__ac_state||'')})")
            if st['s']!='run': break
            if shot==0 and st['t']>st['tot']*0.45:
                await pg.evaluate("()=>{__ps.dbg.timeScale=1}"); await pg.wait_for_timeout(1500); await pg.screenshot(path=f'scripts/out/look_{tag}_mid.png'); await pg.evaluate(f"()=>{{__ps.dbg.timeScale={ts}}}"); shot=1
            if not fight and st['b']=='fight':
                await pg.evaluate("()=>{__ps.dbg.timeScale=1}"); await pg.wait_for_timeout(2500); await pg.screenshot(path=f'scripts/out/look_{tag}_boss.png'); await pg.evaluate(f"()=>{{__ps.dbg.timeScale={ts}}}"); fight=True
            if not fight and st['b']=='sprint':
                await pg.evaluate("()=>{__ps.dbg.timeScale=1}"); await pg.wait_for_timeout(2000); await pg.screenshot(path=f'scripts/out/look_{tag}_sprint.png'); await pg.evaluate(f"()=>{{__ps.dbg.timeScale={ts}}}")
        await pg.wait_for_timeout(800); await pg.screenshot(path=f'scripts/out/look_{tag}_post.png')
        print(tag, 'final', st, 'errors', errs[:5]); await b.close()
asyncio.run(main())
