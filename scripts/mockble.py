"""Mock Web Bluetooth FTMS trainer to verify parsing, control-point writes, disconnect/reconnect."""
import asyncio, json
from playwright.async_api import async_playwright
MOCK = r"""
(() => {
  const U = n => '0000' + n.toString(16).padStart(4,'0') + '-0000-1000-8000-00805f9b34fb';
  window.__writes = [];
  function mkChar(uuid){ const ls=[]; return { uuid, value:null, addEventListener:(t,f)=>ls.push(f), startNotifications: async()=>{}, notify(dv){ this.value=dv; ls.forEach(f=>f({target:this})); }, writeValueWithResponse: async (d)=>{ window.__writes.push(Array.from(d)); const op=d[0]; const r=new DataView(new Uint8Array([0x80,op,1]).buffer); setTimeout(()=>cp.notify(r),5);} }; }
  const ibd = mkChar(U(0x2ad2)); const cp = mkChar(U(0x2ad9));
  const dls=[];
  const dev = { name:'KICKR MOCK', id:'mock', addEventListener:(t,f)=>dls.push(f), gatt:{ connected:false, connect: async()=>{ dev.gatt.connected=true; return server; }, disconnect(){ dev.gatt.connected=false; dls.forEach(f=>f()); } } };
  const server = { getPrimaryService: async (u)=>{ if(u===U(0x1826)) return { getCharacteristic: async(c)=> c===U(0x2ad2)?ibd:cp }; throw new Error('nope'); } };
  navigator.bluetooth = { requestDevice: async()=>dev };
  window.__mock = { dev, ibd, cp, pump(w,c){ // flags: bit2 cadence, bit6 power, bit0=1 (no inst speed)
      const b=new DataView(new ArrayBuffer(8)); b.setUint16(0, 1|4|64, true); b.setUint16(2, c*2, true); b.setInt16(4, w, true); ibd.notify(b); } };
})();
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':1180,'height':820})
        logs=[]; pg.on('pageerror', lambda e: logs.append(str(e)))
        await pg.add_init_script(MOCK)
        await pg.goto('http://localhost:4173/'); await pg.wait_for_timeout(600)
        await pg.click('#pp-t'); await pg.wait_for_timeout(1500)
        print('status:', await pg.inner_text('#pp-tst'))
        await pg.evaluate("()=>{ window.__pump=setInterval(()=>__mock.pump(212,91),250) }")
        await pg.wait_for_timeout(1500)
        print('sensors:', await pg.evaluate("()=>JSON.stringify({src:__ps.sensors.src,p:__ps.sensors.power,c:__ps.sensors.cadence,p3:Math.round(__ps.sensors.p3)})"))
        await pg.evaluate("()=>{__ps.closeAll(); __ps.startRun({char:'kai',arena:'sakura',tpl:'sweetspot',min:30});}")
        await pg.wait_for_timeout(800)
        print('writes after start:', await pg.evaluate("()=>JSON.stringify(__writes.slice(-3))"))
        # jump to the first interval: ERG should go to 91% of 250 = 227/228 W
        await pg.evaluate("()=>{ const wk=__ps.game.wk; while(wk.step.kind!=='interval') wk.skip(), wk.update(0.01); }")
        await pg.wait_for_timeout(500)
        print('interval writes:', await pg.evaluate("()=>JSON.stringify(__writes.slice(-2).map(w=>w[0]===5?['ERG',w[1]+w[2]*256]:w))"))
        # disconnect -> pause + modal; then auto reconnect
        await pg.evaluate("()=>__mock.dev.gatt.disconnect()")
        await pg.wait_for_timeout(300)
        print('paused:', await pg.evaluate("()=>__ps.game.paused"), 'modal:', await pg.evaluate("()=>!!document.querySelector('#dc-re')"))
        await pg.screenshot(path='scripts/out/m3dc.png')
        await pg.wait_for_timeout(3500)
        print('after reconnect paused:', await pg.evaluate("()=>__ps.game.paused"), 'modal:', await pg.evaluate("()=>!!document.querySelector('#dc-re')"), 'writes:', await pg.evaluate("()=>JSON.stringify(__writes.slice(-3))"))
        # gear mode: jump to boss
        await pg.evaluate("()=>{ const wk=__ps.game.wk; while(wk.step.kind!=='boss') wk.skip(), wk.update(0.01); }")
        await pg.wait_for_timeout(1500)
        print('boss/gear writes:', await pg.evaluate("()=>JSON.stringify({mode:__ps.trainer.mode,gear:__ps.trainer.gear,last:__writes.slice(-2)})"))
        for l in logs: print('ERR', l)
        await b.close()
asyncio.run(main())
