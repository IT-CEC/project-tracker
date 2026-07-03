# Action Item — Design Spec

**Date:** 2026-07-03
**Status:** Approved (pending spec review)

## Goal

Add an **Action Item** view to the ERP dashboard under the **โปรเจค (Project)** tab — a third sub-view alongside `แผนงาน (Implementation)` and `ความต้องการ (Requirements)`. It tracks 43 action items from `Action_Item_Tracker.xlsx` (ERP Implementation follow-ups), editable and synced realtime on Firestore like the rest of the app.

## Source data

- Extracted from `Action_Item_Tracker.xlsx` → sheet `Tracker` → saved to `seed/action_items.json` (43 items, source of truth for the seed).
- Per item: `_id` (No.), `cat` (หมวด), `dept` (Department), `action` (Action Request, may contain `\n`), `pri` (Priority), `owner` (ผู้รับผิดชอบ), `due` (กำหนดส่ง, `dd/mm/yyyy`), `status` (สถานะ), `done` (วันที่เสร็จ), `note` (หมายเหตุ / ติดตาม).
- Observed values: **cat** = `Master Data` (8), `Report&Flow` (11), `Forms` (11), `BRD` (13); **status** = `In Process` (34), `Not Started` (9); **pri** = `High` (12), `Low` (31); **due** range 09/07/2026–31/08/2026.

## Architecture — follows the existing Requirements pattern

This view mirrors the Requirements page (`REQS` model + `renderReqTable` + filters + KPI + `openReq` drawer + `editCell`) so it reads as one system and reuses proven patterns.

### Data model + persistence (like `requirements`)

- New Firestore collection **`action_items`** (per-item docs, doc id = `String(_id)`), realtime.
- In-memory model: `let ACTS = []` (array of the item objects above).
- Embed the 43 seed items inline in `index.html` as `DATA.actions` (copied verbatim from `seed/action_items.json`), same as `DATA.reqs`/`DATA.bridge`.
- Persistence functions (parallel to requirements, reusing the `dbErr` helper + `window.DB` adapter):
  - `async loadActs()` — `DB.loadAll('action_items')`; if empty → seed from `DATA.actions` (write each doc); sort by `_id`; set `ACTS`. Graceful fallback to `DATA.actions` on error.
  - `actSaveOne(a)` — `DB.saveItem('action_items', a._id, a)`.
  - `actDelOne(id)` — `DB.deleteItem('action_items', id)`.
  - `subscribeActs()` — `DB.subscribe('action_items', docs => { ACTS = sortById(docs); renderActs(); })` (skip-first-echo, debounced).
- Wire into `window.startApp`: `await loadActs();` (after `loadPlan()`), and `subscribeActs();` in the subscribe line.

### Nav integration

- **Project sub-toggle** (`#projToggle`): add a third button `data-pv="action"` labelled **Action Item** after the existing `impl` / `reqs` buttons.
- `setProjView(pv)` gains an `action` branch: show `#actionView`, hide `#implement`/`#reqs`, hide the impl/reqs-specific ribbons, render the action view.
- Add a new panel container `#actionView` inside the `#project` panel (sibling of `#implement` and `#reqs`), hidden by default.
- No change to the dock/main tabs — Action Item lives entirely inside the existing Project tab.

## View layout (inside `#actionView`)

### 1. KPI strip (clickable → sets status filter)

Cards: **ทั้งหมด** (total) · **กำลังทำ** (In Process) · **ยังไม่เริ่ม** (Not Started) · **เสร็จแล้ว** (Done) · **เลยกำหนด** (Overdue). Overdue is derived: `due < today && status !== 'Done'`. Clicking a card toggles the matching filter (Overdue = a derived filter flag).

### 2. Filters row

`หมวด` (cat) · `สถานะ` (status) · `Priority` · `ผู้รับผิดชอบ` (owner) select dropdowns + a search box + a `ล้าง` (clear) button. Populated from distinct values in `ACTS`. Same control styling as the Requirements filters.

### 3. Table

Columns: `No.` · `หมวด` (colored chip) · `Department` · `Action Request` (truncated one line; full text in drawer) · `Priority` (colored chip) · `ผู้รับผิดชอบ` · `กำหนดส่ง` · **`สถานะ`** (inline `<select>` dropdown, saves on change) · `หมายเหตุ`.

- **Overdue rows** (`due < today && status !== 'Done'`) get a red-tinted highlight + a red due date — matching the xlsx behaviour.
- Sortable by clicking column headers (`No`, `due`, `status`, `cat`, `pri`).
- Row click (outside the status select) opens the detail drawer.

### 4. Detail drawer (`openAct(id)`, reuses `#modal`)

Shows the full multi-line `Action Request` + editable fields: `สถานะ` (select), `Priority` (select), `ผู้รับผิดชอบ` (input), `กำหนดส่ง` (input `dd/mm/yyyy`), `วันที่เสร็จ` (input), `หมายเหตุ` (textarea). A **ลบ** (delete) button and, in the toolbar above the table, a **+ เพิ่ม Action Item** button (`actAdd()` creates a new item with `_id = max+1`, opens its drawer). Each edit writes that one doc via `actSaveOne`.

## Colors / vocabulary

- **สถานะ** list (dropdown): `Not Started` (gray `#8e8e93`) · `In Process` (orange `#ff9500`) · `On Hold` (purple `#af52de`) · `Done` (green `#28cd41`). (`On Hold`/`Done` unused in current data but supported.)
- **Priority**: `High` (red `#ff3b30`) · `Low` (gray `#8e8e93`).
- **หมวด** chip colors: `BRD` `#0071e3` · `Report&Flow` `#5e5ce6` · `Forms` `#ff9500` · `Master Data` `#28cd41` (fallback gray for any new category).
- Reuse existing CSS classes where possible (`.chip`, `.selmini`, `.stwrap`/`.stsel` for the status cell, filter `select` styles, `.kcard`/KPI styles).

## Scope (YAGNI)

- **In scope:** the `#actionView` (KPI + filters + table + inline status edit + overdue highlight + detail drawer + add/delete), the `action_items` collection with seed + realtime, and the Project sub-toggle.
- **Out of scope (add later if wanted):** the xlsx "พร้อมส่งอีเมล" export, kanban board, gantt/timeline of due dates, per-owner grouping, CSV/xlsx import for this view.

## Constraints

- Do not change other pages' UI/behaviour. Additive only: new panel + one toggle button + new persistence functions + startApp wiring.
- Persistence per-item on Firestore; SDK stays v11.10.0; reuse `dbErr`, `window.DB`, and existing render/filter idioms.
- Firestore rules already allow the team account on all collections (`action_items` covered by `match /{document=**}`).

## Verification

- `node --check` on the main script.
- Playwright (fallback boot): Project → Action Item toggle shows `#actionView`; KPI counts = 43 total / 34 in-process / 9 not-started / overdue computed; filters narrow the table; changing a status `<select>` updates the model; an overdue row carries the highlight class; drawer opens with full action text.
- User round-trip (authed): first load seeds `action_items` (43 docs); edit a status → refresh persists; realtime reflects in a second tab.
- UI parity: other pages unchanged.
