"""Balance probe: python3 scripts/bal.py <char> <tpl> <min> <arena> <ts> -> falls, boss timing, level"""
import sys, asyncio, json
from playwright.async_api import async_playwright
async def main():
    ch, tpl, mins, arena, ts = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4], float(sys.argv[5])
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'])
        pg = await b.new_page(viewport={'width':1180,'height':820})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(800)
        await pg.evaluate("()=>{ const u=JSON.parse('" + (sys.argv[6] if len(sys.argv)>6 else '{}') + "'); Object.assign(__ps.save.upgrades,u); }")
        await pg.evaluate(f"()=>{{ __ps.autoTest=true; __ps.sim.bot=true; __ps.startRun({{char:'{ch}',arena:'{arena}',tpl:'{tpl}',min:{mins}}}); __ps.closeAll(); __ps.dbg.timeScale={ts}; }}")
        ph=None; marks=[]
        while True:
            await pg.wait_for_timeout(1000)
            st = await pg.evaluate("()=>({s:__ps.game.state,t:Math.round(__ps.game.wk.elapsed),b:__ps.game.boss.phase,lv:__ps.game.world.player.level,f:__ps.game.world.stats.falls,k:__ps.game.world.stats.kills,fps:Math.round(__ps.dbg.fps),by:__ps.game.world.stats.dmgBy.map(Math.round),bh:__ps.game.world.boss?Math.round(__ps.game.world.boss.hp)+'/'+Math.round(__ps.game.world.boss.maxHp)+' dist '+Math.round(Math.hypot(__ps.game.world.boss.x-__ps.game.world.player.x,__ps.game.world.boss.y-__ps.game.world.player.y)):''})")
            if st['b']!=ph: marks.append((st['b'],st['t'])); ph=st['b']
            if st['b']=='fight' and st['t']%15==0: print('  fight', st['t'], st['bh'])
            if st['s']!='run': break
            last=st
        print(ch,tpl,mins,arena,'falls',last['f'],'lv',last['lv'],'kills',last['k'],'boss',marks,'dmgBy(contact,proj,zone,blast)',last['by'],'bossHP',last['bh'],'err',errs[:3])
        await b.close()
asyncio.run(main())
