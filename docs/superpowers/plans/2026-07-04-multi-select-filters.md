# Multi-select Filters — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the filter-bar dropdowns across all views multi-select (choose many or one), by extending the existing `.cs` combobox, with OR filter logic, fully backward-compatible with single selection.

**Architecture:** All changes in `index.html`. Add a **multi mode** to the existing `.cs` combobox (`csSyncMulti`), opt-in per `<select>` via `data-multi="1"`. Multi state is a `Set` on the select element (`sel._m`); empty = all. A reader `vm(id)` returns the selected array; filter functions switch from equality to array `includes`/`some`. Programmatic `select.value = x` stays working via the existing value-setter hook (mapped to the Set). Non-filter selects (edit modal, zoom) are untouched.

**Tech Stack:** Vanilla HTML/CSS/JS in one file. No test runner.

## Global Constraints

- Edit **only** `index.html`. Do not touch persistence/Firebase, Gantt/table render internals (beyond the named filter lines), topbar, sidebar, status strips.
- Opt-in attribute is exactly `data-multi="1"` (NOT bare `data-multi` — `dataset.multi===""` is falsy).
- Empty selection = show all (unfiltered), same as the current empty `<select>` value.
- Single selection must behave identically to today.
- Trigger label: 0 selected → the `value===""` option's text; 1 → that option's label; ≥2 → `N + ' รายการ'` (Thai) or `N + ' selected'` when `LANG==='en'`.
- Multi selects to convert (visible filter-bar dropdowns): `piPhase, piStatus, piAsg, apPhase, apStatus, apAsg, fMod, fSub, fType, fGap, actCat, actStatus, actPri, actOwner, brDept, brType, brCplx, brRisk`.
- Do NOT convert: `fStatus, brStatus` (hidden, strip-driven), `piZoom, apZoom`, edit-modal selects, settings segmented.
- File uses CRLF line endings — anchor edits on single-line strings; multi-line `old_string` will not match.
- Verification per task: `node --check` on the extracted main script (below) + code review. Full visual check is Task 6.
- Reusable `node --check`:
  ```bash
  node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const blocks=h.match(/<script>[\s\S]*?<\/script>/g)||[];const main=blocks.map(b=>b.replace(/^<script>/,'').replace(/<\/script>$/,'')).find(s=>s.includes('function showTab'));fs.writeFileSync('.navcheck.js',main)" && node --check .navcheck.js && rm .navcheck.js && echo SYNTAX_OK
  ```

---

### Task 1: Multi-select infrastructure (dormant)

**Files:** Modify `index.html` (add `csSyncMulti` + branch in `csSync`; add `vm()`; enhance the value-setter hook). No `data-multi` yet, so nothing changes behavior.

**Interfaces:**
- Produces: `csSyncMulti(sel)` (renders multi menu + label, mutates `sel._m` Set), `vm(id)` → `string[]`. Later tasks add `data-multi="1"` and switch filter reads to `vm`.
- Consumes: existing `csSync`, `csClose`, `LANG`, `_csBusy`.

- [ ] **Step 1: Add `csSyncMulti` and branch `csSync` into it**

Edit — anchor on the `csSync` declaration line (single line):

old:
```javascript
function csSync(sel){
```
new:
```javascript
function csSyncMulti(sel){
  var wrap=sel.closest('.cs');if(!wrap)return;
  if(!sel._m)sel._m=new Set();
  var trg=wrap.querySelector('.cs-trg'),val=trg.querySelector('.fl-value');
  var opts=[].slice.call(sel.options);
  var phOpt=opts.filter(function(o){return o.value==='';})[0];
  var ph=phOpt?phOpt.textContent.trim():'';
  var chosen=opts.filter(function(o){return o.value!==''&&sel._m.has(o.value);});
  trg.disabled=sel.disabled;
  if(chosen.length===0)val.textContent=ph;
  else if(chosen.length===1)val.textContent=chosen[0].textContent.trim();
  else val.textContent=chosen.length+(LANG==='en'?' selected':' รายการ');
  var menu=wrap.querySelector('.fl-menu');
  menu.innerHTML=opts.map(function(o,i){
    if(o.disabled&&!o.value)return '<div class="fl-sep"></div>';
    var isAll=(o.value===''),on=isAll?(sel._m.size===0):sel._m.has(o.value);
    return '<div class="fl-opt'+(on?' selected':'')+'" data-i="'+i+'"><span class="fl-opt-label">'+(o.textContent.trim()||'—')+'</span>'+(on?'<svg class="fl-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="m5 12 5 5L20 7"/></svg>':'')+'</div>';
  }).join('');
  menu.querySelectorAll('.fl-opt').forEach(function(op){
    op.addEventListener('click',function(e){
      e.stopPropagation();
      var o=sel.options[+op.dataset.i];
      if(o.value==='')sel._m.clear();
      else if(sel._m.has(o.value))sel._m.delete(o.value);
      else sel._m.add(o.value);
      csSyncMulti(sel);
      sel.dispatchEvent(new Event('input',{bubbles:true}));
      sel.dispatchEvent(new Event('change',{bubbles:true}));
    });
  });
}
function csSync(sel){if(sel.dataset.multi)return csSyncMulti(sel);
```

- [ ] **Step 2: Add the `vm(id)` reader next to `v(id)`**

Edit — anchor on the `v` helper (single line):

old:
```javascript
function v(id){var e=document.getElementById(id);return e?e.value:"";}
```
new:
```javascript
function v(id){var e=document.getElementById(id);return e?e.value:"";}
function vm(id){var e=document.getElementById(id);if(!e)return [];if(e.dataset.multi)return e._m?[].slice.call(e._m):[];return e.value?[e.value]:[];}
```

- [ ] **Step 3: Enhance the value-setter hook for multi**

Edit — anchor on the exact setter line:

old:
```javascript
    set:function(v){d.set.call(this,v);if(this.dataset&&this.dataset.cs&&!_csBusy)csSync(this);}});
```
new:
```javascript
    set:function(v){d.set.call(this,v);if(this.dataset&&this.dataset.cs&&!_csBusy){if(this.dataset.multi){if(!this._m)this._m=new Set();this._m.clear();if(v)this._m.add(v);csSyncMulti(this);}else csSync(this);}}});
```

- [ ] **Step 4: Verify syntax**

Run the `node --check` command from Global Constraints. Expected: `SYNTAX_OK`.

- [ ] **Step 5: Confirm dormancy**

Run: `grep -c 'data-multi' index.html`
Expected: `0` (no select opted in yet — infra is present but inactive).

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(filters): add dormant multi-select combobox infra (csSyncMulti/vm)"
```

---

### Task 2: PI + Automation (Gantt) filters multi

**Files:** Modify `index.html` (add `data-multi="1"` to 6 selects; rewrite `filteredPI`).

**Interfaces:** Consumes `vm` from Task 1. `filteredPI()` return shape unchanged (array of PIMPL rows).

- [ ] **Step 1: Opt-in the 6 Gantt filter selects**

Make these six edits (each old→new adds ` data-multi="1"`):

- `<select id="piPhase">` → `<select id="piPhase" data-multi="1">`
- `<select id="piStatus">` → `<select id="piStatus" data-multi="1">`
- `<select id="piAsg">` → `<select id="piAsg" data-multi="1">`
- `<select id="apPhase">` → `<select id="apPhase" data-multi="1">`
- `<select id="apStatus">` → `<select id="apStatus" data-multi="1">`
- `<select id="apAsg">` → `<select id="apAsg" data-multi="1">`

- [ ] **Step 2: Switch `filteredPI` to multi (OR)**

Edit:

old:
```javascript
function filteredPI(){var ph=v(GP+'Phase'),st=v(GP+'Status'),ag=v(GP+'Asg'),q=v(GP+'Search').toLowerCase().trim();
  return PIMPL.filter(d=>(!ph||d.ph===ph)&&(!st||d.st===st)&&(!ag||d.asg.includes(ag))&&(!q||(d.name+d.asg.join(' ')).toLowerCase().includes(q)));}
```
new:
```javascript
function filteredPI(){var phs=vm(GP+'Phase'),sts=vm(GP+'Status'),ags=vm(GP+'Asg'),q=v(GP+'Search').toLowerCase().trim();
  return PIMPL.filter(d=>(!phs.length||phs.includes(d.ph))&&(!sts.length||sts.includes(d.st))&&(!ags.length||ags.some(a=>d.asg.includes(a)))&&(!q||(d.name+d.asg.join(' ')).toLowerCase().includes(q)));}
```

- [ ] **Step 3: Verify syntax**

Run the `node --check` command. Expected: `SYNTAX_OK`.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(filters): multi-select phase/status/team on PI + AP Gantt"
```

---

### Task 3: Requirements filters multi (fMod/fSub/fType/fGap)

**Files:** Modify `index.html` (opt-in 4 selects; add `gapPred`; rewrite `fillSub`, `filteredReqs`, `renderReqKbar` filter lines, `setGapKpi`).

**Interfaces:** Consumes `vm`, `gapAssessed`, `uniq`. Produces `gapPred(g,x)` used by both `filteredReqs` and `renderReqKbar`.

> This is the heaviest task: Requirements reads its filters in three places (`fillSub`, `filteredReqs`, `renderReqKbar`) plus the KPI toggle `setGapKpi`. All must move to multi together so the table and KPI ribbon stay consistent. `fStatus` stays single (strip-driven) — leave every `st=v('fStatus')` as-is.

- [ ] **Step 1: Opt-in the 4 Requirements filter selects**

- `<select id="fMod">` → `<select id="fMod" data-multi="1">`
- `<select id="fSub">` → `<select id="fSub" data-multi="1">`
- `<select id="fType">` → `<select id="fType" data-multi="1">`
- `<select id="fGap">` → `<select id="fGap" data-multi="1">`

- [ ] **Step 2: Add the shared `gapPred` helper**

Edit — anchor on the `gapAssessed` helper (single line):

old:
```javascript
function gapAssessed(r){return GAP_OPTS.indexOf(r.gap)>0;}
```
new:
```javascript
function gapAssessed(r){return GAP_OPTS.indexOf(r.gap)>0;}
function gapPred(g,x){return g==='yes'?gapAssessed(x):g==='no'?!gapAssessed(x):g==='dev'?(x.gap==='3. Customization'||x.gap==='5. Not supported'):x.gap===g;}
```

- [ ] **Step 3: Rewrite `fillSub` (union + prune stale sub-selection)**

Edit:

old:
```javascript
function fillSub(){const m=v('fMod');const subs=uniq(REQS.filter(r=>!m||r.module===m).map(r=>r.sub).filter(Boolean));document.getElementById('fSub').innerHTML='<option value="">'+T('allSub')+'</option>'+subs.map(s=>`<option>${s}</option>`).join('');}
```
new:
```javascript
function fillSub(){const mods=vm('fMod');const subs=uniq(REQS.filter(r=>!mods.length||mods.includes(r.module)).map(r=>r.sub).filter(Boolean));const fs=document.getElementById('fSub');fs.innerHTML='<option value="">'+T('allSub')+'</option>'+subs.map(s=>`<option>${s}</option>`).join('');if(fs._m)fs._m=new Set(subs.filter(s=>fs._m.has(s)));}
```

- [ ] **Step 4: Rewrite `filteredReqs` (OR + gapPred)**

Edit:

old:
```javascript
function filteredReqs(){const m=v('fMod'),sub=v('fSub'),t=v('fType'),g=v('fGap'),st=v('fStatus'),q=v('fSearch').toLowerCase().trim();
```
new:
```javascript
function filteredReqs(){const mods=vm('fMod'),subs=vm('fSub'),types=vm('fType'),gaps=vm('fGap'),st=v('fStatus'),q=v('fSearch').toLowerCase().trim();
```

Then edit the predicate line that follows (line begins with `let r=REQS.filter`):

old:
```javascript
  let r=REQS.filter(x=>(!m||x.module===m)&&(!sub||x.sub===sub)&&(!t||x.type===t)&&(!g||(g==='yes'?gapAssessed(x):g==='no'?!gapAssessed(x):g==='dev'?(x.gap==='3. Customization'||x.gap==='5. Not supported'):x.gap===g))&&(!st||(x.status||'Not Started')===st)&&(!q||(x.name+x.req+x.owner+x.code+x.sub).toLowerCase().includes(q)));
```
new:
```javascript
  let r=REQS.filter(x=>(!mods.length||mods.includes(x.module))&&(!subs.length||subs.includes(x.sub))&&(!types.length||types.includes(x.type))&&(!gaps.length||gaps.some(g=>gapPred(g,x)))&&(!st||(x.status||'Not Started')===st)&&(!q||(x.name+x.req+x.owner+x.code+x.sub).toLowerCase().includes(q)));
```

- [ ] **Step 5: Rewrite `renderReqKbar` filter reads + base/baseAll + gap highlights**

Edit the reader line:

old:
```javascript
function renderReqKbar(){const el=document.getElementById('reqKbar');if(!el)return;const m=v('fMod'),sub=v('fSub'),t=v('fType'),st=v('fStatus'),q=v('fSearch').toLowerCase().trim(),g=v('fGap');
```
new:
```javascript
function renderReqKbar(){const el=document.getElementById('reqKbar');if(!el)return;const mods=vm('fMod'),subs=vm('fSub'),types=vm('fType'),st=v('fStatus'),q=v('fSearch').toLowerCase().trim(),gaps=vm('fGap');
```

Edit `base` (line begins `  const base=REQS.filter`):

old:
```javascript
  const base=REQS.filter(x=>(!m||x.module===m)&&(!sub||x.sub===sub)&&(!t||x.type===t)&&(!st||(x.status||'Not Started')===st)&&(!q||(x.name+x.req+x.owner+x.code+x.sub).toLowerCase().includes(q)));
```
new:
```javascript
  const base=REQS.filter(x=>(!mods.length||mods.includes(x.module))&&(!subs.length||subs.includes(x.sub))&&(!types.length||types.includes(x.type))&&(!st||(x.status||'Not Started')===st)&&(!q||(x.name+x.req+x.owner+x.code+x.sub).toLowerCase().includes(q)));
```

Edit the `_gn` group-name line fragment (single occurrence):

old:
```javascript
  var _gn=sub||m||'ทุกกลุ่มงาน';
```
new:
```javascript
  var _gn=(subs.length?subs.join(', '):mods.length?mods.join(', '):'ทุกกลุ่มงาน');
```

Edit `baseAll` (line begins `  const baseAll=REQS.filter`):

old:
```javascript
  const baseAll=REQS.filter(x=>(!m||x.module===m)&&(!sub||x.sub===sub)&&(!t||x.type===t)&&(!q||(x.name+x.req+x.owner+x.code+x.sub).toLowerCase().includes(q)));
```
new:
```javascript
  const baseAll=REQS.filter(x=>(!mods.length||mods.includes(x.module))&&(!subs.length||subs.includes(x.sub))&&(!types.length||types.includes(x.type))&&(!q||(x.name+x.req+x.owner+x.code+x.sub).toLowerCase().includes(q)));
```

Edit the KPI cards line — only the dev-card `on:` uses `g`; replace `on:g==='dev'` with `on:gaps.includes('dev')`:

old:
```javascript
{v:devA,sm:'Customization/Not supported',l:'ต้องพัฒนา',act:"setGapKpi('dev')",c:'#ff3b30',on:g==='dev'}];
```
new:
```javascript
{v:devA,sm:'Customization/Not supported',l:'ต้องพัฒนา',act:"setGapKpi('dev')",c:'#ff3b30',on:gaps.includes('dev')}];
```

Edit the gap legend highlight (`g===cat[0]` → `gaps.includes(cat[0])`):

old:
```javascript
if(n>0)leg+=`<span class="fglg${g===cat[0]?' on':''}" onclick="setGapKpi('${cat[0]}')"><span class="dot" style="background:${cat[2]}"></span>${cat[1]} <b>${n}</b></span>`;});
```
new:
```javascript
if(n>0)leg+=`<span class="fglg${gaps.includes(cat[0])?' on':''}" onclick="setGapKpi('${cat[0]}')"><span class="dot" style="background:${cat[2]}"></span>${cat[1]} <b>${n}</b></span>`;});
```

Edit the "not assessed" legend highlight (`g==='no'` → `gaps.includes('no')`):

old:
```javascript
    leg+=`<span class="fglg${g==='no'?' on':''}" onclick="setGapKpi('no')"><span class="dot dot-u"></span>ยังไม่ประเมิน <b>${na}</b></span>`;
```
new:
```javascript
    leg+=`<span class="fglg${gaps.includes('no')?' on':''}" onclick="setGapKpi('no')"><span class="dot dot-u"></span>ยังไม่ประเมิน <b>${na}</b></span>`;
```

- [ ] **Step 6: Make `setGapKpi` multi-aware**

Edit:

old:
```javascript
function setGapKpi(val){const f=document.getElementById('fGap');f.value=(f.value===val)?'':val;page=1;renderReqTable();}
```
new:
```javascript
function setGapKpi(val){const f=document.getElementById('fGap');if(f.dataset.multi){if(!f._m)f._m=new Set();if(f._m.size===1&&f._m.has(val))f._m.clear();else{f._m.clear();f._m.add(val);}csSyncMulti(f);}else{f.value=(f.value===val)?'':val;}page=1;renderReqTable();}
```

- [ ] **Step 7: Verify syntax**

Run the `node --check` command. Expected: `SYNTAX_OK`.

- [ ] **Step 8: Verify no stale single-var reads remain in these functions**

Run:
```bash
grep -nE "x.module===m\b|x.sub===sub\b|x.type===t\b|_gn=sub" index.html
```
Expected: no output (all converted).

- [ ] **Step 9: Commit**

```bash
git add index.html
git commit -m "feat(filters): multi-select module/sub/type/fit-gap on Requirements"
```

---

### Task 4: Action filters multi

**Files:** Modify `index.html` (opt-in 4 selects; rewrite `filteredActs` predicate).

- [ ] **Step 1: Opt-in the 4 Action filter selects**

- `<select id="actCat">` → `<select id="actCat" data-multi="1">`
- `<select id="actStatus">` → `<select id="actStatus" data-multi="1">`
- `<select id="actPri">` → `<select id="actPri" data-multi="1">`
- `<select id="actOwner">` → `<select id="actOwner" data-multi="1">`

- [ ] **Step 2: Switch `filteredActs` reads + predicate to multi**

Edit the reader line:

old:
```javascript
function filteredActs(){var c=v('actCat'),st=v('actStatus'),pr=v('actPri'),ow=v('actOwner'),q=v('actSearch').toLowerCase().trim();
```
new:
```javascript
function filteredActs(){var cs=vm('actCat'),sts=vm('actStatus'),prs=vm('actPri'),ows=vm('actOwner'),q=v('actSearch').toLowerCase().trim();
```

Edit the predicate line:

old:
```javascript
  var r=ACTS.filter(function(a){return (!c||a.cat===c)&&(!st||(a.status||'Not Started')===st)&&(!pr||a.pri===pr)&&(!ow||(a.owner||'').replace(/\n/g,' ').trim()===ow)&&(!actFilt.overdue||actOverdue(a))&&(!q||((a.action||'')+(a.dept||'')+(a.owner||'')+(a.note||'')+(a.cat||'')).toLowerCase().includes(q));});
```
new:
```javascript
  var r=ACTS.filter(function(a){return (!cs.length||cs.includes(a.cat))&&(!sts.length||sts.includes(a.status||'Not Started'))&&(!prs.length||prs.includes(a.pri))&&(!ows.length||ows.includes((a.owner||'').replace(/\n/g,' ').trim()))&&(!actFilt.overdue||actOverdue(a))&&(!q||((a.action||'')+(a.dept||'')+(a.owner||'')+(a.note||'')+(a.cat||'')).toLowerCase().includes(q));});
```

- [ ] **Step 3: Verify syntax**

Run the `node --check` command. Expected: `SYNTAX_OK`.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(filters): multi-select category/status/priority/owner on Action"
```

---

### Task 5: FTE / Bridge filters multi

**Files:** Modify `index.html` (opt-in 4 selects; rewrite `filteredBr` predicate). `brStatus` stays single.

- [ ] **Step 1: Opt-in the 4 FTE filter selects (NOT brStatus)**

- `<select id="brDept">` → `<select id="brDept" data-multi="1">`
- `<select id="brType">` → `<select id="brType" data-multi="1">`
- `<select id="brCplx">` → `<select id="brCplx" data-multi="1">`
- `<select id="brRisk">` → `<select id="brRisk" data-multi="1">`

- [ ] **Step 2: Switch `filteredBr` reads + predicate to multi (keep `st`/brStatus single)**

Edit the reader line:

old:
```javascript
function filteredBr(){var d=v('brDept'),t=v('brType'),c=v('brCplx'),rk=v('brRisk'),st=v('brStatus'),q=v('brSearch').toLowerCase().trim();
```
new:
```javascript
function filteredBr(){var ds=vm('brDept'),ts=vm('brType'),cs=vm('brCplx'),rks=vm('brRisk'),st=v('brStatus'),q=v('brSearch').toLowerCase().trim();
```

Edit the predicate line:

old:
```javascript
  var r=BR.filter(b=>(!d||b.module===d)&&(!t||b.type===t)&&(!c||b.cplx===c)&&(!rk||brRiskVal(b)===rk)&&(!st||(b.status||'Not Started')===st)&&(!brCatF||b.cat===brCatF)&&(!q||((b.name||'')+(b.dept||'')+(b.req||'')+(b.owner||'')+(b.app||'')).toLowerCase().includes(q)));
```
new:
```javascript
  var r=BR.filter(b=>(!ds.length||ds.includes(b.module))&&(!ts.length||ts.includes(b.type))&&(!cs.length||cs.includes(b.cplx))&&(!rks.length||rks.includes(brRiskVal(b)))&&(!st||(b.status||'Not Started')===st)&&(!brCatF||b.cat===brCatF)&&(!q||((b.name||'')+(b.dept||'')+(b.req||'')+(b.owner||'')+(b.app||'')).toLowerCase().includes(q)));
```

- [ ] **Step 3: Verify syntax**

Run the `node --check` command. Expected: `SYNTAX_OK`.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(filters): multi-select dept/type/complexity/risk on FTE"
```

---

### Task 6: Visual verification (Playwright preview)

**Files:** Create (scratchpad, not committed): `filters-preview.html`.

**Deliverable:** Screenshots + measurements proving: multi menu (checkboxes stay open), count label, OR filtering, "ทุก…"/clear row, single-select parity, programmatic `.value` (drill) compat, dark mode. Any defect is fixed in `index.html` and re-verified.

- [ ] **Step 1: Build a standalone preview**

Create `filters-preview.html` in the session scratchpad. Include the token `:root`/`[data-theme="dark"]` blocks and the `.cs*`/`.fl-*` CSS copied verbatim from `index.html`. Add two `data-multi="1"` selects populated with sample options (e.g., a "phase" select: `ทุกเฟส` + `Design`, `Build`, `Test`; a "team" select). Include `v`, `vm`, `csWrap`, `csToggle`, `csOpen`, `csClose`, `csSync`, `csSyncMulti`, `enhanceSelects`, and the value-setter hook copied verbatim. Add a small results list bound to a filter using `vm(...)` with `.includes` to demonstrate OR. Call `enhanceSelects(document)` on load.

- [ ] **Step 2: Serve and drive with Playwright**

Serve the scratchpad on an unused port (e.g. 8916) with the node one-liner used previously, then `browser_navigate` to it. Use `browser_evaluate`/clicks to: open a menu, click two options (assert menu stays open via snapshot, `_m.size===2`, trigger label = "2 รายการ"), click the "ทุก…" row (assert `_m.size===0`), set `select.value='Build'` programmatically (assert `_m` = {'Build'} and label = "Build"). Screenshot the open multi menu (light) and after switching `document.documentElement.dataset.theme='dark'`.

- [ ] **Step 3: Confirm expectations**
- menu stays open on option click; check marks on all selected
- label: 0 → "ทุกเฟส", 1 → option label, 2 → "2 รายการ"
- results list reflects OR of selected values
- programmatic `.value='X'` → `_m={'X'}` (drill compatibility)
- dark mode menu/label readable (tokens)

- [ ] **Step 4: Fix any defect in index.html and re-run**

If a check fails, correct `index.html`, re-run `node --check`, re-verify.

- [ ] **Step 5: Clean up + commit (only if index.html changed)**

Stop the server (TaskStop), remove any screenshots written to the repo root. If Step 4 changed `index.html`:
```bash
git add index.html
git commit -m "fix(filters): polish per visual verification"
```

---

## Self-Review

**Spec coverage:**
- Extend `.cs` with multi mode, opt-in `data-multi` → Task 1 + per-view opt-ins. ✓
- Set state, empty=all, `vm` reader → Task 1. ✓
- Label 0/1/N rules, menu stays open, "ทุก…"=clear → Task 1 (`csSyncMulti`). ✓
- OR filter logic all views → Tasks 2–5 (filteredPI, filteredReqs, filteredActs, filteredBr). ✓
- fGap OR predicate → Task 3 (`gapPred`). ✓
- fSub union (+prune) → Task 3 (`fillSub`). ✓
- Requirements KPI consistency (renderReqKbar) + setGapKpi → Task 3. ✓
- Programmatic `.value` / drill / clear compat → Task 1 setter hook (used by drill/cockGo/clear\*). ✓
- Exclusions (fStatus/brStatus/zoom/modal) → not opted in. ✓
- Scope list (18 ids) → Tasks 2–5 cover exactly those; fStatus/brStatus excluded. ✓
- Verification (node --check + preview) → every task + Task 6. ✓

**Placeholder scan:** No TBD/TODO; each edit shows exact old/new. ✓

**Type/name consistency:** `vm` returns `string[]`; `csSyncMulti`, `sel._m` (Set), `gapPred(g,x)`, `data-multi="1"` used consistently across tasks. `csSyncMulti` is a hoisted function declaration, so the value-setter hook (Task 1 Step 3) can reference it regardless of source order. ✓
