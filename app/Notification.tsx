import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import BottomNav from "../components/BottomNav";
import { collection, getDocs, query, where, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../functions/lib/firebaseConfig";
import { getAuth } from "firebase/auth";

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const user = getAuth().currentUser;

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const snapshot = await getDocs(
          query(collection(db, "notifications"), where("toUser", "==", user.uid), orderBy("timestamp", "desc"))
        );
        const notiData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as { read: boolean }) }));
        setNotifications(notiData);

        // Mark as read
        notiData.forEach(noti => {
          if (!noti.read) {
            updateDoc(doc(db, "notifications", noti.id), { read: true });
          }
        });
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    fetchNotifications();
  }, []);

  const handleClearAll = () => {
    Alert.alert("Clear All?", "Are you sure you want to delete all notifications?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete All",
        style: "destructive",
        onPress: async () => {
          try {
            if (!user) return;
            const notiDocs = await getDocs(query(collection(db, "notifications"), where("toUser", "==", user.uid)));
            const deleteBatch = notiDocs.docs.map(notiDoc => deleteDoc(doc(db, "notifications", notiDoc.id)));
            await Promise.all(deleteBatch);
            setNotifications([]);
          } catch (error) {
            console.error("Failed to delete notifications:", error);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Your Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={handleClearAll}>
            <Text style={styles.clearButton}>Clear All ❌</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {notifications.length === 0 ? (
            <Text style={styles.info}>You have no notifications yet.</Text>
          ) : (
            notifications.map((noti) => (
              <View key={noti.id} style={[styles.notiCard, { borderLeftColor: getColor(noti.type) }]}>
                <Text style={styles.notiMessage}>
                  {noti.type === "player-joined" && "✅ Player joined your match"}
                  {noti.type === "player-left" && "⚠ Player left your match"}
                  {noti.type === "match-full" && "🔥 Your match is now full"}
                  {noti.type === "teams-created" && "🎮 Teams created for your match"}
                </Text>
                <Text style={styles.notiEventName}>"{noti.eventName}"</Text>
                <Text style={styles.notiTimestamp}>
                  {new Date(noti.timestamp).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <BottomNav />
    </View>
  );
}

// Helper for color per type
const getColor = (type: string) => {
  switch (type) {
    case "player-joined":
      return "#28a745";
    case "player-left":
      return "#dc3545";
    case "match-full":
      return "#ff9800";
    case "teams-created":
      return "#1877F2";
    default:
      return "#999";
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderColor: "#ddd",
    zIndex: 10,
  },
  sectionTitle: { fontSize: 26, fontWeight: "bold", color: "#1877F2" },
  clearButton: { fontSize: 14, color: "#dc3545", fontWeight: "bold" },
  scrollContent: { paddingBottom: 120, paddingHorizontal: 20, marginTop: 15 },
  content: {},
  info: { fontSize: 16, color: "#555", textAlign: "center", marginTop: 40 },
  notiCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 5,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  notiMessage: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  notiEventName: {
    fontSize: 15,
    color: "#555",
    marginTop: 4,
  },
  notiTimestamp: {
    fontSize: 12,
    color: "#999",
    marginTop: 8,
    textAlign: "right",
  },
});
