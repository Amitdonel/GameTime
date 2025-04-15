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
import { db } from "../app/firebaseConfig";
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
      const allEvents = snapshot.docs.map(doc => ({ ...(doc.data() as Omit<Event, "id">), id: doc.id }));
      const myEvents = allEvents.filter(event => user?.uid && event.players?.includes(user.uid));

      const now = Date.now();
      const upcoming = myEvents
        .filter(e => e.date.seconds * 1000 >= now)
        .sort((a, b) => b.date.seconds - a.date.seconds);
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
            fetchMyEvents(); // Refresh list
          } catch (err) {
            console.error("Failed to leave event:", err);
          }
        },
      },
    ]);
  };

  const renderEvent = ({
    item,
    showLeaveButton = false,
  }: {
    item: Event;
    showLeaveButton?: boolean;
  }) => (
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1877F2" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        ListHeaderComponent={
          <View style={styles.section}>
            <Text style={styles.mainTitle}>My Events</Text>
            {upcomingEvents.length > 0 && (
              <Text style={styles.sectionTitle}>Upcoming Events</Text>
            )}
          </View>
        }
        data={upcomingEvents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.container}
        renderItem={({ item }) => renderEvent({ item, showLeaveButton: true })}
        ListFooterComponent={
          pastEvents.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Past Events</Text>
              {pastEvents.map((event) => renderEvent({ item: event }))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No events found.</Text>
        }
      />
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 80,
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    paddingTop: 60,
    paddingBottom: 20,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1877F2",
    textAlign: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#555",
    marginTop: 20,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#ddd",
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
    color: "#fff",
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
