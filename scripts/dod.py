"""Definition-of-done run: Kai, Sweet Spot 30 min, then validate TCX vs Garmin XSD + capture post-run + share card."""
import sys, asyncio, json, base64
from playwright.async_api import async_playwright
from lxml import etree
async def main():
    ts = float(sys.argv[1]) if len(sys.argv)>1 else 16
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--autoplay-policy=no-user-gesture-required'])
        pg = await b.new_page(viewport={'width':1180,'height':820}, device_scale_factor=1)
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' else None)
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(800)
        await pg.evaluate(f"()=>{{ __ps.autoTest=true; __ps.sim.bot=true; __ps.startRun({{char:'kai',arena:'sakura',tpl:'sweetspot',min:30}}); __ps.closeAll(); __ps.dbg.timeScale={ts}; window.__bt=[]; }}")
        ergs=[]; last=None
        while True:
            await pg.wait_for_timeout(500)
            st = await pg.evaluate("()=>({s:__ps.game.state,i:__ps.game.wk.idx,lbl:__ps.game.wk.step.label,mode:__ps.trainer.mode,erg:Math.round(__ps.trainer.ergFrac*__ps.settings.ftp),g:__ps.trainer.gear,b:__ps.game.boss.phase})")
            key=(st['lbl'],st['mode'],st['b'])
            if key!=last: ergs.append(f"{st['lbl']:<22} {st['mode']:<4} {st['erg'] if st['mode']=='erg' else 'gear '+str(st['g'])} boss={st['b']}"); last=key
            if st['s']!='run': break
        print('\n'.join(ergs))
        await pg.wait_for_timeout(2500)
        await pg.screenshot(path='scripts/out/dod_post.png', full_page=False)
        await pg.evaluate("()=>document.querySelector('.screen').scrollTo(0,99999)"); await pg.wait_for_timeout(300)
        await pg.screenshot(path='scripts/out/dod_post2.png')
        src = await pg.evaluate("()=>document.querySelector('#pr-card').src")
        open('scripts/out/dod_card.png','wb').write(base64.b64decode(src.split(',')[1]))
        xml = await pg.evaluate("()=>__ps.tcx('Validation run')")
        open('scripts/out/dod.tcx','w').write(xml)
        schema = etree.XMLSchema(etree.parse('scripts/TrainingCenterDatabasev2.xsd'))
        doc = etree.fromstring(xml.encode())
        ok = schema.validate(doc); print('XSD valid:', ok); 
        for e in list(schema.error_log)[:5]: print('  ', e.message)
        ns={'t':'http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2'}
        laps=doc.findall('.//t:Lap',ns); tps=doc.findall('.//t:Trackpoint',ns)
        print('laps', len(laps), 'trackpoints', len(tps), 'lap notes', [l.findtext('t:Notes',namespaces=ns) for l in laps])
        print('report', await pg.evaluate("()=>{const r=__ps.lastReport(); return r && {title:r.title,avg:Math.round(r.avg),np:Math.round(r.np),comp:r.compliance.toFixed(3),kj:Math.round(r.kj),won:r.won,ach:r.achievements}}"))
        print('errors', errs[:5]); await b.close()
asyncio.run(main())
