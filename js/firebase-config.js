// ⚠️ ไฟล์นี้ถูก git-ignore (ดู .gitignore) — ใส่ค่าจริงจาก Firebase Console แล้วห้าม commit
// (Project settings → Your apps → Web app → firebaseConfig)
//
// ค่าเหล่านี้ "ไม่ใช่ความลับ" — ความปลอดภัยมาจาก Firebase Auth + Firestore Rules
// email ทีมฝังไว้ที่นี่เพื่อให้หน้า login เหลือแค่ช่องกรอก "รหัสผ่าน" ช่องเดียว
//
// TODO(ผู้ตั้งค่า): แทนที่ค่า placeholder ด้านล่างด้วยค่าจริง แล้วสร้าง user ใน Authentication

export const firebaseConfig = {
  apiKey: "AIzaSyD2kJH08xwzjjlOU4H5vBKcxsPBoLsFgdM",
  authDomain: "civil-project-tracker-7cf47.firebaseapp.com",
  projectId: "civil-project-tracker-7cf47",
  storageBucket: "civil-project-tracker-7cf47.firebasestorage.app",
  messagingSenderId: "621732136362",
  appId: "1:621732136362:web:906e7189a90e593a4057d3",
  measurementId: "G-50EK3Y3MCC"
};

// บัญชีทีมที่ใช้ร่วมกัน (สร้างใน Firebase Console → Authentication → Users)
export const TEAM_EMAIL = "team@civil.co.th";


// บัญชีผู้ดูแล IT — คนที่ล็อกอินด้วยบัญชีนี้เท่านั้นที่แก้แผนงานโครงการและ Automation ได้
// ต้องสร้างบัญชีนี้ใน Firebase Console → Authentication → Users ก่อน ไม่งั้นจะไม่มีใครแก้ได้เลย
// ถ้าลบบรรทัดนี้ออก ระบบจะกลับไปเป็นทุกคนแก้ได้เหมือนเดิม
export const ADMIN_EMAIL = "admin@civil.co.th";