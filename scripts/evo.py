import asyncio, json
from playwright.async_api import async_playwright
PAIRS=[('darts','cadence'),('shuriken','aero'),('whip','lube'),('cannon','co2'),('bell','chamois'),('bidon','electro'),('drone','pm'),('lightning','rims'),('boomer','socks'),('laser','gel'),('trail','sealant')]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'])
        pg = await b.new_page(viewport={'width':1180,'height':820})
        logs=[]; pg.on('pageerror', lambda e: logs.append(str(e)))
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(600)
        await pg.evaluate("()=>{ __ps.autoTest=true; __ps.sim.bot=true; __ps.startRun({char:'kai',arena:'neon',tpl:'free',min:30}); __ps.closeAll(); __ps.game.world.player.invuln=1e9; __ps.game.director.spawnScale=3; }")
        await pg.wait_for_timeout(1500)
        await pg.evaluate("()=>{__ps.game.world.t=600}")
        for i,(w,ps) in enumerate(PAIRS):
            await pg.evaluate(f"()=>{{ __ps.loadout([['{w}',6]],[['{ps}',1]]); __ps.chest(1); }}")
            await pg.wait_for_timeout(2600)
            r = await pg.evaluate("()=>{const P=__ps.game.world.player; return P.weapons.map(x=>x.def.id+':'+Math.round(x.dmgDone)).join(',')}")
            print(w, '->', r)
            await pg.screenshot(path=f'scripts/out/evo_{w}.png')
        for l in logs: print('ERR', l)
        await b.close()
asyncio.run(main())
