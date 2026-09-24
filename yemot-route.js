// yemot-route.js
// שירות גנרי אחד שמשרת כל שלוחות ה-API של ימות המשיח.
//
// חשוב: גילינו בבדיקות שאסור לסמוך על "&" בתוך api_link - כשמדביקים אותו
// בהגדרות השלוחה ה-"&" עלול להיבלע, ובנוסף ימות עצמו מוסיף את הפרמטרים שלו
// עם "?" נוסף במקום "&" (באג ידוע). לכן: כל ההגדרות שלנו נדחסות לפרמטר יחיד
// "cfg", בלי & בפנים, מופרד בפסיקים: tel,Introduction,ending
//
// הגדרת השלוחה בימות (שורה אחת ל-api_link, בלי מעברי שורה בתוכה):
//   type=api
//   api_link=https://YOUR-SERVICE.onrender.com/route?cfg=0501234567,072,99
//   api_url_post=yes
//
// אם Introduction או ending לא נחוצים - משאירים את המקום ריק בין הפסיקים:
//   ...?cfg=0501234567,,99      (בלי Introduction)
//   ...?cfg=0501234567,072,     (בלי ending)

const express = require("express");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// מאומת מול לוג בקשה אמיתי: ApiPhone הוא השדה של מספר המתקשר.
const CALLER_PHONE_FIELDS = ["ApiPhone", "Phone", "phone"];

// פענוח ידני של ה-query, סובלני ל"?" כפול שימות מוסיף בסוף הכתובת.
function parseRawQuery(originalUrl) {
  const qIndex = originalUrl.indexOf("?");
  if (qIndex === -1) return {};
  let raw = originalUrl.slice(qIndex + 1);
  raw = raw.split("?").join("&"); // "?" נוסף → מתייחסים אליו כ-"&"
  const result = {};
  for (const pair of raw.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const key = eq === -1 ? pair : pair.slice(0, eq);
    const val = eq === -1 ? "" : pair.slice(eq + 1);
    try {
      result[decodeURIComponent(key)] = decodeURIComponent(val.replace(/\+/g, " "));
    } catch (e) {
      result[key] = val;
    }
  }
  return result;
}

function pick(obj, keys) {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== "") return String(obj[k]);
  }
  return undefined;
}

app.all("/route", (req, res) => {
  const data = { ...parseRawQuery(req.originalUrl), ...req.body };

  res.type("text/plain; charset=utf-8");

  // הודעת סיום שיחה מימות - אין צורך להחזיר הנחיית ניתוב, רק לאשר קבלה.
  if (data.hangup === "yes") {
    console.log("HANGUP:", req.originalUrl, JSON.stringify(data));
    return res.send("");
  }

  console.log("ROUTE REQUEST:", req.originalUrl, JSON.stringify(data));

  // cfg=tel.Introduction.ending (נקודה כמפריד - התו שימות עצמו משתמש בו
  // רשמית להפרדת כמה ערכים, למשל ברשימות routing_to_phone)
  const cfg = data.cfg || "";
  const [tel, introduction = "", ending = ""] = cfg.split(".");

  const token = pick(data, ["token", "Token"]);
  const expectedToken = process.env.YEMOT_TOKEN; // אופציונלי

  const callerPhone = pick(data, CALLER_PHONE_FIELDS) || "";

  if (!tel) {
    return res.send("id_list_message=t-לא הוגדר יעד לשלוחה זו&go_to_folder=hangup");
  }
  if (expectedToken && token !== expectedToken) {
    return res.send("id_list_message=t-קוד גישה שגוי&go_to_folder=hangup");
  }

  // המספר המזוהה שיוצג אצל מקבל השיחה: קידומת + מספר המתקשר + סיומת.
  const presentedId = `${introduction}${callerPhone}${ending}`;

  // מאומת מהתיעוד הרשמי: routing=<number> מחייג למספר חוץ (בעלות יחידות),
  // ומאומת מפורום המפתחים של ימות: הגדרות "רגילות" של מודול ה-routing
  // (routing_your_id, music_on_hold, ...) עובדות גם כששולחים אותן משלוחת
  // api, גם שזה לא מתועד רשמית עבור api. משרשרים הכל יחד עם &.
  // עדיין דורש אימות בפועל: האם ניתן להציג מזוהה "סינתטי" (קידומת+מספר+סיומת)
  // שאינו מספר בבעלות החשבון בימות, או שרק מספרים מאומתים מתקבלים.
  const responseLine =
    `routing=${tel}` +
    `&routing_your_id=${presentedId}` +
    `&music_on_hold=m-1990`;

  console.log("RESPONSE:", responseLine);
  res.send(responseLine);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Yemot route service listening on ${PORT}`));
