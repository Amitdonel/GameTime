import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
} from "react-native";
import MapView, { Marker, Circle, Callout } from "react-native-maps";
import Slider from "@react-native-community/slider";
import BottomNav from "../components/BottomNav";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../functions/lib/firebaseConfig";
import { useRouter } from "expo-router";
import axios from "axios";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type Event = {
  id: string;
  name: string;
  date: { seconds: number };
  location: { latitude: number; longitude: number };
  gameMethod?: string;
};

export default function SearchScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(10);
  const [region, setRegion] = useState({
    latitude: 32.0853,
    longitude: 34.7818,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [searchQuery, setSearchQuery] = useState("");
  type Suggestion = {
    display_name: string;
    lat: string;
    lon: string;
  };
  
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const mapRef = useRef<MapView | null>(null);
  const router = useRouter();

  const handleAddressChange = async (text: string) => {
    setSearchQuery(text);
    if (text.length < 3) return setSuggestions([]);
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${text}`,
        {
          headers: {
            "User-Agent": "GameTimeApp/1.0 (contact@example.com)",
          },
        }
      );
      setSuggestions(response.data);
    } catch (err) {
      console.error("Address autocomplete error:", err);
    }
  };

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        {
          headers: {
            "User-Agent": "GameTimeApp/1.0 (contact@example.com)",
          },
        }
      );
      if (response.data && response.data.display_name) {
        setSearchQuery(response.data.display_name);
      }
    } catch (err) {
      console.error("Reverse geocoding error:", err);
    }
  };

  const handleSelectSuggestion = (place: Suggestion) => {
    const newLat = parseFloat(place.lat);
    const newLon = parseFloat(place.lon);
    const newRegion = {
      latitude: newLat,
      longitude: newLon,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    };
    setRegion(newRegion);
    setSearchQuery(place.display_name);
    setSuggestions([]);
    mapRef.current?.animateToRegion(newRegion, 1000);
  };

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "events"));
        const now = Date.now();
        const upcomingEvents = snapshot.docs
          .map((doc) => ({ ...(doc.data() as Event), id: doc.id }))
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
      <View style={styles.header}>
        <Text style={styles.headerText}>Explore Events</Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={(ref) => {
            mapRef.current = ref;
          }}
          style={styles.map}
          region={region}
          onRegionChangeComplete={(newRegion) => {
            setRegion(newRegion);
            reverseGeocode(newRegion.latitude, newRegion.longitude);
          }}
        >
          <Marker coordinate={region} pinColor="red" />
          <Circle
            center={region}
            radius={radius * 1000}
            strokeColor="rgba(24, 119, 242, 0.5)"
            fillColor="rgba(24, 119, 242, 0.1)"
          />
          {events.map((event) => (
            <Marker
              key={event.id}
              coordinate={event.location}
              pinColor="blue"
            >
              <Callout
                onPress={() =>
                  router.push({
                    pathname: "/EventDetail",
                    params: { eventId: event.id },
                  })
                }
              >
                <View style={{ maxWidth: 200 }}>
                  <Text style={{ fontWeight: "bold" }}>{event.name}</Text>
                  <Text>
                    {new Date(event.date.seconds * 1000).toDateString()}
                  </Text>
                  <Text>Tap here for details</Text>
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      </View>
<View style={{ paddingHorizontal: 20, marginTop: 10 }}>
        <TextInput
          style={styles.input}
          placeholder="Search for address..."
          value={searchQuery}
          onChangeText={handleAddressChange}
        />
        {suggestions.length > 0 && (
          <View style={styles.suggestionList}>
            {suggestions.map((place, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleSelectSuggestion(place)}
                style={styles.suggestionItem}
              >
                <Text>{place.display_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      <View style={styles.sliderSection}>
        <Text style={styles.sliderLabel}>Search radius: {radius} km</Text>
        <Slider
          style={styles.slider}
          minimumValue={5}
          maximumValue={50}
          step={5}
          value={radius}
          onValueChange={(value) => {
            setRadius(value);
            setRegion((prev) => ({
              ...prev,
              latitudeDelta: value / 50,
              longitudeDelta: value / 50,
            }));
          }}
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
              })}
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
  header: {
    paddingTop: 50,
    paddingBottom: 10,
    backgroundColor: "#1877F2",
    alignItems: "center",
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
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
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
  },
  suggestionList: {
    backgroundColor: "#fff",
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 150,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
});
