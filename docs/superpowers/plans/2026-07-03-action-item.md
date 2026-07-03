# Action Item View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an editable, realtime **Action Item** view (43 items from `Action_Item_Tracker.xlsx`) as a third sub-view under the Project tab, mirroring the Requirements page pattern.

**Architecture:** All changes are in the single-file app `index.html`. A new Firestore collection `action_items` (per-item docs, realtime) backs an in-memory `ACTS` array, seeded from an embedded `ACT_SEED` (the 43 items in `seed/action_items.json`). A new `#actionView` panel inside the existing `#project` panel renders a KPI strip + filters + table with inline status editing + overdue highlight + a detail drawer. Persistence reuses the existing `window.DB` adapter, `dbErr`, `clone`, `setOpts`, `esc`, `v`, `toast`, `#modal`.

**Tech Stack:** Single-file HTML app (classic `<script>`, global functions), Firebase Web SDK v11.10.0 modular via `window.DB`, Firestore realtime.

## Global Constraints

- Additive only — do NOT change other pages' UI/behaviour. New: `#actionView` panel, one `#projToggle` button, new persistence + render functions, `setProjView('action')` branch, startApp wiring, scoped CSS.
- Persistence per-item on Firestore (`action_items`, doc id = `String(_id)`); reuse `window.DB` + `dbErr`. Never localStorage for this DATA. SDK stays v11.10.0.
- Reuse existing idioms/classes: `.tablecard`/`.tscroll`/`table.dt`/`thead th`, `.stwrap`/`.stdot`/`.stsel`/`.selmini` (status cell), `.chip`, `.bar`/`.lbl`/`.barright`, `.tbtn`/`.tbtn.pri`, `.truncate`/`.muted`, `#modal`/`closeModal`, `setOpts(id,arr,allLabel)`, `esc(s)`, `attr(s)`, `v(id)`, `clone(x)`, `toast(msg)`, `T('saved')`.
- Status vocab: `Not Started`(#8e8e93) · `In Process`(#ff9500) · `On Hold`(#af52de) · `Done`(#28cd41). Priority: `High`(#ff3b30) · `Low`(#8e8e93). หมวด chip: `BRD`(#0071e3) · `Report&Flow`(#5e5ce6) · `Forms`(#ff9500) · `Master Data`(#28cd41), fallback #8e8e93.
- Overdue = `due < today && status !== 'Done'` (due is `dd/mm/yyyy`).
- No unit-test framework. **Verify each task with:** (1) `node --check` on the extracted `<script>` (helper below); (2) Playwright smoke via the fallback boot; (3) commit. Do NOT use `git add -A` (stages scratch); stage `index.html` explicitly.

### Verify Helper

Syntax (from repo root `d:/Project Tracker`):
```bash
OPEN=$(grep -n "^<script>$" index.html | head -1 | cut -d: -f1)
CLOSE=$(grep -n "^</script>" index.html | head -1 | cut -d: -f1)
SP="/c/Users/NATHIP~1.S/AppData/Local/Temp/claude/d--Project-Tracker/b71b6c27-4b39-4b53-911b-1330eebfccf2/scratchpad"
awk -v a=$((OPEN+1)) -v b=$((CLOSE-1)) 'NR>=a&&NR<=b' index.html > "$SP/main.js"
node --check "$SP/main.js" && echo "SYNTAX OK"
```
Playwright smoke: server on 8123 (`node scratchpad/serve.js "d:/Project Tracker" 8123 &`), navigate `http://localhost:8123/index.html`, then in the browser:
```js
document.getElementById('loginGate').style.display='none';
document.body.classList.remove('locked');
await window.startApp();   // fallback: no auth → ACTS = ACT_SEED (43)
```

---

## File Structure

- **`index.html`** — every change:
  - Script: `ACT_SEED` const (43 items), `ACTS` model + colors, persistence (`loadActs`/`actSaveOne`/`actDelOne`/`subscribeActs` + `actNorm`/`actBase`/`actDue`/`actOverdue`), view (`renderActs`/`renderActKpi`/`renderActTable`/`actStatusCell`/`actChip`/filters/`actEdit`), drawer (`openAct`/`actAdd`/`actDel`), `setProjView` `action` branch, `actBind`, startApp wiring.
  - HTML: 3rd `#projToggle` button; `#actionView` panel after `#reqs`.
  - CSS: `.actkpi`/`.actk`, `tr.act-over`, `.act-duered` (small scoped block).

---

## Task 1: Seed data + persistence layer + startApp wiring

**Files:** Modify `index.html` (script: after the `save(){...}`/requirements-DB block is fine, anywhere among top-level functions; startApp boot line).

**Interfaces:**
- Produces: `ACT_SEED` (array), `let ACTS`, `COL_ACT='action_items'`, `ACT_STATUS`, `ACT_SC`, `ACT_CATC`, `ACT_PRIC`, `async loadActs()`, `actSaveOne(a)`, `actDelOne(id)`, `subscribeActs()`, `actNorm()`, `actBase()`, `actDue(s)->Date|null`, `actOverdue(a)->bool`. Consumes existing: `window.DB`, `dbErr`, `clone`, `toast`.

- [ ] **Step 1: Embed the seed + model + persistence.** Read `seed/action_items.json` (43-item array) and inline it. Insert this block in the main `<script>` immediately AFTER the line `var _reqFirst=true,_setFirst=true;` (the requirements subscribe flags) — pick a stable anchor near the requirements DB block:

```js
// ══ Action Items (action_items collection) ══
const ACT_SEED = /* PASTE the full array from seed/action_items.json here, verbatim */ ;
let ACTS = [];
const COL_ACT='action_items';
const ACT_STATUS=['Not Started','In Process','On Hold','Done'];
const ACT_SC={'Not Started':'#8e8e93','In Process':'#ff9500','On Hold':'#af52de','Done':'#28cd41'};
const ACT_CATC={'BRD':'#0071e3','Report&Flow':'#5e5ce6','Forms':'#ff9500','Master Data':'#28cd41'};
const ACT_PRIC={'High':'#ff3b30','Low':'#8e8e93'};
function actBase(){return clone(ACT_SEED);}
function actNorm(){ACTS.sort(function(a,b){return (a._id||0)-(b._id||0);});ACTS.forEach(function(a){if(!a.status)a.status='Not Started';if(!a.pri)a.pri='Low';});}
function actDue(s){var p=(s||'').split('/');return p.length===3?new Date(+p[2],+p[1]-1,+p[0]):null;}
function actOverdue(a){if((a.status||'')==='Done')return false;var d=actDue(a.due);if(!d)return false;var t=new Date();t.setHours(0,0,0,0);return d<t;}
async function loadActs(){try{var arr=await window.DB.loadAll(COL_ACT);if(!arr.length){arr=actBase();await Promise.all(arr.map(function(a){return window.DB.saveItem(COL_ACT,a._id,a);}));}ACTS=arr;}catch(e){console.error('[act load]',e);ACTS=actBase();if(window.toast)toast('โหลด Action Items จาก Firebase ไม่ได้ · ใช้ข้อมูลตั้งต้น');}actNorm();}
function actSaveOne(a){if(window.DB&&a&&a._id!=null)window.DB.saveItem(COL_ACT,a._id,a).catch(dbErr('action save'));}
function actDelOne(id){if(window.DB&&id!=null)window.DB.deleteItem(COL_ACT,id).catch(dbErr('action del'));}
var _actFirst=true;
function subscribeActs(){if(!window.DB)return;window.DB.subscribe(COL_ACT,function(docs){if(_actFirst){_actFirst=false;return;}ACTS=docs;actNorm();if(typeof fillActFilters==='function')fillActFilters();if(typeof curProjView!=='undefined'&&curProjView==='action'&&typeof renderActs==='function')renderActs();});}
```

The `ACT_SEED` value MUST be the exact JSON array from `seed/action_items.json` (43 objects with `_id,cat,dept,action,pri,owner,due,status,done,note`). Read that file and paste its contents as the array literal (it is valid JS).

- [ ] **Step 2: Wire into `window.startApp`.** In the boot line (starts `var _ld=document.getElementById('appLoading')...`), add `await loadActs();` immediately after the existing `await loadPlan();`:

Find `setGanttCtx('pi');await loadPlan();fillFilters();` and change to `setGanttCtx('pi');await loadPlan();await loadActs();fillFilters();`.

- [ ] **Step 3: Add `subscribeActs()` to the subscribe line.** Find `subscribeReqs();subscribeSettings();subscribeBr();subscribePI('pi');subscribePI('ap');subscribePlan();` and append `subscribeActs();` → `...subscribePlan();subscribeActs();`.

- [ ] **Step 4: Verify.** Run the Verify Helper syntax check (expect `SYNTAX OK`). Playwright fallback boot, then evaluate: `return {len: ACTS.length, first: ACTS[0]&&ACTS[0]._id, hasLoad: typeof loadActs, overdueFn: typeof actOverdue};` — expect `len:43`, `first:1`, `hasLoad:"function"`.

- [ ] **Step 5: Commit.**
```bash
git add index.html && git commit -m "feat(action): seed + Firestore persistence for action_items"
```

---

## Task 2: Action Item view — toggle, panel, KPI, filters, table

**Files:** Modify `index.html` (HTML: `#projToggle` button + `#actionView` panel + CSS; script: `setProjView` rewrite + render/filter functions + `actBind`; startApp: call `fillActFilters();actBind();`).

**Interfaces:**
- Consumes (Task 1): `ACTS`, `ACT_STATUS`, `ACT_SC`, `ACT_CATC`, `ACT_PRIC`, `actOverdue`, `actDue`, `actSaveOne`. Existing: `setOpts`, `esc`, `v`, `toast`, `T`.
- Produces: `renderActs()`, `renderActKpi()`, `renderActTable()`, `filteredActs()`, `fillActFilters()`, `actClear()`, `actStatusCell(a)`, `actChip(t,c)`, `actEdit(id,f,val)`, `actKfilter(st)`, `actKoverdue()`, `actBind()`, `curProjView==='action'` branch. Used by Task 3.

- [ ] **Step 1: Add the toggle button.** In `#projToggle` (line ~668), after the `data-pv="reqs"` button and before the closing `</div>`, insert:
```html
<button class="pjt" data-pv="action" onclick="setProjView('action')"><svg class="eic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> Action Item</button>
```

- [ ] **Step 2: Add the `#actionView` panel.** Immediately after the `#reqs` panel's closing (find the `</div>` that closes `<div class="projview" id="reqs" ...>`, right before the `</section>` that ends `#project`), insert:
```html
<div class="projview" id="actionView" style="display:none">
  <div id="actKpi" class="actkpi"></div>
  <div class="bar" style="margin-top:8px">
    <span class="lbl">หมวด</span><select id="actCat"></select>
    <span class="lbl">สถานะ</span><select id="actStatus"></select>
    <span class="lbl">Priority</span><select id="actPri"></select>
    <span class="lbl">ผู้รับผิดชอบ</span><select id="actOwner"></select>
    <input type="text" id="actSearch" placeholder="ค้นหา…" style="width:180px;flex:none">
    <button class="tbtn" onclick="actClear()">ล้าง</button>
    <div class="barright"><button class="tbtn pri" onclick="actAdd()">+ เพิ่ม Action Item</button></div>
  </div>
  <div class="tablecard"><div class="tscroll"><table class="dt" id="actTable"><colgroup><col style="width:52px"><col style="width:130px"><col style="width:190px"><col style="width:340px"><col style="width:90px"><col style="width:180px"><col style="width:110px"><col style="width:120px"><col style="width:170px"></colgroup>
    <thead><tr><th data-asort="_id">No <span class="ar"></span></th><th data-asort="cat">หมวด <span class="ar"></span></th><th>Department</th><th>Action Request</th><th data-asort="pri">Priority <span class="ar"></span></th><th>ผู้รับผิดชอบ</th><th data-asort="due">กำหนดส่ง <span class="ar"></span></th><th data-asort="status">สถานะ <span class="ar"></span></th><th>หมายเหตุ</th></tr></thead><tbody></tbody>
  </table></div></div>
</div>
```
(`actAdd` is defined in Task 3; it's referenced by an onclick, harmless until then.)

- [ ] **Step 3: Add scoped CSS.** In a `<style>` block (add a new one right before the `#actionView` panel, or append to an existing app `<style>`):
```html
<style>
.actkpi{display:flex;gap:10px;flex-wrap:wrap;margin-top:2px}
.actk{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:10px 16px;min-width:96px;box-shadow:var(--cardsh)}
.actk.clk{cursor:pointer;transition:border-color .15s,transform .05s}
.actk.clk:hover{border-color:var(--accent)}
.actk-v{font-size:22px;font-weight:700;color:var(--ink);line-height:1}
.actk-l{font-size:11.5px;color:var(--ink2);margin-top:4px}
#actTable tr.act-over td{background:rgba(255,59,48,.06)}
#actTable td.act-duered{color:#ff3b30;font-weight:600}
</style>
```

- [ ] **Step 4: Rewrite `setProjView` for 3 views.** Replace the whole existing `function setProjView(pv){...}` with:
```js
function setProjView(pv){curProjView=pv;document.querySelectorAll('#projToggle .pjt').forEach(b=>b.classList.toggle('on',b.dataset.pv===pv));requestAnimationFrame(piMoveThumb);var im=document.getElementById('implement'),rq=document.getElementById('reqs'),ac=document.getElementById('actionView');if(im)im.style.display=pv==='impl'?'':'none';if(rq)rq.style.display=pv==='reqs'?'':'none';if(ac)ac.style.display=pv==='action'?'':'none';var vt=document.getElementById('piViewTabs');if(vt)vt.style.display=pv==='impl'?'':'none';var rb=document.getElementById('projRibbon');if(rb)rb.style.display=pv==='impl'?'':'none';var rb2=document.getElementById('reqRibbon');if(rb2)rb2.style.display=pv==='reqs'?'':'none';var ab=document.getElementById('addReqBtn');if(ab)ab.style.display=pv==='reqs'?'':'none';if(pv==='impl'){renderPI();setTimeout(piToday,90);}else if(pv==='reqs'){renderAll();}else if(pv==='action'){renderActs();}}
```
(Only change from the original: adds `ac`/`#actionView`, projRibbon shows only on `impl`, and the trailing `if/else` handles all three views.)

- [ ] **Step 5: Add the view functions.** Insert near the other Action functions (after Task 1's block):
```js
let actSortK='',actSortD=1,actFilt={overdue:false};
function fillActFilters(){setOpts('actCat',[...new Set(ACTS.map(a=>a.cat).filter(Boolean))],'ทุกหมวด');setOpts('actStatus',ACT_STATUS,'ทุกสถานะ');setOpts('actPri',['High','Low'],'ทุก Priority');setOpts('actOwner',[...new Set(ACTS.map(a=>(a.owner||'').replace(/\n/g,' ').trim()).filter(Boolean))],'ทุกคน');}
function filteredActs(){var c=v('actCat'),st=v('actStatus'),pr=v('actPri'),ow=v('actOwner'),q=v('actSearch').toLowerCase().trim();
  var r=ACTS.filter(function(a){return (!c||a.cat===c)&&(!st||(a.status||'Not Started')===st)&&(!pr||a.pri===pr)&&(!ow||(a.owner||'').replace(/\n/g,' ').trim()===ow)&&(!actFilt.overdue||actOverdue(a))&&(!q||((a.action||'')+(a.dept||'')+(a.owner||'')+(a.note||'')+(a.cat||'')).toLowerCase().includes(q));});
  if(actSortK){var k=actSortK;r=r.slice().sort(function(a,b){if(k==='_id')return ((a._id||0)-(b._id||0))*actSortD;if(k==='due')return ((actDue(a.due)||0)-(actDue(b.due)||0))*actSortD;return String(a[k]||'').localeCompare(String(b[k]||''),'th')*actSortD;});}return r;}
function actClear(){actFilt.overdue=false;['actCat','actStatus','actPri','actOwner','actSearch'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});renderActTable();}
function renderActKpi(){var el=document.getElementById('actKpi');if(!el)return;var tot=ACTS.length,inp=ACTS.filter(a=>(a.status||'Not Started')==='In Process').length,ns=ACTS.filter(a=>(a.status||'Not Started')==='Not Started').length,dn=ACTS.filter(a=>a.status==='Done').length,ov=ACTS.filter(actOverdue).length;
  function c(lab,val,col,fn){return '<div class="actk clk" onclick="'+fn+'"><div class="actk-v"'+(col?' style="color:'+col+'"':'')+'>'+val+'</div><div class="actk-l">'+lab+'</div></div>';}
  el.innerHTML=c('ทั้งหมด',tot,'','actClear()')+c('กำลังทำ',inp,'#ff9500',"actKfilter('In Process')")+c('ยังไม่เริ่ม',ns,'#8e8e93',"actKfilter('Not Started')")+c('เสร็จแล้ว',dn,'#28cd41',"actKfilter('Done')")+c('เลยกำหนด',ov,'#ff3b30','actKoverdue()');}
function actKfilter(st){actFilt.overdue=false;var e=document.getElementById('actStatus');if(e)e.value=(e.value===st?'':st);renderActTable();}
function actKoverdue(){actFilt.overdue=!actFilt.overdue;renderActTable();}
function actChip(t,col){return t?'<span class="chip" style="background:'+col+'1f;color:'+col+'">'+esc(t)+'</span>':'';}
function actStatusCell(a){var sv=a.status||'Not Started',cc=ACT_SC[sv]||'#8e8e93';return '<span class="stwrap" style="--sc:'+cc+'"><span class="stdot"></span><select class="selmini stsel" onclick="event.stopPropagation()" onchange="actEdit('+a._id+',&quot;status&quot;,this.value)">'+ACT_STATUS.map(function(x){return '<option '+(x===sv?'selected':'')+'>'+x+'</option>';}).join('')+'</select></span>';}
function renderActTable(){var rows=filteredActs();var tb=document.querySelector('#actTable tbody');if(!tb)return;tb.innerHTML=rows.map(function(a){var ov=actOverdue(a);return '<tr onclick="openAct('+a._id+')" style="cursor:pointer"'+(ov?' class="act-over"':'')+'><td class="muted">'+a._id+'</td><td>'+actChip(a.cat,ACT_CATC[a.cat]||'#8e8e93')+'</td><td class="truncate">'+esc((a.dept||'').replace(/\n/g,' '))+'</td><td><div class="truncate" style="max-width:330px;color:var(--ink)">'+esc((a.action||'').replace(/\n/g,' '))+'</div></td><td>'+actChip(a.pri,ACT_PRIC[a.pri]||'#8e8e93')+'</td><td class="truncate">'+esc((a.owner||'').replace(/\n/g,' '))+'</td><td class="'+(ov?'act-duered':'muted')+'">'+esc(a.due||'')+'</td><td>'+actStatusCell(a)+'</td><td class="muted truncate">'+esc((a.note||'').replace(/\n/g,' '))+'</td></tr>';}).join('')||'<tr><td colspan="9" style="text-align:center;padding:40px" class="muted">ไม่พบรายการ</td></tr>';}
function renderActs(){renderActKpi();renderActTable();}
function actEdit(id,f,val){var a=ACTS.find(function(x){return x._id===id;});if(!a)return;a[f]=val;actSaveOne(a);renderActs();if(window.toast)toast(T('saved'));}
function actBind(){['actCat','actStatus','actPri','actOwner','actSearch'].forEach(function(id){var e=document.getElementById(id);if(e)e.addEventListener('input',renderActTable);});document.querySelectorAll('#actTable th[data-asort]').forEach(function(th){th.style.cursor='pointer';th.onclick=function(){var k=th.dataset.asort;if(actSortK===k)actSortD=-actSortD;else{actSortK=k;actSortD=1;}renderActTable();};});}
```

- [ ] **Step 6: Init filters + bind in startApp.** In the boot line, after `await loadActs();` chain, ensure filters fill + bind once. Change the earlier edit's `await loadActs();fillFilters();` so it becomes `await loadActs();fillActFilters();actBind();fillFilters();` (i.e., add `fillActFilters();actBind();` right after `await loadActs();`).

- [ ] **Step 7: Verify.** Syntax check (`SYNTAX OK`). Playwright fallback boot, then: `showTab('project');setProjView('action');` and evaluate: `return {panel: getComputedStyle(document.getElementById('actionView')).display, rows: document.querySelectorAll('#actTable tbody tr').length, kpiTotal: document.querySelector('#actKpi .actk-v').textContent, overRows: document.querySelectorAll('#actTable tr.act-over').length};` — expect `panel:"block"` (or not "none"), `rows:43`, `kpiTotal:"43"`, `overRows` ≥ 0. Then set a status `<select>` value + dispatch change → confirm the model updated (`ACTS.find(a=>a._id===<n>).status` changed). Screenshot for visual parity.

- [ ] **Step 8: Commit.**
```bash
git add index.html && git commit -m "feat(action): Action Item view — toggle, KPI, filters, table, inline status"
```

---

## Task 3: Detail drawer + add + delete

**Files:** Modify `index.html` (script: `openAct`, `actAdd`, `actDel`).

**Interfaces:** Consumes: `ACTS`, `ACT_STATUS`, `actSaveOne`, `actDelOne`, `actEdit`, `renderActs`, `fillActFilters`, `esc`, `attr`, `#modal`, `closeModal`, `toast`. Produces: `openAct(id)`, `actAdd()`, `actDel(id)`.

- [ ] **Step 1: Add the drawer + add/delete functions.** Insert near the other Action functions:
```js
function openAct(id){var a=ACTS.find(function(x){return x._id===id;});if(!a)return;var mt=document.getElementById('mTitle');if(mt)mt.textContent='Action #'+a._id+(a.cat?' · '+a.cat:'');var ms=document.getElementById('mSub');if(ms)ms.textContent=(a.dept||'').replace(/\n/g,' ');
  var sel=function(cur,arr,f){return '<select onchange="actEdit('+id+',&quot;'+f+'&quot;,this.value);openAct('+id+')">'+arr.map(function(x){return '<option '+(x===cur?'selected':'')+'>'+x+'</option>';}).join('')+'</select>';};
  document.getElementById('mBody').innerHTML='<div style="padding:6px 4px">'
    +'<div class="fld"><label>Action Request</label><div class="roval" style="white-space:pre-wrap;line-height:1.5">'+esc(a.action||'')+'</div></div>'
    +'<div class="frow"><div class="fld"><label>สถานะ</label>'+sel(a.status||'Not Started',ACT_STATUS,'status')+'</div><div class="fld"><label>Priority</label>'+sel(a.pri||'Low',['High','Low'],'pri')+'</div></div>'
    +'<div class="fld"><label>ผู้รับผิดชอบ</label><input value="'+attr((a.owner||'').replace(/\n/g,' '))+'" onchange="actEdit('+id+',&quot;owner&quot;,this.value)"></div>'
    +'<div class="frow"><div class="fld"><label>กำหนดส่ง (dd/mm/yyyy)</label><input value="'+attr(a.due||'')+'" onchange="actEdit('+id+',&quot;due&quot;,this.value)"></div><div class="fld"><label>วันที่เสร็จ</label><input value="'+attr(a.done||'')+'" onchange="actEdit('+id+',&quot;done&quot;,this.value)"></div></div>'
    +'<div class="fld"><label>หมายเหตุ / ติดตาม</label><textarea rows="2" onchange="actEdit('+id+',&quot;note&quot;,this.value)">'+esc(a.note||'')+'</textarea></div>'
    +'</div><div class="mact"><button class="btn btn-sec del" onclick="actDel('+id+')">ลบรายการ</button><button class="btn btn-sec" onclick="closeModal()">ปิด</button></div>';
  document.getElementById('modal').classList.add('open');}
function actAdd(){var nid=ACTS.reduce(function(m,a){return Math.max(m,a._id||0);},0)+1;var a={_id:nid,cat:'',dept:'',action:'รายการใหม่',pri:'Low',owner:'',due:'',status:'Not Started',done:'',note:''};ACTS.push(a);actNorm();actSaveOne(a);fillActFilters();renderActs();openAct(nid);}
function actDel(id){var a=ACTS.find(function(x){return x._id===id;});if(!a)return;if(!confirm('ลบ Action #'+id+' ?'))return;ACTS=ACTS.filter(function(x){return x._id!==id;});actDelOne(id);fillActFilters();renderActs();closeModal();if(window.toast)toast('ลบแล้ว');}
```

- [ ] **Step 2: Verify.** Syntax check (`SYNTAX OK`). Playwright: enter the Action view, then `openAct(1)` → evaluate `getComputedStyle(document.getElementById('modal')).display !== 'none' && document.getElementById('mBody').textContent.includes('Action Request')` → true. Test `actAdd()` → `ACTS.length===44` and the new row appears; then `actDel(<newId>)` (stub `window.confirm=()=>true` first) → back to 43. Confirm other pages still render (open `showTab('project');setProjView('reqs')` → reqs table still 165, and `setProjView('impl')` → PI gantt renders).

- [ ] **Step 3: Commit.**
```bash
git add index.html && git commit -m "feat(action): detail drawer + add/delete action items"
```

---

## Self-Review

- **Spec coverage:** collection+seed+realtime→Task 1; nav toggle + panel + setProjView→Task 2 Steps 1-4; KPI (incl. overdue, clickable)→Task 2 Step 5; filters→Task 2 Step 5; table + inline status + overdue highlight + sort→Task 2 Steps 5,7 + CSS Step 3; drawer + add/delete→Task 3; colors/vocab→Global Constraints + used in `ACT_SC`/`ACT_CATC`/`ACT_PRIC`. All spec sections covered.
- **Placeholder scan:** the only intentional "paste here" is `ACT_SEED` = verbatim contents of `seed/action_items.json` (a concrete, existing file) — not a vague placeholder. Everything else is complete code.
- **Type consistency:** `renderActs()`=`renderActKpi()`+`renderActTable()` used consistently; filter binds call `renderActTable`; `actEdit(id,f,val)`, `openAct(id)`, `actAdd()`, `actDel(id)`, `fillActFilters()` names match across tasks; `curProjView==='action'` matches the `setProjView('action')` branch; `_id` numeric throughout (doc id `String(_id)` via `saveItem`).
