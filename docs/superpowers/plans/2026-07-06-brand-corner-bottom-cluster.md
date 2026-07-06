# Brand Corner + Bottom Cluster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่ม brand corner (โลโก้ + "Civil ERP") ที่ topbar-left ให้ track ความกว้าง sidebar และดัน breadcrumb ไม่ให้ล้ำ sidebar; ย้าย `#syncBadge` จาก element ลอยเข้าไปในกลุ่มล่างของ sidebar

**Architecture:** แก้ HTML + CSS ใน `index.html` เท่านั้น (ไม่แตะ JS). Component 1: `<div class="brand">` เป็นลูกตัวแรกของ `.topbar`, กว้าง `var(--nav-w)`, `overflow:hidden` ซ่อน wordmark ตอนหุบโดยไม่ต้องใช้ JS. Component 2: ย้าย `<div id="syncBadge">` (คง id + `.sb-dot`/`.sb-txt`) เข้า `.nav-bottom` แล้ว restyle เป็น in-flow row.

**Tech Stack:** Vanilla HTML/CSS ไฟล์เดียว. ไม่มี test runner — verify ด้วย Playwright (geometry/visual) + grep.

## Global Constraints

- แก้ **HTML + CSS** ใน `index.html` เท่านั้น — **ห้ามแตะ JavaScript**
- **ต้องคง** `id="syncBadge"` + ลูก `<span class="sb-dot">` + `<span class="sb-txt">` ครบ (JS `DB.onStatus` ที่ index.html:2293 อ้างอิง: toggle `display`, class `.off`/`.saving`, อัปเดต text)
- คงพฤติกรรมเดิม 100%: nav 3 โหมด (expanded/collapsed/hover) + popover, `--nav-w`, dark mode, สี, breadcrumb, sub-tabs, ปุ่มทุกตัว, T-Shape topbar (`--topbar-h:46px`, `.topbar` fixed)
- wordmark = `Civil ERP` เป๊ะ; โลโก้ = `SMALL_CIVIL_LOGO.png`
- ไฟล์ **CRLF** — anchor edit บน string บรรทัดเดียว (multi-line old_string จะไม่ match). new_string มี newline ได้
- อ้างอิงบรรทัด baseline: `.topbar`=60 · `.topbar .crumb`=65 · media ≤760px=587 · `#syncBadge` CSS=687 · `#syncBadge.saving`=690 · `<div id="syncBadge">` HTML=692 · `.nav-bottom`=713 · `<div class="nav-pop">`=717 · `<div class="topbar"><div class="crumb">` HTML=727
- Reusable serve (port 8921, background):
  ```bash
  cd "d:/Project Tracker" && node -e "const http=require('http'),fs=require('fs'),path=require('path');const root=process.cwd();http.createServer((q,s)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith(path.sep))p=path.join(p,'index.html');fs.readFile(p,(e,d)=>{if(e){s.writeHead(404);s.end('404');return;}const t=p.endsWith('.html')?'text/html':p.endsWith('.png')?'image/png':'text/plain';s.writeHead(200,{'Content-Type':t});s.end(d);});}).listen(8921,()=>console.log('8921'));"
  ```
- Reusable JS-unchanged guard (ยืนยันว่าไม่เผลอแตะ `<script>`):
  ```bash
  cd "d:/Project Tracker" && node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const b=h.match(/<script>[\s\S]*?<\/script>/g)||[];const m=b.map(x=>x.replace(/^<script>/,'').replace(/<\/script>$/,'')).find(s=>s.includes('function showTab'));fs.writeFileSync('.navcheck.js',m)" && node --check .navcheck.js && rm .navcheck.js && echo SYNTAX_OK
  ```

---

### Task 1: Brand corner (topbar-left)

**Files:**
- Modify: `index.html` (1 HTML edit + 3 CSS edits)

**Interfaces:**
- Produces: `.brand` element (first child of `.topbar`), `.brand`/`.brand-logo`/`.brand-wm` CSS. Task 3 verifies it.
- Consumes: existing `--nav-w` (on `#app`), `--topbar-h`, existing `.topbar` flex row.

- [ ] **Step 1: Insert the brand element as first child of `.topbar`**

Edit — anchor on the topbar+crumb opening (บรรทัดเดียว, unique):

old:
```
<div class="topbar"><div class="crumb">
```
new:
```
<div class="topbar"><div class="brand"><img class="brand-logo" src="SMALL_CIVIL_LOGO.png" alt="Civil ERP"><span class="brand-wm">Civil ERP</span></div><div class="crumb">
```

- [ ] **Step 2: Remove `.topbar` left padding (so brand aligns to x=0 with the sidebar)**

Edit — anchor on the distinctive topbar substring:

old:
```
gap:14px;padding:0 16px;height:var(--topbar-h)
```
new:
```
gap:14px;padding:0 16px 0 0;height:var(--topbar-h)
```

- [ ] **Step 3: Add `.brand` / `.brand-logo` / `.brand-wm` CSS**

Edit — append after the `.crumb` rule (same line, dense-CSS style like the file):

old:
```
.topbar .crumb{font-size:13px;color:var(--ink);font-weight:700}.topbar .crumb b{color:var(--ink);font-weight:600}
```
new:
```
.topbar .crumb{font-size:13px;color:var(--ink);font-weight:700}.topbar .crumb b{color:var(--ink);font-weight:600}
.brand{flex:none;width:var(--nav-w,54px);height:100%;display:flex;align-items:center;gap:11px;padding-left:16px;border-right:1px solid var(--line);overflow:hidden;transition:width .18s cubic-bezier(.32,.72,0,1)}
.brand-logo{width:26px;height:26px;flex:none;object-fit:contain}
.brand-wm{font-weight:700;font-size:14px;letter-spacing:-.01em;color:var(--ink);white-space:nowrap}
```

(wordmark ซ่อนตอนหุบด้วย `overflow:hidden` + `width:var(--nav-w)`: ที่ 54px → 16+26+11=53px, wordmark ถูก clip; ที่ 210px → โผล่. `border-right:var(--line)` ต่อแนวเส้นขอบ sidebar เป็นเส้นตั้งเดียวกัน)

- [ ] **Step 4: Make brand hug the 54px rail on mobile (≤760px)**

Edit — replace the whole media-query line (บรรทัดเดียว, unique):

old:
```
@media(max-width:760px){.nav,.nav[data-mode="expanded"],.nav[data-mode="hover"]:hover{width:54px}.nav .nav-lbl,.nav .nav-badge{opacity:0}.content{padding-left:54px!important}.nav-pop{left:6px}}
```
new:
```
@media(max-width:760px){.nav,.nav[data-mode="expanded"],.nav[data-mode="hover"]:hover{width:54px}.nav .nav-lbl,.nav .nav-badge,.nav .sb-txt{opacity:0}.content{padding-left:54px!important}.nav-pop{left:6px}.brand{width:54px}}
```

(เพิ่ม `.brand{width:54px}` และเผื่อ `.nav .sb-txt` สำหรับ Task 2 ในบรรทัดเดียวกันเลย)

- [ ] **Step 5: Verify edits applied + JS untouched**

Run:
```bash
cd "d:/Project Tracker" && grep -c 'class="brand"' index.html && grep -c 'padding:0 16px 0 0;height:var(--topbar-h)' index.html && grep -c '.brand{flex:none;width:var(--nav-w,54px)' index.html && grep -c '.nav .nav-badge,.nav .sb-txt{opacity:0}' index.html
```
Expected: `1` ทั้ง 4 บรรทัด

Then run the JS-unchanged guard (Global Constraints). Expected: `SYNTAX_OK`

- [ ] **Step 6: Commit**

```bash
cd "d:/Project Tracker" && git add index.html && git commit -m "feat(nav): brand corner (logo + Civil ERP) in topbar T-corner"
```

---

### Task 2: Bottom cluster — relocate `#syncBadge` into the sidebar

**Files:**
- Modify: `index.html` (2 HTML edits: delete + reinsert; 2 CSS edits: restyle + hide-text)

**Interfaces:**
- Consumes: `.nav-bottom` group, existing `#syncBadge` markup, nav-mode selectors.
- Produces: `#syncBadge` as an in-flow child of `.nav-bottom`. Task 3 verifies it.

> ลำดับสำคัญ: **ลบตัวเดิมก่อน แล้วค่อยแทรกตัวใหม่** — ไม่งั้น `id="syncBadge"` จะซ้ำ 2 ที่ทำให้ Edit ถัดไป match ไม่ unique.

- [ ] **Step 1: Delete the floating `#syncBadge` (before `#app`)**

Edit — anchor on the full syncBadge line (บรรทัดเดียว, ตอนนี้ unique):

old:
```
<div id="syncBadge"><span class="sb-dot"></span><span class="sb-txt">เชื่อมต่อแล้ว</span></div>
```
new:
```

```

(แทนที่ด้วยบรรทัดว่าง — เหลือบรรทัดเปล่าก่อน `<div class="app" id="app">` ไม่มีผล)

- [ ] **Step 2: Reinsert `#syncBadge` inside `.nav-bottom` (after the control button, before the popover)**

Edit — anchor on the nav-pop opening (บรรทัดเดียว, unique):

old:
```
<div class="nav-pop" id="navPop">
```
new:
```
<div id="syncBadge"><span class="sb-dot"></span><span class="sb-txt">เชื่อมต่อแล้ว</span></div>
      <div class="nav-pop" id="navPop">
```

- [ ] **Step 3: Restyle `#syncBadge` from floating pill to in-flow sidebar row**

Edit — replace the whole `#syncBadge` rule (บรรทัดเดียว, unique):

old:
```
#syncBadge{position:fixed;left:14px;bottom:14px;z-index:60;display:none;align-items:center;gap:7px;padding:6px 11px;border-radius:999px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--cardsh);font:600 11.5px/1 'DM Sans','Noto Sans Thai',sans-serif;color:var(--ink2)}
```
new:
```
#syncBadge{position:static;margin:2px 8px 2px;padding:0 9px;height:30px;z-index:auto;display:none;align-items:center;gap:7px;border-radius:8px;background:none;border:0;box-shadow:none;font:600 11.5px/1 'DM Sans','Noto Sans Thai',sans-serif;color:var(--ink2)}
```

(คง `display:none` — JS จะ set `display:flex` ตอนเชื่อมต่อ; `.sb-dot` สี green/orange/blue ผ่าน class เดิมยังทำงาน)

- [ ] **Step 4: Hide `.sb-txt` when the rail is narrow (parity with `.nav-lbl`)**

Edit — append after the `.saving .sb-dot` rule (same line, dense style):

old:
```
#syncBadge.saving .sb-dot{background:#0a84ff}
```
new:
```
#syncBadge.saving .sb-dot{background:#0a84ff}
.sb-txt{transition:opacity .13s;white-space:nowrap}
.nav[data-mode="collapsed"] #syncBadge .sb-txt,.nav[data-mode="hover"] #syncBadge .sb-txt{opacity:0}
.nav[data-mode="hover"]:hover #syncBadge .sb-txt{opacity:1}
```

- [ ] **Step 5: Verify edits applied + JS untouched**

Run:
```bash
cd "d:/Project Tracker" && echo -n "syncBadge count (expect 1): " && grep -c 'id="syncBadge"' index.html && echo -n "in nav-bottom (expect 1): " && grep -c 'id="syncBadge"><span class="sb-dot"></span><span class="sb-txt">เชื่อมต่อแล้ว</span></div>' index.html && echo -n "static restyle (expect 1): " && grep -c '#syncBadge{position:static' index.html && echo -n "old fixed gone (expect 0): " && grep -c '#syncBadge{position:fixed' index.html && echo -n "sb-txt hide (expect 1): " && grep -c '.nav\[data-mode="collapsed"\] #syncBadge .sb-txt' index.html
```
Expected: `1`, `1`, `1`, `0`, `1`

Then run the JS-unchanged guard (Global Constraints). Expected: `SYNTAX_OK`

- [ ] **Step 6: Commit**

```bash
cd "d:/Project Tracker" && git add index.html && git commit -m "feat(nav): move sync status into sidebar bottom (in-flow, no float)"
```

---

### Task 3: Visual verification (Playwright)

**Files:**
- Verify: `index.html` (no edit unless a defect is found)

**Interfaces:**
- Consumes: `.brand` (Task 1), relocated `#syncBadge` (Task 2).

- [ ] **Step 1: Serve index.html** — run the serve one-liner (port 8921), background.

- [ ] **Step 2: Navigate + hide login overlay + measure brand geometry**

Load Playwright browser tools via ToolSearch (`select:mcp__plugin_playwright_playwright__browser_navigate,mcp__plugin_playwright_playwright__browser_evaluate,mcp__plugin_playwright_playwright__browser_take_screenshot`). `browser_navigate` → `http://localhost:8921/index.html`, then `browser_evaluate`:
```js
() => {
  var g=document.getElementById('loginGate'); if(g) g.style.display='none';
  var app=document.getElementById('app'), nav=document.getElementById('nav');
  function read(){ var b=document.querySelector('.brand').getBoundingClientRect();
    var c=document.querySelector('.crumb').getBoundingClientRect();
    var wm=getComputedStyle(document.querySelector('.brand-wm'));
    return {brandX:Math.round(b.x),brandW:Math.round(b.width),brandH:Math.round(b.height),
            crumbStartsAfterBrand: c.x >= b.x+b.width-1, wmClipped: (b.width < 90)}; }
  var out={};
  nav.dataset.mode='expanded'; app.style.setProperty('--nav-w','210px'); out.expanded=read();
  nav.dataset.mode='collapsed'; app.style.setProperty('--nav-w','54px'); out.collapsed=read();
  return out;
}
```
Expected: `expanded` → `brandX:0, brandW:210, brandH:46, crumbStartsAfterBrand:true, wmClipped:false` · `collapsed` → `brandW:54, crumbStartsAfterBrand:true, wmClipped:true`

- [ ] **Step 3: Verify relocated syncBadge (force-visible) is in the sidebar, not floating**

`browser_evaluate`:
```js
() => {
  var sb=document.getElementById('syncBadge');
  sb.style.display='flex';                       // JS normally does this on connect
  var nav=document.getElementById('nav');
  var inNav = nav.contains(sb);
  var r=sb.getBoundingClientRect(), nr=nav.getBoundingClientRect();
  var cs=getComputedStyle(sb);
  return { inNav, position: cs.position,
           insideNavHoriz: r.x>=nr.x-1 && r.right<=nr.right+1,
           dotVisible: !!sb.querySelector('.sb-dot') };
}
```
Expected: `inNav:true`, `position:"static"`, `insideNavHoriz:true`, `dotVisible:true` (ไม่มี pill ลอยที่มุมล่างซ้าย viewport อีก)

- [ ] **Step 4: Screenshots — light + dark, expanded + collapsed**

- expanded+light: set `loginGate` hidden, `nav.dataset.mode='expanded'`, `--nav-w:210px`, force `#syncBadge` `display:flex` → `browser_take_screenshot` `bc-exp-light.png`
- dark: `document.documentElement.dataset.theme='dark'` → screenshot `bc-exp-dark.png`
- collapsed: `nav.dataset.mode='collapsed'`, `--nav-w:54px` → screenshot `bc-collapsed.png`
- ดูภาพ: brand (โลโก้+"Civil ERP") มุมซ้ายบน; หุบ→เหลือโลโก้; breadcrumb เริ่มหลัง brand ไม่ล้ำ; เส้น border-right ของ brand ต่อกับ sidebar เป็นเส้นเดียว; syncBadge อยู่กลุ่มล่าง sidebar (dark อ่านออก)

- [ ] **Step 5: Confirm expectations**
- brand กว้าง = `--nav-w` (54/210), โลโก้โชว์เสมอ, wordmark เฉพาะกาง
- breadcrumb ไม่ล้ำ sidebar (เริ่มหลัง brand)
- syncBadge in-flow ในกลุ่มล่าง sidebar (ไม่ลอย, ไม่ทับปุ่ม control), หุบ→เหลือ dot
- ไม่มี horizontal scroll; nav 3 โหมด + T-Shape topbar ยังปกติ; dark mode อ่านออก

- [ ] **Step 6: Fix any defect + re-verify (เฉพาะถ้าเจอ)**

ถ้าพบข้อบกพร่อง (brand ล้น/ไม่ align, wordmark ไม่ซ่อนตอนหุบ, syncBadge ยังลอย/ทับ, breadcrumb ยังล้ำ, dark อ่านไม่ออก): แก้ `index.html` เท่าที่จำเป็น, re-run Step 2–3 + JS guard, แล้ว commit ด้วยข้อความ `fix(nav): brand/sync polish per visual verification`

- [ ] **Step 7: Cleanup**

หยุด server (TaskStop); ลบ `bc-*.png` ถ้าเขียนลง repo root.

---

## Self-Review

**Spec coverage:**
- Brand corner (topbar-left, track --nav-w, logo+wordmark, overflow ซ่อน wordmark, border-right, breadcrumb เลื่อน) → Task 1. ✓
- Mobile brand 54px + sb-txt hide → Task 1 Step 4. ✓
- ย้าย #syncBadge เข้า nav-bottom (คง id/children) → Task 2 Step 1–2. ✓
- Restyle floating→in-flow → Task 2 Step 3. ✓
- ซ่อน .sb-txt ตอนหุบ/hover parity → Task 2 Step 4. ✓
- JS ไม่แตะ → Global Constraints + JS guard (Task 1/2 Step 5). ✓
- Verify Playwright (brand geometry, syncBadge in-nav, light/dark, modes) → Task 3. ✓

**Placeholder scan:** ไม่มี TBD/TODO; ทุก edit มี old/new เป๊ะ; verify มีโค้ดจริง. ✓

**Type/name consistency:** class `.brand`/`.brand-logo`/`.brand-wm`, `#syncBadge`/`.sb-dot`/`.sb-txt`, wordmark "Civil ERP", `--nav-w`/`--topbar-h` ใช้ตรงกันทุก task; grep strings ตรงกับ new strings. ลำดับ delete-before-insert ของ syncBadge ป้องกัน id ซ้ำ. ✓
