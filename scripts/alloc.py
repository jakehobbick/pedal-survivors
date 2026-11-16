import asyncio, json, sys
from playwright.async_api import async_playwright
async def main():
    mode = sys.argv[1] if len(sys.argv)>1 else 'stress'
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'])
        pg = await b.new_page(viewport={'width':1180,'height':820})
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(800)
        if mode=='stress':
            await pg.evaluate("()=>{ __ps.autoTest=true; __ps.sim.bot=true; __ps.startRun({char:'kai',arena:'neon',tpl:'free',min:60,stress:true}); __ps.closeAll(); }")
        else:
            await pg.evaluate("()=>{ __ps.autoTest=true; __ps.sim.bot=true; Object.assign(__ps.save.upgrades,{maxhp:3,armor:2}); __ps.startRun({char:'ren',arena:'sakura',tpl:'vo2',min:30}); __ps.closeAll(); __ps.dbg.timeScale=8; }")
            await pg.wait_for_timeout(60000); await pg.evaluate("()=>{__ps.dbg.timeScale=1; __ps.settings.autoPick=8;}")
        await pg.wait_for_timeout(3000)
        cdp = await pg.context.new_cdp_session(pg)
        await cdp.send('HeapProfiler.enable')
        await cdp.send('HeapProfiler.startSampling', {'samplingInterval': 256, 'includeObjectsCollectedByMinorGC': True, 'includeObjectsCollectedByMajorGC': True})
        await pg.wait_for_timeout(8000)
        prof = (await cdp.send('HeapProfiler.stopSampling'))['profile']
        agg = {}
        def walk(n, stack):
            cf = n['callFrame']; name = f"{cf['functionName'] or '(anon)'} {cf['url'].split('/')[-1]}:{cf['lineNumber']}:{cf['columnNumber']}"
            st = stack + [name]
            if n['selfSize']:
                key = ' < '.join(reversed(st[-3:]))
                agg[key] = agg.get(key, 0) + n['selfSize']
            for c in n.get('children', []): walk(c, st)
        walk(prof['head'], [])
        tot = sum(agg.values())
        print('total KB', tot//1024)
        for k,v in sorted(agg.items(), key=lambda x:-x[1])[:25]: print(f'{v//1024:6d}KB  {k}')
        await b.close()
asyncio.run(main())
