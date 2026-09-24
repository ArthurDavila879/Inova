const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function app() {
  const elements = new Map();
  const context = vm.createContext({
    window: {}, document: {addEventListener() {}, getElementById(id) {
      if (!elements.has(id)) elements.set(id, {innerHTML:'', classList:{remove(){},add(){}},style:{}});
      return elements.get(id);
    }}, localStorage:{getItem(){return 'test-token';}}, URLSearchParams, setTimeout(){},
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8'), context);
  return {context,elements,run: code=>vm.runInContext(code,context)};
}

test('renders API fields and escapes stored HTML in proposals and details', async () => {
  const {context,elements,run} = app();
  const proposal = {id:1,title:'<img src=x onerror=alert(1)>',desc:'<script>bad()</script>',location:'Centro',bairro:'Centro',emoji:'🌳',tags:['<b>tag</b>'],votes:1,status:'votacao',author:{id:1,name:'<svg onload=bad()>',initials:'T'},createdAt:'2026-09-20',photo:'/uploads/1234-abcd.png',ia:{estimatedCost:'R$ 35.000',treesRequired:25,temperatureReduction:'4°C',implementationTime:'36 meses',species:'Teste'}};
  context.fetch = async()=>({ok:true,status:200,json:async()=>[proposal]});
  await run('renderProposals()');
  const html = elements.get('proposals-grid').innerHTML;
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('R$ 35.000'));
  assert.ok(html.includes('/api/uploads/1234-abcd.png'));
  run('App.user = {id:1}; openProposal(1)');
  assert.ok(!elements.get('proposal-modal').innerHTML.includes('undefined'));
  assert.ok(elements.get('proposal-modal').innerHTML.includes('Editar proposta'));
});

test('ranking supplies modal state even before dashboard has loaded', async()=> {
  const {context,run}=app();
  context.fetch=async()=>({ok:true,status:200,json:async()=>[{id:99,title:'Teste',location:'Centro',bairro:'Centro',emoji:'',votes:2}]});
  await run('renderVotacao()');
  assert.equal(run('App.proposals[0].id'),99);
});

test('204 does not parse JSON and expired authentication logs out', async()=> {
  const {context,run}=app();
  context.fetch=async()=>({ok:true,status:204,json(){throw new Error('Should not parse');}});
  assert.equal(await run("apiFetch('/proposals/1',{method:'DELETE'})"),null);
  run('logout = () => { window.loggedOut = true; }');
  context.fetch=async()=>({ok:false,status:401});
  await assert.rejects(run("apiFetch('/proposals')"),/sessão expirou/);
  assert.equal(context.window.loggedOut,true);
});
