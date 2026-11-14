"""Automated bot play-test: python3 scripts/play.py <tpl> <min> <arena> <char> <timescale> <seconds> [shots...]"""
import sys, asyncio, json
from playwright.async_api import async_playwright
async def main():
    tpl, mins, arena, char, ts, secs = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4], float(sys.argv[5]), int(sys.argv[6])
    shots = int(sys.argv[7]) if len(sys.argv) > 7 else 4
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'])
        pg = await b.new_page(viewport={'width':1180,'height':820})
        logs=[]
        pg.on('console', lambda m: logs.append(f'[{m.type}] {m.text}') if m.type in ('error','warning') else None)
        pg.on('pageerror', lambda e: logs.append(f'[pageerror] {e}'))
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(800)
        await pg.evaluate(f"""()=>{{ __ps.autoTest=true; __ps.sim.bot=true; __ps.startRun({{char:'{char}',arena:'{arena}',tpl:'{tpl}',min:{mins}}}); __ps.closeAll(); __ps.dbg.timeScale={ts}; __ps.settings.debug=true; }}""")
        per = secs // shots
        for i in range(shots):
            await pg.wait_for_timeout(per*1000)
            st = await pg.evaluate("""()=>{const g=__ps.game,w=g.world,P=w.player;return {state:g.state,t:Math.round(g.wk?g.wk.elapsed:0),step:g.wk&&g.wk.step.label,lvl:P.level,hp:Math.round(P.hp),kills:w.stats.kills,en:w.enemies.n,pr:w.projs.n,weap:P.weapons.map(x=>x.def.id+x.lv).join(','),pas:P.passives.map(x=>x.id+x.lv).join(','),falls:w.stats.falls,boss:g.boss.phase,surge:g.wk&&g.wk.surge.toFixed(2),comp:g.wk&&g.wk.compliance().toFixed(2),fps:Math.round(__ps.dbg.fps),gold:w.stats.gold}}""")
            print(json.dumps(st))
            await pg.screenshot(path=f'scripts/out/play{i}.png')
        for l in logs[-30:]: print(l)
        await b.close()
asyncio.run(main())
