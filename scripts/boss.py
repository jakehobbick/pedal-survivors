import asyncio, json, sys
from playwright.async_api import async_playwright
arena = sys.argv[1] if len(sys.argv) > 1 else 'sakura'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'])
        pg = await b.new_page(viewport={'width':1180,'height':820})
        logs=[]; pg.on('pageerror', lambda e: logs.append(str(e))); pg.on('console', lambda m: logs.append(m.text) if m.type=='error' else None)
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(600)
        await pg.evaluate(f"()=>{{ __ps.autoTest=true; __ps.sim.bot=true; __ps.startRun({{char:'ren',arena:'{arena}',tpl:'vo2',min:20}}); __ps.closeAll(); __ps.settings.debug=true; }}")
        # give the player a decent build quickly, then jump to the boss
        await pg.evaluate("()=>{ const w=__ps.game.world; w.addXp(2500); }")
        await pg.wait_for_timeout(3000)
        await pg.evaluate("()=>{ const wk=__ps.game.wk; while(wk.step.kind!=='boss') { wk.skip(); wk.update(0.01); } }")
        for i in range(9):
            await pg.wait_for_timeout(3000 if i < 5 else 6000)
            st = await pg.evaluate("""()=>{const g=__ps.game,w=g.world,b=w.boss;return {phase:g.boss.phase,sprintT:+g.boss.sprintT.toFixed(1),shield:b?+b.shield.toFixed(2):null,bhp:b?Math.round(b.hp)+'/'+Math.round(b.maxHp):null,step:g.wk.step.label,state:g.state,p:Math.round(__ps.sensors.pFast),gear:__ps.trainer.gear,mode:__ps.trainer.mode,lvl:w.player.level}}""")
            print(json.dumps(st))
            if i in (1,3,6): await pg.screenshot(path=f'scripts/out/boss{i}.png')
            if i == 5: await pg.evaluate("()=>{__ps.dbg.timeScale=4}")
        for l in logs[-20:]: print('LOG', l)
        await b.close()
asyncio.run(main())
