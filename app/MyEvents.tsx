import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  ImageBackground,
} from "react-native";
import BottomNav from "../components/BottomNav";
import { db } from "../functions/lib/firebaseConfig";
import { getAuth } from "firebase/auth";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
  arrayRemove,
} from "firebase/firestore";
import { useRouter } from "expo-router";
import Ionicons from "react-native-vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";

// ------- Brand tokens (keep consistent across app) -------
const BRAND = {
  primary: "#1877F2",
  textOnDark: "#ffffff",
  overlay: "rgba(0,0,0,0.55)",
  glassBg: "rgba(255,255,255,0.10)",
  glassBorder: "rgba(255,255,255,0.25)",
  inputBg: "rgba(255,255,255,0.95)",
  muted: "rgba(255,255,255,0.85)",
  danger: "#ef4444",
};
const bgImage = require("../assets/images/soccer.jpg");

// Optional local image map (for event cover fallbacks)
const imageMap: Record<string, any> = {
  "soccer.jpg": require("../assets/images/soccer.jpg"),
  "soccer1.jpg": require("../assets/images/soccer1.jpg"),
  "soccer2.jpg": require("../assets/images/soccer2.jpg"),
  "soccer3.jpg": require("../assets/images/soccer3.jpg"),
};

type Event = {
  id: string;
  name: string;
  date: { seconds: number };
  gameMethod?: string;
  players?: string[];
  createdBy?: string;
  image?: string; // may be a key (for require) or a remote/local URI
};

export default function MyEventsScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const user = auth.currentUser;
  const router = useRouter();

  // Divide to upcoming/past and compute counters
  const now = Date.now();
  const upcomingEvents = useMemo(
    () =>
      events
        .filter((e) => e.date?.seconds * 1000 >= now)
        .sort((a, b) => a.date.seconds - b.date.seconds),
    [events, now]
  );
  const pastEvents = useMemo(
    () =>
      events
        .filter((e) => e.date?.seconds * 1000 < now)
        .sort((a, b) => b.date.seconds - a.date.seconds),
    [events, now]
  );

  const upcomingCount = upcomingEvents.length;
  const pastCount = pastEvents.length;

  // Targeted fetch: only events where I appear in "players"
  const fetchMyEvents = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const q = query(collection(db, "events"), where("players", "array-contains", user.uid));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Event[];
      setEvents(data);
    } catch (err) {
      console.error("Error fetching events:", err);
      Alert.alert("Error", "Failed to load your events.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLeaveEvent = async (eventId: string) => {
    if (!user) return;
    Alert.alert("Leave Event", "Are you sure you want to leave this event?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            const ref = doc(db, "events", eventId);
            await updateDoc(ref, { players: arrayRemove(user.uid) });
            fetchMyEvents();
          } catch (err) {
            console.error("Failed to leave event:", err);
            Alert.alert("Error", "Could not leave the event.");
          }
        },
      },
    ]);
  };

  // Resolve card image source (URI or mapped require, with fallback)
  const resolveImage = (img?: string) => {
    if (!img) return imageMap["soccer.jpg"];
    if (img.startsWith("http") || img.startsWith("file:")) return { uri: img };
    return imageMap[img] || imageMap["soccer.jpg"];
  };

  // Pretty time helpers
  const toDateStr = (sec: number) => new Date(sec * 1000).toLocaleString();
  const countdown = (sec: number) => {
    const diff = sec * 1000 - Date.now();
    if (diff <= 0) return "Finished";
    const hrs = Math.floor(diff / 3_600_000);
    const mins = Math.floor((diff % 3_600_000) / 60_000);
    if (hrs >= 24) {
      const days = Math.floor(hrs / 24);
      return `${days}d ${hrs % 24}h`;
    }
    return `${hrs}h ${mins}m`;
  };

  const renderEvent = (item: Event, isUpcoming: boolean) => {
    const mine = item.createdBy === user?.uid;
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push({ pathname: "/EventDetail", params: { eventId: item.id } })}
        style={styles.card}
      >
        <Image source={resolveImage(item.image)} style={styles.thumb} />
        <View style={{ flex: 1 }}>
          <View style={styles.cardTop}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.pill}>
              <Text style={styles.pillText}>
                {isUpcoming ? countdown(item.date.seconds) : "Past"}
              </Text>
            </View>
          </View>

          <Text style={styles.cardMeta}>{toDateStr(item.date.seconds)}</Text>
          <Text style={styles.cardMetaMuted}>
            {item.gameMethod ? `Game method: ${item.gameMethod}` : "Game method: —"}
          </Text>

          <View style={styles.cardActions}>
            <View style={styles.joinBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
              <Text style={styles.joinBadgeText}>Joined</Text>
            </View>

            {isUpcoming ? (
              <TouchableOpacity
                onPress={() => handleLeaveEvent(item.id)}
                style={styles.leaveBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.leaveText}>Not Coming</Text>
              </TouchableOpacity>
            ) : mine ? (
              <TouchableOpacity
                onPress={() => router.push({ pathname: "/EditEvent", params: { eventId: item.id } })}
                style={styles.manageBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.manageText}>Manage</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ImageBackground source={bgImage} style={{ flex: 1 }} resizeMode="cover">
      <StatusBar style="light" />
      <View style={styles.overlay} />

      {/* Glass header */}
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="football-outline" size={20} color={BRAND.textOnDark} />
          <Text style={styles.headerTitle}>My Events</Text>
        </View>

        {/* Stat chips */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <View style={styles.statIconWrap}>
              <Ionicons name="calendar-outline" size={14} color="#fff" />
            </View>
            <Text style={styles.statLabel}>Upcoming</Text>
            <Text style={styles.statValue}>{upcomingCount}</Text>
          </View>
          <View style={styles.stat}>
            <View style={styles.statIconWrap}>
              <Ionicons name="time-outline" size={14} color="#fff" />
            </View>
            <Text style={styles.statLabel}>Past</Text>
            <Text style={styles.statValue}>{pastCount}</Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#fff" />
          <Text style={{ color: "#fff", marginTop: 6 }}>Loading your events…</Text>
        </View>
      ) : (
        <FlatList
          data={[{ key: "upcoming" }, { key: "past" }]}
          keyExtractor={(s) => s.key}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, paddingTop: 12 }}
          renderItem={({ item }) => {
            if (item.key === "upcoming") {
              return (
                <View style={styles.section}>
                  {upcomingEvents.length > 0 && (
                    <Text style={styles.sectionTitle}>Upcoming Events</Text>
                  )}
                  {upcomingEvents.length === 0 ? (
                    <Text style={styles.empty}>No upcoming events yet.</Text>
                  ) : (
                    upcomingEvents.map((e) => (
                      <View key={e.id} style={{ marginBottom: 12 }}>
                        {renderEvent(e, true)}
                      </View>
                    ))
                  )}
                </View>
              );
            }
            // Past
            return (
              <View style={styles.section}>
                {pastEvents.length > 0 && (
                  <Text style={styles.sectionTitle}>Past Events</Text>
                )}
                {pastEvents.length === 0 ? null : (
                  pastEvents.map((e) => (
                    <View key={e.id} style={{ marginBottom: 12 }}>
                      {renderEvent(e, false)}
                    </View>
                  ))
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={[styles.empty, { marginTop: 24 }]}>
              You haven’t joined any events yet.
            </Text>
          }
        />
      )}

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
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  headerTitle: { color: BRAND.textOnDark, fontSize: 18, fontWeight: "800" },

  // Stats
  statsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  stat: {
    flex: 1,
    backgroundColor: BRAND.glassBg,
    borderColor: BRAND.glassBorder,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statIconWrap: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    padding: 6,
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  statLabel: { color: BRAND.muted, fontSize: 12 },
  statValue: { color: BRAND.textOnDark, fontWeight: "800", fontSize: 18 },

  // Section
  section: {
    marginTop: 12,
    backgroundColor: BRAND.glassBg,
    borderColor: BRAND.glassBorder,
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
  },
  sectionTitle: {
    color: BRAND.textOnDark,
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 10,
  },
  empty: { color: BRAND.muted, textAlign: "center" },

  // Card
  card: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  thumb: { width: 76, height: 76, borderRadius: 12, backgroundColor: "#0B1220" },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { color: "#fff", fontWeight: "800", fontSize: 16, flex: 1, marginRight: 8 },
  pill: { backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillText: { color: "#111827", fontWeight: "800", fontSize: 12 },

  cardMeta: { color: "#E5E7EB", fontWeight: "700", marginTop: 2 },
  cardMetaMuted: { color: "#CBD5E1", marginTop: 2 },

  cardActions: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  joinBadge: { flexDirection: "row", alignItems: "center", gap: 6 },
  joinBadgeText: { color: "#16a34a", fontWeight: "800" },

  leaveBtn: {
    backgroundColor: BRAND.danger,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  leaveText: { color: "#fff", fontWeight: "800" },

  manageBtn: {
    backgroundColor: BRAND.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  manageText: { color: "#fff", fontWeight: "800" },

  loadingWrap: { alignItems: "center", marginTop: 24 },
});
