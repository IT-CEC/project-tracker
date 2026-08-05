# เมนู Oracle Workflow — ฝังผังกระบวนการเดิมแบบไม่แตะต้นฉบับ

**วันที่:** 2026-08-05
**ขอบเขต:** `index.html` (จุดต่อสาย 4 จุด) + commit ไฟล์ `Oracle_Process_Interactive.html` เข้า repo

## เป้าหมาย
> **อัปเดต 2026-08-05:** ข้อกำหนด "เหมือนต้นฉบับ 100%" ถูกยกเลิกแล้วโดยผู้ใช้ เพื่อแก้สีหัวคอลัมน์ — ดู [2026-08-05-oracle-lane-colors-design.md](2026-08-05-oracle-lane-colors-design.md) ไฟล์นี้จึงเป็นไฟล์ที่โปรเจคดูแลเอง ไม่ใช่สำเนาต้นฉบับอีกต่อไป เหตุผลเรื่อง iframe ด้านล่างยังใช้ได้ทั้งหมด (การชนกันของ `esc()`/`:root`/คลาส ไม่ได้หายไปเพราะแก้สี)


เพิ่มเมนู **Oracle Workflow** ที่แสดงผังกระบวนการจาก `Oracle_Process_Interactive.html` **เหมือนต้นฉบับ 100%** ยังไม่ต่อฐานข้อมูล

## ไฟล์ต้นฉบับ

`Oracle NetSuite · ผังกระบวนการ + คำอธิบาย (Interactive)` — standalone app 70KB
CSS 11KB · **JS 56KB (39 ฟังก์ชัน)** · markup 3.4KB
มี ซูม/ฟิตจอ/เต็มจอ · แถบกรองโซน LV0 · toggle เส้นเชื่อม · legend · ค้นหา · lane header · canvas SVG + minimap + panel/popover/tooltip

## ทำไมต้อง iframe ไม่ใช่ inline

ถ้ายัดโค้ดเข้า `index.html` ตรง ๆ จะชนกันจริงตามนี้ (วัดแล้ว):

| ชนกัน | รายการ |
|---|---|
| **ฟังก์ชัน** | `esc()` · `clearFilters()` |
| ID | `fsBtn` |
| คลาส | `chip` · `on` · `dot` · `l` · `pb` · `v` |
| CSS ระดับ element | `html,body` · `html` |
| ตัวแปร `:root` | 14 ตัว ทับชื่อ `--bg` `--line` `--ink` `--ink3` ของแอป |

`esc()` อันตรายที่สุด — แอปหลักใช้ escape HTML แทบทุกฟังก์ชัน ถ้าถูกทับด้วยเวอร์ชันของ Oracle จะพังทั้งแอปแบบเงียบ ๆ และ `:root` ของ Oracle จะทับตัวแปรสีจนธีมทั้งแอปเพี้ยน

การ inline แล้วเติม prefix ให้ทุก id/class/ฟังก์ชัน/ตัวแปร ต้องแก้ JS 56KB ด้วยมือ เสี่ยงพลาดสูง **และขัดกับข้อกำหนด "เหมือนต้นฉบับ 100%" โดยตรง**

iframe แยก document แยก global scope แยก CSS scope — ชนกันไม่ได้ในเชิงโครงสร้าง และสิ่งที่แสดงคือไฟล์เดิมทั้งดุ้น จึงเหมือน 100% โดยไม่ต้องพิสูจน์ทีละจุด

## สิ่งที่ทำ

### 1. ไฟล์
commit `Oracle_Process_Interactive.html` เข้า repo root (ตอนนั้นตามเดิมทุกไบต์ — ภายหลังแก้สีหัวคอลัมน์แล้ว ดูหมายเหตุด้านบน)

### 2. เมนู
เพิ่มใน sidebar หมวด **Oracle** ต่อจากรายการ "รายงาน 3 ระดับ" (บรรทัด ~801)

```html
<a class="sb-item" data-tab="oracle" data-tip="Oracle Workflow">…icon…<span class="sb-label" data-nav="oracle">Oracle Workflow</span></a>
```

`updateNavActive()` รองรับอยู่แล้ว — รายการที่ไม่มี `data-pv`/`data-bv` จะเทียบ `data-tab` กับแท็บที่ active ตรง ๆ

### 3. Panel
เพิ่ม `<section class="panel" id="oracle">` ต่อจาก panel `settings`

```html
<section class="panel" id="oracle">
  <iframe id="oracleFrame" class="oraclefr" title="Oracle Workflow" allow="fullscreen" loading="lazy"></iframe>
</section>
```

CSS:
```css
.oraclefr{width:100%;height:calc(100vh - 172px);min-height:520px;border:1px solid var(--line);border-radius:16px;background:#fff;display:block}
```
พื้นเป็น `#fff` คงที่ ไม่ผูกกับตัวแปรธีม เพราะเนื้อหาข้างในเป็นโหมดสว่างอย่างเดียว

### 4. โหลดแบบ lazy
ตั้ง `src` ตอนเปิดแท็บครั้งแรกเท่านั้น — 70KB + Google Fonts จะไม่ถูกดึงถ้าผู้ใช้ไม่เคยเข้าเมนูนี้

ใน `showTab(id)` เพิ่ม:
```js
if(id==='oracle'){var _of=document.getElementById('oracleFrame');if(_of&&!_of.getAttribute('src'))_of.setAttribute('src','Oracle_Process_Interactive.html');}
```

### 5. ป้ายชื่อ
- `CRUMB` เพิ่ม `oracle:'Oracle Workflow'` (บรรทัด ~3040) — `refreshCrumb()` ใช้ `CRUMB[tab]` เป็น fallback อยู่แล้ว
- `NAVI` เพิ่ม `oracle:{th:'Oracle Workflow',en:'Oracle Workflow'}` (บรรทัด ~3683) สำหรับ `data-nav="oracle"` ทั้งสองภาษา (ชื่อเดียวกันทั้งไทยและอังกฤษตามที่ผู้ใช้กำหนด)

## ไม่แตะ

JS เดิม · ตาราง · การ์ด · หน้าอื่น · `syncTopAdd` (โค้ดเดิมซ่อนปุ่ม + ทุกตัวเมื่อ panel ไม่ใช่ project/bridge อยู่แล้ว) · และ**ไฟล์ Oracle เอง**

## ข้อแลกเปลี่ยนที่ยอมรับแล้ว

1. **ธีมมืดไม่มีผลข้างใน** — ต้นฉบับเป็นโหมดสว่างอย่างเดียว เปิดในธีมมืดจะเห็นกล่องสว่างบนพื้นมืด การแก้ให้เนียนต้องแก้ไฟล์ต้นฉบับ ซึ่งขัดกับข้อกำหนด
2. **Google Fonts โหลดจากภายนอก** — ต้นฉบับใช้ DM Sans + Noto Sans Thai ถ้าออฟไลน์จะตกไปใช้ฟอนต์สำรอง (ไม่พัง แค่หน้าตาเปลี่ยน)
3. **เนื้อหาเป็นไทยล้วน** — ปุ่มสลับ EN ของแอปไม่มีผลข้างใน
4. ปุ่ม "นำเสนอ" ของแอปกับปุ่ม "เต็มจอ" ในผังทำงานคนละระดับ (ทั้งแอป vs เฉพาะผัง) ใช้งานได้ทั้งคู่

## การตรวจสอบ

1. `node --check` → `SYNTAX OK`
2. ~~ไฟล์ Oracle ที่ commit ต้องเหมือนต้นฉบับทุกไบต์~~ — ยกเลิกแล้ว ดูหมายเหตุด้านบน
3. Playwright:
   - คลิกเมนู → panel `oracle` active · crumb เป็น `Oracle Workflow` · รายการ sidebar ได้คลาส `active`
   - iframe **ไม่มี `src` ก่อนเปิดแท็บ** และมี `src` หลังเปิด (พิสูจน์ lazy-load)
   - เนื้อหาใน iframe โหลดจริง — เข้าถึง `contentDocument` แล้วเจอ `#stage` · `#canvas` · `#wires` และปุ่มควบคุมของต้นฉบับ
   - ไม่มี JS error ใหม่ทั้งใน parent และใน iframe
4. ไม่ regression — 4 panel เดิม + sub-view ทั้งหมด ทั้ง light/dark render ปกติ · `esc()` ของแอปยังเป็นตัวเดิม (พิสูจน์ว่า iframe ไม่รั่ว) · ตัวแปร `--bg`/`--ink` ของแอปไม่เปลี่ยน
5. ดูภาพจริงทั้งสองธีม
