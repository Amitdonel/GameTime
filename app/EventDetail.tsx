import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
  ImageBackground,
  Modal,
  TextInput,
  Platform,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  getDocs,
  collection,
  addDoc,
} from "firebase/firestore";
import { db } from "../functions/lib/firebaseConfig";
import { getAuth } from "firebase/auth";
import BottomNav from "../components/BottomNav";
import axios from "axios";
import Ionicons from "react-native-vector-icons/Ionicons";

/** Brand tokens */
const BRAND = {
  primary: "#1877F2",
  textOnDark: "#ffffff",
  overlay: "rgba(0,0,0,0.55)",
  glassBg: "rgba(255,255,255,0.10)",
  glassBorder: "rgba(255,255,255,0.25)",
  muted: "rgba(255,255,255,0.85)",
  danger: "#ef4444",
  success: "#22c55e",
};

/** Local images fallback map */
const imageMap: Record<string, any> = {
  "soccer.jpg": require("../assets/images/soccer.jpg"),
  "soccer1.jpg": require("../assets/images/soccer1.jpg"),
  "soccer2.jpg": require("../assets/images/soccer2.jpg"),
  "soccer3.jpg": require("../assets/images/soccer3.jpg"),
};

const resolveImage = (img?: string) => {
  if (!img) return imageMap["soccer.jpg"];
  if (img.startsWith("http") || img.startsWith("file:")) return { uri: img };
  return imageMap[img] || imageMap["soccer.jpg"];
};

export default function EventDetailScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isManager, setIsManager] = useState(false);
  const [isComing, setIsComing] = useState(false);
  const [joining, setJoining] = useState(false);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [teams, setTeams] = useState<Record<string, string[]> | null>(null);
  const [address, setAddress] = useState("");
  const [weather, setWeather] = useState<{ code: number; temp: number } | null>(null);
  const [weatherIcon, setWeatherIcon] = useState("");
  const [weatherNote, setWeatherNote] = useState("");

  // Cross-platform "Create Teams" prompt (no Alert.prompt on Android)
  const [teamPromptVisible, setTeamPromptVisible] = useState(false);
  const [teamCountInput, setTeamCountInput] = useState<string>("");

  const user = getAuth().currentUser;
  const router = useRouter();

  // Helpers
  const refreshPlayers = async (playersUids: string[]) => {
    const names: string[] = [];
    for (const uid of playersUids) {
      const uRef = doc(db, "users", uid);
      const uSnap = await getDoc(uRef);
      names.push(uSnap.exists() ? uSnap.data().name || uid : uid);
    }
    setPlayerNames(names);
  };

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId || !user) return;

      try {
        const ref = doc(db, "events", eventId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setLoading(false);
          return;
        }

        const data = snap.data()!;
        setEvent(data);
        setTeams(data.teams || null);
        setIsManager(data.createdBy === user.uid);
        setIsComing((data.players || []).includes(user.uid));

        // Player names
        await refreshPlayers(data.players || []);

        // Address (reverse geocode)
        if (data.location) {
          try {
            const res = await axios.get(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${data.location.latitude}&lon=${data.location.longitude}`,
              { headers: { "User-Agent": "GameTimeApp/1.0 (support@gametime.example)", "Accept-Language": "en" } }
            );
            if (res.data?.display_name) setAddress(res.data.display_name);
          } catch {}
        }

        // Weather (Open-Meteo hourly)
        if (data.location && data.date?.seconds) {
          const unixTime = data.date.seconds;
          try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${data.location.latitude}&longitude=${data.location.longitude}&hourly=temperature_2m,weathercode&start=${unixTime}&end=${unixTime +
              3600}&timezone=auto`;
            const res = await axios.get(url);
            const { time, temperature_2m, weathercode } = res.data.hourly;
            const eventDate = new Date(unixTime * 1000);
            const eventHourISO = eventDate.toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
            let idx = time.findIndex((t: string) => t.startsWith(eventHourISO));
            if (idx === -1) idx = 0;
            const code = weathercode[idx];
            const temp = temperature_2m[idx];
            setWeather({ code, temp });

            // Simple icon + note
            let icon = "🌫️";
            let note = "";
            if (code === 0) {
              icon = "☀️";
              if (temp >= 25) note = "It's going to be hot,stay hydrated💧";
            } else if ([1, 2, 3].includes(code)) {
              icon = "⛅";
              if (temp >= 25) note = "It's going to be hot,stay hydrated💧";
            } else if ([45, 48].includes(code)) icon = "🌫️";
            else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
              icon = "🌧️";
              note = "Rain expected,Consider a covered pitch☔";
            }
            setWeatherIcon(icon);
            setWeatherNote(note);
          } catch {}
        }
      } catch (e) {
        console.error("Error loading event:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleJoin = async () => {
    if (!eventId || !user || !event) return;

    const currentPlayers = event.players || [];
    if (currentPlayers.length >= event.maxPlayers) {
      Alert.alert("Match is Full", "No more players can join.");
      return;
    }
    if (isComing) {
      Alert.alert("Already Confirmed", "You have already joined this match.");
      return;
    }

    try {
      setJoining(true);

      // Conflict: joined same date
      const allEventsSnap = await getDocs(collection(db, "events"));
      const sameDay = allEventsSnap.docs
        .map((d) => d.data() as any)
        .some(
          (e) =>
            e.players?.includes(user.uid) &&
            new Date(e.date.seconds * 1000).toDateString() ===
              new Date(event.date.seconds * 1000).toDateString()
        );
      if (sameDay) {
        Alert.alert("Conflict", "You already joined another match on the same date.");
        setJoining(false);
        return;
      }

      const ref = doc(db, "events", eventId);
      const userRef = doc(db, "users", user.uid);
      const surveyRef = doc(db, "surveys", user.uid);
      const [userSnap, surveySnap] = await Promise.all([getDoc(userRef), getDoc(surveyRef)]);
      if (!userSnap.exists() || !surveySnap.exists()) {
        Alert.alert("Error", "User profile or survey not found.");
        setJoining(false);
        return;
      }

      const userName = userSnap.data().name || "Unknown";
      let positionsTemp: string[] = surveySnap.data().positionsTemp || [];
      if (positionsTemp.length === 0) {
        Alert.alert("No positions", "Update your survey to include preferred positions.");
        setJoining(false);
        return;
      }

      const selectedPosition = positionsTemp[0];
      positionsTemp = positionsTemp.slice(1).concat(selectedPosition);

      // Update survey rotation, then add to event
      await updateDoc(surveyRef, { positionsTemp });
      await updateDoc(ref, {
        players: arrayUnion(user.uid),
        [`playerPositions.${user.uid}`]: selectedPosition,
      });

      // Local state sync
      setIsComing(true);
      const updatedPlayers = [...currentPlayers, user.uid];
      setEvent((prev: any) => ({
        ...prev,
        players: updatedPlayers,
        playerPositions: { ...(prev.playerPositions || {}), [user.uid]: selectedPosition },
      }));
      await refreshPlayers(updatedPlayers);

      // Notify manager
      await addDoc(collection(db, "notifications"), {
        toUser: event.createdBy,
        type: "player-joined",
        eventId,
        eventName: event.name,
        timestamp: Date.now(),
        read: false,
      });

      // If now full, notify manager
      const checkSnap = await getDoc(ref);
      const checkData = checkSnap.data();
      if (checkData && (checkData.players?.length || 0) >= checkData.maxPlayers) {
        await addDoc(collection(db, "notifications"), {
          toUser: event.createdBy,
          type: "match-full",
          eventId,
          eventName: event.name,
          timestamp: Date.now(),
          read: false,
        });
      }
    } catch (e) {
      console.error("Join failed:", e);
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!eventId || !user || !event) return;
    try {
      const ref = doc(db, "events", eventId);
      await updateDoc(ref, { players: arrayRemove(user.uid) });

      const updatedPlayers = (event.players || []).filter((uid: string) => uid !== user.uid);
      setEvent((prev: any) => ({ ...prev, players: updatedPlayers }));
      await refreshPlayers(updatedPlayers);
      setIsComing(false);

      // Notify manager
      await addDoc(collection(db, "notifications"), {
        toUser: event.createdBy,
        type: "player-left",
        eventId,
        eventName: event.name,
        timestamp: Date.now(),
        read: false,
      });
    } catch (e) {
      console.error("Leave failed:", e);
    }
  };

  const handleCancelEvent = () => {
    Alert.alert("Are you sure?", "This will permanently delete the event.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "events", eventId!));
            Alert.alert("Event deleted", "The event has been successfully canceled.");
            router.push("/Home");
          } catch (e) {
            console.error("Error deleting event:", e);
            Alert.alert("Error", "Could not delete the event.");
          }
        },
      },
    ]);
  };

  const openTeamPrompt = () => {
    setTeamCountInput("");
    setTeamPromptVisible(true);
  };

  const createTeamsWithCount = async (countNum: number) => {
    if (!event || !eventId) return;

    const totalPlayers = event.players?.length || 0;
    if (!countNum || totalPlayers % countNum !== 0) {
      Alert.alert("Invalid", "Please enter a valid number of teams (must divide players evenly).");
      return;
    }
    if (!event.playerPositions) {
      Alert.alert("Error", "Player positions not available.");
      return;
    }

    const players = event.players || [];
    const playerPositions = event.playerPositions || {};

    // Build player details with names + positions
    const details = await Promise.all(
      players.map(async (uid: string) => {
        const uSnap = await getDoc(doc(db, "users", uid));
        const name = uSnap.exists() ? uSnap.data().name : uid;
        const position = playerPositions[uid] || "Unknown";
        return { uid, name, position };
      })
    );

    const grouped: Record<string, string[]> = {};
    for (let i = 0; i < countNum; i++) grouped[`Group ${i + 1}`] = [];

    const method = event.gameMethod || "Match Making";

    if (method === "Match Making") {
      // Skill-balanced split
      const skillMap = {
        "Beginner ⭐": 1,
        "Average ⭐⭐": 2,
        "Intermediate ⭐⭐⭐": 3,
        "Advanced ⭐⭐⭐⭐": 4,
        "Professional ⭐⭐⭐⭐⭐": 5,
      };

      const detailsWithSkills = await Promise.all(
        details.map(async (p) => {
          const sSnap = await getDoc(doc(db, "surveys", p.uid));
          const level = sSnap.exists() ? sSnap.data().skillLevel : "Beginner ⭐";
          return { ...p, skillLevel: level };
        })
      );

      // Shuffle then sort by skill desc
      for (let i = detailsWithSkills.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [detailsWithSkills[i], detailsWithSkills[j]] = [detailsWithSkills[j], detailsWithSkills[i]];
      }
      detailsWithSkills.sort(
        (a, b) =>
          (skillMap[b.skillLevel as keyof typeof skillMap] || 1) -
          (skillMap[a.skillLevel as keyof typeof skillMap] || 1)
      );

      const totals = Array(countNum).fill(0);
      const sizes = Array(countNum).fill(0);
      const perTeam = Math.floor(detailsWithSkills.length / countNum);

      for (const p of detailsWithSkills) {
        const skill = skillMap[p.skillLevel as keyof typeof skillMap] || 1;
        let best = 0;
        let minScore = Infinity;
        for (let i = 0; i < countNum; i++) {
          if (sizes[i] < perTeam && totals[i] < minScore) {
            best = i;
            minScore = totals[i];
          }
        }
        grouped[`Group ${best + 1}`].push(`${p.name} (${p.skillLevel})`);
        totals[best] += skill;
        sizes[best] += 1;
      }
    } else {
      // Optimization: balance by roles with GK logic
      const shuffle = (arr: any[]) => {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
      };
      const teams: string[][] = Array.from({ length: countNum }, () => []);
      const sizes = Array(countNum).fill(0);
      const notes: Record<number, string[]> = {};

      const gks = details.filter((p) => p.position === "Goalkeeper");
      const defs = details.filter((p) => p.position === "Defender");
      const mids = details.filter((p) => p.position === "Midfielder");
      const atts = details.filter((p) => p.position === "Attacker");
      [gks, defs, mids, atts].forEach(shuffle);

      const smallest = () => sizes.indexOf(Math.min(...sizes));

      // GK distribution
      if (gks.length === countNum) {
        for (let i = 0; i < countNum; i++) {
          const gk = gks.shift();
          if (gk) {
            teams[i].push(`${gk.name} (GK)`);
            sizes[i]++;
          }
        }
      } else if (gks.length > countNum) {
        for (let i = 0; i < countNum; i++) {
          const gk = gks.shift();
          if (gk) {
            teams[i].push(`${gk.name} (GK)`);
            sizes[i]++;
          }
        }
        gks.forEach((gk) => {
          const idx = smallest();
          teams[idx].push(`${gk.name} (GK, field)`);
          sizes[idx]++;
          (notes[idx] = notes[idx] || []).push("🧤 Extra GK playing as field – rotation required");
        });
      } else {
        for (let i = 0; i < gks.length; i++) {
          teams[i].push(`${gks[i].name} (GK)`);
          sizes[i]++;
        }
        for (let i = gks.length; i < countNum; i++) {
          (notes[i] = notes[i] || []).push("🧤 No GK – rotation needed");
        }
      }

      const assign = (pool: any[], label: string) => {
        while (pool.length) {
          const idx = smallest();
          const p = pool.shift();
          teams[idx].push(`${p.name} (${label})`);
          sizes[idx]++;
        }
      };
      assign(defs, "DEF");
      assign(mids, "MID");
      assign(atts, "ATT");

      for (let i = 0; i < countNum; i++) {
        const gName = `Group ${i + 1}`;
        grouped[gName] = teams[i];
        if (notes[i]) grouped[gName].push(...notes[i]);
      }
    }

    await updateDoc(doc(db, "events", eventId), { teams: grouped });
    setTeams(grouped);

    // Notify all players (except creator if desired)
    const notifyUids = (event.players || []).filter((uid: string) => !user || uid !== user.uid);
    await Promise.all(
      notifyUids.map((uid: string) =>
        addDoc(collection(db, "notifications"), {
          toUser: uid,
          type: "teams-created",
          eventId,
          eventName: event.name,
          timestamp: Date.now(),
          read: false,
        })
      )
    );
  };

  const handleNavigate = () => {
    if (!event?.location) return;
    const { latitude, longitude } = event.location;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  /** Loading / Not found with global background */
  if (loading) {
    return (
      <ImageBackground source={imageMap["soccer.jpg"]} style={styles.screenBg} resizeMode="cover">
        <View style={[styles.screenShade, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={BRAND.primary} />
        </View>
      </ImageBackground>
    );
  }
  if (!event) {
    return (
      <ImageBackground source={imageMap["soccer.jpg"]} style={styles.screenBg} resizeMode="cover">
        <View style={[styles.screenShade, { justifyContent: "center", alignItems: "center" }]}>
          <Text style={{ color: "#fff" }}>Event not found.</Text>
        </View>
      </ImageBackground>
    );
  }

  const confirmedCount = event.players?.length || 0;
  const isFull = confirmedCount >= event.maxPlayers;
  const showTeams = isFull && teams && Object.keys(teams).length > 0;
  const capacityPct = Math.min(1, confirmedCount / Math.max(1, event.maxPlayers));

  return (
    <ImageBackground source={imageMap["soccer.jpg"]} style={styles.screenBg} resizeMode="cover">
      <View style={styles.screenShade}>
        {/* Hero cover */}
        <ImageBackground source={resolveImage(event.image)} style={styles.hero} resizeMode="cover">
          <View style={styles.heroOverlay} />

          {/* Top actions (manager) */}
          <View style={styles.heroTopRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.ghostBtn} activeOpacity={0.85}>
              <Ionicons name="chevron-back" size={18} color="#fff" />
              <Text style={styles.ghostText}>Back</Text>
            </TouchableOpacity>

            {isManager ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: "/EditEvent", params: { eventId } })}
                  style={styles.ghostBtn}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={18} color="#fff" />
                  <Text style={styles.ghostText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCancelEvent} style={[styles.ghostBtn, { borderColor: "#fecaca" }]} activeOpacity={0.85}>
                  <Ionicons name="trash-outline" size={18} color="#fff" />
                  <Text style={styles.ghostText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ width: 1 }} />
            )}
          </View>

          {/* Title */}
          <View style={styles.heroBottom}>
            <Text style={styles.title} numberOfLines={1}>{event.name}</Text>

            {/* Info chips */}
            <View style={styles.chipsRow}>
              <View style={styles.chip}>
                <Ionicons name="calendar-outline" size={14} color="#111827" />
                <Text style={styles.chipText}>
                  {new Date(event.date?.seconds * 1000).toDateString()}
                </Text>
              </View>
              <View style={styles.chip}>
                <Ionicons name="time-outline" size={14} color="#111827" />
                <Text style={styles.chipText}>
                  {new Date(event.date?.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              </View>
            </View>

            {address ? (
              <TouchableOpacity onPress={handleNavigate} activeOpacity={0.85} style={styles.chipWide}>
                <Ionicons name="navigate-outline" size={14} color="#111827" />
                <Text style={[styles.chipText, { flex: 1 }]} numberOfLines={1}>{address}</Text>
              </TouchableOpacity>
            ) : null}

            {/* Weather: temp pill + note on the same row */}
            {weather ? (
              <View style={styles.weatherRow}>
                <View style={styles.smallChip}>
                  <Text style={styles.chipText}>
                    {weatherIcon} {Math.round(weather.temp)}°C
                  </Text>
                </View>

                {weatherNote ? (
                  <View style={styles.noteInline}>
                    <Ionicons name="alert-circle" size={14} color="#92400E" />
                    <Text style={styles.noteInlineText} numberOfLines={1}>
                      {weatherNote}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </ImageBackground>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Capacity bar */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Players</Text>
            <View style={styles.capacityRow}>
              <Text style={styles.capacityText}>
                {confirmedCount}/{event.maxPlayers} confirmed
              </Text>
              <View style={styles.capacityBar}>
                <View style={[styles.capacityFill, { width: `${capacityPct * 100}%` }]} />
              </View>
            </View>

            {playerNames.length === 0 ? (
              <Text style={styles.muted}>No players yet.</Text>
            ) : (
              playerNames.map((name, i) => (
                <Text key={i} style={styles.playerItem}>• {name}</Text>
              ))
            )}
          </View>

          {/* Game method */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Game Method</Text>
            <Text style={styles.value}>{event.gameMethod || "—"}</Text>
          </View>

          {/* Actions */}
          <View style={[styles.card, { paddingBottom: 14 }]}>
            <Text style={styles.sectionTitle}>Actions</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[
                  styles.ctaBtn,
                  { backgroundColor: BRAND.success, opacity: (isFull && !isComing) || joining ? 0.6 : 1 },
                ]}
                onPress={handleJoin}
                disabled={(isFull && !isComing) || joining}
                activeOpacity={0.9}
              >
                {joining ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>GameTime</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.ctaBtn, { backgroundColor: BRAND.danger }]}
                onPress={handleLeave}
                activeOpacity={0.9}
              >
                <Text style={styles.ctaText}>Not Coming</Text>
              </TouchableOpacity>
            </View>

            {isManager && isFull && (
              <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: BRAND.primary, marginTop: 8 }]} onPress={openTeamPrompt} activeOpacity={0.9}>
                <Text style={styles.ctaText}>Create Teams</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Teams */}
          {showTeams && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Created Teams ({event.gameMethod})</Text>
              {Object.entries(teams!).map(([groupName, players], i) => {
                let averageStars: number | null = null;
                if (event.gameMethod === "Match Making") {
                  averageStars =
                    players.reduce((sum: number, line: string) => {
                      const m = line.match(/⭐+/);
                      return sum + (m ? m[0].length : 0);
                    }, 0) / Math.max(1, players.length);
                }
                return (
                  <View key={i} style={styles.groupCard}>
                    <Text style={styles.groupTitle}>{groupName}</Text>
                    {players.map((p, j) => (
                      <Text key={j} style={styles.name}>{p}</Text>
                    ))}
                    {averageStars !== null && (
                      <Text style={styles.average}>⭐ Average: {averageStars.toFixed(2)} Stars</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Spacer for BottomNav */}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Create Teams modal (cross-platform) */}
        <Modal
          visible={teamPromptVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setTeamPromptVisible(false)}
        >
          <View style={styles.modalWrap}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Create Teams</Text>
              <Text style={styles.modalSub}>Enter number of teams (must divide players evenly)</Text>
              <TextInput
                value={teamCountInput}
                onChangeText={setTeamCountInput}
                placeholder="e.g., 2"
                placeholderTextColor="#9CA3AF"
                keyboardType={Platform.OS === "ios" ? "number-pad" : "numeric"}
                style={styles.modalInput}
              />
              <View style={styles.modalRow}>
                <TouchableOpacity
                  onPress={() => setTeamPromptVisible(false)}
                  style={[styles.modalBtn, { backgroundColor: "rgba(255,255,255,0.16)" }]}
                >
                  <Text style={styles.modalBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    const n = parseInt(teamCountInput || "", 10);
                    setTeamPromptVisible(false);
                    await createTeamsWithCount(n);
                  }}
                  style={[styles.modalBtn, { backgroundColor: BRAND.primary }]}
                >
                  <Text style={[styles.modalBtnText, { fontWeight: "800" }]}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <BottomNav />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  /** Global screen background */
  screenBg: { flex: 1 },
  screenShade: { flex: 1, backgroundColor: "rgba(0,0,0,0.28)" },

  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },

  /** Hero */
  hero: { height: 280, width: "100%" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: BRAND.overlay },
  heroTopRow: {
    marginTop: 46,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  ghostText: { color: "#fff", fontWeight: "700" },
  heroBottom: { marginTop: "auto", paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  title: { color: "#fff", fontSize: 24, fontWeight: "900", letterSpacing: 0.2 },

  chipsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipWide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  chipText: { color: "#111827", fontWeight: "700" },

  /** Content */
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },

  card: {
    backgroundColor: BRAND.glassBg,
    borderColor: BRAND.glassBorder,
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  sectionTitle: { color: BRAND.textOnDark, fontWeight: "800", fontSize: 16, marginBottom: 6 },
  value: { color: "#E5E7EB", fontWeight: "700" },
  muted: { color: "#CBD5E1" },
  playerItem: { color: "#fff", marginTop: 4 },

  capacityRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 },
  capacityText: { color: BRAND.muted, fontWeight: "700" },
  capacityBar: {
    flex: 1,
    height: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    overflow: "hidden",
  },
  capacityFill: { height: "100%", backgroundColor: "#fff" },

  actionsRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  ctaBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaText: { color: "#fff", fontWeight: "800" },

  groupCard: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    marginTop: 8,
  },
  groupTitle: { color: "#fff", fontWeight: "800", fontSize: 15, marginBottom: 4 },
  name: { color: "#E5E7EB", marginTop: 2 },
  average: { color: "#CBD5E1", marginTop: 6, fontWeight: "800" },

  /** Weather row */
  weatherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "nowrap", // keep on one line
  },
  smallChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  noteInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    flexShrink: 1,
  },
  noteInlineText: {
    color: "#92400E",
    fontWeight: "700",
  },

  /** Modal */
  modalWrap: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: BRAND.glassBg,
    borderColor: BRAND.glassBorder,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  modalTitle: { color: "#fff", fontWeight: "900", fontSize: 18 },
  modalSub: { color: BRAND.muted, marginTop: 6 },
  modalInput: {
    marginTop: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#111827",
  },
  modalRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  modalBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
  },
  modalBtnText: { color: "#fff", fontWeight: "700" },
});
