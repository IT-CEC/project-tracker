# Supabase-style Sidebar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the floating icon dock with a Supabase-style expandable sidebar (Expanded / Collapsed / Expand-on-hover) plus a bottom control popover, keeping the old dock archived in-file for revert.

**Architecture:** All changes are in the single file `index.html`. A new `<aside class="nav">` fixed-left sidebar replaces the archived `<aside class="dock">`. Display mode lives in `[data-mode]` on the sidebar (CSS-driven widths) and a per-user `localStorage['erp_nav_mode']`. Content offset is a CSS variable `--nav-w` on `#app` so the main frame stays fixed during hover-expand. Navigation reuses the existing `showTab()` by switching its selector from `.di[data-tab]` to `.nav-item[data-tab]`.

**Tech Stack:** Vanilla HTML/CSS/JS in one file. Chart.js/xlsx via CDN (untouched). Firebase persistence (untouched).

## Global Constraints

- Edit **only** `index.html`. Do not touch persistence/Firebase, render functions, tables, Gantt, topbar, projtabs, or other buttons.
- Per-user pref key: **`erp_nav_mode`** = `expanded` | `collapsed` | `hover`; default **`hover`**. localStorage only (no Firestore sync), per CLAUDE.md §3.
- Sizes: collapsed **54px**, expanded **210px**.
- Active state = **subtle** (bg `var(--hover)` + text `var(--ink)` + weight 600). No colored accent bar.
- Preserve element `id="navReqCount"` (existing code updates its number).
- All sidebar colors bind to existing CSS tokens (`--side`, `--surface`, `--line`, `--line2`, `--ink`, `--ink2`, `--ink3`, `--hover`, `--shadow`, `--font-mono`) so dark mode keeps working.
- No test runner exists. **Verification loop per task** = (a) JS syntax via `node --check` on the extracted main script, (b) code review vs this plan. Full visual verification (all modes + dark mode) happens in Task 4 via a standalone Playwright preview (the real app is behind a Firebase login gate).
- Reusable `node --check` command (robust to line shifts):
  ```bash
  node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const blocks=h.match(/<script>[\s\S]*?<\/script>/g)||[];const main=blocks.map(b=>b.replace(/^<script>/,'').replace(/<\/script>$/,'')).find(s=>s.includes('function showTab'));fs.writeFileSync('.navcheck.js',main)" && node --check .navcheck.js && rm .navcheck.js && echo SYNTAX_OK
  ```

---

### Task 1: Structural swap — archive dock, add sidebar, wire navigation, content offset

**Files:**
- Modify: `index.html` (dock markup ~656–663; `.content` CSS line 59; dock mobile media query ~562; `showTab` selectors ~1496–1497; magnification IIFE ~1498–1515)

**Interfaces:**
- Consumes: existing `showTab(id)` (navigates + toggles `.active`), existing tokens.
- Produces: live sidebar `#nav` with `.nav-item[data-tab]` rows; CSS var `--nav-w` consumed by `.content` padding. Later tasks add mode logic + popover.

**Deliverable:** App shows an expanded Supabase-style sidebar; clicking โปรเจค / Automation / ตั้งค่า navigates and highlights; old dock is commented out; content is offset 210px and does not sit under the sidebar.

- [ ] **Step 1: Archive the dock markup (open comment + keep content)**

Edit — replace the dock opening tag:

old:
```html
  <aside class="dock">
```
new:
```html
  <!-- ===== ARCHIVED DOCK (2026-07-04). REVERT: uncomment this dock block AND comment out the .nav block below. ===== -->
  <!--
  <aside class="dock">
```

- [ ] **Step 2: Close the dock comment and insert the new sidebar**

Edit — replace the dock closing tag (there is only one `</aside>` in the file):

old:
```html
</aside>
```
new:
```html
</aside>
  -->
  <!-- ===== SUPABASE-STYLE SIDEBAR ===== -->
  <aside class="nav" id="nav" data-mode="expanded">
    <div class="nav-group">
      <a class="nav-item" data-tab="project" data-tip="โปรเจค"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12"/></svg></span><span class="nav-lbl">โปรเจค</span><i class="nav-badge" id="navReqCount">83</i></a>
      <a class="nav-item" data-tab="bridge" data-tip="Automation"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg></span><span class="nav-lbl">Automation</span><i class="nav-badge">39</i></a>
    </div>
    <div class="nav-spacer"></div>
    <div class="nav-group nav-bottom">
      <div class="nav-div"></div>
      <a class="nav-item" data-tab="settings" data-tip="ตั้งค่า"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></span><span class="nav-lbl">ตั้งค่า</span></a>
    </div>
  </aside>
```

> Note: The archived dock still contains `id="navReqCount"` but is inside an HTML comment, so it is not parsed — only the new sidebar's `navReqCount` is live. No duplicate-id issue.

- [ ] **Step 3: Add the sidebar CSS block**

Edit — insert the new block immediately AFTER the dock mobile media query. Anchor on that line and append:

old:
```css
@media(max-width:760px){.main{padding-left:82px}.dock{left:8px;gap:5px}.di{width:33px;height:33px}.di-ic{width:31px;height:31px;border-radius:9px}.di-ic svg{width:16px;height:16px}.di-lbl{display:none}}
```
new:
```css
@media(max-width:760px){.dock{left:8px;gap:5px}.di{width:33px;height:33px}.di-ic{width:31px;height:31px;border-radius:9px}.di-ic svg{width:16px;height:16px}.di-lbl{display:none}}
/* ===== Supabase-style sidebar ===== */
.nav{position:fixed;left:0;top:0;bottom:0;z-index:90;width:210px;background:var(--side);border-right:1px solid var(--line);display:flex;flex-direction:column;padding:10px 0;overflow:visible;transition:width .18s cubic-bezier(.32,.72,0,1)}
.nav-group{display:flex;flex-direction:column;gap:2px}
.nav-spacer{flex:1}
.nav-item{position:relative;display:flex;align-items:center;gap:11px;height:34px;margin:1px 8px;padding:0 9px;border-radius:8px;color:var(--ink2);cursor:pointer;background:none;border:0;font:inherit;font-size:13.5px;text-align:left;white-space:nowrap;overflow:hidden;transition:background .13s,color .13s}
.nav-item:hover{background:var(--hover);color:var(--ink)}
.nav-item.active{background:var(--hover);color:var(--ink);font-weight:600}
.nav-ic{flex:none;width:20px;height:20px;display:flex;align-items:center;justify-content:center}
.nav-ic svg{width:19px;height:19px;display:block}
.nav-lbl{flex:1;opacity:1;transition:opacity .13s}
.nav-badge{flex:none;font-family:var(--font-mono);font-size:10.5px;font-weight:600;color:var(--ink3);opacity:1;transition:opacity .13s}
.nav-div{height:1px;background:var(--line2);margin:8px 16px}
```

- [ ] **Step 4: Offset the content so it clears the sidebar**

Edit — add padding + transition to `.content`:

old:
```css
.content{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column}
```
new:
```css
.content{flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;padding-left:var(--nav-w,210px);transition:padding-left .18s cubic-bezier(.32,.72,0,1)}
```

- [ ] **Step 5: Point showTab at the new sidebar items**

Edit — the active-toggle selector:

old:
```javascript
function showTab(id){document.querySelectorAll('.di[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===id));
```
new:
```javascript
function showTab(id){document.querySelectorAll('.nav-item[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===id));
```

Edit — the click-wiring selector:

old:
```javascript
document.querySelectorAll('.di[data-tab]').forEach(t=>t.onclick=()=>showTab(t.dataset.tab));
```
new:
```javascript
document.querySelectorAll('.nav-item[data-tab]').forEach(t=>t.onclick=()=>showTab(t.dataset.tab));
```

- [ ] **Step 6: Archive the magnification IIFE**

Edit — wrap the dock magnification block in a JS comment. Match from its start through its end:

old:
```javascript
(function(){const dock=document.querySelector('.dock');if(!dock)return;const ics=[...dock.querySelectorAll('.di-ic')];const n=ics.length;
```
new:
```javascript
/* ARCHIVED DOCK magnification — revert with the dock block above.
(function(){const dock=document.querySelector('.dock');if(!dock)return;const ics=[...dock.querySelectorAll('.di-ic')];const n=ics.length;
```

Edit — close the comment at the IIFE's end:

old:
```javascript
dock.addEventListener('mouseleave',()=>{my=null;setTargets();kick();});})();
```
new:
```javascript
dock.addEventListener('mouseleave',()=>{my=null;setTargets();kick();});})();
*/
```

- [ ] **Step 7: Verify JS syntax**

Run:
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const blocks=h.match(/<script>[\s\S]*?<\/script>/g)||[];const main=blocks.map(b=>b.replace(/^<script>/,'').replace(/<\/script>$/,'')).find(s=>s.includes('function showTab'));fs.writeFileSync('.navcheck.js',main)" && node --check .navcheck.js && rm .navcheck.js && echo SYNTAX_OK
```
Expected: `SYNTAX_OK`

- [ ] **Step 8: Verify no leftover live dock / double offset**

Run:
```bash
grep -n 'class="dock"' index.html; grep -n 'padding-left:82px' index.html; grep -n '.nav-item\[data-tab\]' index.html
```
Expected: `class="dock"` appears only inside the `<!-- -->` comment; **no** `padding-left:82px` line remains; `.nav-item[data-tab]` appears twice (in showTab).

- [ ] **Step 9: Commit**

```bash
git add index.html
git commit -m "feat(nav): replace floating dock with sidebar shell (dock archived)"
```

---

### Task 2: Three display modes + persistence + hover-expand overlay

**Files:**
- Modify: `index.html` (add mode CSS after the sidebar CSS block; add JS functions + init in the main script)

**Interfaces:**
- Consumes: `#nav` element and `.nav-item`/`.nav-lbl`/`.nav-badge` from Task 1; `#app` element (existing).
- Produces: `applyNavMode(mode)` and `setNavMode(mode)` globals; `[data-mode="collapsed"|"hover"]` behavior; `--nav-w` on `#app`. Task 3's popover calls `setNavMode`.

**Deliverable:** Setting `data-mode` (or `localStorage['erp_nav_mode']`) switches between expanded (210, labels), collapsed (54, icons + tooltip), and hover (54, expands to 210 on hover as an overlay with the content frame fixed). Choice persists across reload; default is `hover`.

- [ ] **Step 1: Add mode CSS**

Edit — insert the mode rules right after the `.nav-div` rule from Task 1:

old:
```css
.nav-div{height:1px;background:var(--line2);margin:8px 16px}
```
new:
```css
.nav-div{height:1px;background:var(--line2);margin:8px 16px}
/* modes */
.nav[data-mode="expanded"]{width:210px}
.nav[data-mode="collapsed"]{width:54px}
.nav[data-mode="collapsed"] .nav-lbl,.nav[data-mode="collapsed"] .nav-badge{opacity:0}
.nav[data-mode="hover"]{width:54px}
.nav[data-mode="hover"] .nav-lbl,.nav[data-mode="hover"] .nav-badge{opacity:0}
.nav[data-mode="hover"]:hover{width:210px;box-shadow:6px 0 24px rgba(0,0,0,.10)}
.nav[data-mode="hover"]:hover .nav-lbl,.nav[data-mode="hover"]:hover .nav-badge{opacity:1}
/* tooltip when labels are hidden */
.nav[data-mode="collapsed"] .nav-item:hover::after{content:attr(data-tip);position:absolute;left:calc(100% + 14px);top:50%;transform:translateY(-50%);background:var(--ink);color:var(--surface);padding:5px 10px;border-radius:8px;font-size:12px;white-space:nowrap;box-shadow:var(--shadow);z-index:6;pointer-events:none}
/* mobile: force thin rail */
@media(max-width:760px){.nav,.nav[data-mode="expanded"],.nav[data-mode="hover"]:hover{width:54px}.nav .nav-lbl,.nav .nav-badge{opacity:0}.content{padding-left:54px!important}}
```

- [ ] **Step 2: Add the mode JS functions**

Edit — insert the functions right after the `showTab` click-wiring line (updated in Task 1):

old:
```javascript
document.querySelectorAll('.nav-item[data-tab]').forEach(t=>t.onclick=()=>showTab(t.dataset.tab));
```
new:
```javascript
document.querySelectorAll('.nav-item[data-tab]').forEach(t=>t.onclick=()=>showTab(t.dataset.tab));
function applyNavMode(m){m=(m==='expanded'||m==='collapsed'||m==='hover')?m:'hover';var nav=document.getElementById('nav');if(nav)nav.dataset.mode=m;var app=document.getElementById('app');if(app)app.style.setProperty('--nav-w',m==='expanded'?'210px':'54px');document.querySelectorAll('#navPop .nav-pop-i').forEach(function(b){b.classList.toggle('on',b.dataset.nm===m);});}
function setNavMode(m){try{localStorage.setItem('erp_nav_mode',m);}catch(e){}applyNavMode(m);var p=document.getElementById('navPop');if(p)p.classList.remove('open');}
applyNavMode((function(){try{return localStorage.getItem('erp_nav_mode');}catch(e){return null;}})()||'hover');
```

> `applyNavMode` queries `#navPop` (added in Task 3). Until then the `querySelectorAll` matches nothing and is a harmless no-op.

- [ ] **Step 3: Verify JS syntax**

Run the `node --check` command from Global Constraints.
Expected: `SYNTAX_OK`

- [ ] **Step 4: Verify default + persistence logic by inspection**

Run:
```bash
grep -n "erp_nav_mode" index.html
```
Expected: two matches — the `setItem` in `setNavMode` and the init reader. Confirm the init falls back to `'hover'`.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(nav): add expanded/collapsed/hover modes + localStorage persistence"
```

---

### Task 3: Sidebar control popover

**Files:**
- Modify: `index.html` (add control button + popover markup into `.nav-bottom`; add popover CSS; add toggle + outside-click JS)

**Interfaces:**
- Consumes: `setNavMode(mode)` from Task 2; `.nav-bottom` container from Task 1.
- Produces: `toggleNavPop(event)` global; `#navPop` with three `.nav-pop-i[data-nm]` options that `applyNavMode` marks with `.on`.

**Deliverable:** A "Sidebar control" button at the sidebar bottom opens a popover listing Expanded / Collapsed / Expand on hover with a dot on the current mode; selecting one switches + persists + closes; clicking outside closes.

- [ ] **Step 1: Add the control button + popover markup**

Edit — insert after the settings item inside `.nav-bottom`:

old:
```html
<span class="nav-lbl">ตั้งค่า</span></a>
    </div>
  </aside>
```
new:
```html
<span class="nav-lbl">ตั้งค่า</span></a>
      <button class="nav-item nav-ctrl" id="navCtrlBtn" data-tip="Sidebar control" onclick="toggleNavPop(event)"><span class="nav-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/></svg></span><span class="nav-lbl">Sidebar control</span></button>
      <div class="nav-pop" id="navPop">
        <div class="nav-pop-h">Sidebar control</div>
        <button class="nav-pop-i" data-nm="expanded" onclick="setNavMode('expanded')"><span class="nav-pop-dot"></span>Expanded</button>
        <button class="nav-pop-i" data-nm="collapsed" onclick="setNavMode('collapsed')"><span class="nav-pop-dot"></span>Collapsed</button>
        <button class="nav-pop-i" data-nm="hover" onclick="setNavMode('hover')"><span class="nav-pop-dot"></span>Expand on hover</button>
      </div>
    </div>
  </aside>
```

- [ ] **Step 2: Add the popover CSS**

Edit — insert after the mobile media query added in Task 2:

old:
```css
@media(max-width:760px){.nav,.nav[data-mode="expanded"],.nav[data-mode="hover"]:hover{width:54px}.nav .nav-lbl,.nav .nav-badge{opacity:0}.content{padding-left:54px!important}}
```
new:
```css
@media(max-width:760px){.nav,.nav[data-mode="expanded"],.nav[data-mode="hover"]:hover{width:54px}.nav .nav-lbl,.nav .nav-badge{opacity:0}.content{padding-left:54px!important}.nav-pop{left:6px}}
.nav-pop{position:absolute;left:10px;bottom:52px;min-width:186px;background:var(--surface);border:1px solid var(--line);border-radius:12px;box-shadow:var(--shadow);padding:6px;display:none;z-index:20}
.nav-pop.open{display:block}
.nav-pop-h{font-size:11px;font-weight:600;color:var(--ink3);padding:6px 10px 8px;border-bottom:1px solid var(--line2);margin-bottom:4px}
.nav-pop-i{display:flex;align-items:center;gap:9px;width:100%;background:none;border:0;font:inherit;font-size:13px;color:var(--ink);padding:8px 10px;border-radius:8px;cursor:pointer;text-align:left}
.nav-pop-i:hover{background:var(--hover)}
.nav-pop-dot{width:6px;height:6px;border-radius:50%;background:transparent;flex:none}
.nav-pop-i.on .nav-pop-dot{background:var(--ink)}
```

- [ ] **Step 3: Add toggle + outside-click JS**

Edit — insert after the `applyNavMode(...)` init line from Task 2:

old:
```javascript
applyNavMode((function(){try{return localStorage.getItem('erp_nav_mode');}catch(e){return null;}})()||'hover');
```
new:
```javascript
applyNavMode((function(){try{return localStorage.getItem('erp_nav_mode');}catch(e){return null;}})()||'hover');
function toggleNavPop(e){if(e){e.stopPropagation();}var p=document.getElementById('navPop');if(p)p.classList.toggle('open');}
document.addEventListener('click',function(e){var p=document.getElementById('navPop');if(p&&p.classList.contains('open')&&!e.target.closest('#navPop')&&!e.target.closest('#navCtrlBtn'))p.classList.remove('open');});
```

- [ ] **Step 4: Verify JS syntax**

Run the `node --check` command from Global Constraints.
Expected: `SYNTAX_OK`

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(nav): add sidebar control popover (mode switcher)"
```

---

### Task 4: Full visual verification (all modes, popover, dark mode)

**Files:**
- Create (scratchpad, not committed): `sidebar-preview.html`

**Interfaces:**
- Consumes: the final sidebar markup + CSS + JS from Tasks 1–3.
- Produces: screenshots confirming Acceptance Criteria.

**Deliverable:** Screenshots proving expanded/collapsed/hover widths, content-fixed-on-hover, the control popover with the current-mode dot, and correct dark-mode colors. Any defect found is fixed in `index.html` and re-verified.

- [ ] **Step 1: Build a standalone preview**

Create `sidebar-preview.html` in the session scratchpad directory. Copy the final `<style>` sidebar rules and the `<aside class="nav">…</aside>` markup and the mode JS from `index.html` verbatim, plus a `:root` token block for light mode and a `[data-theme="dark"]` block (copy both from `index.html` lines ~15–24). Add a mock content area with a heading and a fixed card on the right (to confirm the content frame does not move). Include the `applyNavMode`, `setNavMode`, `toggleNavPop` functions and the outside-click handler.

- [ ] **Step 2: Serve it and open in Playwright**

Start a local server on an unused port (8791 is taken by another app — use e.g. 8913) from the scratchpad dir:
```bash
node -e "const h=require('http'),f=require('fs'),p=require('path');h.createServer((q,s)=>{try{const fp=p.join(process.cwd(),decodeURIComponent(q.url.split('?')[0]));s.setHeader('Content-Type','text/html; charset=utf-8');s.end(f.readFileSync(fp))}catch(e){s.statusCode=404;s.end('nf')}}).listen(8913,()=>console.log('up'))"
```
(run in background), then `browser_navigate` to `http://localhost:8913/sidebar-preview.html`.

- [ ] **Step 3: Screenshot each mode**

Use `browser_evaluate` to call `setNavMode('expanded')`, `setNavMode('collapsed')`, then `setNavMode('hover')` and dispatch a `mouseenter`/hover on `#nav`; take a `browser_take_screenshot` after each. Then `toggleNavPop()` and screenshot the popover. Then set `document.documentElement.dataset.theme='dark'` and screenshot expanded again.
Expected per Acceptance Criteria:
- expanded = 210px, labels + badges visible, content heading offset right of the sidebar
- collapsed = 54px, icons only
- hover = sidebar overlaps the content (right-side card unchanged position vs collapsed)
- popover lists 3 options with a dot on the current mode
- dark mode: sidebar bg dark, text light, active row subtle

- [ ] **Step 4: Fix any defect in index.html and re-run Steps 2–3**

If a screenshot violates the criteria, correct `index.html`, re-run the `node --check` command, and re-screenshot. Repeat until all criteria pass.

- [ ] **Step 5: Clean up + commit (only if index.html changed)**

Stop the background server (TaskStop). Remove any screenshots written to the repo root. If Step 4 modified `index.html`:
```bash
git add index.html
git commit -m "fix(nav): polish sidebar per visual verification"
```
If no fix was needed, no commit — verification only.

---

## Self-Review

**Spec coverage:**
- Archive dock (markup/CSS/JS) → Task 1 Steps 1,2,6 (markup+JS commented; CSS left inert as dead code — the spec's intent "keep in file, revert-able" is met; nested-comment breakage avoided). ✓
- Items (โปรเจค/Automation/ตั้งค่า, Overview hidden, no search) → Task 1 Step 2. ✓
- 3 modes + sizes + default hover + persistence → Task 2. ✓
- Content fixed on hover → Task 2 CSS (`--nav-w` stays 54 in hover; only `.nav` width grows) + Task 1 Step 4. ✓
- Supabase neutral tone + subtle active + tokens/dark mode → Task 1 Step 3 CSS + Task 4 dark check. ✓
- Sidebar control popover → Task 3. ✓
- showTab integration + navReqCount preserved → Task 1 Steps 2,5. ✓
- Mobile thin rail → Task 2 Step 1 media query. ✓
- Verification (node --check + preview) → every task + Task 4. ✓

**Placeholder scan:** No TBD/TODO; every edit shows exact old/new code. ✓

**Type/name consistency:** `applyNavMode`/`setNavMode`/`toggleNavPop`, `#nav`, `#navPop`, `#navCtrlBtn`, `.nav-item`, `.nav-lbl`, `.nav-badge`, `.nav-pop-i[data-nm]`, `--nav-w`, `erp_nav_mode` used consistently across Tasks 1–4. `applyNavMode` references `#navPop` before Task 3 creates it — documented as a safe no-op. ✓
