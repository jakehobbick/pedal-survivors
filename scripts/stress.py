"""Stress: frame work ms split + heap growth. python3 scripts/stress.py [dpr]"""
import sys, asyncio, json
from playwright.async_api import async_playwright
async def main():
    dpr = float(sys.argv[1]) if len(sys.argv)>1 else 1
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-precise-memory-info','--js-flags=--expose-gc'])
        ctx = await b.new_context(viewport={'width':1180,'height':820}, device_scale_factor=dpr)
        pg = await ctx.new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(800)
        await pg.evaluate("()=>{ __ps.autoTest=true; __ps.sim.bot=true; __ps.settings.renderScale=1; __ps.startRun({char:'kai',arena:'neon',tpl:'free',min:60,stress:true}); __ps.closeAll(); __ps.settings.debug=true; }")
        await pg.wait_for_timeout(4000)
        # instrument: wrap update & render timing
        r = await pg.evaluate("""async()=>{
          const g=__ps; const out={};
          gc && gc(); await new Promise(r=>setTimeout(r,300));
          const h0=performance.memory.usedJSHeapSize; const samples=[]; let minH=1e12,maxH=0;
          const t0=performance.now(); let frames=0; const works=[];
          const ts=[]; await new Promise(res=>{ function f(t){ ts.push(t); frames++; works.push(g.dbg.work||0); const h=performance.memory.usedJSHeapSize; minH=Math.min(minH,h); maxH=Math.max(maxH,h); samples.push(h); if(performance.now()-t0<15000) requestAnimationFrame(f); else res(); } requestAnimationFrame(f); });
          const dt=(performance.now()-t0)/1000; const d=[]; for(let i=1;i<ts.length;i++) d.push(ts[i]-ts[i-1]); d.sort((a,b)=>a-b); out.iv_p50=d[d.length>>1]; out.iv_p99=d[Math.floor(d.length*0.99)]; out.iv_max=d[d.length-1]; out.over20=d.filter(x=>x>20).length;
          works.sort((a,b)=>a-b);
          // count sawtooth drops (GCs)
          let gcs=0; for(let i=1;i<samples.length;i++) if(samples[i]<samples[i-1]-200000) gcs++;
          const iv=[]; for(let i=1;i<samples.length;i++){}; return {...out, fps:frames/dt, work_med:works[works.length>>1], work_p95:works[Math.floor(works.length*0.95)], heapMB_start:h0/1e6, heap_min:minH/1e6, heap_max:maxH/1e6, gcs, en:g.game.world.enemies.n, pr:g.game.world.projs.n, zones:g.game.world.zones.n};
        }""")
        print(json.dumps(r)); print(errs[:3])
        await pg.screenshot(path='scripts/out/stress.png')
        await b.close()
asyncio.run(main())
