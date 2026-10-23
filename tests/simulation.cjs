const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.argv[2]||'app.js','utf8');
function setup(){
  const elements=new Map(),scenarios=['normal','rain','oxygen','offline'].map(x=>element('scenario-'+x,{scenario:x}));let tick;
  function element(id,dataset={}){return{id,dataset,value:'',innerHTML:'',textContent:'',open:false,events:{},attrs:{},classList:{toggle(){},add(){},remove(){}},addEventListener(k,fn){this.events[k]=fn},setAttribute(k,v){this.attrs[k]=v},append(){},showModal(){this.open=true},close(){this.open=false}};}
  const get=id=>{if(!elements.has(id))elements.set(id,element(id));return elements.get(id)};
  get('do-warning').value='4';get('do-critical').value='3';get('salt-warning').value='3';
  const document={getElementById:get,querySelectorAll(sel){return sel==='[data-scenario]'||sel==='.scenario'?scenarios:[]},querySelector(sel){return get(sel)},createElement(tag){return element(tag)}};
  const context={document,window:{},Date,Math,Number,Object,Array,String,Infinity,Blob,URL,setTimeout(){return 1},clearTimeout(){},setInterval(fn){tick=fn}};
  vm.runInNewContext(source,context);return{get,scenario(name){scenarios.find(x=>x.dataset.scenario===name).events.click()},click(id){get(id).events.click()},advance(n){for(let i=0;i<n;i++)tick()},snapshot(){return context.window.salaHumSnapshot()}};
}
const sim=setup();assert.equal(sim.snapshot().cages.length,6);assert.ok(sim.snapshot().cages.every(c=>c.status==='normal'));
sim.scenario('rain');assert.equal(sim.snapshot().cages[1].status,'warning');sim.advance(20);assert.ok(sim.snapshot().cages[1].salinity<28);assert.notEqual(sim.snapshot().cages[1].status,'critical');
sim.click('reset');sim.scenario('oxygen');sim.advance(90);assert.equal(sim.snapshot().cages[1].status,'critical');const before=sim.snapshot().cages[1].do;sim.click('aerator');sim.click('feeding');sim.advance(60);assert.ok(sim.snapshot().cages[1].do>before);assert.equal(sim.snapshot().cages[1].feeding,false);
sim.scenario('offline');const old=sim.snapshot().cages[1].do;sim.advance(20);assert.equal(sim.snapshot().cages[1].status,'offline');assert.equal(sim.snapshot().cages[1].do,old);
sim.click('play');const time=sim.snapshot().minute;sim.advance(10);assert.equal(sim.snapshot().minute,time);
sim.get('do-critical').value='5';sim.click('save-thresholds');assert.equal(sim.snapshot().limits.critical,3);assert.match(sim.get('threshold-message').textContent,/ตรวจค่าใหม่/);
sim.get('do-critical').value='2.5';sim.click('save-thresholds');assert.equal(sim.snapshot().limits.critical,2.5);
sim.click('reset');assert.equal(sim.snapshot().minute,0);assert.ok(sim.snapshot().cages.every(c=>!c.aerator&&!c.offline&&c.feeding));
console.log('PASS: normal, rain, salinity without universal 28-ppt cutoff, low oxygen, response, sensor outage, pause, threshold validation, reset');
assert.equal(sim.snapshot().view,'home');sim.click('admin-home');assert.equal(sim.snapshot().view,'home');assert.equal(sim.get('admin-dialog').open,true);
sim.get('admin-password').value='wrong';sim.click('admin-submit');assert.equal(sim.snapshot().admin,false);sim.get('admin-password').value='demo-admin';sim.click('admin-submit');assert.equal(sim.snapshot().admin,true);assert.equal(sim.snapshot().view,'overview');
sim.get('verify-identity').value='C-99';sim.click('verify-submit');assert.equal(sim.snapshot().linkedCage,null);
sim.get('verify-identity').value='0800000000';sim.get('verify-cage').value='C-03';sim.click('verify-submit');assert.equal(sim.snapshot().linkedCage,null);sim.get('verify-otp').value='000000';sim.click('verify-submit');assert.equal(sim.snapshot().linkedCage,null);sim.get('verify-otp').value='123456';sim.click('verify-submit');assert.equal(sim.snapshot().linkedCage,'C-03');
sim.get('plan-type').value='นัดตรวจน้ำ';sim.get('plan-cage').value='all';sim.get('plan-note').value='<b>note</b>';sim.click('plan-submit');assert.equal(sim.snapshot().plans,1);assert.ok(sim.get('response-plans').innerHTML.includes('&lt;b&gt;note&lt;/b&gt;'));
sim.click('admin-access');assert.equal(sim.snapshot().admin,false);assert.equal(sim.snapshot().view,'home');
console.log('PASS: admin demo login/logout, invalid cage, phone/OTP demo validation, account linking, shared plans, HTML escaping');
