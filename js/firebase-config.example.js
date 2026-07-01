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
