// คัดลอกไฟล์นี้เป็น  js/firebase-config.js  แล้วใส่ค่าจริงจาก Firebase Console
// (Project settings → Your apps → Web app → firebaseConfig)
//
// ค่าเหล่านี้ "ไม่ใช่ความลับ" — ความปลอดภัยมาจาก Firebase Auth + Firestore Rules
// email ทีมฝังไว้ที่นี่เพื่อให้หน้า login เหลือแค่ช่องกรอก "รหัสผ่าน" ช่องเดียว

export const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "civil-erp-tracker.firebaseapp.com",
  projectId: "civil-erp-tracker",
  storageBucket: "civil-erp-tracker.appspot.com",
  messagingSenderId: "0000000000",
  appId: "1:0000000000:web:xxxxxxxxxxxx"
};

// บัญชีทีมที่ใช้ร่วมกัน (สร้างใน Authentication → Users)
export const TEAM_EMAIL = "team@civil.co.th";

// บัญชีผู้ดูแล (สร้างเพิ่มใน Authentication → Users อีกหนึ่งบัญชี คนละรหัสกับ TEAM_EMAIL)
// คนที่ล็อกอินด้วยบัญชีนี้เท่านั้นที่แก้แผนงานโครงการและ Automation ได้
// ถ้าไม่ใส่ ระบบจะถือว่าไม่มีระดับผู้ดูแล ทุกคนเป็นผู้ดูอย่างเดียวสำหรับสองส่วนนั้น
export const ADMIN_EMAIL = "admin@civil.co.th";
