import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import BottomNav from "../components/BottomNav";
import { db } from "../functions/lib/firebaseConfig";
import { getAuth } from "firebase/auth";
import { collection, getDocs, updateDoc, doc, arrayRemove } from "firebase/firestore";
import { useRouter } from "expo-router";

export default function MyEventsScreen() {
  interface Event {
    id: string;
    name: string;
    date: { seconds: number };
    gameMethod: string;
    players?: string[];
  }

  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [pastEvents, setPastEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const user = getAuth().currentUser;
  const router = useRouter();

  const fetchMyEvents = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "events"));
      const events = snapshot.docs.map(doc => ({ ...(doc.data() as Omit<Event, "id">), id: doc.id }));
      const myEvents = events.filter(event => user?.uid && event.players?.includes(user.uid));

      const now = Date.now();
      const upcoming = myEvents
        .filter(e => e.date.seconds * 1000 >= now)
        .sort((a, b) => a.date.seconds - b.date.seconds);
      const past = myEvents
        .filter(e => e.date.seconds * 1000 < now)
        .sort((a, b) => b.date.seconds - a.date.seconds);

      setUpcomingEvents(upcoming);
      setPastEvents(past);
    } catch (err) {
      console.error("Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyEvents();
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
            await updateDoc(ref, {
              players: arrayRemove(user.uid),
            });
            fetchMyEvents();
          } catch (err) {
            console.error("Failed to leave event:", err);
          }
        },
      },
    ]);
  };

  const renderEvent = (item: Event, showLeaveButton: boolean) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/EventDetail?eventId=${item.id}`)}
    >
      <Text style={styles.title}>{item.name}</Text>
      <Text style={styles.subtitle}>
        {new Date(item.date.seconds * 1000).toDateString()}
      </Text>
      <Text style={styles.subtitle}>Game Method: {item.gameMethod}</Text>
      <Text style={styles.joined}>✅ Joined</Text>
      {showLeaveButton && (
        <TouchableOpacity
          style={styles.leaveButton}
          onPress={() => handleLeaveEvent(item.id)}
        >
          <Text style={styles.leaveText}>Not Coming</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <Text style={styles.mainTitle}>My Events</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1877F2" />
        </View>
      ) : (
        <FlatList
          data={upcomingEvents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.container}
          ListHeaderComponent={
            upcomingEvents.length > 0 ? (
              <Text style={styles.sectionTitle}>Upcoming Events</Text>
            ) : null
          }
          renderItem={({ item }) => renderEvent(item, true)}
          ListFooterComponent={
            pastEvents.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Past Events</Text>
                {pastEvents.map((event) => (
                  <View key={event.id} style={{ marginBottom: 10 }}>
                    {renderEvent(event, false)}
                  </View>
                ))}
              </>
            ) : null
          }
          ListEmptyComponent={
            <Text style={styles.empty}>You haven't joined any events yet.</Text>
          }
        />
      )}

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1877F2",
    textAlign: "center",
    marginTop: 50,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    marginTop: 20,
  },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 15,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1877F2",
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },
  joined: {
    fontSize: 13,
    color: "#28a745",
    marginTop: 8,
  },
  leaveButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#dc3545",
    borderRadius: 6,
  },
  leaveText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 13,
  },
  empty: {
    textAlign: "center",
    fontSize: 16,
    marginTop: 60,
    color: "#999",
  },
});
