const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Load your Firebase service account key
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function uploadEvents() {
  try {
    const events = JSON.parse(
      fs.readFileSync(path.join(__dirname, "mock_events.json"))
    );

    console.log("📤 Uploading events...");

    for (const [eventId, eventData] of Object.entries(events)) {
      const ref = db.collection("events").doc(eventId);
      await ref.set(eventData);
    }

    console.log("✅ Events uploaded successfully!");
  } catch (err) {
    console.error("❌ Failed to upload events:", err);
  }
}

uploadEvents();
