import { items, itemById } from './data/items.js';
import { createProgressionState, applyFeed, equipEmpowerment, talentDefinitions, baseMonsterStats } from './data/progression.js';

const DEV_MODE = new URLSearchParams(location.search).get('dev') === '1';
const INVENTORY_KEY = 'shanhaijing_inventory_v1';
const PROGRESSION_KEY = 'shanhaijing_progression_v1';
const DISCOVERED_KEY = 'shanhaijing-collector-discovered';
const monsterNames = {'nine-tailed-fox':'九尾狐','fu-zhu':'夫諸','bi-fang':'畢方'};
const monsterIcons = {'nine-tailed-fox':'🦊','fu-zhu':'🦌','bi-fang':'🐦'};
const statNames = {perception:'感知',spirit:'靈性',speed:'速度',adaptability:'適應'};

function load(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function save(){if(DEV_MODE)return;localStorage.setItem(INVENTORY_KEY,JSON.stringify(inventory));localStorage.setItem(PROGRESSION_KEY,JSON.stringify(progression))}
function refreshDiscovered(){
  const raw=load(DISCOVERED_KEY,[]);
  discoveredMonsters.clear();
  if(Array.isArray(raw)) raw.forEach(id=>discoveredMonsters.add(id));
}
let inventory=DEV_MODE?{}:load(INVENTORY_KEY,{});
let progression=DEV_MODE?{}:load(PROGRESSION_KEY,{});
const discoveredMonsters=new Set();
refreshDiscovered();

function ensureMonster(monsterId){
  refreshDiscovered();
  if(!discoveredMonsters.has(monsterId))return null;
  if(!progression[monsterId])progression[monsterId]=createProgressionState(monsterId);
  return progression[monsterId];
}
function addItem(itemId){
  if(!DEV_MODE)return;
  const item=itemById[itemId];if(!item)return;
  const next=Math.min((inventory[itemId]||0)+1,item.stackMax);
  if(next===inventory[itemId])return;
  inventory[itemId]=next;renderInventory();
}
function removeItem(itemId){
  if(!DEV_MODE)return;
  const next=Math.max(0,(inventory[itemId]||0)-1);
  if(next)inventory[itemId]=next;else delete inventory[itemId];
  renderInventory();
}
function consumeItem(itemId){
  if((inventory[itemId]||0)<1)return false;
  inventory[itemId]-=1;if(inventory[itemId]<=0)delete inventory[itemId];save();return true;
}
function getEffect(item,monsterId,type){return item?.effects?.[type]?.[monsterId]??null}
function targetsFor(item){
  refreshDiscovered();
  return [...discoveredMonsters].filter(id=>monsterNames[id]&&(getEffect(item,id,'feed')||getEffect(item,id,'empower')));
}
function statHTML(monsterId,state,preview=null){
  const base=baseMonsterStats[monsterId]?.stats||{};const bonus=state?.statBonuses||{};const p=preview||{};
  return Object.keys(base).map(k=>`<span>${statNames[k]} ${base[k]}${(bonus[k]||0)+(p[k]||0)?` <b class="stat-bonus">+${(bonus[k]||0)+(p[k]||0)}</b>`:''}</span>`).join('');
}
function closeModal(id){const el=document.querySelector(id);if(el)el.hidden=true}
function openItemUse(itemId){
  const item=itemById[itemId],modal=document.querySelector('#item-use-modal');
  refreshDiscovered();
  if(!item||!modal||(inventory[itemId]||0)<1)return;
  const targets=targetsFor(item);modal.dataset.itemId=itemId;
  modal.querySelector('[data-use-title]').textContent=`${item.icon} ${item.name}`;
  modal.querySelector('[data-use-description]').textContent=`${item.description}　持有 ${inventory[itemId]}/${item.stackMax}`;
  modal.querySelector('[data-use-targets]').innerHTML=targets.length?targets.map(id=>{
    const state=ensureMonster(id);if(!state)return '';
    const feed=getEffect(item,id,'feed'),empower=getEffect(item,id,'empower');
    const labels=[];if(feed)labels.push(`餵食 ${Object.entries(feed).map(([k,v])=>`${statNames[k]||k} +${v}`).join('、')}`);if(empower)labels.push(`賦能 ${empower.name}`);
    return `<article class="use-target-card"><div class="use-target-head"><span class="use-target-icon">${monsterIcons[id]||'◈'}</span><strong>${monsterNames[id]}</strong></div><div class="use-target-stats">${statHTML(id,state)}</div><div class="use-target-effect">${labels.join('　')}</div><div class="use-target-actions">${feed?`<button type="button" data-feed-target="${id}" data-item-id="${item.id}">餵食</button>`:''}${empower?`<button type="button" data-empower-target="${id}" data-item-id="${item.id}">賦能</button>`:''}</div></article>`;
  }).join(''):`<div class="use-empty">目前沒有已發現且適用於此道具的妖獸。<br><small>必須先在地圖捕捉妖獸，才能使用道具。</small></div>`;
  modal.hidden=false;
}
function openConfirm(itemId,monsterId,action){
  refreshDiscovered();const item=itemById[itemId],state=ensureMonster(monsterId),modal=document.querySelector('#use-confirm-modal');
  if(!item||!state||!discoveredMonsters.has(monsterId)||(inventory[itemId]||0)<1)return;
  const feed=action==='feed'?getEffect(item,monsterId,'feed'):null;const empower=action==='empower'?item.effects?.empower?.[monsterId]:null;
  if(action==='feed'&&!feed)return;if(action==='empower'&&!empower)return;
  modal.dataset.itemId=itemId;modal.dataset.monsterId=monsterId;modal.dataset.action=action;
  modal.querySelector('[data-confirm-title]').textContent=`${monsterIcons[monsterId]||'◈'} ${monsterNames[monsterId]}`;
  modal.querySelector('[data-confirm-item]').textContent=`${item.icon} ${item.name} ×${inventory[itemId]}`;
  modal.querySelector('[data-confirm-effect]').innerHTML=action==='feed'?`<div class="confirm-stats">${statHTML(monsterId,state,feed)}</div><p>確認餵食後，${item.name} ×1 會從背包消耗。</p>`:`<p>安裝「${empower.name}」後，會消耗 ${item.name} ×1。</p>`;
  modal.hidden=false;
}
function renderInventory(){
  const grid=document.querySelector('#inventory-grid'),count=document.querySelector('#inventory-count');if(!grid)return;
  const owned=Object.entries(inventory).filter(([id,qty])=>qty>0&&itemById[id]);if(count)count.textContent=`${owned.length} 種物品`;
  grid.innerHTML=owned.length?owned.map(([id,qty])=>{const item=itemById[id];return `<button class="inventory-item" type="button" data-item="${id}"><span class="inventory-icon">${item.icon}</span><strong>${item.name}</strong><small>${qty}/${item.stackMax}</small></button>`}).join(''):`<div class="inventory-empty">目前還沒有收集到物品。</div>`;
  if(DEV_MODE)renderDevButtons();
}
function renderDevButtons(){document.querySelectorAll('[data-dev-item]').forEach(b=>{const i=itemById[b.dataset.devItem],q=inventory[i.id]||0;b.disabled=q>=i.stackMax;b.textContent=`＋ ${i.icon}${i.name} ${q}/${i.stackMax}`});document.querySelectorAll('[data-dev-remove-item]').forEach(b=>{const i=itemById[b.dataset.devRemoveItem],q=inventory[i.id]||0;b.disabled=q<=0;b.textContent=`− ${i.icon}${i.name} ${q}/${i.stackMax}`})}
function renderMonsterGrowth(monsterId){
  const state=ensureMonster(monsterId),modal=document.querySelector('#monster-growth-modal');if(!state||!modal)return;
  const innate=(state.talents||[]).map(id=>{const t=talentDefinitions[id];return t?`<li><strong>${t.name}</strong><small>${t.description}</small></li>`:''}).join('');
  const equipped=(state.equipped||[]).map(e=>`<li><strong>${e.name||e.itemId}</strong><small>${e.description||'已安裝賦能效果。'}</small></li>`).join('');
  modal.querySelector('#monster-growth-content').innerHTML=`<div class="growth-title">妖獸養成</div><div class="growth-level">Lv.${state.level}　餵食 ${state.feedCount} 次</div><div class="growth-section-title">技能</div><ul class="monster-skill-list">${innate+equipped||'<li>尚未獲得技能</li>'}</ul><div class="growth-section-title">能力值</div><div class="growth-stats">${statHTML(monsterId,state)}</div>`;modal.hidden=false;
}
function enhanceCollectionCards(){
  refreshDiscovered();const grid=document.querySelector('#collection-grid');if(!grid)return;
  grid.querySelectorAll('.collection-item.discovered').forEach(card=>{const name=card.querySelector('.monster-name')?.textContent?.trim();const id=Object.entries(monsterNames).find(([,v])=>v===name)?.[0];if(!id||!discoveredMonsters.has(id))return;const state=ensureMonster(id);if(!state)return;let panel=card.querySelector('.monster-ability-panel');if(!panel){panel=document.createElement('div');panel.className='monster-ability-panel';card.appendChild(panel)}const skills=[...(state.talents||[]).map(x=>talentDefinitions[x]?.name||x),...(state.equipped||[]).map(x=>x.name).filter(Boolean)];const html=`<div class="monster-level">Lv.${state.level}</div><div class="monster-card-skill-title">技能</div><div class="monster-card-skills">${skills.map(x=>`<span>✦ ${x}</span>`).join('')||'<span>尚未獲得</span>'}</div><div class="monster-stats">${statHTML(id,state)}</div>`;if(panel.innerHTML!==html)panel.innerHTML=html});
}
function injectStyles(){if(document.querySelector('#inventory-ui-style'))return;const s=document.createElement('style');s.id='inventory-ui-style';s.textContent=`.inventory-modal,.monster-growth-modal,.item-use-modal,.use-confirm-modal{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.62);display:grid;place-items:end center;padding:12px}.inventory-modal[hidden],.monster-growth-modal[hidden],.item-use-modal[hidden],.use-confirm-modal[hidden]{display:none}.inventory-card,.monster-growth-card,.item-use-card,.use-confirm-card{width:min(100%,520px);max-height:84vh;overflow:auto;background:#f6efd9;color:#3b321f;border-radius:20px;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.5)}.inventory-head,.use-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.inventory-head button,.use-head button{width:38px;height:38px;border:0;border-radius:50%;background:#20251f;color:#fff;font-size:1.3rem;cursor:pointer}.inventory-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.inventory-item{min-height:100px;border:1px solid rgba(45,38,24,.2);border-radius:14px;background:#fffaf0;color:#3b321f;padding:8px;display:grid;place-items:center;cursor:pointer}.inventory-icon{font-size:30px}.inventory-item strong{font-size:12px}.inventory-item small{font-size:12px;font-weight:700}.inventory-empty,.use-empty{text-align:center;padding:30px 10px;grid-column:1/-1;opacity:.7}.use-targets{display:grid;gap:10px}.use-target-card{background:#fffaf0;border-radius:14px;padding:12px;border:1px solid rgba(65,53,29,.15)}.use-target-head{display:flex;align-items:center;gap:8px}.use-target-icon{font-size:1.7rem}.use-target-stats,.confirm-stats,.growth-stats{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:9px 0}.use-target-stats span,.confirm-stats span,.growth-stats span{background:#f0e8cf;border-radius:8px;padding:7px;color:#3b321f;font-weight:700}.stat-bonus{color:#b34b20;font-weight:900}.use-target-effect{font-size:.78rem;color:#6d5a31;margin:6px 0}.use-target-actions,.confirm-actions{display:flex;gap:8px}.use-target-actions button,.confirm-actions button{border:0;border-radius:10px;padding:9px 13px;background:#183b31;color:#fff4cf;font-weight:800;cursor:pointer}.confirm-actions{justify-content:flex-end;margin-top:14px}.confirm-actions button[data-confirm-cancel]{background:#77705f}.growth-title{font-size:1.2rem;font-weight:900;color:#5c451d}.growth-level{margin-top:4px;color:#66583d}.growth-section-title{margin:16px 0 7px;font-weight:900;color:#5c451d}.monster-skill-list{list-style:none;padding:0;margin:0;display:grid;gap:8px}.monster-skill-list li{background:#fffaf0;border-radius:10px;padding:10px}.monster-skill-list strong,.monster-skill-list small{display:block}.monster-skill-list small{margin-top:3px;color:#66583d}.monster-ability-panel{margin-top:8px;padding-top:8px;border-top:1px solid rgba(225,191,110,.24)}.monster-level,.monster-card-skill-title{color:#fff4cf;font:700 .72rem/1.2 system-ui}.monster-card-skills{display:flex;flex-wrap:wrap;gap:4px 7px;margin:4px 0 7px}.monster-card-skills span,.monster-stats span{color:#dce7df;font:700 .66rem/1.2 system-ui}.dev-section{margin-top:14px;padding-top:12px;border-top:1px dashed rgba(65,53,29,.25)}.dev-title{font-size:.75rem;font-weight:900;color:#6d5a31;margin-bottom:7px}.dev-items{display:grid;grid-template-columns:1fr 1fr;gap:6px}.dev-item-row{display:grid;grid-template-columns:1fr 1fr;gap:5px}.dev-items button{border:0;border-radius:8px;padding:7px;background:#ded5bc;color:#3b321f;cursor:pointer}.dev-items button:disabled{opacity:.45;cursor:not-allowed}`;document.head.appendChild(s)}
function installUI(){if(document.querySelector('#inventory-modal'))return;injectStyles();let inventoryButton=document.querySelector('#inventory-button');if(!inventoryButton){inventoryButton=document.createElement('button');inventoryButton.id='inventory-button';inventoryButton.type='button';inventoryButton.textContent='🎒';document.body.appendChild(inventoryButton)}
  const inventoryModal=document.createElement('div');inventoryModal.id='inventory-modal';inventoryModal.className='inventory-modal';inventoryModal.hidden=true;inventoryModal.innerHTML=`<div class="inventory-card" role="dialog" aria-modal="true"><div class="inventory-head"><div><strong>🎒 物品背包</strong><div id="inventory-count">0 種物品</div></div><button type="button" data-close-modal="inventory-modal">×</button></div><div id="inventory-grid" class="inventory-grid"></div>${DEV_MODE?`<div class="dev-section"><div class="dev-title">🛠 測試模式：道具數量調整</div><div class="dev-items">${items.map(i=>`<div class="dev-item-row"><button type="button" data-dev-item="${i.id}">＋ ${i.icon}${i.name}</button><button type="button" data-dev-remove-item="${i.id}">− ${i.icon}${i.name}</button></div>`).join('')}</div></div>`:''}</div>`;document.body.appendChild(inventoryModal);
  const useModal=document.createElement('div');useModal.id='item-use-modal';useModal.className='item-use-modal';useModal.hidden=true;useModal.innerHTML=`<div class="item-use-card" role="dialog" aria-modal="true"><div class="use-head"><div><strong data-use-title></strong><p data-use-description></p></div><button type="button" data-close-modal="item-use-modal" aria-label="取消選擇">×</button></div><div class="use-targets" data-use-targets></div></div>`;document.body.appendChild(useModal);
  const confirmModal=document.createElement('div');confirmModal.id='use-confirm-modal';confirmModal.className='use-confirm-modal';confirmModal.hidden=true;confirmModal.innerHTML=`<div class="use-confirm-card" role="dialog" aria-modal="true"><div class="use-head"><strong data-confirm-title></strong><button type="button" data-close-modal="use-confirm-modal">×</button></div><strong data-confirm-item></strong><div data-confirm-effect></div><div class="confirm-actions"><button type="button" data-confirm-cancel>取消</button><button type="button" data-confirm-ok>確認</button></div></div>`;document.body.appendChild(confirmModal);
  const growthModal=document.createElement('div');growthModal.id='monster-growth-modal';growthModal.className='monster-growth-modal';growthModal.hidden=true;growthModal.innerHTML=`<div class="monster-growth-card" role="dialog" aria-modal="true"><div id="monster-growth-content"></div><button type="button" data-close-modal="monster-growth-modal">關閉</button></div>`;document.body.appendChild(growthModal);
  inventoryButton.addEventListener('click',()=>{inventoryModal.hidden=false;renderInventory();enhanceCollectionCards()});
  document.addEventListener('click',e=>{
    const a=e.target.closest('[data-dev-item]');if(a){addItem(a.dataset.devItem);return}
    const r=e.target.closest('[data-dev-remove-item]');if(r){removeItem(r.dataset.devRemoveItem);return}
    const item=e.target.closest('[data-item]');if(item){openItemUse(item.dataset.item);return}
    const feed=e.target.closest('[data-feed-target]');if(feed){openConfirm(feed.dataset.itemId,feed.dataset.feedTarget,'feed');return}
    const emp=e.target.closest('[data-empower-target]');if(emp){openConfirm(emp.dataset.itemId,emp.dataset.empowerTarget,'empower');return}
    const ok=e.target.closest('[data-confirm-ok]');if(ok){refreshDiscovered();const m=document.querySelector('#use-confirm-modal');const itemId=m.dataset.itemId,monsterId=m.dataset.monsterId,action=m.dataset.action,item=itemById[itemId],state=ensureMonster(monsterId);if(!item||!state||(inventory[itemId]||0)<1)return;let next=action==='feed'?applyFeed(state,item,monsterId):equipEmpowerment(state,item,monsterId);if(next&&consumeItem(itemId)){progression[monsterId]=next;save();closeModal('#use-confirm-modal');closeModal('#item-use-modal');renderInventory();enhanceCollectionCards()}return}
    const cancel=e.target.closest('[data-confirm-cancel]');if(cancel){closeModal('#use-confirm-modal');return}
    const close=e.target.closest('[data-close-modal]');if(close){closeModal(`#${close.dataset.closeModal}`);return}
  });
  for(const id of ['inventory-modal','item-use-modal','use-confirm-modal','monster-growth-modal'])document.querySelector(`#${id}`)?.addEventListener('click',e=>{if(e.target.id===id)e.target.hidden=true});
  document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;for(const id of ['use-confirm-modal','item-use-modal','inventory-modal','monster-growth-modal']){const el=document.querySelector(`#${id}`);if(el&&!el.hidden){el.hidden=true;break}}});
  window.addEventListener('shanhaijing:item-collected',e=>{const {itemId,amount=1}=e.detail||{},item=itemById[itemId];if(!item||amount<=0)return;inventory[itemId]=Math.min((inventory[itemId]||0)+amount,item.stackMax);save();renderInventory()});
  window.addEventListener('shanhaijing:open-monster-growth',e=>{if(e.detail?.monsterId)renderMonsterGrowth(e.detail.monsterId)});
  renderInventory();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installUI);else installUI();
