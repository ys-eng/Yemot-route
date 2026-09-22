// שירות גנרי אחד שמשרת כל שלוחות ה-API של ימות המשיח.
// כל שלוחה מצביעה (api_link) לאותו שירות, ומגדירה בתוכה (בגוף הגדרות השלוחה)
// את הפרמטרים tel / Introduction / ending / token כשורות נפרדות.
//
// דוגמה להגדרת שלוחה בימות:
//   type=api
//   api_link=https://YOUR-SERVICE.onrender.com/route
//   api_url_post=yes
//   tel=0501234567
//   Introduction=072
//   ending=99
//   token=SOME_SECRET
//
// !! חשוב: את שם השדה שבו ימות שולח את מספר המתקשר (למשל ApiPhone / Phone / phone)
// יש לוודא מול לוג הבקשות בפועל (LogApi.ymgr באזור הניהול), כי זה משתנה בין גרסאות/מודולים.
// כמו כן, את התחביר המדויק של השורה המוחזרת לניתוב שיחה למספר חיצוני עם הצגת מספר
// מותאם אישית, ואת התחביר המדויק להשמעת הודעת מערכת (M1990) תוך כדי ההמתנה,
// יש לאמת/לכייל מול התיעוד הרשמי או מול תמיכת ימות - ראה הערות "TODO" למטה.

const express = require("express");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// נתיב ראשי לבדיקת תקינות השירות (Health Check עבור Render והדפדפן)
app.get("/", (req, res) => {
  res.send("Yemot route service is active and running!");
});

// שמות אפשריים לשדה "מספר הטלפון של המתקשר" שימות עשוי לשלוח
const CALLER_PHONE_FIELDS = ["ApiPhone", "Phone", "phone", "ApiCallId", "callerId"];

function pick(obj, keys) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== "") return String(obj[k]);
  }
  return undefined;
}

app.all("/route", (req, res) => {
  const data = { ...req.query, ...req.body };

  const tel = pick(data, ["tel", "Tel", "TEL"]);
  const introduction = pick(data, ["Introduction", "introduction"]) || "";
  const ending = pick(data, ["ending", "Ending"]) || "";
  const token = pick(data, ["token", "Token"]);
  const expectedToken = process.env.YEMOT_TOKEN; // אופציונלי

  const callerPhone = pick(data, CALLER_PHONE_FIELDS) || "";

  res.type("text/plain; charset=utf-8");

  // בדיקת תקינות בסיסית
  if (!tel) {
    return res.send("id_list_message=t-לא הוגדר יעד לשלוחה זו&go_to_folder=hangup");
  }
  if (expectedToken && token !== expectedToken) {
    return res.send("id_list_message=t-קוד גישה שגוי&go_to_folder=hangup");
  }

  // בניית מספר הזיהוי שיוצג
  const presentedId = `${introduction}${callerPhone}${ending}`;

  const responseLine =
    `id_list_message=m-1990` +
    `&go_to_folder=${tel}*${presentedId}`;

  res.send(responseLine);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Yemot route service listening on port ${PORT}`));
