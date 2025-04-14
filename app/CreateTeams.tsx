import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { db } from "../app/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function CreateTeamsScreen() {
  const { eventId, groupCount } = useLocalSearchParams<{
    eventId: string;
    groupCount: string;
  }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Record<string, string[]>>({});
  const [event, setEvent] = useState<any>(null);

  useEffect(() => {
    if (!eventId || !groupCount) return;

    const fetchEventAndDivide = async () => {
      setLoading(true);
      try {
        const eventRef = doc(db, "events", eventId);
        const eventSnap = await getDoc(eventRef);
        if (!eventSnap.exists()) {
          Alert.alert("Error", "Event not found.");
          return;
        }

        const data = eventSnap.data();
        setEvent(data);
        const players = data.players || [];
        const method = data.gameMethod || "Match Making";
        const numGroups = parseInt(groupCount);

        if (!numGroups || players.length % numGroups !== 0) {
          Alert.alert("Invalid", "Choose a valid number of groups.");
          return;
        }

        const playerDetails = await Promise.all(
          players.map(async (uid: string) => {
            const userRef = doc(db, "users", uid);
            const surveyRef = doc(db, "surveys", uid);
            const [userSnap, surveySnap] = await Promise.all([
              getDoc(userRef),
              getDoc(surveyRef),
            ]);
            const name = userSnap.exists() ? userSnap.data().name : uid;
            const survey = surveySnap.exists() ? surveySnap.data() : {};
            return { uid, name, survey };
          })
        );

        let groupings: Record<string, string[]> = {};

        if (method === "Match Making") {
          playerDetails.sort(
            (a, b) => (b.survey.skillLevel || 1) - (a.survey.skillLevel || 1)
          );
          for (let i = 0; i < numGroups; i++) {
            groupings[`Group ${i + 1}`] = [];
          }
          playerDetails.forEach((p, i) => {
            const display = `${p.name} (${p.survey.skillLevel || 1})`;
            groupings[`Group ${(i % numGroups) + 1}`].push(display);
          });
        } else {
          const groups: Record<string, string[]> = {};
          for (let i = 0; i < numGroups; i++) {
            groups[`Group ${i + 1}`] = [];
          }

          const goalkeepers: any[] = [];
          const others: any[] = [];

          for (const player of playerDetails) {
            const { survey } = player;
            let positions = survey.positions || [];
            let lastPlayed = survey.lastPositionPlayed || [];

            if (positions.length === 1) {
              player.position = positions[0];
            } else {
              if (!lastPlayed) lastPlayed = [];
              const remaining = positions.filter(
                (p: any) => !lastPlayed.includes(p)
              );
              if (remaining.length === 0) {
                lastPlayed = [];
              }
              const choices = remaining.length ? remaining : positions;
              const chosen =
                choices[Math.floor(Math.random() * choices.length)];
              player.position = chosen;

              const surveyRef = doc(db, "surveys", player.uid);
              const newHistory = [...lastPlayed, chosen];
              await updateDoc(surveyRef, { lastPositionPlayed: newHistory });
            }

            if (player.position === "goalkeeper") {
              goalkeepers.push(player);
            } else {
              others.push(player);
            }
          }

          goalkeepers.forEach((p, i) => {
            groups[`Group ${(i % numGroups) + 1}`].push(`${p.name} (GK)`);
          });
          others.forEach((p, i) => {
            groups[`Group ${(i % numGroups) + 1}`].push(`${p.name} (${p.position})`);
          });
          groupings = groups;
        }

        await updateDoc(doc(db, "events", eventId), { teams: groupings });
        setTeams(groupings);
      } catch (err) {
        console.error(err);
        Alert.alert("Error", "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };

    fetchEventAndDivide();
  }, [eventId, groupCount]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1877F2" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#1877F2" />
        </TouchableOpacity>
        <Text style={styles.title}>Create Teams ({event?.gameMethod})</Text>
      </View>

      {Object.entries(teams).map(([groupName, players], i) => (
        <View key={i} style={styles.groupCard}>
          <Text style={styles.groupTitle}>{groupName}</Text>
          {players.map((name, j) => (
            <Text key={j} style={styles.name}>{name}</Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 60,
    backgroundColor: "#f5f5f5",
    paddingTop: 60,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1877F2",
  },
  groupCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  groupTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#1877F2",
  },
  name: {
    fontSize: 16,
    marginVertical: 2,
    color: "#333",
  },
});
