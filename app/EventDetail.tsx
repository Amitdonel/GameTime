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
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../app/firebaseConfig";
import { getAuth } from "firebase/auth";

export default function EventDetailScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isManager, setIsManager] = useState(false);
  const [isComing, setIsComing] = useState(false);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
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
          setIsManager(data.createdBy === user.uid);
          setIsComing((data.players || []).includes(user.uid));

          const playerUids = data.players || [];
          const playerNameList: string[] = [];

          for (const uid of playerUids) {
            const userRef = doc(db, "users", uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              playerNameList.push(userSnap.data().name || uid);
            } else {
              playerNameList.push(uid);
            }
          }

          setPlayerNames(playerNameList);
        } else {
          console.warn("Event not found");
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

    if ((event.players?.length || 0) >= event.maxPlayers && !isComing) {
      Alert.alert("Match is Full", "No more players can join.");
      return;
    }

    try {
      const ref = doc(db, "events", eventId);
      await updateDoc(ref, {
        players: arrayUnion(user.uid),
      });
      setIsComing(true);
      setEvent((prev: any) => ({
        ...prev,
        players: [...(prev.players || []), user.uid],
      }));
      setPlayerNames((prev) => [...prev, user.displayName || "You"]);
    } catch (error) {
      console.error("Join failed:", error);
    }
  };

  const handleLeave = async () => {
    if (!eventId || !user) return;

    try {
      const ref = doc(db, "events", eventId);
      await updateDoc(ref, {
        players: arrayRemove(user.uid),
      });
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{event.name}</Text>
        {isManager && (
          <TouchableOpacity onPress={() => router.push(`/EditEvent?eventId=${eventId}`)}>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.label}>Date:</Text>
      <Text style={styles.value}>
        {new Date(event.date?.seconds * 1000).toDateString()}
      </Text>

      <Text style={styles.label}>Game Method:</Text>
      <Text style={styles.value}>{event.gameMethod}</Text>

      <Text style={styles.label}>Max Players:</Text>
      <Text style={styles.value}>{event.maxPlayers}</Text>

      <Text style={styles.label}>Description:</Text>
      <Text style={styles.value}>{event.description || "No description provided."}</Text>

      <Text style={styles.label}>Location:</Text>
      <Text style={styles.value}>
        Latitude: {event.location?.latitude}, Longitude: {event.location?.longitude}
      </Text>

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
            isFull && !isComing && styles.disabledButton,
          ]}
          onPress={handleJoin}
          disabled={isFull && !isComing}
        >
          <Text style={styles.buttonText}>GameTime</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.redButton]}
          onPress={handleLeave}
        >
          <Text style={styles.buttonText}>Not Coming</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingHorizontal: 20,
    backgroundColor: "#f5f5f5",
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#1877F2",
  },
  editText: {
    fontSize: 16,
    color: "#1877F2",
    textDecorationLine: "underline",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 15,
    color: "#333",
  },
  value: {
    fontSize: 16,
    marginBottom: 5,
    color: "#555",
  },
  playerItem: {
    fontSize: 15,
    marginLeft: 10,
    color: "#222",
  },
  errorText: {
    fontSize: 18,
    color: "red",
    textAlign: "center",
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
});
