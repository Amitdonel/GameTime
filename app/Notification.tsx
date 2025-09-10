import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ImageBackground,
  ActivityIndicator,
} from "react-native";
import BottomNav from "../components/BottomNav";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  doc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../functions/lib/firebaseConfig";
import { getAuth } from "firebase/auth";
import Ionicons from "react-native-vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";

// ---- Brand tokens (keep consistent with other screens) ----
const BRAND = {
  primary: "#1877F2",
  textOnDark: "#ffffff",
  overlay: "rgba(0,0,0,0.55)",
  glassBg: "rgba(255,255,255,0.10)",
  glassBorder: "rgba(255,255,255,0.25)",
  inputBg: "rgba(255,255,255,0.95)",
  muted: "rgba(255,255,255,0.85)",
  success: "#22c55e",
  warn: "#f59e0b",
  danger: "#ef4444",
};
const bgImage = require("../assets/images/soccer.jpg");

// ---- Helpers ----
const TYPE_META: Record<
  string,
  { color: string; icon: string; label: string }
> = {
  "player-joined": {
    color: BRAND.success,
    icon: "checkmark-circle",
    label: "Player joined your match",
  },
  "player-left": {
    color: BRAND.danger,
    icon: "alert-circle",
    label: "Player left your match",
  },
  "match-full": {
    color: BRAND.warn,
    icon: "flame",
    label: "Your match is now full",
  },
  "teams-created": {
    color: BRAND.primary,
    icon: "game-controller",
    label: "Teams created for your match",
  },
};

const toDate = (ts: any): Date => {
  // Accept Firestore Timestamp, millis number, or Date
  if (ts?.toDate) return ts.toDate();
  if (typeof ts === "number") return new Date(ts);
  if (ts instanceof Date) return ts;
  return new Date();
};

const timeAgo = (d: Date) => {
  const diff = Date.now() - d.getTime();
  const secs = Math.max(1, Math.floor(diff / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

export default function NotificationScreen() {
  const user = getAuth().currentUser;
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Live query for this user, newest first
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("toUser", "==", user.uid),
      orderBy("timestamp", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setNotifications(rows);
        setLoading(false);
        // Mark all unread as read (batched)
        const batch = writeBatch(db);
        rows.forEach((n: any) => {
          if (!n.read) {
            batch.update(doc(db, "notifications", n.id), { read: true });
          }
        });
        if (rows.some((n: any) => !n.read)) {
          batch.commit().catch(() => {});
        }
      },
      (err) => {
        console.error("Failed to fetch notifications:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user]);

  const unreadCount = useMemo(
    () => notifications.filter((n: any) => !n.read).length,
    [notifications]
  );

  const handleClearAll = () => {
    if (!user || notifications.length === 0) return;
    Alert.alert("Clear all?", "Delete all notifications permanently?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete All",
        style: "destructive",
        onPress: async () => {
          try {
            const batch = writeBatch(db);
            notifications.forEach((n) => batch.delete(doc(db, "notifications", n.id)));
            await batch.commit();
          } catch (error) {
            console.error("Failed to delete notifications:", error);
          }
        },
      },
    ]);
  };

  const handleDeleteOne = (id: string) => {
    Alert.alert("Delete notification?", "", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "notifications", id));
          } catch (e) {
            console.error("Failed to delete notification:", e);
          }
        },
      },
    ]);
  };

  const handleToggleRead = async (n: any) => {
    try {
      await updateDoc(doc(db, "notifications", n.id), { read: !n.read });
    } catch (e) {
      // ignore
    }
  };

  return (
    <ImageBackground source={bgImage} style={{ flex: 1 }} resizeMode="cover">
      <StatusBar style="light" />
      <View style={styles.overlay} />

      {/* Glass header */}
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="notifications-outline" size={20} color={BRAND.textOnDark} />
          <Text style={styles.headerTitle}>Your Notifications</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {unreadCount > 0 && (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadPillText}>{unreadCount} new</Text>
            </View>
          )}
          {notifications.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} activeOpacity={0.85} style={styles.clearBtn}>
              <Ionicons name="trash-outline" size={16} color="#fff" />
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={{ alignItems: "center", marginTop: 20 }}>
            <ActivityIndicator color="#fff" />
            <Text style={{ color: "#fff", marginTop: 6 }}>Loading…</Text>
          </View>
        ) : notifications.length === 0 ? (
          <Text style={styles.empty}>You have no notifications yet.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {notifications.map((n: any) => {
              const meta = TYPE_META[n.type] || {
                color: "#94a3b8",
                icon: "information-circle",
                label: "Update",
              };
              const when = toDate(n.timestamp);
              const isUnread = !n.read;

              return (
                <View key={n.id} style={[styles.notiCard, { borderLeftColor: meta.color }]}>
                  <View style={styles.notiTop}>
                    <View style={[styles.iconWrap, { backgroundColor: `${meta.color}33` }]}>
                      <Ionicons name={String(meta.icon)} size={18} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notiLabel} numberOfLines={1}>
                        {meta.label}
                      </Text>
                      <Text style={styles.notiEvent} numberOfLines={1}>
                        “{n.eventName || "Unnamed match"}”
                      </Text>
                    </View>

                    <View style={{ alignItems: "flex-end", gap: 8 }}>
                      <Text style={styles.notiTime}>{timeAgo(when)}</Text>

                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <TouchableOpacity
                          onPress={() => handleToggleRead(n)}
                          style={[styles.smallBtn, { backgroundColor: isUnread ? BRAND.primary : "rgba(255,255,255,0.16)" }]}
                          activeOpacity={0.85}
                        >
                          <Ionicons
                            name={isUnread ? "mail-unread-outline" : "mail-open-outline"}
                            size={14}
                            color="#fff"
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteOne(n.id)}
                          style={[styles.smallBtn, { backgroundColor: "rgba(239,68,68,0.22)" }]}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="close" size={14} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {n.message ? <Text style={styles.notiBody}>{n.message}</Text> : null}
                </View>
              );
            })}
          </View>
        )}

        {/* Spacer for BottomNav */}
        <View style={{ height: 120 }} />
      </ScrollView>

      <BottomNav />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: BRAND.overlay },

  // Header (glass)
  header: {
    marginTop: 46,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 20,
    backgroundColor: BRAND.glassBg,
    borderWidth: 1,
    borderColor: BRAND.glassBorder,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  headerTitle: { color: BRAND.textOnDark, fontSize: 18, fontWeight: "800" },

  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearText: { color: "#fff", fontWeight: "700" },

  unreadPill: {
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  unreadPillText: { color: "#111827", fontWeight: "800", fontSize: 12 },

  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },

  empty: {
    color: BRAND.muted,
    textAlign: "center",
    marginTop: 24,
  },

  // Notification card (glass)
  notiCard: {
    backgroundColor: BRAND.glassBg,
    borderColor: BRAND.glassBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  notiTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  notiLabel: { color: "#fff", fontWeight: "800", fontSize: 15 },
  notiEvent: { color: "#E5E7EB", marginTop: 2 },
  notiTime: { color: "#CBD5E1", fontSize: 12 },

  smallBtn: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  notiBody: {
    color: "#E5E7EB",
    marginTop: 10,
    lineHeight: 20,
  },
});
