import Ionicons from "react-native-vector-icons/Ionicons";
import React, { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import { db } from "../functions/lib/firebaseConfig";
import BottomNav from "../components/BottomNav";
import {
  Text,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  ImageBackground,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";

const imageMap: { [key: string]: any } = {
  "soccer.jpg": require("../assets/images/soccer.jpg"),
  "soccer1.jpg": require("../assets/images/soccer1.jpg"),
  "soccer2.jpg": require("../assets/images/soccer2.jpg"),
  "soccer3.jpg": require("../assets/images/soccer3.jpg"),
};

// Brand tokens (keep aligned with other screens)
const BRAND = {
  primary: "#1877F2",
  textOnDark: "#ffffff",
  glassBg: "rgba(255,255,255,0.10)",
  glassBorder: "rgba(255,255,255,0.25)",
  inputBg: "rgba(255,255,255,0.95)",
  overlay: "rgba(0,0,0,0.55)",
  muted: "rgba(255,255,255,0.85)",
  danger: "#ef4444",
  warn: "#f59e0b",
};

export default function HomeScreen() {
  const [fullName, setFullName] = useState("Player");
  const [yourEvents, setYourEvents] = useState<any[]>([]);
  const [pastYourEvents, setPastYourEvents] = useState<any[]>([]);
  const [nearbyEvents, setNearbyEvents] = useState<any[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const user = getAuth().currentUser;

  // Haversine distance in KM
  const haversineDistance = (a: any, b: any) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const s =
      Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  };

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!user) return;

      try {
        // Profile name
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setFullName(data.name || "Player");
        }

        // Survey (location & radius)
        const surveyRef = doc(db, "surveys", user.uid);
        const surveySnap = await getDoc(surveyRef);
        if (!surveySnap.exists()) return;
        const { location, playRadius } = surveySnap.data() || {};
        if (!location) return;

        // All events
        const snapshot = await getDocs(collection(db, "events"));
        const allEvents = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        const now = Date.now();

        const yourUpcoming = allEvents.filter(
          (e) => e.createdBy === user.uid && e.date?.seconds * 1000 >= now
        );
        const yourPast = allEvents.filter(
          (e) => e.createdBy === user.uid && e.date?.seconds * 1000 < now
        );

        const nearby = allEvents.filter((e) => {
          const isPast = e.date?.seconds * 1000 < now;
          const isOwned = e.createdBy === user.uid;
          const validLoc = e.location && typeof e.location.latitude === "number";
          if (isPast || !validLoc || isOwned) return false;
          const dist = haversineDistance(location, e.location);
          return dist <= playRadius;
        });

        if (isMounted) {
          setYourEvents(yourUpcoming);
          setPastYourEvents(yourPast);
          setNearbyEvents(nearby);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const fetchUnread = async () => {
      if (!user) return;
      const snapshot = await getDocs(
        query(
          collection(db, "notifications"),
          where("toUser", "==", user.uid),
          where("read", "==", false)
        )
      );
      setHasUnread(!snapshot.empty);
    };

    fetchData();
    fetchUnread();

    return () => {
      isMounted = false;
    };
  }, []);

  const renderEvent = ({ item }: { item: any }) => {
    const confirmed = item.players?.length || 0;
    const max = item.maxPlayers || 0;
    const spotsLeft = Math.max(0, max - confirmed);
    const almostThere = spotsLeft >= 1 && spotsLeft <= 5;
    const imgSrc = imageMap[item.image] || imageMap["soccer.jpg"];

    // Safe date text
    const when =
      item?.date?.seconds
        ? new Date(item.date.seconds * 1000).toLocaleString()
        : "Date TBD";

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() =>
          router.push({ pathname: "/EventDetail", params: { eventId: item.id } })
        }
      >
        <View style={styles.cardMedia}>
          <Image source={imgSrc} style={styles.cardImage} />
          <View style={styles.cardOverlay} />
          {almostThere && (
            <View style={styles.pill}>
              <Text style={styles.pillText}>ALMOST THERE</Text>
            </View>
          )}
          <View style={styles.mediaFooter}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.cardMeta} numberOfLines={1}>
              {item.gameMethod} • {confirmed}/{max} players
            </Text>
            <Text style={styles.cardMetaMuted} numberOfLines={1}>
              {when}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ImageBackground
      source={require("../assets/images/soccer.jpg")}
      style={{ flex: 1 }}
      resizeMode="cover"
    >
      <View style={styles.overlay} />

      {/* Header (glass) */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.hello}>Hello,</Text>
          <Text style={styles.name} numberOfLines={1}>
            {fullName}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/Notification")}
          style={{ position: "relative" }}
          activeOpacity={0.8}
        >
          <Ionicons name="notifications-outline" size={26} color={BRAND.textOnDark} />
          {hasUnread && <View style={styles.redDot} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Quick stats (glass chips) */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <View style={styles.statIconWrap}>
              <Ionicons name="calendar-outline" size={16} color={BRAND.textOnDark} />
            </View>
            <Text style={styles.statLabel}>Your upcoming</Text>
            <Text style={styles.statValue}>{yourEvents.length}</Text>
          </View>

          <View style={styles.stat}>
            <View style={styles.statIconWrap}>
              <Ionicons name="location-outline" size={16} color={BRAND.textOnDark} />
            </View>
            <Text style={styles.statLabel}>Near you</Text>
            <Text style={styles.statValue}>{nearbyEvents.length}</Text>
          </View>

          <View style={styles.stat}>
            <View style={styles.statIconWrap}>
              <Ionicons name="time-outline" size={16} color={BRAND.textOnDark} />
            </View>
            <Text style={styles.statLabel}>Past</Text>
            <Text style={styles.statValue}>{pastYourEvents.length}</Text>
          </View>
        </View>

        {/* Sections */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Upcoming Events</Text>
          {loading ? (
            <ActivityIndicator color="#fff" style={{ marginVertical: 12 }} />
          ) : (
            <FlatList
              data={yourEvents}
              keyExtractor={(i) => i.id}
              renderItem={renderEvent}
              scrollEnabled={false}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No upcoming events found.</Text>
              }
            />
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Events Near You</Text>
          {loading ? (
            <ActivityIndicator color="#fff" style={{ marginVertical: 12 }} />
          ) : (
            <FlatList
              data={nearbyEvents}
              keyExtractor={(i) => i.id}
              renderItem={renderEvent}
              scrollEnabled={false}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No nearby events found.</Text>
              }
            />
          )}
        </View>

        {pastYourEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Past Events</Text>
            <FlatList
              data={pastYourEvents}
              keyExtractor={(i) => i.id}
              renderItem={renderEvent}
              scrollEnabled={false}
            />
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
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: BRAND.glassBg,
    borderWidth: 1,
    borderColor: BRAND.glassBorder,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // soft shadow
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  headerLeft: { flexDirection: "column", maxWidth: "80%" },
  hello: { color: BRAND.muted, fontSize: 12, marginBottom: 2 },
  name: { color: BRAND.textOnDark, fontSize: 22, fontWeight: "800", letterSpacing: 0.2 },

  // Dot for unread notifications
  redDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: BRAND.danger,
  },

  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

  // Stats (glass chips)
  statsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  stat: {
    flex: 1,
    backgroundColor: BRAND.glassBg,
    borderColor: BRAND.glassBorder,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "flex-start",
  },
  statIconWrap: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    padding: 6,
    marginBottom: 8,
  },
  statLabel: { color: BRAND.muted, fontSize: 12 },
  statValue: { color: BRAND.textOnDark, fontWeight: "800", fontSize: 18 },

  // Sections
  section: {
    marginTop: 18,
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
  emptyText: { color: BRAND.muted, fontStyle: "italic" },

  // Event card
  card: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },
  cardMedia: { position: "relative" },
  cardImage: { width: "100%", height: 160, resizeMode: "cover" },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  pill: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: BRAND.warn,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  pillText: { color: "#111827", fontWeight: "800", fontSize: 12, letterSpacing: 0.3 },
  mediaFooter: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
  },
  cardTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 2,
  },
  cardMeta: { color: "#E5E7EB", fontWeight: "700" },
  cardMetaMuted: { color: "#CBD5E1", marginTop: 2, fontSize: 12 },
});
