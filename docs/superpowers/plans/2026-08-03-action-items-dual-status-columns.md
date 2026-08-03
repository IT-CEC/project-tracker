# Action Items — Dual Civil/PS Global Status Columns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ปรับตาราง Action Items จาก 9 คอลัมน์เป็น 11 คอลัมน์ — ตัด Department, เพิ่ม วันที่เสร็จ, และแยกสถานะ/หมายเหตุเป็นสองฝั่ง Civil และ PS Global

**Architecture:** ทุกการเปลี่ยนแปลงอยู่ในไฟล์เดียว `index.html` เพิ่ม 2 ฟิลด์ (`status2`, `note2`) ลงเอกสาร `action_items` ใน Firestore ผ่าน `window.DB` adapter เดิม โดยเติมค่าเริ่มต้นตอน runtime ใน `actNorm()` แทนการ backfill ทั้ง collection ส่วน UI ใช้คลาส/helper ที่มีอยู่ทั้งหมด (`.stwrap`/`.stsel`/`.actk`/`.dsec`/`vm()`/`setOpts()`) ไม่สร้าง pattern ใหม่

**Tech Stack:** Single-file HTML app, classic `<script>` + global functions, Firebase Web SDK v11.10.0 modular ผ่าน `window.DB`, Firestore realtime

## Global Constraints

- แก้เฉพาะ `index.html` — ห้ามแตะ `js/db.js`, `js/auth.js`, `firestore.rules`, `seed/action_items.json`
- ห้ามแตะหน้าอื่น (ภาพรวม / Requirements / Automation 2026 / แผนงาน / Gantt) — เปลี่ยนเฉพาะสิ่งที่อยู่ในขอบเขต `#actionView` และฟังก์ชัน `act*`
- Status vocabulary คงเดิม: `Not Started` · `In Process` · `On Hold` · `Done` — ใช้ `ACT_STATUS` / `ACT_SC` เดิม ห้ามสร้าง constant ใหม่
- สี: `Not Started` `#8e8e93` · `In Process` `#ff9500` · `On Hold` `#af52de` · `Done` `#28cd41` · เลยกำหนด `#ff3b30`
- ค่าเริ่มต้นฟิลด์ใหม่: `status2 = 'Not Started'`, `note2 = ''` — เติมใน `actNorm()` ในหน่วยความจำเท่านั้น **ห้ามเขียน backfill 43 docs กลับ Firestore ตอนโหลด**
- ฟิลด์ `dept` ต้องคงอยู่ในข้อมูล, ใน `#mSub` ของ drawer, และในคำค้นของ `filteredActs()` — เอาออกเฉพาะคอลัมน์ในตาราง
- ไม่มี unit-test framework — **ตรวจทุก task ด้วย:** (1) syntax helper ด้านล่าง (2) Playwright smoke (3) commit
- ห้ามใช้ `git add -A` (จะ stage scratchpad) — stage `index.html` แบบระบุชื่อ

### Verify Helper — syntax

รันจาก repo root `d:/Project Tracker` (Bash tool):

```bash
SP="/c/Users/NATHIP~1.S/AppData/Local/Temp/claude/d--Project-Tracker/ca9058fd-24fc-41d8-8f8f-25b843b33d5b/scratchpad"
mkdir -p "$SP"
OPEN=$(grep -n "^<script>$" index.html | head -1 | cut -d: -f1)
CLOSE=$(grep -n "^</script>" index.html | head -1 | cut -d: -f1)
awk -v a=$((OPEN+1)) -v b=$((CLOSE-1)) 'NR>=a&&NR<=b' index.html > "$SP/main.js"
node --check "$SP/main.js" && echo "SYNTAX OK"
```

Expected: `SYNTAX OK` (ยืนยันแล้วว่าทำงานได้ — baseline ปัจจุบันผ่าน)

### Verify Helper — Playwright smoke

1. เสิร์ฟไฟล์: `node scratchpad/serve.js "d:/Project Tracker" 8123 &` (ถ้าไม่มี `serve.js` ให้เขียน static server สั้น ๆ ลง scratchpad ก่อน)
2. `browser_navigate` → `http://localhost:8123/index.html`
3. `browser_evaluate` — boot แบบ fallback (ไม่ต้อง auth, `ACTS` จะเป็น `ACT_SEED` 43 รายการ):

```js
document.getElementById('loginGate').style.display='none';
document.body.classList.remove('locked');
await window.startApp();
showTab('project'); setProjView('action');
return {rows: document.querySelectorAll('#actTable tbody tr').length};
```

Expected: `{rows: 43}`

---

## File Structure

- **`index.html`** — ไฟล์เดียวที่แก้ ทุก task แตะคนละส่วนของไฟล์:
  - **CSS** — `<style>` block ที่บรรทัด ~889–899 (บล็อกที่ขึ้นต้นด้วย `.actkpi{...}`)
  - **HTML** — `#actionView` panel บรรทัด ~900–913 (filter bar + `#actTable` colgroup/thead)
  - **Script — model/persistence** — บรรทัด ~1595–1610 (`ACTS`, `ACT_STATUS`, `actNorm`, `actDue`, `actOverdue`, `loadActs`, `actSaveOne`, `subscribeActs`)
  - **Script — view** — บรรทัด ~1611–1626 (`fillActFilters`, `filteredActs`, `actClear`, `renderActKpi`, `actKfilter`, `actKoverdue`, `actChip`, `actStatusCell`, `renderActTable`, `renderActs`, `actEdit`, `actBind`)
  - **Script — drawer** — บรรทัด ~1627–1663 (`openAct`, `actPaintStep`, `actReqToggle`, `actSave`, `actAdd`, `actDel`)

> เลขบรรทัดจะเลื่อนหลังแต่ละ task — ให้ค้นด้วยชื่อฟังก์ชัน/สตริงที่ระบุในแต่ละ step ไม่ใช่เลขบรรทัด

---

## Task 1: Data model + ตาราง 11 คอลัมน์

**Files:**
- Modify: `index.html` — script (model: `actNorm`, เพิ่ม `actOverdue2`, `actAdd`) และ (view: `actStatusCell`, `renderActTable`, `filteredActs` sort branch) และ HTML (`#actTable` colgroup + thead)

**Interfaces:**
- Consumes (ของเดิมในไฟล์): `ACTS`, `ACT_STATUS`, `ACT_SC`, `ACT_CATC`, `ACT_PRIC`, `actDue(s)`, `actOverdue(a)`, `actChip(t,col)`, `actEdit(id,f,val)`, `filteredActs()`, `esc(s)`, `clone(x)`
- Produces (Task 2 และ 3 ใช้ต่อ): ฟิลด์ `a.status2` / `a.note2` มีค่าเสมอหลัง `actNorm()`, `actOverdue2(a) -> bool`, `actStatusCell(a, f)` โดย `f` = `'status'` | `'status2'`

---

- [ ] **Step 1: เติมค่าเริ่มต้น `status2` / `note2` ใน `actNorm()`**

ค้นบรรทัดที่ขึ้นต้นด้วย `function actNorm(){ACTS.sort(` แล้วแทนทั้งบรรทัดด้วย:

```js
function actNorm(){ACTS.sort(function(a,b){return (a._id||0)-(b._id||0);});ACTS.forEach(function(a){if(!a.status)a.status='Not Started';if(!a.status2)a.status2='Not Started';if(a.note2==null)a.note2='';if(!a.pri)a.pri='Low';});}
```

(เปลี่ยนจากเดิมแค่เพิ่ม `if(!a.status2)...` และ `if(a.note2==null)...` — ไม่มี write กลับ Firestore)

- [ ] **Step 2: เพิ่ม `actOverdue2()`**

ค้นบรรทัด `function actOverdue(a){` แล้วแทรกบรรทัดใหม่ **ต่อท้ายทันที** (บรรทัดถัดไป):

```js
function actOverdue2(a){if((a.status2||'Not Started')==='Done')return false;var d=actDue(a.due);if(!d)return false;var t=new Date();t.setHours(0,0,0,0);return d<t;}
```

- [ ] **Step 3: เพิ่มฟิลด์ใหม่ใน template ของ `actAdd()`**

ค้นสตริง `var a={_id:nid,cat:'',dept:'',action:'รายการใหม่',pri:'Low',owner:'',due:'',status:'Not Started',done:'',note:''};` แล้วแทนด้วย:

```js
var a={_id:nid,cat:'',dept:'',action:'รายการใหม่',pri:'Low',owner:'',due:'',status:'Not Started',status2:'Not Started',done:'',note:'',note2:''};
```

- [ ] **Step 4: เปลี่ยน `actStatusCell` ให้รับชื่อฟิลด์**

ค้นบรรทัด `function actStatusCell(a){` แล้วแทนทั้งบรรทัดด้วย:

```js
function actStatusCell(a,f){var fd=f||'status',sv=a[fd]||'Not Started',cc=ACT_SC[sv]||'#8e8e93';return '<span class="stwrap" style="--sc:'+cc+'"><span class="stdot"></span><select class="selmini stsel" onclick="event.stopPropagation()" onchange="actEdit('+a._id+',&quot;'+fd+'&quot;,this.value)">'+ACT_STATUS.map(function(x){return '<option '+(x===sv?'selected':'')+'>'+x+'</option>';}).join('')+'</select></span>';}
```

- [ ] **Step 5: เขียน `renderActTable()` ใหม่ให้ออก 11 `<td>`**

ค้นบรรทัด `function renderActTable(){var rows=filteredActs();` แล้วแทนทั้งบรรทัดด้วย:

```js
function renderActTable(){var rows=filteredActs();var tb=document.querySelector('#actTable tbody');if(!tb)return;tb.innerHTML=rows.map(function(a){var ov=actOverdue(a);return '<tr onclick="openAct('+a._id+')" style="cursor:pointer"'+(ov?' class="act-over"':'')+'><td class="muted">'+a._id+'</td><td>'+actChip(a.cat,ACT_CATC[a.cat]||'#8e8e93')+'</td><td><div class="truncate" style="max-width:290px;color:var(--ink)">'+esc((a.action||'').replace(/\n/g,' '))+'</div></td><td>'+actChip(a.pri,ACT_PRIC[a.pri]||'#8e8e93')+'</td><td><div class="truncate">'+esc((a.owner||'').replace(/\n/g,' '))+'</div></td><td class="'+(ov?'act-duered':'muted')+'">'+esc(a.due||'')+'</td><td class="muted">'+esc(a.done||'')+'</td><td>'+actStatusCell(a,'status')+'</td><td class="muted"><div class="truncate">'+esc((a.note||'').replace(/\n/g,' '))+'</div></td><td>'+actStatusCell(a,'status2')+'</td><td class="muted"><div class="truncate">'+esc((a.note2||'').replace(/\n/g,' '))+'</div></td></tr>';}).join('')||'<tr><td colspan="11" style="text-align:center;padding:40px" class="muted">ไม่พบรายการ</td></tr>';}
```

การเปลี่ยนแปลงเทียบของเดิม: ตัด `<td>` ของ `dept` ออก · ย้าย `action` ขึ้นมาเป็นคอลัมน์ 3 (`max-width` 330→290) · เพิ่ม `<td class="muted">done</td>` · เรียกใหม่เป็น `actStatusCell(a,'status')` · เพิ่ม `<td>` ของ `status2` และ `note2` · `colspan` 9→11

- [ ] **Step 6: ให้ `filteredActs()` เรียงคอลัมน์ `done` แบบวันที่**

ค้นสตริง `if(k==='due')return ((actDue(a.due)||0)-(actDue(b.due)||0))*actSortD;` แล้วแทนด้วย:

```js
if(k==='due'||k==='done')return ((actDue(a[k])||0)-(actDue(b[k])||0))*actSortD;
```

(`actDue('')` คืน `null` → `null||0` = `0` แถวที่ยังไม่มีวันที่จะไปกองอยู่ต้นลิสต์ — ตั้งใจ)

- [ ] **Step 7: แทน `<colgroup>` ของ `#actTable`**

ค้นสตริง `<table class="dt" id="actTable"><colgroup>` แล้วแทน `<colgroup>...</colgroup>` ทั้งก้อนด้วย:

```html
<colgroup><col style="width:52px"><col style="width:118px"><col style="width:300px"><col style="width:86px"><col style="width:150px"><col style="width:100px"><col style="width:100px"><col style="width:132px"><col style="width:180px"><col style="width:140px"><col style="width:180px"></colgroup>
```

- [ ] **Step 8: แทน `<thead>` ของ `#actTable`**

ค้นบรรทัดที่ขึ้นต้นด้วย `        <thead><tr><th data-asort="_id">No <span class="ar"></span></th>` แล้วแทนทั้งบรรทัดด้วย:

```html
        <thead><tr><th data-asort="_id">No <span class="ar"></span></th><th data-asort="cat">หมวด <span class="ar"></span></th><th>Action Request</th><th data-asort="pri">Priority <span class="ar"></span></th><th>ผู้รับผิดชอบ</th><th data-asort="due">กำหนดส่ง <span class="ar"></span></th><th data-asort="done">วันที่เสร็จ <span class="ar"></span></th><th data-asort="status">Civil Work Status <span class="ar"></span></th><th>Civil : หมายเหตุ / ติดตาม</th><th data-asort="status2">PS Global Work Status <span class="ar"></span></th><th>PS Global : หมายเหตุ / ติดตาม</th></tr></thead><tbody></tbody>
```

- [ ] **Step 9: ตรวจ syntax**

รัน Verify Helper — syntax → ต้องได้ `SYNTAX OK`

- [ ] **Step 10: ตรวจด้วย Playwright**

boot แบบ fallback (ดู Verify Helper — Playwright smoke) แล้ว `browser_evaluate`:

```js
var ths=[].map.call(document.querySelectorAll('#actTable thead th'),function(t){return t.textContent.trim();});
var r1=document.querySelector('#actTable tbody tr');
return {
  nTh: ths.length,
  heads: ths,
  nTd: r1.querySelectorAll('td').length,
  rows: document.querySelectorAll('#actTable tbody tr').length,
  hasStatus2: typeof ACTS[0].status2,
  s2Default: ACTS.every(function(a){return a.status2==='Not Started';}),
  note2Default: ACTS.every(function(a){return a.note2==='';}),
  overdue2: typeof actOverdue2
};
```

Expected:
- `nTh: 11`, `nTd: 11`, `rows: 43`
- `heads` = `["No","หมวด","Action Request","Priority","ผู้รับผิดชอบ","กำหนดส่ง","วันที่เสร็จ","Civil Work Status","Civil : หมายเหตุ / ติดตาม","PS Global Work Status","PS Global : หมายเหตุ / ติดตาม"]`
- `hasStatus2: "string"`, `s2Default: true`, `note2Default: true`, `overdue2: "function"`

จากนั้นทดสอบว่าแก้ค่าในคอลัมน์ 10 เขียนลง `status2` (ไม่ใช่ `status`):

```js
var tr=document.querySelector('#actTable tbody tr');
var id=+tr.children[0].textContent.trim();
var before=ACTS.find(function(a){return a._id===id;}).status;
var sel=tr.children[9].querySelector('select');
sel.value='Done'; sel.dispatchEvent(new Event('change',{bubbles:true}));
var a=ACTS.find(function(x){return x._id===id;});
return {status2:a.status2, statusUnchanged:a.status===before};
```

Expected: `{status2:"Done", statusUnchanged:true}`

- [ ] **Step 11: Commit**

```bash
git add index.html && git commit -m "feat(action): 11-column table with Civil/PS Global status + done date"
```

---

## Task 2: KPI 2 แถว + filter PS Global

**Files:**
- Modify: `index.html` — CSS (`<style>` block ที่มี `.actkpi`), HTML (filter bar ใน `#actionView`), script (`fillActFilters`, `filteredActs`, `actClear`, `actFilt`, `renderActKpi`, `actKfilter`, `actKoverdue`, `actBind`)

**Interfaces:**
- Consumes (Task 1): `a.status2`, `a.note2`, `actOverdue2(a)`
- Consumes (ของเดิม): `ACTS`, `ACT_STATUS`, `actOverdue(a)`, `vm(id)`, `v(id)`, `setOpts(id,arr,allLabel)`, `csSyncMulti(sel)`, `renderActTable()`
- Produces (Task 3 ไม่ได้ใช้ แต่ต้องคงชื่อไว้): `actKfilter(f, st)` โดย `f` = `'status'` | `'status2'`, `actKoverdue(f)`, `actFilt = {overdue:bool, overdue2:bool}`, select `#actStatus2`

> **หมายเหตุ:** `<select>` ที่ใส่ใน HTML ตั้งแต่แรกจะถูก `enhanceSelects(document)` ห่อเป็น custom select ตอน boot อยู่แล้ว และมี MutationObserver (`csStartObserver`) คอยห่อตัวที่เพิ่มมาทีหลัง — ไม่ต้องเรียกอะไรเพิ่ม
> การ `sel.value=''` บน multi-select จะเคลียร์ `sel._m` ให้เองผ่าน value setter ที่ override ไว้ — `actClear()` จึงใช้แพทเทิร์นเดิมได้

---

- [ ] **Step 1: แก้ CSS — `.actkpi` เป็นแนวตั้ง + เพิ่ม 3 คลาสใหม่**

ค้นบรรทัด `.actkpi{display:flex;gap:10px;flex-wrap:wrap;margin-top:2px}` แล้วแทนด้วย 4 บรรทัดนี้:

```css
.actkpi{display:flex;flex-direction:column;gap:8px;margin-top:2px}
.actkrow{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
.actkl{font-size:10.5px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.05em;width:72px;flex:none;white-space:nowrap}
.actk.actk-sp{visibility:hidden;pointer-events:none}
```

- [ ] **Step 2: เพิ่ม dropdown PS Global ในแถบ filter**

ค้นบรรทัด `        <span class="lbl">สถานะ</span><select id="actStatus" data-multi="1"></select>` แล้วแทนด้วย:

```html
        <span class="lbl">Civil</span><select id="actStatus" data-multi="1"></select>
        <span class="lbl">PS Global</span><select id="actStatus2" data-multi="1"></select>
```

- [ ] **Step 3: เติม options ให้ `#actStatus2`**

ค้นบรรทัด `function fillActFilters(){setOpts('actCat',` แล้วแทนทั้งบรรทัดด้วย:

```js
function fillActFilters(){setOpts('actCat',[...new Set(ACTS.map(a=>a.cat).filter(Boolean))],'ทุกหมวด');setOpts('actStatus',ACT_STATUS,'ทุกสถานะ');setOpts('actStatus2',ACT_STATUS,'ทุกสถานะ');setOpts('actPri',['High','Low'],'ทุก Priority');setOpts('actOwner',[...new Set(ACTS.map(a=>(a.owner||'').replace(/\n/g,' ').trim()).filter(Boolean))],'ทุกคน');}
```

- [ ] **Step 4: เพิ่ม `overdue2` ใน state ของ filter**

ค้นสตริง `let actSortK='',actSortD=1,actFilt={overdue:false};` แล้วแทนด้วย:

```js
let actSortK='',actSortD=1,actFilt={overdue:false,overdue2:false};
```

- [ ] **Step 5: ให้ `filteredActs()` กรองด้วย `status2` + ค้นหาใน `note2`**

ค้น 2 บรรทัดแรกของ `filteredActs` (ขึ้นต้นด้วย `function filteredActs(){var cs=vm('actCat'),`) แล้วแทนทั้ง 2 บรรทัดด้วย:

```js
function filteredActs(){var cs=vm('actCat'),sts=vm('actStatus'),st2s=vm('actStatus2'),prs=vm('actPri'),ows=vm('actOwner'),q=v('actSearch').toLowerCase().trim();
  var r=ACTS.filter(function(a){return (!cs.length||cs.includes(a.cat))&&(!sts.length||sts.includes(a.status||'Not Started'))&&(!st2s.length||st2s.includes(a.status2||'Not Started'))&&(!prs.length||prs.includes(a.pri))&&(!ows.length||ows.includes((a.owner||'').replace(/\n/g,' ').trim()))&&(!actFilt.overdue||actOverdue(a))&&(!actFilt.overdue2||actOverdue2(a))&&(!q||((a.action||'')+(a.dept||'')+(a.owner||'')+(a.note||'')+(a.note2||'')+(a.cat||'')).toLowerCase().includes(q));});
```

(บรรทัดที่ 3 ของฟังก์ชัน — branch การ sort ที่แก้ไปแล้วใน Task 1 Step 6 — ไม่ต้องแตะ)

- [ ] **Step 6: ให้ `actClear()` ล้าง filter ใหม่ด้วย**

ค้นบรรทัด `function actClear(){actFilt.overdue=false;` แล้วแทนทั้งบรรทัดด้วย:

```js
function actClear(){actFilt.overdue=false;actFilt.overdue2=false;['actCat','actStatus','actStatus2','actPri','actOwner','actSearch'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});renderActTable();}
```

- [ ] **Step 7: เขียน `renderActKpi()` ใหม่เป็น 2 แถว**

ค้น 3 บรรทัดของ `renderActKpi` (เริ่มที่ `function renderActKpi(){var el=document.getElementById('actKpi');` จบที่บรรทัดที่ขึ้นต้น `  el.innerHTML=c('ทั้งหมด',tot,`) แล้วแทนทั้ง 3 บรรทัดด้วย:

```js
function renderActKpi(){var el=document.getElementById('actKpi');if(!el)return;var tot=ACTS.length;
  function n(f,st){return ACTS.filter(function(a){return (a[f]||'Not Started')===st;}).length;}
  function c(lab,val,col,fn){return '<div class="actk clk" onclick="'+fn+'"><div class="actk-v"'+(col?' style="color:'+col+'"':'')+'>'+val+'</div><div class="actk-l">'+lab+'</div></div>';}
  function row(lab,f,ovn,ovfn){return '<div class="actkrow"><span class="actkl">'+lab+'</span>'
    +(f==='status'?c('ทั้งหมด',tot,'','actClear()'):'<div class="actk actk-sp"><div class="actk-v">'+tot+'</div><div class="actk-l">ทั้งหมด</div></div>')
    +c('กำลังทำ',n(f,'In Process'),'#ff9500','actKfilter(&quot;'+f+'&quot;,&quot;In Process&quot;)')
    +c('ยังไม่เริ่ม',n(f,'Not Started'),'#8e8e93','actKfilter(&quot;'+f+'&quot;,&quot;Not Started&quot;)')
    +c('เสร็จแล้ว',n(f,'Done'),'#28cd41','actKfilter(&quot;'+f+'&quot;,&quot;Done&quot;)')
    +c('เลยกำหนด',ovn,'#ff3b30',ovfn)+'</div>';}
  el.innerHTML=row('Civil','status',ACTS.filter(actOverdue).length,'actKoverdue(&quot;status&quot;)')
    +row('PS Global','status2',ACTS.filter(actOverdue2).length,'actKoverdue(&quot;status2&quot;)');}
```

- [ ] **Step 8: ให้ `actKfilter` / `actKoverdue` รับพารามิเตอร์ระบุฝั่ง**

ค้น 2 บรรทัด `function actKfilter(st){actFilt.overdue=false;` และ `function actKoverdue(){actFilt.overdue=!actFilt.overdue;renderActTable();}` แล้วแทนทั้ง 2 บรรทัดด้วย:

```js
function actKfilter(f,st){var id=f==='status2'?'actStatus2':'actStatus';if(f==='status2')actFilt.overdue2=false;else actFilt.overdue=false;var e=document.getElementById(id);if(e){if(e.dataset.multi){if(!e._m)e._m=new Set();if(e._m.size===1&&e._m.has(st))e._m.clear();else{e._m.clear();e._m.add(st);}csSyncMulti(e);}else{e.value=(e.value===st?'':st);}}renderActTable();}
function actKoverdue(f){if(f==='status2')actFilt.overdue2=!actFilt.overdue2;else actFilt.overdue=!actFilt.overdue;renderActTable();}
```

- [ ] **Step 9: ผูก event ให้ `#actStatus2`**

ค้นบรรทัด `function actBind(){['actCat','actStatus','actPri','actOwner','actSearch'].forEach(` แล้วแทน array ตัวแรกด้วย `['actCat','actStatus','actStatus2','actPri','actOwner','actSearch']` — บรรทัดเต็มหลังแก้:

```js
function actBind(){['actCat','actStatus','actStatus2','actPri','actOwner','actSearch'].forEach(function(id){var e=document.getElementById(id);if(e)e.addEventListener('input',renderActTable);});document.querySelectorAll('#actTable th[data-asort]').forEach(function(th){th.style.cursor='pointer';th.onclick=function(){var k=th.dataset.asort;if(actSortK===k)actSortD=-actSortD;else{actSortK=k;actSortD=1;}renderActTable();};});}
```

- [ ] **Step 10: ตรวจ syntax**

รัน Verify Helper — syntax → ต้องได้ `SYNTAX OK`

- [ ] **Step 11: ตรวจด้วย Playwright**

boot แบบ fallback แล้ว `browser_evaluate`:

```js
var rows=document.querySelectorAll('#actKpi .actkrow');
var lab=[].map.call(rows,function(r){return r.querySelector('.actkl').textContent.trim();});
var civilCards=rows[0].querySelectorAll('.actk');
var psCards=rows[1].querySelectorAll('.actk');
return {
  nRows: rows.length,
  labels: lab,
  civilN: civilCards.length,
  psN: psCards.length,
  civilTotal: civilCards[0].querySelector('.actk-v').textContent,
  psSpacerHidden: getComputedStyle(psCards[0]).visibility,
  psNotStarted: psCards[2].querySelector('.actk-v').textContent,
  hasFilter2: !!document.getElementById('actStatus2')
};
```

Expected: `nRows:2`, `labels:["Civil","PS Global"]`, `civilN:5`, `psN:5`, `civilTotal:"43"`, `psSpacerHidden:"hidden"`, `psNotStarted:"43"`, `hasFilter2:true`

จากนั้นทดสอบว่าคลิกการ์ดฝั่ง PS Global กรองด้วย `status2` (ไม่ใช่ `status`):

```js
actKfilter('status2','Done');
var afterDone = document.querySelectorAll('#actTable tbody tr').length;
actClear();
var afterClear = document.querySelectorAll('#actTable tbody tr').length;
actKfilter('status','In Process');
var civilInProc = document.querySelectorAll('#actTable tbody tr').length;
actClear();
return {afterDone, afterClear, civilInProc};
```

Expected: `afterDone` = จำนวนแถวที่ `status2==='Done'` (0 บน seed สด — ถ้าเคยแก้ใน Task 1 Step 10 จะเป็น 1) · `afterClear: 43` · `civilInProc` = จำนวนแถวที่ `status==='In Process'` (> 0 และ < 43)

- [ ] **Step 12: Commit**

```bash
git add index.html && git commit -m "feat(action): split KPI into Civil/PS Global rows + PS Global status filter"
```

---

## Task 3: Drawer — สองบล็อก Civil / PS Global

**Files:**
- Modify: `index.html` — script (`openAct`, `actSave`)

**Interfaces:**
- Consumes (Task 1): `a.status2`, `a.note2`
- Consumes (ของเดิม): `ACT_STATUS`, `actPaintStep(sv)`, `actSaveOne(a)`, `renderActs()`, `closeModal()`, `esc(s)`, `attr(s)`, `T(k)`, `fmtReq(s)`, `actReqToggle(id)`, คลาส `.dtwo`/`.dleft`/`.dright`/`.frow`/`.fld`/`.dsec`/`.srcline`/`.stepper`/`.mact`
- Produces: ช่องกรอก `#ea_status2` และ `#ea_note2` ใน drawer, `actSave(id)` เขียน `status2`/`note2`

---

- [ ] **Step 1: เพิ่มตัวแปร `st2` ที่ต้นฟังก์ชัน `openAct`**

ค้นบรรทัด `function openAct(id){var a=ACTS.find(function(x){return x._id===id;});if(!a)return;var st=a.status||'Not Started';` แล้วแทนทั้งบรรทัดด้วย:

```js
function openAct(id){var a=ACTS.find(function(x){return x._id===id;});if(!a)return;var st=a.status||'Not Started',st2=a.status2||'Not Started';
```

- [ ] **Step 2: เขียนบล็อก `.dleft` ใหม่**

ในเทมเพลตของ `openAct` ค้นก้อน **8 บรรทัด** ตั้งแต่ `      <div class="dleft">` ถึง `      </div>` ที่ปิดมัน — ลำดับเดิมคือ `dleft` เปิด → `#actStep` → `frow`(สถานะ+Priority) → `frow`(กำหนดส่ง+วันที่เสร็จ) → `fld`(ผู้รับผิดชอบ) → `fld`(หมายเหตุ) → `${a.cat?...srcline...}` → `</div>` ปิด — แล้วแทนทั้งก้อนด้วย:

```html
      <div class="dleft">
        <div id="actStep" class="stepper"></div>
        <div class="frow"><div class="fld"><label>Priority</label><select id="ea_pri">${opt(a.pri||'Low',['High','Low'])}</select></div><div class="fld"><label>ผู้รับผิดชอบ</label><input id="ea_owner" value="${attr((a.owner||'').replace(/\n/g,' '))}"></div></div>
        <div class="frow"><div class="fld"><label>กำหนดส่ง (dd/mm/yyyy)</label><input id="ea_due" value="${attr(a.due||'')}"></div><div class="fld"><label>วันที่เสร็จ</label><input id="ea_done" value="${attr(a.done||'')}"></div></div>
        <div class="dsec">Civil</div>
        <div class="fld"><label>Work Status</label><select id="ea_status" onchange="actPaintStep(this.value)">${opt(st,ACT_STATUS)}</select></div>
        <div class="fld"><label>หมายเหตุ / ติดตาม</label><textarea id="ea_note" style="min-height:56px">${esc(a.note||'')}</textarea></div>
        <div class="dsec">PS Global</div>
        <div class="fld"><label>Work Status</label><select id="ea_status2">${opt(st2,ACT_STATUS)}</select></div>
        <div class="fld"><label>หมายเหตุ / ติดตาม</label><textarea id="ea_note2" style="min-height:56px">${esc(a.note2||'')}</textarea></div>
        ${a.cat?`<div class="srcline">หมวด: ${esc(a.cat)}</div>`:''}
      </div>
```

การเปลี่ยนแปลง: แถว `สถานะ + Priority` เดิมกลายเป็น `Priority + ผู้รับผิดชอบ` · ตัด `.fld` ของ `ผู้รับผิดชอบ` เดี่ยวออก (ย้ายขึ้นไปคู่กับ Priority) · `สถานะ`/`หมายเหตุ` เดิมย้ายลงไปอยู่ใต้หัวข้อ `Civil` · เพิ่มหัวข้อ `PS Global` พร้อม `#ea_status2` / `#ea_note2` · stepper ยังขับด้วย `#ea_status` เท่านั้น

- [ ] **Step 3: ให้ `actSave()` บันทึกฟิลด์ใหม่**

ค้นบรรทัด `function actSave(id){` แล้วแทนทั้งบรรทัดด้วย:

```js
function actSave(id){var a=ACTS.find(function(x){return x._id===id;});if(!a)return;var g=function(k){var el=document.getElementById(k);return el?el.value:undefined;};a.status=g('ea_status');a.status2=g('ea_status2');a.pri=g('ea_pri');a.due=g('ea_due');a.done=g('ea_done');a.owner=g('ea_owner');a.note=g('ea_note');a.note2=g('ea_note2');a.action=g('actReqTa');actSaveOne(a);renderActs();closeModal();if(window.toast)toast(T('saved'));}
```

- [ ] **Step 4: ตรวจ syntax**

รัน Verify Helper — syntax → ต้องได้ `SYNTAX OK`

- [ ] **Step 5: ตรวจ drawer ด้วย Playwright**

boot แบบ fallback แล้ว `browser_evaluate`:

```js
openAct(1);
var b=document.getElementById('mBody');
var secs=[].map.call(b.querySelectorAll('.dsec'),function(s){return s.textContent.trim();});
return {
  open: document.getElementById('modal').classList.contains('open'),
  secs: secs,
  hasStatus2: !!document.getElementById('ea_status2'),
  hasNote2: !!document.getElementById('ea_note2'),
  status2Val: document.getElementById('ea_status2').value,
  stepper: !!document.getElementById('actStep').innerHTML.trim()
};
```

Expected: `open:true` · `secs` มี `"Civil"` และ `"PS Global"` (และ `"Action Request"` จากฝั่งขวา) · `hasStatus2:true` · `hasNote2:true` · `status2Val:"Not Started"` · `stepper:true`

จากนั้นทดสอบ round-trip การบันทึก:

```js
openAct(1);
document.getElementById('ea_status2').value='In Process';
document.getElementById('ea_note2').value='ทดสอบ PS';
actSave(1);
var a=ACTS.find(function(x){return x._id===1;});
return {status2:a.status2, note2:a.note2, statusStillOK:a.status};
```

Expected: `{status2:"In Process", note2:"ทดสอบ PS", statusStillOK:"In Process"}` (ค่า `status` ของรายการ 1 ใน seed คือ `In Process` — ต้องไม่ถูกเขียนทับด้วยค่าอื่น)

- [ ] **Step 6: ตรวจว่าหน้าอื่นไม่ regress**

`browser_evaluate` ต่อในหน้าเดิม:

```js
closeModal();
setProjView('reqs');
var reqRows=document.querySelectorAll('#reqTable tbody tr').length;
setProjView('impl');
var gantt=!!document.querySelector('#piGantt, .pi-gantt, #implement');
setProjView('action');
var actRows=document.querySelectorAll('#actTable tbody tr').length;
return {reqRows, gantt, actRows, err:null};
```

Expected: `reqRows > 0` · `gantt: true` · `actRows: 43` · ไม่มี error ใน console (ตรวจด้วย `browser_console_messages` — ต้องไม่มี error ใหม่)

ถ่าย screenshot หน้า Action Item ไว้เทียบสายตากับรูปต้นทาง

- [ ] **Step 7: Commit**

```bash
git add index.html && git commit -m "feat(action): drawer with separate Civil and PS Global status/note blocks"
```

---

## Self-Review

**1. Spec coverage**

| หัวข้อใน spec | Task/Step |
|---|---|
| §1 เพิ่ม `status2`/`note2` + ค่าเริ่มต้น | Task 1 Step 1 |
| §1 ใช้ `ACT_STATUS`/`ACT_SC` เดิม ไม่สร้าง constant ใหม่ | Task 1 Step 4 (`ACT_SC[sv]`), Task 2 Step 3 |
| §1 ไม่ backfill Firestore | Task 1 Step 1 (in-memory only) + Global Constraints |
| §1 `actAdd()` template | Task 1 Step 3 |
| §1 `dept` ไม่ถูกลบ (drawer `#mSub` + คำค้น) | `#mSub` ไม่ถูกแตะใน Task 3 Step 2 (อยู่นอกก้อน `.dleft`); คำค้นคง `(a.dept||'')` ไว้ใน Task 2 Step 5 |
| §2 colgroup/thead 11 คอลัมน์ | Task 1 Steps 7–8 |
| §2 `actStatusCell(a,f)` | Task 1 Step 4 |
| §2 เรียง `done` แบบวันที่, `status2` แบบ string | Task 1 Step 6 (branch `k==='due'\|\|k==='done'`; `status2` ตกไป branch `localeCompare` เดิม) |
| §2 แถวเลยกำหนดไม่เปลี่ยน | Task 1 Step 5 (ยังใช้ `actOverdue(a)`) |
| §2 `colspan` 9→11 | Task 1 Step 5 |
| §3 KPI 2 แถว + label + spacer | Task 2 Steps 1, 7 |
| §3 `actOverdue2` | Task 1 Step 2 |
| §3 คลิกการ์ด → filter ฝั่งนั้น | Task 2 Step 8 |
| §3 CSS `.actkrow`/`.actkl`/`.actk-sp` | Task 2 Step 1 |
| §4 filter bar + label Civil/PS Global | Task 2 Step 2 |
| §4 `fillActFilters` / `filteredActs` / `actClear` / `actBind` / `actFilt.overdue2` | Task 2 Steps 3–6, 9 |
| §4 ค้นหาครอบ `note2` | Task 2 Step 5 |
| §5 drawer 2 บล็อก + stepper อิง Civil | Task 3 Steps 1–2 |
| §5 `actSave` เขียน `status2`/`note2` | Task 3 Step 3 |
| §5 `.dright` ไม่เปลี่ยน | Task 3 Step 2 แตะเฉพาะก้อน `.dleft` |
| §การตรวจสอบ 1 syntax | ทุก task (Step ก่อน commit) |
| §การตรวจสอบ 2 Playwright smoke | Task 1 Step 10, Task 2 Step 11, Task 3 Step 5 |
| §การตรวจสอบ 3 ไม่ regress หน้าอื่น | Task 3 Step 6 |
| §การตรวจสอบ 4 Firestore round-trip | ทำหลังจบ Task 3 — ต้องมี `js/firebase-config.js` จริง (ทำด้วยมือ ไม่อยู่ในสคริปต์) |

ครบทุกหัวข้อ

**2. Placeholder scan** — ไม่มี TBD/TODO/"similar to Task N" ทุก step มีโค้ดจริงและสตริงค้นหาที่ระบุชัด

**3. Type consistency**
- `actStatusCell(a,f)` — นิยาม Task 1 Step 4, เรียก Task 1 Step 5 ด้วย `'status'`/`'status2'` ✓
- `actOverdue2(a)` — นิยาม Task 1 Step 2, ใช้ Task 2 Steps 5, 7 ✓
- `actKfilter(f,st)` / `actKoverdue(f)` — นิยาม Task 2 Step 8, เรียกจาก markup ที่ Task 2 Step 7 สร้าง ✓ (ลำดับ argument `f` ก่อน `st` ตรงกันทั้งสองที่)
- `actFilt.overdue2` — ประกาศ Task 2 Step 4, อ่าน Task 2 Step 5, เขียน Task 2 Steps 6, 8 ✓
- `#actStatus2` — สร้าง Task 2 Step 2, เติม options Step 3, อ่าน Step 5, ล้าง Step 6, ผูก event Step 9, อ้างใน `actKfilter` Step 8 ✓
- `#ea_status2` / `#ea_note2` — สร้าง Task 3 Step 2, อ่าน Task 3 Step 3 ✓
- ฟิลด์ `status2` / `note2` — สะกดตรงกันทุก task ✓
