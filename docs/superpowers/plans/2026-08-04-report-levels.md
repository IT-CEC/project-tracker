# รายงาน 3 ระดับ (Report Catalog) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่ม sub-view ที่ 4 ใต้แท็บ *โปรเจค* ชื่อ "รายงาน 3 ระดับ" — แคตาล็อกรายงาน NetSuite 90 รายการ แสดงเป็น matrix แผนก × ระดับ + ตารางกรองได้ + drawer แก้ไข realtime

**Architecture:** ทุกอย่างอยู่ในไฟล์เดียว `index.html` Firestore collection ใหม่ `report_levels` (per-item doc, realtime ผ่าน `window.DB`) seed จาก `seed/report_levels.json` ที่ฝังเป็น `RPT_SEED` const โครงโค้ดลอกแพทเทิร์นจากฟีเจอร์ Action Items ที่มีอยู่ (`ACT_SEED`/`ACTS`/`loadActs`/`renderActs`/`openAct`) ทุกจุด — ชื่อฟังก์ชันเปลี่ยน prefix `act` → `rpt`

**Tech Stack:** Single-file HTML app, classic `<script>` + global functions (inline `onclick` ต้องการ global), Firebase Web SDK v11.10.0 modular ผ่าน `window.DB`, Firestore realtime

## Global Constraints

- แก้เฉพาะ `index.html` — ห้ามแตะ `js/db.js`, `js/auth.js`, `firestore.rules`, `seed/report_levels.json` (seed สร้างและ commit ไว้แล้ว)
- ห้ามแตะหน้าอื่นและ sub-view อื่น — เปลี่ยนเฉพาะสิ่งที่อยู่ในขอบเขต `#reportView` และฟังก์ชัน `rpt*` ยกเว้นจุดต่อสายที่ระบุไว้ชัดใน Task 2
- ระดับมี 3 ค่าเสมอ: `Operational` · `Managerial` · `Executive` — รายการที่ครอบคลุมหลายระดับเก็บเป็นสตริงคั่นด้วย ` / ` (มีอยู่จริง 2 แบบ: `Managerial / Executive` และ `Operational / Managerial / Executive`)
- สีระดับ: `Operational` `#0071e3` · `Managerial` `#ff9500` · `Executive` `#5e5ce6` · ไม่รู้จัก `#8e8e93`
- สีแผนก (ตาม prefix โมดูล): `HR` `#28cd41` · `FI` `#0071e3` · `MM` `#ff9500` · `PM` `#af52de` · `SD` `#ff3b30` · `PS` `#5e5ce6` · อื่น ๆ `#8e8e93`
- **การนับใน matrix:** เซลล์ระดับนับซ้ำ (รายการอยู่ได้หลายระดับ) · คอลัมน์ "รวม" รายแผนกนับไม่ซ้ำ → รวมทั้งหมด 90 · แถวล่างสุดของคอลัมน์ระดับ = 39 / 37 / 17
- **การจับกลุ่มความถี่:** dropdown มี 4 ตัวเลือก จับด้วย substring บนข้อความเดิม — `รายวัน`←`วัน` · `รายสัปดาห์`←`สัปดาห์` · `รายเดือน`←`เดือน` · `รายไตรมาส`←`ไตรมาส` · **ห้ามแก้ค่า `freq` ในข้อมูล** ตารางและ drawer แสดงข้อความเดิมเสมอ
- ไม่มี unit-test framework — **ตรวจทุก task ด้วย:** (1) syntax helper ด้านล่าง (2) Playwright smoke (3) commit
- ห้ามใช้ `git add -A` — stage `index.html` แบบระบุชื่อ

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

Expected: `SYNTAX OK` (baseline ปัจจุบันผ่านแล้ว)

### Verify Helper — Playwright smoke

1. เสิร์ฟไฟล์เป็น background task: `node "$SP/serve.js" "d:/Project Tracker" 8123` (ถ้า `serve.js` ไม่มีให้เขียน static server สั้น ๆ ลง scratchpad)
2. `browser_navigate` → `http://localhost:8123/index.html`
3. `browser_evaluate` — boot:

```js
document.getElementById('loginGate').style.display='none';
document.body.classList.remove('locked');
await window.startApp();
// ⚠️ หน้านี้ต่อ Firestore ตัวจริง — ปิดการเขียนก่อนทดสอบแก้ไขทุกครั้ง
window.__writes=[]; window.DB.saveItem=function(c,i){window.__writes.push({c:c,i:i});return Promise.resolve();};
showTab('project'); setProjView('report');
return {rows: document.querySelectorAll('#rptTable tbody tr').length};
```

> **⚠️ สำคัญ:** เบราว์เซอร์มี session Firebase ค้างอยู่ `startApp()` จะโหลดข้อมูล **production จริง** ไม่ใช่ seed ที่ฝังในโค้ด ดังนั้น
> - ต้อง stub `window.DB.saveItem` ก่อนทดสอบใด ๆ ที่แก้ข้อมูล แล้ว assert `window.__writes` เพื่อพิสูจน์ว่าไม่มี write หลุด
> - `RPTS.length` อาจ **ไม่เท่ากับ 90** ถ้ามีคนเพิ่ม/ลบใน production — ให้เทียบจำนวนแถวกับ `RPTS.length` เสมอ ห้าม assert เลข 90 ตรง ๆ ยกเว้นตอนตรวจ `RPT_SEED` เอง
> - นับแถวตารางต้อง **ไม่รวมแถว empty-state** → กรองด้วย `tr.children.length===7`

---

## File Structure

- **`index.html`** — ไฟล์เดียวที่แก้ แต่ละ task แตะคนละส่วน:
  - **Script — model/persistence** ~บรรทัด 1075 (`var _reqFirst=true,_setFirst=true;`) → แทรกบล็อก `RPT_SEED`/`RPTS`/persistence ต่อท้าย
  - **Script — boot** ~บรรทัด 2457 (`var _ld=document.getElementById('appLoading')...`) และ 2459 (`subscribeReqs();...`)
  - **HTML — sidebar** ~บรรทัด 802 (`.sb-item` ตัวสุดท้ายของกลุ่ม project)
  - **HTML — topbar** ~บรรทัด 836 (`#projToggle` ปุ่มสุดท้าย) และ 840 (`#addActBtn` ในกลุ่ม `.tb-right`)
  - **HTML — panel** ~บรรทัด 913 (ท้าย `#actionView` ก่อน `</section>` บรรทัด 914)
  - **Script — nav plumbing** `setProjView` ~1711 · `syncTopAdd` ~1710 · `refreshCrumb` · `NAVI` ~2325
  - **Script — view/drawer** แทรกต่อจากบล็อกฟังก์ชัน `act*` (หลัง `actDel`)
  - **CSS** `<style>` block ที่มี `.actkpi` (~บรรทัด 889–899) → เพิ่มบล็อกใหม่ต่อท้ายก่อน `</style>`

> เลขบรรทัดจะเลื่อนหลังแต่ละ task — ค้นด้วยสตริงที่ระบุในแต่ละ step ไม่ใช่เลขบรรทัด

---

## Task 1: Seed + model + persistence + boot wiring

**Files:** Modify `index.html` (script: บล็อกใหม่หลัง `var _reqFirst=true,_setFirst=true;` · boot 2 บรรทัด)

**Interfaces:**
- Consumes (ของเดิม): `window.DB`, `dbErr(msg)`, `clone(x)`, `toast(msg)`
- Produces (Task 2–4 ใช้ต่อ): `RPT_SEED` (array 90), `let RPTS`, `COL_RPT='report_levels'`, `RPT_LV`, `RPT_LVC`, `RPT_DEPTC`, `RPT_FREQ`, `rptLevels(r)->string[]`, `rptTopLv(r)->string`, `rptLvColor(r)->string`, `rptDeptColor(d)->string`, `rptFreqBucket(f)->string[]`, `rptDepts()->string[]`, `async loadRpts()`, `rptSaveOne(r)`, `rptDelOne(id)`, `subscribeRpts()`, `rptNorm()`, `rptBase()`

---

- [ ] **Step 1: แทรกบล็อก model + persistence**

อ่านไฟล์ `seed/report_levels.json` (array 90 object, valid JS อยู่แล้ว) แล้วแทรกบล็อกนี้ใน `<script>` หลักทันที **หลัง** บรรทัด `var _reqFirst=true,_setFirst=true;`

```js
// ══ Report Levels (report_levels collection) ══
const RPT_SEED = /* วาง array ทั้งก้อนจาก seed/report_levels.json ตรงนี้ แบบ verbatim */ ;
let RPTS = [];
const COL_RPT='report_levels';
const RPT_LV=['Operational','Managerial','Executive'];
const RPT_LVC={'Operational':'#0071e3','Managerial':'#ff9500','Executive':'#5e5ce6'};
const RPT_DEPTC={'HR':'#28cd41','FI':'#0071e3','MM':'#ff9500','PM':'#af52de','SD':'#ff3b30','PS':'#5e5ce6'};
const RPT_FREQ=[['รายวัน','วัน'],['รายสัปดาห์','สัปดาห์'],['รายเดือน','เดือน'],['รายไตรมาส','ไตรมาส']];
const RPT_KEYS=['dept','level','name','user','freq','kpi','src','decide','sample','want'];
function rptBase(){return clone(RPT_SEED);}
function rptNorm(){RPTS.sort(function(a,b){return (a._id||0)-(b._id||0);});RPTS.forEach(function(r){RPT_KEYS.forEach(function(k){if(r[k]==null)r[k]='';});});}
function rptLevels(r){var s=String((r&&r.level)||'');return RPT_LV.filter(function(l){return s.indexOf(l)>=0;});}
function rptTopLv(r){var L=rptLevels(r);return L.length?L[L.length-1]:'';}
function rptLvColor(r){return RPT_LVC[rptTopLv(r)]||'#8e8e93';}
function rptDeptColor(d){var k=String(d||'').trim().split(/\s+/)[0];return RPT_DEPTC[k]||'#8e8e93';}
function rptFreqBucket(f){var s=String(f||'');return RPT_FREQ.filter(function(p){return s.indexOf(p[1])>=0;}).map(function(p){return p[0];});}
function rptDepts(){var seen=[];RPTS.forEach(function(r){if(r.dept&&seen.indexOf(r.dept)<0)seen.push(r.dept);});return seen;}
async function loadRpts(){try{var arr=await window.DB.loadAll(COL_RPT);if(!arr.length){arr=rptBase();await Promise.all(arr.map(function(r){return window.DB.saveItem(COL_RPT,r._id,r);}));}RPTS=arr;}catch(e){console.error('[rpt load]',e);RPTS=rptBase();if(window.toast)toast('โหลดรายงาน 3 ระดับ จาก Firebase ไม่ได้ · ใช้ข้อมูลตั้งต้น');}rptNorm();}
function rptSaveOne(r){if(window.DB&&r&&r._id!=null)window.DB.saveItem(COL_RPT,r._id,r).catch(dbErr('report save'));}
function rptDelOne(id){if(window.DB&&id!=null)window.DB.deleteItem(COL_RPT,id).catch(dbErr('report del'));}
var _rptFirst=true;
function subscribeRpts(){if(!window.DB)return;window.DB.subscribe(COL_RPT,function(docs){if(_rptFirst){_rptFirst=false;return;}RPTS=docs;rptNorm();if(typeof fillRptFilters==='function')fillRptFilters();if(typeof curProjView!=='undefined'&&curProjView==='report'&&typeof renderRpts==='function')renderRpts();});}
```

`RPT_SEED` ต้องเป็น array จาก `seed/report_levels.json` แบบตรงตัว (90 object แต่ละอันมี key `_id,dept,level,name,user,freq,kpi,src,decide,sample,want`)

**หมายเหตุ `rptTopLv`:** `RPT_LV` เรียงจากต่ำไปสูง (`Operational` → `Managerial` → `Executive`) และ `rptLevels()` คืนค่าตามลำดับนั้น ตัวสุดท้ายจึงเป็นระดับสูงสุดเสมอ

- [ ] **Step 2: ต่อสายเข้า boot**

ค้นสตริง `setGanttCtx('pi');await loadPlan();await loadActs();` แล้วแทนด้วย:

```js
setGanttCtx('pi');await loadPlan();await loadActs();await loadRpts();
```

- [ ] **Step 3: ต่อสาย subscribe**

ค้นสตริง `subscribePlan();subscribeActs();` แล้วแทนด้วย:

```js
subscribePlan();subscribeActs();subscribeRpts();
```

- [ ] **Step 4: ตรวจ syntax**

รัน Verify Helper — syntax → ต้องได้ `SYNTAX OK`

- [ ] **Step 5: ตรวจด้วย Playwright**

boot ตาม Verify Helper (ข้ามบรรทัด `setProjView('report')` ไปก่อน เพราะ view ยังไม่มี) แล้ว `browser_evaluate`:

```js
var KEYS=['_id','dept','level','name','user','freq','kpi','src','decide','sample','want'];
var fill=function(k){return RPT_SEED.filter(function(o){return String(o[k]).trim();}).length;};
return {
  seedLen: RPT_SEED.length,
  allKeys: RPT_SEED.every(function(o){return KEYS.every(function(k){return k in o;});}),
  fill: {kpi:fill('kpi'), src:fill('src'), decide:fill('decide'), sample:fill('sample'), want:fill('want')},
  levels: [...new Set(RPT_SEED.map(function(o){return o.level;}))],
  depts: rptDepts().length,
  matrix: RPT_LV.map(function(l){return RPTS.filter(function(r){return rptLevels(r).indexOf(l)>=0;}).length;}),
  freq: RPT_FREQ.map(function(p){return RPTS.filter(function(r){return rptFreqBucket(r.freq).indexOf(p[0])>=0;}).length;}),
  topLvMulti: rptTopLv({level:'Managerial / Executive'}),
  deptColor: [rptDeptColor('PM เครื่องจักร'), rptDeptColor('การผลิต (Manufacturing)')],
  loaded: RPTS.length, fns: [typeof loadRpts, typeof subscribeRpts, typeof rptSaveOne]
};
```

Expected:
- `seedLen: 90` · `allKeys: true`
- `fill: {kpi:89, src:32, decide:69, sample:16, want:9}`
- `levels` = 5 ค่า: `["Operational","Managerial","Executive","Managerial / Executive","Operational / Managerial / Executive"]`
- `depts: 9`
- `matrix: [39,37,17]` · `freq: [30,12,50,6]` (ถ้า production มีข้อมูลต่างจาก seed ตัวเลขอาจเลื่อน — ในกรณีนั้นให้ยืนยันกับ `RPT_SEED` แทน `RPTS`)
- `topLvMulti: "Executive"` · `deptColor: ["#af52de","#8e8e93"]`
- `loaded` > 0 · `fns: ["function","function","function"]`

- [ ] **Step 6: Commit**

```bash
git add index.html && git commit -m "feat(report): seed + Firestore persistence for report_levels"
```

---

## Task 2: Nav plumbing + panel ว่าง

**Files:** Modify `index.html` (HTML: sidebar item, `#projToggle` button, `#addRptBtn`, `#reportView` panel · script: `setProjView`, `syncTopAdd`, `refreshCrumb`, `NAVI`)

**Interfaces:**
- Consumes (Task 1): `RPTS`
- Consumes (ของเดิม): `navLbl(k)`, `curProjView`, `updateNavActive()`, `piMoveThumb()`
- Produces (Task 3–4 ใช้ต่อ): `#reportView` panel ที่มี `#rptMatrix` / `#rptTable` / แถบ filter ครบ, `curProjView==='report'`, ปุ่ม `#addRptBtn`, การเรียก `renderRpts()` จาก `setProjView`

> `renderRpts()` / `rptAdd()` ยังไม่มีใน task นี้ — Task 2 ใส่ guard `typeof` ไว้แล้วจึงไม่ error

---

- [ ] **Step 1: เพิ่มรายการใน sidebar**

ค้นบรรทัดที่มี `data-tab="project" data-pv="action"` (`.sb-item` ของ Action Item) แล้วแทรกบรรทัดใหม่ **ต่อท้ายทันที**:

```html
      <a class="sb-item" data-tab="project" data-pv="report" data-tip="รายงาน 3 ระดับ"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="4" width="3" height="14"/></svg><span class="sb-label" data-nav="report">รายงาน 3 ระดับ</span></a>
```

- [ ] **Step 2: เพิ่มปุ่มใน `#projToggle`**

ค้นบรรทัดปุ่ม `data-pv="action" onclick="setProjView('action')"` แล้วแทรกบรรทัดใหม่ **ต่อท้ายทันที**:

```html
        <button class="pjt" data-pv="report" onclick="setProjView('report')"><svg class="eic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="4" width="3" height="14"/></svg> รายงาน 3 ระดับ</button>
```

- [ ] **Step 3: เพิ่มปุ่ม "+ เพิ่มรายงาน" ในแถบบน**

ค้นสตริง `<button class="tbtn pri" id="addBrBtn"` แล้วแทรกปุ่มใหม่ **ก่อนหน้า** ปุ่มนั้น (ยังอยู่ในบรรทัดเดียวกัน):

```html
<button class="tbtn pri" id="addRptBtn" style="display:none" onclick="rptAdd()">+ เพิ่มรายงาน</button>
```

- [ ] **Step 4: เพิ่ม label ลง `NAVI`**

ค้นสตริง `action:{th:'รายการงาน',en:'Action Items'},` แล้วแทนด้วย:

```js
action:{th:'รายการงาน',en:'Action Items'},report:{th:'รายงาน 3 ระดับ',en:'3-Level Reports'},
```

- [ ] **Step 5: เพิ่ม branch ใน `setProjView`**

ในฟังก์ชัน `setProjView` ทำ 3 จุดนี้ (แก้ในบรรทัดเดียวกันทั้งหมด):

1. ค้น `var im=document.getElementById('implement'),rq=document.getElementById('reqs'),ac=document.getElementById('actionView');`
   แทนด้วย:
```js
var im=document.getElementById('implement'),rq=document.getElementById('reqs'),ac=document.getElementById('actionView'),rp=document.getElementById('reportView');
```

2. ค้น `if(ac)ac.style.display=pv==='action'?'':'none';`
   แทนด้วย:
```js
if(ac)ac.style.display=pv==='action'?'':'none';if(rp)rp.style.display=pv==='report'?'':'none';
```

3. ค้น `else if(pv==='action'){renderActs();}`
   แทนด้วย:
```js
else if(pv==='action'){renderActs();}else if(pv==='report'){if(typeof renderRpts==='function')renderRpts();}
```

- [ ] **Step 6: ให้ `syncTopAdd` รู้จักปุ่มใหม่**

ค้นบรรทัด `function syncTopAdd(){` แล้วแทนทั้งบรรทัดด้วย:

```js
function syncTopAdd(){var p=document.querySelector('.panel.active');p=p?p.id:'';var show={addReqBtn:false,addActBtn:false,addRptBtn:false,addBrBtn:false};if(p==='project'){if(curProjView==='reqs')show.addReqBtn=true;else if(curProjView==='action')show.addActBtn=true;else if(curProjView==='report')show.addRptBtn=true;}else if(p==='bridge'){if(curBrView==='table')show.addBrBtn=true;}Object.keys(show).forEach(function(k){var b=document.getElementById(k);if(b)b.style.display=show[k]?'':'none';});}
```

- [ ] **Step 7: ให้ breadcrumb แสดงชื่อ view**

ค้นสตริง `cb.textContent={impl:navLbl('impl'),reqs:navLbl('reqs'),action:navLbl('action')}[curProjView]||navLbl('project');` แล้วแทนด้วย:

```js
cb.textContent={impl:navLbl('impl'),reqs:navLbl('reqs'),action:navLbl('action'),report:navLbl('report')}[curProjView]||navLbl('project');
```

- [ ] **Step 8: เพิ่ม CSS**

ค้นบรรทัด `#actTable td.act-duered{color:#ff3b30;font-weight:600}` แล้วแทรก **ต่อท้ายทันที** (ยังอยู่ในบล็อก `<style>` เดิม):

```css
.rptmx{border-collapse:separate;border-spacing:0;font-size:12.5px}
.rptmx th,.rptmx td{padding:7px 12px;border-bottom:1px solid var(--line);white-space:nowrap}
.rptmx thead th{font-size:11px;font-weight:700;color:var(--ink3);text-transform:uppercase;letter-spacing:.04em;text-align:center}
.rptmx thead th.mxd{text-align:left}
.rptmx th.mxd{text-align:left;font-weight:600;color:var(--ink);cursor:pointer}
.rptmx td.mxc{text-align:center;color:var(--ink);font-variant-numeric:tabular-nums}
.rptmx td.mxc.clk,.rptmx th.mxd,.rptmx thead th:not(.mxd){cursor:pointer;transition:background .12s,color .12s}
.rptmx td.mxc.clk:hover,.rptmx th.mxd:hover,.rptmx thead th:not(.mxd):hover{background:var(--hover)}
.rptmx td.mxc.zero{color:var(--ink3);opacity:.45}
.rptmx td.mxc.on,.rptmx th.mxd.on,.rptmx thead th.mxh.on{background:var(--mint);color:var(--accent);font-weight:700}
.rptmx .mxt{font-weight:700}
.rptmx tfoot th,.rptmx tfoot td{border-bottom:0;border-top:2px solid var(--line2);font-weight:700}
.mxnote{font-size:11px;color:var(--ink3);margin-top:8px}
#rptTable td.rpt-empty{color:var(--ink3);opacity:.5}
```

- [ ] **Step 9: เพิ่ม `#reportView` panel**

ค้นบรรทัด `    </div>` ที่ปิด `#actionView` (บรรทัดถัดจาก `      </table></div></div>` และอยู่ก่อน `    </section>`) แล้วแทรก panel ใหม่ **ระหว่าง** `</div>` นั้นกับ `</section>`:

```html
    <div class="projview" id="reportView" style="display:none">
      <div class="tablecard" style="padding:14px 16px"><div class="tscroll"><div id="rptMatrix"></div></div></div>
      <div class="bar" style="margin-top:10px">
        <span class="lbl">แผนก</span><select id="rptDept" data-multi="1"></select>
        <span class="lbl">ระดับ</span><select id="rptLevel" data-multi="1"></select>
        <span class="lbl">ความถี่</span><select id="rptFreq" data-multi="1"></select>
        <input type="text" id="rptSearch" placeholder="ค้นหา…" data-i18n-ph="search" style="width:180px;flex:none">
        <button class="tbtn" onclick="rptClear()">ล้าง</button>
      </div>
      <div class="tablecard"><div class="tscroll"><table class="dt" id="rptTable"><colgroup><col style="width:52px"><col style="width:150px"><col style="width:130px"><col style="width:330px"><col style="width:170px"><col style="width:110px"><col style="width:160px"></colgroup>
        <thead><tr><th data-rsort="_id">No <span class="ar"></span></th><th data-rsort="dept">แผนก <span class="ar"></span></th><th data-rsort="level">ระดับ <span class="ar"></span></th><th data-rsort="name">ชื่อรายงาน <span class="ar"></span></th><th>ผู้ใช้หลัก</th><th data-rsort="freq">ความถี่ <span class="ar"></span></th><th>แหล่งข้อมูล</th></tr></thead><tbody></tbody>
      </table></div></div>
    </div>
```

- [ ] **Step 10: ตรวจ syntax**

รัน Verify Helper — syntax → ต้องได้ `SYNTAX OK`

- [ ] **Step 11: ตรวจด้วย Playwright**

boot ตาม Verify Helper (รวมบรรทัด `setProjView('report')`) แล้ว `browser_evaluate`:

```js
var vis=function(id){var e=document.getElementById(id);return e?getComputedStyle(e).display!=='none':null;};
return {
  panelOn: vis('reportView'),
  othersOff: [vis('implement'), vis('reqs'), vis('actionView')],
  crumb: document.getElementById('crumbNow').textContent.trim(),
  addBtn: vis('addRptBtn'),
  sbActive: !!document.querySelector('.sb-item[data-pv="report"].active'),
  toggleOn: !!document.querySelector('#projToggle .pjt[data-pv="report"].on'),
  hasMatrix: !!document.getElementById('rptMatrix'),
  ths: [].map.call(document.querySelectorAll('#rptTable thead th'),function(t){return t.textContent.trim();}),
  selects: ['rptDept','rptLevel','rptFreq','rptSearch'].map(function(i){return !!document.getElementById(i);})
};
```

Expected: `panelOn:true` · `othersOff:[false,false,false]` · `crumb:"รายงาน 3 ระดับ"` · `addBtn:true` · `sbActive:true` · `toggleOn:true` · `hasMatrix:true` · `ths` = `["No","แผนก","ระดับ","ชื่อรายงาน","ผู้ใช้หลัก","ความถี่","แหล่งข้อมูล"]` · `selects:[true,true,true,true]`

จากนั้นตรวจว่า view อื่นยังสลับได้และไม่มี error:

```js
var errs=[]; var oe=function(e){errs.push(String(e.message||e));}; window.addEventListener('error',oe);
var r={};
['impl','reqs','action','report'].forEach(function(pv){try{setProjView(pv);r[pv]=true;}catch(e){r[pv]='THREW: '+e.message;}});
['overview','project','bridge','settings'].forEach(function(t){try{showTab(t);}catch(e){errs.push(t+': '+e.message);}});
showTab('project'); setProjView('report');
window.removeEventListener('error',oe);
return {views:r, jsErrors:errs, topbarOverflow:(function(){var t=document.querySelector('.topbar');return t?t.scrollWidth>t.clientWidth:null;})()};
```

Expected: `views` ทุกตัว `true` · `jsErrors: []` · `topbarOverflow: false`

**ถ้า `topbarOverflow` เป็น `true`** ที่ความกว้าง 1280px (ตั้งด้วย `browser_resize` 1280×800 ก่อนวัด): ให้ย่อป้ายปุ่มใน `#projToggle` เป็นข้อความสั้น — `แผนงาน` · `ความต้องการ` · `Action Item` · `รายงาน 3 ระดับ` (ตัดวงเล็บภาษาอังกฤษออก) แล้ววัดซ้ำจนไม่ล้น

- [ ] **Step 12: Commit**

```bash
git add index.html && git commit -m "feat(report): nav entry + empty report catalog panel"
```

---

## Task 3: Matrix + ตาราง + filter

**Files:** Modify `index.html` (script: เพิ่มฟังก์ชัน `rpt*` ต่อจาก `actDel` · boot 1 บรรทัด)

**Interfaces:**
- Consumes (Task 1): `RPTS`, `RPT_LV`, `RPT_FREQ`, `rptLevels`, `rptLvColor`, `rptDeptColor`, `rptFreqBucket`, `rptDepts`
- Consumes (Task 2): `#rptMatrix`, `#rptTable`, `#rptDept`, `#rptLevel`, `#rptFreq`, `#rptSearch`, CSS `.rptmx`
- Consumes (ของเดิม): `setOpts(id,arr,allLabel)`, `vm(id)->string[]`, `v(id)->string`, `esc(s)`, `attr(s)`
- Produces (Task 4 ใช้ต่อ): `renderRpts()`, `renderRptMatrix()`, `renderRptTable()`, `filteredRpts()`, `fillRptFilters()`, `rptClear()`, `rptPick(dept,lv)`, `rptChip(text,color)`, `rptBind()`, `rptSel={dept,lv}`

---

- [ ] **Step 1: เพิ่มฟังก์ชัน view**

แทรกบล็อกนี้ **หลัง** บรรทัดที่ขึ้นต้นด้วย `function actDel(id){`

```js
// ══ Report Levels — view ══
let rptSortK='',rptSortD=1,rptSel={dept:'',lv:''};
function rptChip(t,col){return t?'<span class="chip" style="background:'+col+'1f;color:'+col+'">'+esc(t)+'</span>':'';}
function fillRptFilters(){setOpts('rptDept',rptDepts(),'ทุกแผนก');setOpts('rptLevel',RPT_LV,'ทุกระดับ');setOpts('rptFreq',RPT_FREQ.map(function(p){return p[0];}),'ทุกความถี่');}
function filteredRpts(){
  var ds=vm('rptDept'),ls=vm('rptLevel'),fs=vm('rptFreq'),q=v('rptSearch').toLowerCase().trim();
  var r=RPTS.filter(function(x){
    if(rptSel.dept&&x.dept!==rptSel.dept)return false;
    if(rptSel.lv&&rptLevels(x).indexOf(rptSel.lv)<0)return false;
    if(ds.length&&ds.indexOf(x.dept)<0)return false;
    if(ls.length&&!ls.some(function(l){return rptLevels(x).indexOf(l)>=0;}))return false;
    if(fs.length&&!fs.some(function(f){return rptFreqBucket(x.freq).indexOf(f)>=0;}))return false;
    if(q&&((x.name||'')+' '+(x.user||'')+' '+(x.kpi||'')+' '+(x.src||'')+' '+(x.decide||'')+' '+(x.sample||'')+' '+(x.want||'')).toLowerCase().indexOf(q)<0)return false;
    return true;
  });
  if(rptSortK){var k=rptSortK;r=r.slice().sort(function(a,b){if(k==='_id')return ((a._id||0)-(b._id||0))*rptSortD;return String(a[k]||'').localeCompare(String(b[k]||''),'th')*rptSortD;});}
  return r;
}
function rptPick(d,l){rptSel.dept=d;rptSel.lv=l;renderRpts();}
function rptClear(){rptSel.dept='';rptSel.lv='';['rptDept','rptLevel','rptFreq','rptSearch'].forEach(function(id){var e=document.getElementById(id);if(e)e.value='';});renderRpts();}
function renderRptMatrix(){
  var el=document.getElementById('rptMatrix');if(!el)return;
  var depts=rptDepts(),nAll=RPTS.length;
  var cnt=function(rows,l){return rows.filter(function(r){return rptLevels(r).indexOf(l)>=0;}).length;};
  var h='<table class="rptmx"><thead><tr><th class="mxd">แผนก</th>';
  RPT_LV.forEach(function(l){h+='<th class="mxh'+(!rptSel.dept&&rptSel.lv===l?' on':'')+'" onclick="rptPick(\'\',\''+l+'\')">'+l+'</th>';});
  h+='<th class="mxt">รวม</th></tr></thead><tbody>';
  depts.forEach(function(d){
    var rs=RPTS.filter(function(r){return r.dept===d;}),da=attr(d);
    h+='<tr><th class="mxd'+(rptSel.dept===d&&!rptSel.lv?' on':'')+'" onclick="rptPick(\''+da+'\',\'\')">'+esc(d)+'</th>';
    RPT_LV.forEach(function(l){
      var n=cnt(rs,l),on=(rptSel.dept===d&&rptSel.lv===l);
      h+=n?'<td class="mxc clk'+(on?' on':'')+'" onclick="rptPick(\''+da+'\',\''+l+'\')">'+n+'</td>':'<td class="mxc zero">–</td>';
    });
    h+='<td class="mxc mxt clk'+(rptSel.dept===d&&!rptSel.lv?' on':'')+'" onclick="rptPick(\''+da+'\',\'\')">'+rs.length+'</td></tr>';
  });
  var tl=RPT_LV.map(function(l){return cnt(RPTS,l);});
  h+='</tbody><tfoot><tr><th class="mxd">รวม</th>';
  tl.forEach(function(n,i){h+='<td class="mxc clk'+(!rptSel.dept&&rptSel.lv===RPT_LV[i]?' on':'')+'" onclick="rptPick(\'\',\''+RPT_LV[i]+'\')">'+n+'</td>';});
  h+='<td class="mxc mxt clk" onclick="rptClear()">'+nAll+'</td></tr></tfoot></table>';
  var multi=RPTS.filter(function(r){return rptLevels(r).length>1;}).length;
  if(multi)h+='<div class="mxnote">'+multi+' รายการครอบคลุมหลายระดับ จึงถูกนับซ้ำในคอลัมน์ระดับ (รวมคอลัมน์ระดับ = '+tl.reduce(function(a,b){return a+b;},0)+' · รายงานทั้งหมด = '+nAll+')</div>';
  el.innerHTML=h;
}
function renderRptTable(){
  var rows=filteredRpts(),tb=document.querySelector('#rptTable tbody');if(!tb)return;
  tb.innerHTML=rows.map(function(r){
    return '<tr onclick="openRpt('+r._id+')" style="cursor:pointer">'
      +'<td class="muted">'+r._id+'</td>'
      +'<td>'+rptChip(r.dept,rptDeptColor(r.dept))+'</td>'
      +'<td>'+rptChip(r.level,rptLvColor(r))+'</td>'
      +'<td><div class="truncate" style="max-width:320px;color:var(--ink)">'+esc(r.name||'')+'</div></td>'
      +'<td><div class="truncate">'+esc(r.user||'')+'</div></td>'
      +'<td class="muted">'+esc(r.freq||'')+'</td>'
      +'<td class="'+(String(r.src||'').trim()?'muted':'rpt-empty')+'"><div class="truncate">'+esc(String(r.src||'').replace(/\n/g,' ').trim()||'—')+'</div></td>'
      +'</tr>';
  }).join('')||'<tr><td colspan="7" style="text-align:center;padding:40px" class="muted">ไม่พบรายการ</td></tr>';
}
function renderRpts(){renderRptMatrix();renderRptTable();}
function rptBind(){
  ['rptDept','rptLevel','rptFreq','rptSearch'].forEach(function(id){var e=document.getElementById(id);if(e)e.addEventListener('input',renderRptTable);});
  document.querySelectorAll('#rptTable th[data-rsort]').forEach(function(th){th.style.cursor='pointer';th.onclick=function(){var k=th.dataset.rsort;if(rptSortK===k)rptSortD=-rptSortD;else{rptSortK=k;rptSortD=1;}renderRptTable();};});
}
```

> `openRpt` มาใน Task 4 — ตอนนี้ยังไม่มี แต่เป็นแค่สตริงใน `onclick` จึงไม่ error จนกว่าจะคลิก

- [ ] **Step 2: ต่อสายเข้า boot**

ค้นสตริง `await loadRpts();` (เพิ่มไว้ตอน Task 1) แล้วแทนด้วย:

```js
await loadRpts();fillRptFilters();rptBind();
```

- [ ] **Step 3: ตรวจ syntax**

รัน Verify Helper — syntax → ต้องได้ `SYNTAX OK`

- [ ] **Step 4: ตรวจ matrix ด้วย Playwright**

boot ตาม Verify Helper แล้ว `browser_evaluate`:

```js
var mx=document.querySelector('#rptMatrix table.rptmx');
var body=[].map.call(mx.querySelectorAll('tbody tr'),function(tr){
  return {d:tr.querySelector('th').textContent.trim(), c:[].map.call(tr.querySelectorAll('td'),function(td){return td.textContent.trim();})};
});
var foot=[].map.call(mx.querySelectorAll('tfoot td'),function(td){return td.textContent.trim();});
var nrows=function(){return [].filter.call(document.querySelectorAll('#rptTable tbody tr'),function(t){return t.children.length===7;}).length;};
return {deptRows:body.length, body:body, foot:foot, note:(document.querySelector('.mxnote')||{}).textContent, tableRows:nrows(), total:RPTS.length};
```

Expected (ถ้า production ยังเท่ากับ seed):
- `deptRows: 9`
- `body[0]` = `{d:"HR บุคคล/แรงงาน", c:["2","1","1","4"]}` · `body[5]` = `{d:"PM เครื่องจักร", c:["10","9","6","25"]}` · `body[7]` = `{d:"PS โครงการ", c:["1","11","2","14"]}`
- แถวที่มีค่า 0 แสดงเป็น `–` (เช่น `FI บัญชี/การเงิน` = `["3","–","–","3"]`)
- `foot` = `["39","37","17","90"]`
- `note` มีข้อความ `2 รายการครอบคลุมหลายระดับ` และ `= 93` และ `= 90`
- `tableRows` = `total`

- [ ] **Step 5: ตรวจการคลิกและ filter**

`browser_evaluate` ต่อ:

```js
var nrows=function(){return [].filter.call(document.querySelectorAll('#rptTable tbody tr'),function(t){return t.children.length===7;}).length;};
var o={};
rptPick('PM เครื่องจักร','Executive'); o.cellPM_E=nrows();
rptPick('PS โครงการ','');             o.rowPS=nrows();
rptPick('','Managerial');             o.colManag=nrows();
rptClear();                            o.afterClear=nrows();
var setSel=function(id,val){var e=document.getElementById(id);e.value=val;e.dispatchEvent(new Event('input',{bubbles:true}));};
setSel('rptFreq','รายสัปดาห์'); o.freqWeek=nrows(); rptClear();
setSel('rptSearch','AVAL');     o.search=nrows(); o.searchId=(document.querySelector('#rptTable tbody tr td')||{}).textContent; rptClear();
o.expect={cellPM_E:RPTS.filter(function(r){return r.dept==='PM เครื่องจักร'&&rptLevels(r).indexOf('Executive')>=0;}).length,
          rowPS:RPTS.filter(function(r){return r.dept==='PS โครงการ';}).length,
          colManag:RPTS.filter(function(r){return rptLevels(r).indexOf('Managerial')>=0;}).length,
          freqWeek:RPTS.filter(function(r){return rptFreqBucket(r.freq).indexOf('รายสัปดาห์')>=0;}).length,
          total:RPTS.length};
o.emptyColspan=(function(){setSel('rptSearch','zzzznotfound');var td=document.querySelector('#rptTable tbody td[colspan]');var c=td?td.getAttribute('colspan'):null;rptClear();return c;})();
return o;
```

Expected: `cellPM_E:6` · `rowPS:14` · `colManag:37` · `afterClear` = `total` · `freqWeek:12` · `search:1` และ `searchId:"18"` · `emptyColspan:"7"` — และทุกค่าตรงกับ `o.expect` ตัวที่คู่กัน

- [ ] **Step 6: Screenshot ตรวจสายตา**

`browser_resize` เป็น 1440×900 แล้ว `browser_take_screenshot` — ตรวจว่า matrix อ่านง่าย เซลล์ที่เลือกไฮไลต์ชัด และ chip แผนก/ระดับสีถูกตามที่ระบุใน Global Constraints

- [ ] **Step 7: Commit**

```bash
git add index.html && git commit -m "feat(report): dept x level matrix, catalog table, filters"
```

---

## Task 4: Drawer + เพิ่ม/ลบ

**Files:** Modify `index.html` (script: `openRpt`, `rptSave`, `rptAdd`, `rptDel` ต่อจากบล็อก Task 3)

**Interfaces:**
- Consumes (Task 1): `RPTS`, `RPT_LV`, `rptNorm`, `rptSaveOne`, `rptDelOne`, `rptDepts`
- Consumes (Task 3): `renderRpts()`, `fillRptFilters()`
- Consumes (ของเดิม): `#modal`, `#mTitle`, `#mSub`, `#mBody`, `closeModal()`, `esc(s)`, `attr(s)`, `T(k)`, `toast(msg)`, คลาส `.dtwo`/`.dleft`/`.dright`/`.frow`/`.fld`/`.dsec`/`.dsec1`/`.mact`
- Produces: `openRpt(id)`, `rptSave(id)`, `rptAdd()`, `rptDel(id)`

---

- [ ] **Step 1: เพิ่ม drawer + add/delete**

แทรกบล็อกนี้ **ต่อท้าย** บล็อกที่เพิ่มไว้ใน Task 3 (หลัง `function rptBind(){...}`)

```js
function openRpt(id){
  var r=RPTS.find(function(x){return x._id===id;});if(!r)return;
  var opt=function(cur,arr){return arr.map(function(x){return '<option '+(x===cur?'selected':'')+'>'+esc(String(x))+'</option>';}).join('');};
  var lvOpts=RPT_LV.slice();RPTS.forEach(function(x){if(x.level&&lvOpts.indexOf(x.level)<0)lvOpts.push(x.level);});
  var dpOpts=rptDepts();if(r.dept&&dpOpts.indexOf(r.dept)<0)dpOpts.push(r.dept);
  document.getElementById('mTitle').textContent='รายงาน #'+r._id+(r.dept?' · '+r.dept:'');
  document.getElementById('mSub').textContent=[r.level,r.freq].filter(Boolean).join(' · ');
  document.getElementById('mBody').innerHTML=`
    <div class="dtwo">
      <div class="dleft">
        <div class="frow"><div class="fld"><label>แผนก</label><select id="er_dept">${opt(r.dept||'',dpOpts)}</select></div><div class="fld"><label>ระดับ</label><select id="er_level">${opt(r.level||'',lvOpts)}</select></div></div>
        <div class="frow"><div class="fld"><label>ผู้ใช้หลัก</label><input id="er_user" value="${attr(r.user||'')}"></div><div class="fld"><label>ความถี่</label><input id="er_freq" value="${attr(r.freq||'')}"></div></div>
        <div class="fld"><label>แหล่งข้อมูล (NetSuite)</label><input id="er_src" value="${attr(r.src||'')}"></div>
        <div class="dsec">ตัวชี้วัด / ข้อมูลหลัก</div>
        <div class="fld"><textarea id="er_kpi" style="min-height:64px">${esc(r.kpi||'')}</textarea></div>
        <div class="dsec">ใช้ตัดสินใจอะไร</div>
        <div class="fld"><textarea id="er_decide" style="min-height:64px">${esc(r.decide||'')}</textarea></div>
      </div>
      <div class="dright">
        <div class="dsec dsec1">ชื่อรายงาน</div>
        <div class="fld"><textarea id="er_name" style="min-height:56px">${esc(r.name||'')}</textarea></div>
        <div class="dsec">ชื่อไฟล์ตัวอย่าง</div>
        <div class="fld"><textarea id="er_sample" style="min-height:56px">${esc(r.sample||'')}</textarea></div>
        <div class="dsec">กรณีไม่มีไฟล์ตัวอย่าง อยากเห็นข้อมูลอะไรบ้าง</div>
        <div class="fld"><textarea id="er_want" style="min-height:88px">${esc(r.want||'')}</textarea></div>
      </div>
    </div>
    <div class="mact"><button class="btn btn-pri" onclick="rptSave(${id})">${T('save')}</button><button class="btn btn-sec" onclick="closeModal()">${T('cancel')}</button><button class="btn btn-danger" onclick="rptDel(${id})">${T('delete')}</button></div>`;
  document.getElementById('modal').classList.add('open');
}
function rptSave(id){
  var r=RPTS.find(function(x){return x._id===id;});if(!r)return;
  var g=function(k){var el=document.getElementById(k);return el?el.value:undefined;};
  RPT_KEYS.forEach(function(k){var val=g('er_'+k);if(val!==undefined)r[k]=val;});
  rptSaveOne(r);fillRptFilters();renderRpts();closeModal();if(window.toast)toast(T('saved'));
}
function rptAdd(){
  var nid=RPTS.reduce(function(m,r){return Math.max(m,r._id||0);},0)+1;
  var r={_id:nid,dept:(rptDepts()[0]||''),level:'Operational',name:'รายงานใหม่',user:'',freq:'',kpi:'',src:'',decide:'',sample:'',want:''};
  RPTS.push(r);rptNorm();rptSaveOne(r);fillRptFilters();renderRpts();openRpt(nid);
}
function rptDel(id){
  var r=RPTS.find(function(x){return x._id===id;});if(!r)return;
  if(!confirm('ลบรายงาน #'+id+' ?'))return;
  RPTS=RPTS.filter(function(x){return x._id!==id;});rptDelOne(id);fillRptFilters();renderRpts();closeModal();if(window.toast)toast('ลบแล้ว');
}
```

**หมายเหตุ `rptSave`:** วนตาม `RPT_KEYS` (`['dept','level','name','user','freq','kpi','src','decide','sample','want']`) ซึ่งตรงกับ id ของช่องกรอกที่ขึ้นต้นด้วย `er_` ทุกตัว จึงไม่ต้องเขียนซ้ำทีละฟิลด์

- [ ] **Step 2: ตรวจ syntax**

รัน Verify Helper — syntax → ต้องได้ `SYNTAX OK`

- [ ] **Step 3: ตรวจ drawer ด้วย Playwright**

boot ตาม Verify Helper (**ต้อง stub `DB.saveItem` ก่อน**) แล้ว `browser_evaluate`:

```js
openRpt(18);
var b=document.getElementById('mBody');
var secs=[].map.call(b.querySelectorAll('.dsec'),function(s){return s.textContent.trim();});
return {
  open: document.getElementById('modal').classList.contains('open'),
  title: document.getElementById('mTitle').textContent,
  sub: document.getElementById('mSub').textContent,
  secs: secs,
  fields: ['er_dept','er_level','er_user','er_freq','er_src','er_kpi','er_decide','er_name','er_sample','er_want'].map(function(i){return !!document.getElementById(i);}),
  levelVal: document.getElementById('er_level').value,
  levelOptCount: document.getElementById('er_level').options.length,
  deptVal: document.getElementById('er_dept').value
};
```

Expected: `open:true` · `title` = `"รายงาน #18 · FI การเงิน"` · `sub` = `"Operational / Managerial / Executive · รายวัน"` · `secs` ครบ 5 หัวข้อ (`ตัวชี้วัด / ข้อมูลหลัก`, `ใช้ตัดสินใจอะไร`, `ชื่อรายงาน`, `ชื่อไฟล์ตัวอย่าง`, `กรณีไม่มีไฟล์ตัวอย่าง อยากเห็นข้อมูลอะไรบ้าง`) · `fields` ทุกตัว `true` · `levelVal` = `"Operational / Managerial / Executive"` · `levelOptCount:5` · `deptVal` = `"FI การเงิน"`

- [ ] **Step 4: ตรวจ save round-trip**

```js
openRpt(18);
var nameBefore=RPTS.find(function(x){return x._id===18;}).name;
document.getElementById('er_src').value='NetSuite · Saved Search 278';
document.getElementById('er_sample').value='AVAL_PN_sample.xlsx';
rptSave(18);
var r=RPTS.find(function(x){return x._id===18;});
var row=[].filter.call(document.querySelectorAll('#rptTable tbody tr'),function(t){return t.children[0].textContent.trim()==='18';})[0];
return {src:r.src, sample:r.sample, nameUnchanged:r.name===nameBefore,
        closed:!document.getElementById('modal').classList.contains('open'),
        tableSrc:row?row.children[6].textContent.trim():null,
        writes:window.__writes};
```

Expected: `src:"NetSuite · Saved Search 278"` · `sample:"AVAL_PN_sample.xlsx"` · `nameUnchanged:true` · `closed:true` · `tableSrc:"NetSuite · Saved Search 278"` · `writes` มี 1 รายการ `{c:"report_levels",i:18}` (พิสูจน์ว่าถูก stub ดักไว้ ไม่ถึง Firestore จริง)

- [ ] **Step 5: ตรวจ add / delete**

```js
window.confirm=function(){return true;};
var before=RPTS.length;
rptAdd();
var added=RPTS.length, newId=Math.max.apply(null,RPTS.map(function(r){return r._id;}));
var inDrawer=document.getElementById('mTitle').textContent;
rptDel(newId);
var after=RPTS.length;
var mxTotal=(document.querySelector('#rptMatrix tfoot td.mxt')||{}).textContent;
return {before:before, added:added, after:after, newId:newId, inDrawer:inDrawer, mxTotal:mxTotal, writes:window.__writes.length};
```

Expected: `added === before + 1` · `after === before` · `inDrawer` มีคำว่า `รายงาน #` + `newId` · `mxTotal` เท่ากับ `after` · `writes` เพิ่มขึ้น (ทุก write ถูก stub ดัก)

- [ ] **Step 6: ตรวจว่าไม่ regress**

```js
closeModal();
var errs=[]; var oe=function(e){errs.push(String(e.message||e));}; window.addEventListener('error',oe);
var r={};
['impl','reqs','action','report'].forEach(function(pv){try{setProjView(pv);r[pv]=true;}catch(e){r[pv]='THREW: '+e.message;}});
['overview','project','bridge','settings'].forEach(function(t){try{showTab(t);}catch(e){errs.push(t+': '+e.message);}});
showTab('project');setProjView('reqs');var reqRows=document.querySelectorAll('#reqTable tbody tr').length;
setProjView('action');var actRows=document.querySelectorAll('#actTable tbody tr').length;
setProjView('report');
window.removeEventListener('error',oe);
return {views:r, reqRows:reqRows, actRows:actRows, jsErrors:errs};
```

Expected: `views` ทุกตัว `true` · `reqRows > 0` · `actRows > 0` · `jsErrors: []`
ตรวจ `browser_console_messages` ระดับ `error` เพิ่มเติม — ต้องมีแค่ 404 ของ `sf-pro-display/*.OTF` (มีอยู่ก่อนแล้ว) ไม่มี error ใหม่

- [ ] **Step 7: Screenshot drawer**

`browser_evaluate` เรียก `openRpt(18)` แล้ว `browser_take_screenshot` — ตรวจว่าฝั่งซ้าย/ขวาสมดุล หัวข้อ `.dsec` อ่านออก และไม่มีช่องล้นกรอบ

- [ ] **Step 8: ลบไฟล์ screenshot ที่หลุดลง repo แล้ว commit**

```bash
rm -f *.png && rm -rf .playwright-mcp
git add index.html && git commit -m "feat(report): detail drawer + add/delete report entries"
```

---

## Self-Review

**1. Spec coverage**

| หัวข้อใน spec | Task/Step |
|---|---|
| §1 collection `report_levels`, per-item, realtime | Task 1 Step 1 (`COL_RPT`, `loadRpts`, `subscribeRpts`), Step 3 |
| §1 ฟิลด์ 11 ตัว + ค่าว่างเป็น `''` | Task 1 Step 1 (`RPT_KEYS`, `rptNorm`) |
| §1 seed จาก `seed/report_levels.json` ฝังเป็น `RPT_SEED` | Task 1 Step 1 + verify Step 5 (`seedLen:90`, fill rate) |
| §1 parser / normalize whitespace | ทำไปแล้วตอนสร้าง seed (commit `690f590`) — plan ไม่ต้องทำซ้ำ |
| §2 matrix 9×3 + คอลัมน์รวม | Task 3 Step 1 (`renderRptMatrix`), verify Step 4 |
| §2 ตัวเลข 39/37/17 และรวม 90 | Task 3 Step 4 (`foot` = `["39","37","17","90"]`) |
| §2 กติกานับซ้ำ + เชิงอรรถ | Task 3 Step 1 (`cnt()` ใช้ `rptLevels`, `.mxnote` คำนวณ `multi` จากข้อมูลจริง) |
| §2 การคลิก 5 แบบ | Task 3 Step 1 (`rptPick` ที่หัวแถว/หัวคอลัมน์/เซลล์/คอลัมน์รวม + `rptClear` ที่มุมล่างขวา), verify Step 5 |
| §2 เซลล์ 0 จางและคลิกไม่ได้ | Task 3 Step 1 (`class="mxc zero"` ไม่มี `onclick`) + CSS Task 2 Step 8 |
| §2 ไฮไลต์เซลล์ที่เลือก | CSS `.on` (Task 2 Step 8) + logic `rptSel` (Task 3 Step 1) |
| §3 ตาราง 7 คอลัมน์ + เรียงได้ 5 คอลัมน์ | Task 2 Step 9 (`thead` + `data-rsort`), Task 3 Step 1 (`renderRptTable`, `rptBind`) |
| §3 `src` ว่างแสดง `—` สีจาง | Task 3 Step 1 (`rpt-empty`) + CSS Task 2 Step 8 |
| §3 สี chip ระดับ/แผนก + ระดับสูงสุด | Task 1 Step 1 (`rptLvColor`/`rptTopLv`/`rptDeptColor`), verify Step 5 |
| §4 filter 3 dropdown + ค้นหา + ล้าง | Task 2 Step 9 (markup), Task 3 Step 1 (`fillRptFilters`/`filteredRpts`/`rptClear`) |
| §4 ค้นหาครอบ 7 ฟิลด์ | Task 3 Step 1 (`filteredRpts` รวม name/user/kpi/src/decide/sample/want) |
| §4 ความถี่ยุบ 4 กลุ่ม ไม่แก้ข้อมูล | Task 1 Step 1 (`RPT_FREQ`/`rptFreqBucket`), Task 3 Step 5 (`freqWeek:12`) |
| §5 drawer แก้ได้ทุกฟิลด์ + ปุ่ม 3 ปุ่ม | Task 4 Step 1 (`openRpt`/`rptSave`/`rptDel`) |
| §5 select แผนก/ระดับ, ระดับมี 5 ค่า | Task 4 Step 1 (`lvOpts`/`dpOpts`), verify Step 3 (`levelOptCount:5`) |
| §5 ปุ่ม + เพิ่มรายงาน, `_id` = max+1 | Task 2 Step 3 (`#addRptBtn`) + Task 4 Step 1 (`rptAdd`) |
| §6 ปุ่มที่ 4 ใน `#projToggle` + `setProjView` + boot | Task 2 Steps 2, 5 · Task 1 Steps 2–3 · Task 3 Step 2 |
| §6 ข้อควรระวัง topbar ล้น | Task 2 Step 11 (วัด `topbarOverflow` ที่ 1280px + ทางแก้) |
| §การตรวจสอบ 1 syntax | ทุก task ก่อน commit |
| §การตรวจสอบ 2 seed ถูกต้อง | Task 1 Step 5 |
| §การตรวจสอบ 3 Playwright smoke ทุกข้อ | Task 3 Steps 4–5 · Task 4 Steps 3–5 |
| §การตรวจสอบ 4 ไม่ regression + topbar | Task 2 Step 11 · Task 4 Step 6 |

ครบทุกหัวข้อ — สิ่งเดียวที่ไม่มี task คือการสร้าง seed ซึ่งทำและ commit ไปแล้วก่อนเขียนแผน

**2. Placeholder scan** — ไม่มี TBD/TODO/"เหมือน Task N" · ที่เว้นไว้จุดเดียวคือ `RPT_SEED` = เนื้อไฟล์ `seed/report_levels.json` ซึ่งเป็นไฟล์จริงที่ commit แล้ว ไม่ใช่ placeholder ลอย ๆ

**3. Type consistency**
- `rptLevels(r)` รับ **object** (ใช้ `r.level`) — เรียกด้วย object ทุกที่: Task 3 `filteredRpts`/`cnt`, Task 1 verify ✓
- `rptFreqBucket(f)` รับ **string** (`r.freq`) — เรียกด้วย `x.freq`/`r.freq` ทุกที่ ✓
- `rptDeptColor(d)` รับ **string**, `rptLvColor(r)` รับ **object** — ใช้ตรงกันใน `renderRptTable` ✓
- `rptPick(dept, lv)` — นิยาม Task 3 Step 1, เรียกจาก markup ที่ฟังก์ชันเดียวกันสร้าง และจาก verify Step 5 ✓ (ลำดับ dept ก่อน lv ตรงกันทุกที่)
- `rptSel={dept,lv}` — ประกาศ Task 3 Step 1, อ่านใน `filteredRpts`/`renderRptMatrix`, เขียนใน `rptPick`/`rptClear` ✓
- `RPT_KEYS` — ประกาศ Task 1 Step 1, ใช้ใน `rptNorm` (Task 1) และ `rptSave` (Task 4) ✓ ชื่อ id ช่องกรอกคือ `er_` + key ทุกตัว ตรงกับที่ Task 4 Step 1 สร้าง ✓
- `renderRpts()` = `renderRptMatrix()` + `renderRptTable()` — `rptPick`/`rptClear`/`rptSave`/`rptAdd`/`rptDel` เรียก `renderRpts()` (ต้องวาด matrix ใหม่ด้วย) ส่วน filter/sort เรียก `renderRptTable()` อย่างเดียว ✓
- `curProjView==='report'` ตรงกับ `setProjView('report')`, `data-pv="report"`, `NAVI.report`, `syncTopAdd` ✓
- `openRpt(id)` — อ้างใน `renderRptTable` (Task 3) นิยามใน Task 4 ✓ มี guard เป็น string ใน onclick จึงไม่พังระหว่างทาง
