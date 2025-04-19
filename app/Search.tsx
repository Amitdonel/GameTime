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
import MapView, { Marker } from "react-native-maps";
import Slider from "@react-native-community/slider";
import BottomNav from "../components/BottomNav";
import { getAuth } from "firebase/auth";
import { db } from "../app/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { useRouter } from "expo-router";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function SearchScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(10);
  const [region, setRegion] = useState({
    latitude: 32.0853,
    longitude: 34.7818,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const router = useRouter();

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "events"));
        const now = Date.now();
        const upcomingEvents = snapshot.docs
          .map((doc) => ({ ...(doc.data() as any), id: doc.id }))
          .filter((event) => event.date?.seconds * 1000 > now && event.location);

        const filtered = upcomingEvents.filter((event) => {
          const dist = haversineDistance(
            region.latitude,
            region.longitude,
            event.location.latitude,
            event.location.longitude
          );
          return dist <= radius;
        });

        setEvents(filtered);
      } catch (err) {
        Alert.alert("Error", "Failed to fetch events.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [region, radius]);

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={region}
          onRegionChangeComplete={(newRegion) => setRegion(newRegion)}
        >
          <Marker coordinate={region} />
        </MapView>
      </View>

      <View style={styles.sliderSection}>
        <Text style={styles.sliderLabel}>Search radius: {radius} km</Text>
        <Slider
          style={styles.slider}
          minimumValue={5}
          maximumValue={50}
          step={1}
          value={radius}
          onValueChange={setRadius}
          minimumTrackTintColor="#1877F2"
          maximumTrackTintColor="#ddd"
          thumbTintColor="#1877F2"
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1877F2" />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>No nearby events found.</Text>}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({
                pathname: "/EventDetail",
                params: { eventId: item.id },
              } as any)}
              
            >
              <Text style={styles.title}>{item.name}</Text>
              <Text style={styles.subtitle}>
                {new Date(item.date.seconds * 1000).toDateString()}
              </Text>
              <Text style={styles.subtitle}>Game Method: {item.gameMethod}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    height: 300,
    width: "100%",
  },
  map: {
    flex: 1,
  },
  sliderSection: {
    paddingHorizontal: 20,
    paddingTop: 15,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  slider: {
    width: "100%",
  },
  list: {
    padding: 20,
    paddingBottom: 100,
    backgroundColor: "#f5f5f5",
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
  empty: {
    textAlign: "center",
    fontSize: 16,
    marginTop: 30,
    color: "#999",
  },
  loadingContainer: {
    flex: 1,
    paddingTop: 60,
    justifyContent: "center",
    alignItems: "center",
  },
});
