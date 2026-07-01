# ตั้ง Firebase ทีละขั้น (ทำครั้งเดียว ~10 นาที)

## 1. สร้างโปรเจค
1. ไป https://console.firebase.google.com → **Add project** → ตั้งชื่อ (เช่น `civil-erp-tracker`)
2. ปิด Google Analytics ก็ได้ → Create

## 2. เปิด Authentication (รหัสเดียวร่วมกัน)
1. เมนู **Build → Authentication → Get started**
2. แท็บ **Sign-in method → Email/Password → Enable → Save**
3. แท็บ **Users → Add user**
   - Email: `team@civil.co.th` (หรือตามต้องการ — จะฝังไว้ในแอป)
   - Password: ตั้งรหัสทีม (นี่คือ "รหัสเดียว" ที่ทุกคนใช้)

## 3. เปิด Firestore
1. **Build → Firestore Database → Create database**
2. เลือก **Production mode** → Location: `asia-southeast1` (สิงคโปร์ ใกล้ไทยสุด) → Enable
3. แท็บ **Rules** → วางเนื้อหาจากไฟล์ `firestore.rules` → **Publish**

## 4. เอา config มาใส่แอป
1. ⚙️ **Project settings → General → Your apps → Web (</>)** → ตั้งชื่อ app → Register
2. คัดลอก object `firebaseConfig = {...}`
3. สร้างไฟล์ `js/firebase-config.js` (คัดจาก `js/firebase-config.example.js`) แล้วใส่ค่าจริง
4. (แนะนำ) **Authorized domains**: Authentication → Settings → เพิ่มโดเมน GitHub Pages
   เช่น `<username>.github.io`

## 5. Seed ข้อมูลตั้งต้น (ดู `seed/seed.md`)
รันสคริปต์ seed ครั้งเดียว เพื่อให้ Firestore มีข้อมูลเท่ากับแอปปัจจุบัน

## 6. Deploy บน GitHub Pages
1. สร้าง repo (public) → push โปรเจค (ยกเว้น `firebase-config.js` — ดู .gitignore)
   > หมายเหตุ: ถ้า repo เป็น public ต้องมี `firebase-config.js` ตอน deploy จริง —
   > ค่า config ของ Firebase Web **ไม่ใช่ความลับ** (ความปลอดภัยมาจาก Auth + Rules)
   > แต่ถ้าอยากซ่อน ให้ commit เฉพาะตอน deploy หรือใช้ inject ตอน build
2. Settings → Pages → Source: `main` / root → Save
3. เปิด `https://<username>.github.io/<repo>/`

## หมายเหตุความปลอดภัย
- ป้องกันจริง = **Firestore Rules (auth-required)** ไม่ใช่การซ่อนไฟล์
- ใครไม่ login (ไม่รู้รหัสทีม) → อ่าน/เขียน Firestore ไม่ได้เลย
- เปลี่ยนรหัส = แก้ password ของ user ใน Authentication → ทุกคนกรอกใหม่
