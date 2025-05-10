import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
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
} from "firebase/firestore";
import { db } from "../functions/lib/firebaseConfig";
import { getAuth } from "firebase/auth";
import BottomNav from "../components/BottomNav";

export default function EventDetailScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isManager, setIsManager] = useState(false);
  const [isComing, setIsComing] = useState(false);
  const [joining, setJoining] = useState(false); // Added joining state
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [teams, setTeams] = useState<Record<string, string[]> | null>(null);
  const user = getAuth().currentUser;
  const router = useRouter();

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId || !user) return;

      try {
        const docRef = doc(db, "events", eventId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setEvent(data);
          setTeams(data.teams || null);
          setIsManager(data.createdBy === user.uid);
          setIsComing((data.players || []).includes(user.uid));

          const playerUids = data.players || [];
          const playerNameList: string[] = [];

          for (const uid of playerUids) {
            const userRef = doc(db, "users", uid);
            const userSnap = await getDoc(userRef);
            playerNameList.push(userSnap.exists() ? userSnap.data().name || uid : uid);
          }

          setPlayerNames(playerNameList);
        } else {
          console.warn("Event not found!");
        }
      } catch (error) {
        console.error("Error loading event:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  const handleJoin = async () => {
    if (!eventId || !user) return;
    if ((event.players?.length || 0) >= event.maxPlayers) {
      Alert.alert("Match is Full", "No more players can join.");
      return;
    }
    if (isComing) {
      Alert.alert("Already Confirmed", "You have already joined this match.");
      return;
    }

    try {
      setJoining(true); // 🔥 START LOADING
      // 👇 Check if user has another event on the same date
      const allEventsSnap = await getDocs(collection(db, "events"));
      const sameDayEvents = allEventsSnap.docs
        .map(doc => doc.data())
        .filter(e =>
          e.players?.includes(user.uid) &&
          new Date(e.date.seconds * 1000).toDateString() === new Date(event.date.seconds * 1000).toDateString()
        );

      if (sameDayEvents.length > 0) {
        Alert.alert("Conflict", "You already joined another match on the same date.");
        setJoining(false);
        return;
      }

      const ref = doc(db, "events", eventId);
      const userRef = doc(db, "users", user.uid);
      const surveyRef = doc(db, "surveys", user.uid);

      const [userSnap, surveySnap] = await Promise.all([
        getDoc(userRef),
        getDoc(surveyRef),
      ]);

      if (!userSnap.exists() || !surveySnap.exists()) {
        console.error("User or survey not found");
        setJoining(false);
        return;
      }

      const userName = userSnap.data().name || "Unknown";
      let positionsTemp = surveySnap.data().positionsTemp || [];

      if (positionsTemp.length === 0) {
        console.error("No available positions to assign");
        setJoining(false);
        return;
      }

      const selectedPosition = positionsTemp[0];
      positionsTemp = positionsTemp.slice(1).concat(selectedPosition);

      await updateDoc(surveyRef, { positionsTemp });
      await updateDoc(ref, {
        players: arrayUnion(user.uid),
        [`playerPositions.${user.uid}`]: selectedPosition,
      });

      setIsComing(true);
      setEvent((prev: any) => ({
        ...prev,
        players: [...(prev.players || []), user.uid],
        playerPositions: {
          ...(prev.playerPositions || {}),
          [user.uid]: selectedPosition,
        },
      }));

      setPlayerNames((prev) => {
        if (prev.includes(userName)) return prev;
        return [...prev, userName];
      });

    } catch (error) {
      console.error("Join failed:", error);
    } finally {
      setJoining(false); // 🔥 END LOADING
    }
  };


  const handleLeave = async () => {
    if (!eventId || !user) return;

    try {
      const ref = doc(db, "events", eventId);
      await updateDoc(ref, { players: arrayRemove(user.uid) });
      setIsComing(false);
      setEvent((prev: any) => ({
        ...prev,
        players: (prev.players || []).filter((uid: string) => uid !== user.uid),
      }));
      setPlayerNames((prev) =>
        prev.filter((name) => name !== (user.displayName || "You"))
      );
    } catch (error) {
      console.error("Leave failed:", error);
    }
  };

  const handleCancelEvent = async () => {
    Alert.alert("Are you sure?", "This will permanently delete the event.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const ref = doc(db, "events", eventId);
            await deleteDoc(ref);
            Alert.alert("Event deleted", "The event has been successfully canceled.");
            router.push("/Home");
          } catch (err) {
            console.error("Error deleting event:", err);
            Alert.alert("Error", "Could not delete the event.");
          }
        },
      },
    ]);
  };



  const handleCreateTeams = async () => {
    Alert.prompt(
      "Create Teams",
      "Enter number of teams:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create",
          onPress: async (input) => {
            const count = parseInt(input || "");
            const totalPlayers = event.players?.length || 0;
            if (!count || totalPlayers % count !== 0) {
              Alert.alert("Invalid", "Please enter a valid number.");
              return;
            }

            if (!event.playerPositions) {
              Alert.alert("Error", "Player positions not available.");
              return;
            }

            const players = event.players || [];
            const playerPositions = event.playerPositions || {};

            const playerDetails = await Promise.all(
              players.map(async (uid: string) => {
                const userRef = doc(db, "users", uid);
                const userSnap = await getDoc(userRef);
                const name = userSnap.exists() ? userSnap.data().name : uid;
                const position = playerPositions[uid] || "Unknown";
                return { uid, name, position };
              })
            );

            const grouped: Record<string, string[]> = {};
            for (let i = 0; i < count; i++) grouped[`Group ${i + 1}`] = [];

            const method = event.gameMethod || "Match Making";

            if (method === "Match Making") {
              const skillMap = {
                "Beginner ⭐": 1,
                "Average ⭐⭐": 2,
                "Intermediate ⭐⭐⭐": 3,
                "Advanced ⭐⭐⭐⭐": 4,
                "Professional ⭐⭐⭐⭐⭐": 5,
              };

              const detailsWithSkills = await Promise.all(
                playerDetails.map(async (p) => {
                  const surveyRef = doc(db, "surveys", p.uid);
                  const surveySnap = await getDoc(surveyRef);
                  const level = surveySnap.exists() ? surveySnap.data().skillLevel : "Beginner ⭐";
                  return { ...p, skillLevel: level };
                })
              );

              // 🔀 Shuffle first for randomness
              for (let i = detailsWithSkills.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [detailsWithSkills[i], detailsWithSkills[j]] = [detailsWithSkills[j], detailsWithSkills[i]];
              }

              detailsWithSkills.sort(
                (a, b) =>
                  (skillMap[b.skillLevel as keyof typeof skillMap] || 1) -
                  (skillMap[a.skillLevel as keyof typeof skillMap] || 1)
              );

              const groupTotals = Array(count).fill(0);
              const groupSizes = Array(count).fill(0);
              const maxPerTeam = Math.floor(detailsWithSkills.length / count);

              for (const player of detailsWithSkills) {
                const skill = skillMap[player.skillLevel as keyof typeof skillMap] || 1;
                let minIndex = 0;
                let minScore = Infinity;

                for (let i = 0; i < count; i++) {
                  if (groupSizes[i] < maxPerTeam && groupTotals[i] < minScore) {
                    minIndex = i;
                    minScore = groupTotals[i];
                  }
                }

                grouped[`Group ${minIndex + 1}`].push(`${player.name} (${player.skillLevel})`);
                groupTotals[minIndex] += skill;
                groupSizes[minIndex]++;
              }

            } else {
              // Optimization Method with Tactical Roles
              const shuffle = (arr: any[]) => {
                for (let i = arr.length - 1; i > 0; i--) {
                  const j = Math.floor(Math.random() * (i + 1));
                  [arr[i], arr[j]] = [arr[j], arr[i]];
                }
              };

              const totalPlayers = playerDetails.length;
              const teams: string[][] = Array.from({ length: count }, () => []);
              const teamSizes: number[] = Array(count).fill(0);
              const notes: Record<number, string[]> = {};

              // Split players by roles
              let gks = playerDetails.filter((p) => p.position === "Goalkeeper");
              let defs = playerDetails.filter((p) => p.position === "Defender");
              let mids = playerDetails.filter((p) => p.position === "Midfielder");
              let atts = playerDetails.filter((p) => p.position === "Attacker");

              // Shuffle each role group
              shuffle(gks);
              shuffle(defs);
              shuffle(mids);
              shuffle(atts);

              // Helper to find team with fewest players
              const getSmallestTeamIndex = () => {
                let minIndex = 0;
                for (let i = 1; i < teamSizes.length; i++) {
                  if (teamSizes[i] < teamSizes[minIndex]) {
                    minIndex = i;
                  }
                }
                return minIndex;
              };

              // 1. Assign 1 GK per team
              for (let i = 0; i < count; i++) {
                const gk = gks.shift();
                if (gk) {
                  teams[i].push(`${gk.name} (GK)`);
                  teamSizes[i]++;
                } else {
                  notes[i] = notes[i] || [];
                  notes[i].push("🧤 No GK – rotation needed");
                }
              }

              // 2. Assign DEF, MID, ATT positions while respecting team size
              const assignByPosition = (players: any[], label: string) => {
                while (players.length) {
                  const idx = getSmallestTeamIndex();
                  const p = players.shift();
                  teams[idx].push(`${p.name} (${label})`);
                  teamSizes[idx]++;
                }
              };

              assignByPosition(defs, "DEF");
              assignByPosition(mids, "MID");
              assignByPosition(atts, "ATT");

              // 3. Finalize groups with notes
              for (let i = 0; i < count; i++) {
                const groupName = `Group ${i + 1}`;
                grouped[groupName] = teams[i];
                if (notes[i]) grouped[groupName].push(...notes[i]);
              }
            }

            await updateDoc(doc(db, "events", eventId), { teams: grouped });
            setTeams(grouped);
          },
        },
      ],
      "plain-text",
      "",
      "numeric"
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1877F2" />
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Event not found.</Text>
      </View>
    );
  }

  const confirmedCount = event.players?.length || 0;
  const isFull = confirmedCount >= event.maxPlayers;
  const showTeams = isFull && teams && Object.keys(teams).length > 0;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.container, { flexGrow: 1 }]}>
        <View style={styles.header}>
          {isManager && (
            <>
              <TouchableOpacity onPress={() => router.push(`/EditEvent?eventId=${eventId}`)}>
                <Text style={styles.editText}>Edit Event</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCancelEvent}>
                <Text style={[styles.editText, styles.cancelText]}>Cancel Event</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.title}>{event.name}</Text>
        <Text style={styles.label}>Date:</Text>
        <Text style={styles.value}>
          {new Date(event.date?.seconds * 1000).toDateString()}
        </Text>

        <Text style={styles.label}>Time:</Text>
        <Text style={styles.value}>
          {new Date(event.date?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>


        <Text style={styles.label}>Game Method:</Text>
        <Text style={styles.value}>{event.gameMethod}</Text>

        <Text style={styles.label}>Max Players:</Text>
        <Text style={styles.value}>{event.maxPlayers}</Text>

        <Text style={styles.label}>
          Confirmed Players ({confirmedCount}/{event.maxPlayers}):
        </Text>
        {playerNames.map((name, i) => (
          <Text key={i} style={styles.playerItem}>• {name}</Text>
        ))}

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.button,
              styles.greenButton,
              (isFull && !isComing) && styles.disabledButton,
            ]}
            onPress={handleJoin}
            disabled={(isFull && !isComing) || joining} // 🧠 add joining!
          >
            <Text style={styles.buttonText}>GameTime</Text>
          </TouchableOpacity>


          <TouchableOpacity style={[styles.button, styles.redButton]} onPress={handleLeave}>
            <Text style={styles.buttonText}>Not Coming</Text>
          </TouchableOpacity>
        </View>

        {isManager && isFull && (
          <TouchableOpacity style={styles.createTeamsButton} onPress={handleCreateTeams}>
            <Text style={styles.buttonText}>Create Teams</Text>
          </TouchableOpacity>
        )}

        {showTeams && (
          <View style={{ marginTop: 40 }}>
            <Text style={styles.label}>Created Teams ({event.gameMethod})</Text>
            {Object.entries(teams).map(([groupName, players], i) => {
              // Calculate average only for Match Making
              let averageStars = null;
              if (event.gameMethod === "Match Making") {
                averageStars =
                  players.reduce((sum, player) => {
                    const match = player.match(/⭐+/);
                    return sum + (match ? match[0].length : 0);
                  }, 0) / players.length;
              }

              return (
                <View key={i} style={styles.groupCard}>
                  <Text style={styles.groupTitle}>{groupName}</Text>
                  {players.map((playerLine, j) => (
                    <Text key={j} style={styles.name}>{playerLine}</Text>
                  ))}
                  {averageStars !== null && (
                    <Text style={styles.average}>
                      ⭐ Average: {averageStars.toFixed(2)} Stars
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: "#f5f5f5",
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  editText: {
    fontSize: 16,
    color: "#1877F2",
    fontWeight: "bold",
  },
  cancelText: {
    color: "#dc3545",
  },
  errorText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#1877F2",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 15,
    color: "#333",
  },
  value: {
    fontSize: 16,
    color: "#555",
  },
  playerItem: {
    fontSize: 15,
    marginLeft: 10,
    color: "#222",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  greenButton: {
    backgroundColor: "#28a745",
  },
  redButton: {
    backgroundColor: "#dc3545",
  },
  disabledButton: {
    backgroundColor: "#bbb",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  createTeamsButton: {
    backgroundColor: "#1877F2",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  groupCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1877F2",
    marginBottom: 5,
  },
  name: {
    fontSize: 14,
    color: "#333",
  },
  average: {
    marginTop: 8,
    fontSize: 14,
    color: "#444",
    fontWeight: "600",
  },
});