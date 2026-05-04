const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const initialRules = {
  consonants: {
    mid: "กจดตบปอฎฏ",
    high: "ขฃฉฐถผฝศษสห"
  },
  matrix: {
    mid: {
      live: "mid",
      dead: "low",
      mai_ek: "low",
      mai_tho: "falling",
      mai_tri: "high",
      mai_chattawa: "rising"
    },
    high: {
      live: "rising",
      dead: "low",
      mai_ek: "low",
      mai_tho: "falling",
      mai_tri: "high",
      mai_chattawa: "rising"
    },
    low: {
      live: "mid",
      dead_short: "high",
      dead_long: "falling",
      mai_ek: "falling",
      mai_tho: "high",
      mai_tri: "high",
      mai_chattawa: "rising"
    }
  },
  exceptions: {
    "คะ": "high",
    "ค่ะ": "falling",
    "ครับ": "high",
    "นะคะ": "high",
    "มั้ย": "high",
    "ไม๊": "high",
    "ไม่": "falling",
    "น้ำ": "high" // น้ำ usually acts as high tone because of the short vowel + Mai Tho
  }
};

async function initRules() {
  try {
    console.log("Writing initial tone rules to /thai_config/tone_rules...");
    await db.collection("thai_config").doc("tone_rules").set(initialRules);
    console.log("Successfully initialized tone rules.");
    process.exit(0);
  } catch (err) {
    console.error("Error writing rules:", err);
    process.exit(1);
  }
}

initRules();
