// הגדרות Firebase של האפליקציה.
// מעתיקים מ-Firebase Console: Project settings → General → Your apps → Web app → SDK setup and configuration → Config.
// הערכים האלה לא סודיים: Firebase בנוי כך שהם נמצאים בדפדפן. ההגנה על הנתונים היא בכללי האבטחה (firestore.rules).
//
// אם מחזירים את הערך ל-null, האפליקציה עובדת ב״מצב מקומי״: בלי חשבונות, והנתונים נשמרים רק בטלפון.

export const firebaseConfig = {
  apiKey: "AIzaSyCD4iPhMNmVEin_0pn3zO-GuL6bS_umKgc",
  authDomain: "rsg1-d3783.firebaseapp.com",
  projectId: "rsg1-d3783",
  storageBucket: "rsg1-d3783.firebasestorage.app",
  messagingSenderId: "647037659881",
  appId: "1:647037659881:web:a6daa2171d6cd61282de78",
};

// דוגמה למבנה:
// export const firebaseConfig = {
//   apiKey: "AIza...",
//   authDomain: "my-family.firebaseapp.com",
//   projectId: "my-family",
//   storageBucket: "my-family.appspot.com",
//   messagingSenderId: "123456789",
//   appId: "1:123456789:web:abc123",
// };
