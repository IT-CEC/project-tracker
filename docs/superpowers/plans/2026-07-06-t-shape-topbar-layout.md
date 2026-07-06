# T-Shape Top Bar Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เปลี่ยน layout เป็น T-Shape — top bar เต็มความกว้างพาดบนสุด (หัว T) + sidebar ซ้ายเริ่มใต้ top bar (ขา T) โดยแก้ CSS เท่านั้น

**Architecture:** ทำ `.topbar` ให้ `position:fixed` เต็มความกว้าง (`top/left/right:0`), ดัน `.nav` ให้เริ่มที่ `top:var(--topbar-h)`, และเพิ่ม `padding-top:var(--topbar-h)` ให้ `.content` กันเนื้อหาลอดใต้ topbar. ใช้ตัวแปร `--topbar-h:46px` เป็น single source. ไม่แตะ HTML structure และ JS.

**Tech Stack:** Vanilla HTML/CSS/JS ไฟล์เดียว (`index.html`). ไม่มี test runner — verify ด้วย Playwright (วัด geometry) + grep.

## Global Constraints

- แก้ **CSS เท่านั้น** ใน `index.html` — ห้ามแตะ HTML structure, ห้ามแตะ JS
- คงพฤติกรรม/ฟีเจอร์เดิม 100%: เนื้อหาใน topbar (breadcrumb, sub-tabs, ปุ่มนำเสนอ, ปุ่ม +เพิ่ม), sidebar 3 โหมด (expanded/collapsed/hover) + popover, `--nav-w`, สี, dark mode
- แนวทาง: **A — ยืด topbar เดิมเต็มกว้างแบบมินิมอล** (ไม่มี brand zone, ไม่ย้ายของ)
- ไฟล์เป็น **CRLF** — anchor edit บน string บรรทัดเดียว (multi-line old_string จะไม่ match)
- ความสูง topbar เดิม = `46px`; ค่าตัวแปร `--topbar-h:46px` ต้องตรงกัน
- อ้างอิงบรรทัด baseline: `:root{`=15 · `.content`=59 · `.topbar`=60 · `.nav`=564 · `#loginGate`=625 · `<div id="app">`=693
- Reusable serve (static, port 8920):
  ```bash
  cd "d:/Project Tracker" && node -e "const http=require('http'),fs=require('fs'),path=require('path');const root=process.cwd();http.createServer((q,s)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith(path.sep))p=path.join(p,'index.html');fs.readFile(p,(e,d)=>{if(e){s.writeHead(404);s.end('404');return;}const t=p.endsWith('.html')?'text/html':p.endsWith('.js')?'text/javascript':'text/plain';s.writeHead(200,{'Content-Type':t});s.end(d);});}).listen(8920,()=>console.log('8920'));"
  ```
  (รันแบบ background; index.html โหลด Firebase จาก CDN — ถ้าเน็ตบล็อก shell ก็ยัง render เพราะ layout เป็น CSS ล้วน; geometry ไม่ขึ้นกับ JS/ข้อมูล)

---

### Task 1: Apply T-Shape CSS (4 edits)

**Files:**
- Modify: `index.html` (4 single-line CSS edits: `:root`, `.topbar`, `.nav`, `.content`)

**Interfaces:**
- Produces: CSS var `--topbar-h:46px`; `.topbar` fixed full-width; `.nav` offset `top:var(--topbar-h)`; `.content` `padding-top:var(--topbar-h)`. Task 2 verifies geometry against these.
- Consumes: existing `--nav-w` (คงเดิม), existing `.topbar` height 46px.

- [ ] **Step 1: Add `--topbar-h` variable to `:root`**

Edit — anchor on `:root{` (บรรทัดเดียว บรรทัด 15, unique):

old:
```
:root{
```
new:
```
:root{--topbar-h:46px;
```

> ถ้า `:root{` ไม่ unique (Edit error) ให้ anchor บนบรรทัด `.topbar` แทนแล้วใช้ `46px` ตรงๆ ทั้ง 3 จุด (Step 2–4) โดยไม่ใช้ตัวแปร

- [ ] **Step 2: Make `.topbar` fixed full-width (head of the T)**

Edit — anchor on the full `.topbar` rule (บรรทัดเดียว):

old:
```
.topbar{flex:none;position:relative;display:flex;align-items:center;gap:14px;padding:0 16px;height:46px;background:color-mix(in srgb,var(--bg) 65%,transparent);backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);border-bottom:1px solid var(--line)}
```
new:
```
.topbar{flex:none;position:fixed;top:0;left:0;right:0;z-index:100;display:flex;align-items:center;gap:14px;padding:0 16px;height:var(--topbar-h);background:color-mix(in srgb,var(--bg) 65%,transparent);backdrop-filter:saturate(180%) blur(20px);-webkit-backdrop-filter:saturate(180%) blur(20px);border-bottom:1px solid var(--line)}
```

(เปลี่ยน `position:relative`→`position:fixed;top:0;left:0;right:0;z-index:100` และ `height:46px`→`height:var(--topbar-h)`; ที่เหลือคงเดิม)

- [ ] **Step 3: Offset `.nav` to start below the topbar (stem of the T)**

Edit — anchor on the full `.nav` rule (บรรทัดเดียว):

old:
```
.nav{position:fixed;left:0;top:0;bottom:0;z-index:90;width:210px;background:var(--side);border-right:1px solid var(--line);display:flex;flex-direction:column;padding:10px 0;overflow:visible;transition:width .18s cubic-bezier(.32,.72,0,1)}
```
new:
```
.nav{position:fixed;left:0;top:var(--topbar-h);bottom:0;z-index:90;width:210px;background:var(--side);border-right:1px solid var(--line);display:flex;flex-direction:column;padding:10px 0;overflow:visible;transition:width .18s cubic-bezier(.32,.72,0,1)}
```

(เปลี่ยนเฉพาะ `top:0`→`top:var(--topbar-h)`)

- [ ] **Step 4: Add `padding-top` to `.content` (clear the now-fixed topbar)**

Edit — anchor on the full `.content` rule (บรรทัดเดียว):

old:
```
.content{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;padding-left:var(--nav-w,54px);transition:padding-left .18s cubic-bezier(.32,.72,0,1)}
```
new:
```
.content{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;padding-left:var(--nav-w,54px);padding-top:var(--topbar-h);transition:padding-left .18s cubic-bezier(.32,.72,0,1)}
```

(เพิ่ม `padding-top:var(--topbar-h);` หลัง `padding-left`)

- [ ] **Step 5: Verify all 4 edits applied**

Run:
```bash
cd "d:/Project Tracker" && grep -c -- '--topbar-h:46px' index.html && grep -c 'position:fixed;top:0;left:0;right:0;z-index:100' index.html && grep -c 'left:0;top:var(--topbar-h);bottom:0' index.html && grep -c 'padding-left:var(--nav-w,54px);padding-top:var(--topbar-h)' index.html
```
Expected: `1` แต่ละบรรทัด (รวม 4 บรรทัด `1`)

- [ ] **Step 6: Sanity — main script still parses**

Run:
```bash
cd "d:/Project Tracker" && node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const b=h.match(/<script>[\s\S]*?<\/script>/g)||[];const m=b.map(x=>x.replace(/^<script>/,'').replace(/<\/script>$/,'')).find(s=>s.includes('function showTab'));fs.writeFileSync('.navcheck.js',m)" && node --check .navcheck.js && rm .navcheck.js && echo SYNTAX_OK
```
Expected: `SYNTAX_OK` (JS ไม่ถูกแตะ — เป็นแค่ regression guard)

- [ ] **Step 7: Commit**

```bash
cd "d:/Project Tracker" && git add index.html && git commit -m "feat(layout): T-Shape — fixed full-width topbar, sidebar below"
```

---

### Task 2: Visual verification (Playwright) + polish

**Files:**
- Verify: `index.html` (no edit unless a defect is found)

**Interfaces:**
- Consumes: geometry from Task 1 (`.topbar` fixed full-width; `.nav` `top:var(--topbar-h)`).

- [ ] **Step 1: Serve index.html**

รัน serve one-liner (Global Constraints) แบบ background.

- [ ] **Step 2: Navigate + hide login overlay + measure geometry**

`browser_navigate` → `http://localhost:8920/index.html` แล้ว `browser_evaluate`:
```js
() => {
  var g = document.getElementById('loginGate'); if (g) g.style.display = 'none';
  var tb = document.querySelector('.topbar').getBoundingClientRect();
  var nv = document.querySelector('.nav').getBoundingClientRect();
  var vw = window.innerWidth;
  return {
    topbar: {x: Math.round(tb.x), y: Math.round(tb.y), w: Math.round(tb.width), h: Math.round(tb.height)},
    navTop: Math.round(nv.y), navLeft: Math.round(nv.x),
    topbarFullWidth: Math.abs(tb.width - vw) < 2,
    topbarAtTop: Math.round(tb.y) === 0,
    navBelowTopbar: Math.abs(nv.y - tb.height) < 2,
    noHScroll: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
  };
}
```
Expected: `topbar` ≈ `{x:0, y:0, w:≈vw, h:46}` · `navTop`≈46 · `navLeft`≈0 · `topbarFullWidth:true` · `topbarAtTop:true` · `navBelowTopbar:true` · `noHScroll:true`

- [ ] **Step 3: Verify across sidebar modes (DOM-only, no app JS needed)**

`browser_evaluate` วนแต่ละโหมด (set dataset + `--nav-w` ตรงๆ):
```js
() => {
  var nav = document.getElementById('nav'), app = document.getElementById('app');
  var out = {};
  [['expanded','210px'],['collapsed','54px'],['hover','54px']].forEach(function(m){
    nav.dataset.mode = m[0];
    if (app) app.style.setProperty('--nav-w', m[1]);
    var nv = nav.getBoundingClientRect();
    out[m[0]] = { navTop: Math.round(nv.y), navW: Math.round(nv.width) };
  });
  return out;
}
```
Expected: ทุกโหมด `navTop`≈46 · `expanded.navW`≈210 · `collapsed.navW`≈54 · `hover.navW`≈54

- [ ] **Step 4: Screenshot light + dark**

- ตั้งโหมด expanded เพื่อเห็น sidebar เต็ม:
```js
() => { var g=document.getElementById('loginGate'); if(g) g.style.display='none';
  document.getElementById('nav').dataset.mode='expanded';
  var a=document.getElementById('app'); if(a) a.style.setProperty('--nav-w','210px'); return true; }
```
- `browser_take_screenshot` → `tbar-light.png`
- สลับ dark: `browser_evaluate` `() => { document.documentElement.dataset.theme='dark'; return true; }`
- `browser_take_screenshot` → `tbar-dark.png`
- ดูภาพ: topbar พาดเต็มกว้างบนสุด, sidebar เริ่มใต้ topbar, ไม่มีเนื้อหาโดน topbar บัง, มุมซ้ายบน = topbar (ไม่ใช่ sidebar)

- [ ] **Step 5: Confirm expectations**
- topbar `y=0`, เต็มกว้าง (คร่อมเหนือ sidebar), height 46
- sidebar `top≈46` ทุกโหมด, ยังยืดถึงล่าง (bottom:0)
- ไม่มี horizontal scroll; เนื้อหา `.main` ไม่โดน topbar ทับ (padding-top ทำงาน)
- dark mode: topbar blur/border อ่านออก, ไม่มีพื้นที่โปร่ง/ทับซ้อน

- [ ] **Step 6: Fix any defect + re-verify (เฉพาะถ้าเจอปัญหา)**

ถ้าพบข้อบกพร่อง (เช่น เนื้อหาโดนบัง = padding-top ไม่พอ, หรือ Gantt/ตาราง `max-height:calc(100vh - Npx)` ล้น/ถูกตัดจนสังเกตได้): แก้ `index.html` เท่าที่จำเป็น (เช่น บวก `+ var(--topbar-h)` ในบรรทัด calc นั้น), แล้ว re-run Step 2 + node --check (Task 1 Step 6). อย่าปรับ calc ถ้าไม่ล้นจริง (`.main` scroll ได้อยู่แล้ว)

- [ ] **Step 7: Cleanup + commit (เฉพาะถ้า Step 6 แก้ไฟล์)**

หยุด server (TaskStop), ลบ `tbar-light.png`/`tbar-dark.png` ถ้าเขียนลง repo root. ถ้า Step 6 แก้ `index.html`:
```bash
cd "d:/Project Tracker" && git add index.html && git commit -m "fix(layout): T-Shape polish per visual verification"
```

---

## Self-Review

**Spec coverage:**
- topbar fixed เต็มกว้าง (หัว T) → Task 1 Step 2. ✓
- sidebar เริ่มใต้ topbar (ขา T) → Task 1 Step 3. ✓
- content ไม่ลอดใต้ topbar → Task 1 Step 4. ✓
- `--topbar-h` single source → Task 1 Step 1. ✓
- คง sidebar modes / `--nav-w` / dark → ไม่แตะ + verify Task 2 Step 3–4. ✓
- verify Playwright ทุกโหมด + light/dark → Task 2. ✓
- ความเสี่ยง calc(100vh) → Task 2 Step 6 (แก้เฉพาะถ้าล้นจริง). ✓
- CSS-only, ไม่แตะ HTML/JS → Global Constraints + grep Task 1 Step 5 + node --check Step 6. ✓

**Placeholder scan:** ไม่มี TBD/TODO; ทุก edit มี old/new เป๊ะ; verify มีโค้ดจริง. ✓

**Type/name consistency:** `--topbar-h` ใช้ตรงกันทั้ง `:root`/`.topbar`/`.nav`/`.content`; ค่า 46px ตรงกับ topbar เดิม; grep strings ตรงกับ new strings ทุกบรรทัด. ✓
