// yemot-route.js
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

// מאומת מול לוג בקשה אמיתי: ApiPhone הוא השדה של מספר המתקשר.
const CALLER_PHONE_FIELDS = ["ApiPhone", "Phone", "phone"];

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
  const expectedToken = process.env.YEMOT_TOKEN; // אופציונלי - להגדיר בשירות אם רוצים לאמת

  const callerPhone = pick(data, CALLER_PHONE_FIELDS) || "";

  res.type("text/plain; charset=utf-8");

  // הודעת סיום שיחה מימות - אין צורך להחזיר הנחיית ניתוב, רק לאשר קבלה.
  if (data.hangup === "yes") {
    console.log("HANGUP:", req.originalUrl, JSON.stringify(data));
    return res.send("");
  }

  console.log("ROUTE REQUEST:", req.originalUrl, JSON.stringify(data));

  // בדיקת תקינות בסיסית
  if (!tel) {
    // אין הגדרת יעד לשלוחה הזו - אפשר להחזיר הודעת שגיאה קולית ולנתק
    return res.send("id_list_message=t-לא הוגדר יעד לשלוחה זו&go_to_folder=hangup");
  }
  if (expectedToken && token !== expectedToken) {
    return res.send("id_list_message=t-קוד גישה שגוי&go_to_folder=hangup");
  }

  // בניית מספר הזיהוי (Caller ID) שיוצג אצל מקבל השיחה:
  // קידומת (Introduction) + מספר המתקשר עצמו + סיומת (ending) - כל חלק אופציונלי.
  const presentedId = `${introduction}${callerPhone}${ending}`;

  // TODO - לאמת מול ימות את התחביר המדויק:
  // 1) השמעת הודעת מערכת M1990 בזמן ההמתנה למענה (לפי תיעוד מודול ה-API,
  //    system_message מקבל את מספר ההודעה עם או בלי האות M בהתחלה).
  // 2) ניתוב השיחה בפועל למספר tel, עם הצגת presentedId כמספר המזוהה.
  //    ב-type=routing הצגת המספר היוצא נעשית עם routing_your_id=..., אבל כאן
  //    התשובה חוזרת משלוחת api, ולכן יש לבדוק אם יש תמיכה ישירה בהחזרת
  //    "יעד*מספר_מזוהה" או שיש לנתב קודם ל-go_to_folder של שלוחת routing קיימת
  //    שמזהה את הפרמטרים דרך שאילתה נוספת (query string) על גבי go_to_folder.
  const responseLine =
    `id_list_message=m-1990` +
    `&go_to_folder=${tel}*${presentedId}`;

  console.log("RESPONSE:", responseLine);
  res.send(responseLine);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Yemot route service listening on ${PORT}`));
