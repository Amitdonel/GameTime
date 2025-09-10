import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import MapView, { Marker, Circle, Callout } from "react-native-maps";
import Slider from "@react-native-community/slider";
import BottomNav from "../components/BottomNav";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../functions/lib/firebaseConfig";
import { useRouter } from "expo-router";
import axios from "axios";
import Ionicons from "react-native-vector-icons/Ionicons";
import { StatusBar } from "expo-status-bar";

// ---------- Brand tokens ----------
const BRAND = {
  primary: "#1877F2",
  textOnDark: "#ffffff",
  overlay: "rgba(0,0,0,0.55)",
  glassBg: "rgba(255,255,255,0.10)",
  glassBorder: "rgba(255,255,255,0.25)",
  inputBg: "rgba(255,255,255,0.95)",
  muted: "#9CA3AF",
};
const bgImage = require("../assets/images/soccer.jpg");

// ---------- Helpers ----------
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

type Suggestion = { display_name: string; lat: string; lon: string };

export default function SearchScreen() {
  const router = useRouter();

  // Map / radius
  const [radius, setRadius] = useState(10);
  const [region, setRegion] = useState({
    latitude: 32.0853,
    longitude: 34.7818,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const mapRef = useRef<MapView | null>(null);

  // Data
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Search + suggestions (debounced forward) + reverse geocode (throttled)
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reverseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  // ----- Fetch events whenever region/radius changes -----
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, "events"));
        const now = Date.now();

        // future events with valid location
        const upcoming = snapshot.docs
          .map((doc) => ({ ...(doc.data() as any), id: doc.id }))
          .filter(
            (e: any) => e.date?.seconds * 1000 > now && e.location?.latitude != null
          ) as Event[];

        // filter within radius and sort by distance
        const filtered = upcoming
          .map((e) => ({
            ...e,
            _dist: haversineDistance(
              region.latitude,
              region.longitude,
              e.location.latitude,
              e.location.longitude
            ),
          }))
          .filter((e) => e._dist <= radius)
          .sort((a, b) => a._dist - b._dist)
          .map(({ _dist, ...rest }) => rest); // strip helper

        if (alive) setEvents(filtered);
      } catch (err) {
        Alert.alert("Error", "Failed to fetch events.");
        console.error(err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [region, radius]);

  // ----- Forward geocode (debounced) -----
  const handleAddressChange = (text: string) => {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    searchTimer.current = setTimeout(() => doSearch(text), 400);
  };

  const doSearch = async (q: string) => {
    try {
      setSearchLoading(true);
      const seq = ++seqRef.current;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        q
      )}&limit=6&addressdetails=0`;
      const res = await axios.get(url, {
        headers: {
          "User-Agent": "GameTimeApp/1.0 (support@gametime.example)",
          "Accept-Language": "en",
        },
        timeout: 8000,
      });
      if (seq !== seqRef.current) return;
      setSuggestions(res.data ?? []);
    } catch {
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // ----- Reverse geocode (throttled) -----
  const debouncedReverseGeocode = (lat: number, lon: number) => {
    if (reverseTimer.current) clearTimeout(reverseTimer.current);
    reverseTimer.current = setTimeout(() => reverseGeocode(lat, lon), 600);
  };

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
      const res = await axios.get(url, {
        headers: {
          "User-Agent": "GameTimeApp/1.0 (support@gametime.example)",
          "Accept-Language": "en",
        },
        timeout: 8000,
      });
      if (res.data?.display_name) setSearchQuery(res.data.display_name);
    } catch {
      // ignore
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
    mapRef.current?.animateToRegion(newRegion, 900);
  };

  // ---------- Render ----------
  return (
    <ImageBackground source={bgImage} style={{ flex: 1 }} resizeMode="cover">
      <StatusBar style="light" />
      <View style={styles.overlay} />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            {/* Glass header with title + address search */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Explore Events</Text>

              <View style={styles.searchRow}>
                <Ionicons name="search" size={18} color={BRAND.muted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search for address…"
                  placeholderTextColor={BRAND.muted}
                  value={searchQuery}
                  onChangeText={handleAddressChange}
                />
                {searchLoading ? <ActivityIndicator style={{ marginLeft: 6 }} /> : null}
              </View>

              {suggestions.length > 0 && (
                <View style={styles.suggestBox}>
                  {suggestions.map((place, idx) => (
                    <TouchableOpacity
                      key={`${place.lat}-${place.lon}-${idx}`}
                      onPress={() => handleSelectSuggestion(place)}
                      style={styles.suggestItem}
                    >
                      <Text style={styles.suggestText} numberOfLines={2}>
                        {place.display_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Map card */}
            <View style={styles.mapCard}>
              <View style={styles.mapWrap}>
                <MapView
                  ref={(ref) => { mapRef.current = ref; }}
                  style={{ flex: 1 }}
                  region={region}
                  onRegionChangeComplete={(newRegion) => {
                    setRegion(newRegion);
                    debouncedReverseGeocode(newRegion.latitude, newRegion.longitude);
                  }}
                >
                  {/* center radius circle and event markers */}
                  <Circle
                    center={region}
                    radius={radius * 1000}
                    strokeColor="rgba(24,119,242,0.55)"
                    fillColor="rgba(24,119,242,0.18)"
                  />
                  {events.map((event) => (
                    <Marker key={event.id} coordinate={event.location} pinColor="blue">
                      <Callout
                        onPress={() =>
                          router.push({ pathname: "/EventDetail", params: { eventId: event.id } })
                        }
                      >
                        <View style={{ maxWidth: 220 }}>
                          <Text style={{ fontWeight: "bold" }}>{event.name}</Text>
                          <Text>{new Date(event.date.seconds * 1000).toDateString()}</Text>
                          <Text style={{ color: "#1877F2", marginTop: 2 }}>Tap for details</Text>
                        </View>
                      </Callout>
                    </Marker>
                  ))}
                </MapView>

                {/* Center pin overlay */}
                <View style={styles.pinContainer}>
                  <Ionicons name="location-sharp" size={36} color="#ef4444" />
                </View>
              </View>

              {/* Radius slider (glass) */}
              <View style={styles.sliderCard}>
                <Text style={styles.sliderLabel}>Search radius: {radius} km</Text>
                <Slider
                  style={{ width: "100%", height: 40 }}
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
                  minimumTrackTintColor={BRAND.primary}
                  maximumTrackTintColor="#ddd"
                  thumbTintColor={BRAND.primary}
                />
              </View>
            </View>

            {/* Results */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={{ color: "#fff", marginTop: 6 }}>Finding events near you…</Text>
              </View>
            ) : (
              <FlatList
                data={events}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                  <Text style={styles.empty}>No nearby events found.</Text>
                }
                renderItem={({ item }) => {
                  const dist = haversineDistance(
                    region.latitude,
                    region.longitude,
                    item.location.latitude,
                    item.location.longitude
                  );
                  return (
                    <TouchableOpacity
                      style={styles.card}
                      activeOpacity={0.9}
                      onPress={() =>
                        router.push({ pathname: "/EventDetail", params: { eventId: item.id } })
                      }
                    >
                      <View style={styles.cardTop}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View style={styles.pill}>
                          <Text style={styles.pillText}>{dist.toFixed(1)} km</Text>
                        </View>
                      </View>
                      <Text style={styles.cardMeta}>
                        {new Date(item.date.seconds * 1000).toLocaleString()}
                      </Text>
                      <Text style={styles.cardMetaMuted}>
                        {item.gameMethod ? `Game method: ${item.gameMethod}` : "Game method: —"}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            {/* Spacer for BottomNav */}
            <View style={{ height: 120 }} />
            <BottomNav />
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: BRAND.overlay },

  // Header (glass) + search
  header: {
    marginTop: 46,
    marginHorizontal: 16,
    padding: 12,
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
  headerTitle: {
    color: BRAND.textOnDark,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BRAND.inputBg,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 48,
  },
  searchInput: { flex: 1, paddingLeft: 8, color: "#0F172A", fontSize: 16 },
  suggestBox: {
    marginTop: 6,
    maxHeight: 180,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  suggestItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  suggestText: { color: "#0F172A" },

  // Map card
  mapCard: { marginTop: 12, paddingHorizontal: 16 },
  mapWrap: {
    height: 300,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: BRAND.glassBg,
    borderWidth: 1,
    borderColor: BRAND.glassBorder,
  },
  pinContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -18 }, { translateY: -36 }],
    zIndex: 999,
  },

  // Slider card (glass)
  sliderCard: {
    marginTop: 10,
    backgroundColor: BRAND.glassBg,
    borderColor: BRAND.glassBorder,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  sliderLabel: { color: BRAND.textOnDark, fontWeight: "700", marginBottom: 6 },

  // Loading
  loadingContainer: {
    alignItems: "center",
    marginTop: 20,
  },

  // List + cards
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  empty: {
    textAlign: "center",
    fontSize: 16,
    marginTop: 16,
    color: "#E5E7EB",
  },
  card: {
    backgroundColor: BRAND.glassBg,
    borderColor: BRAND.glassBorder,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { color: "#fff", fontWeight: "800", fontSize: 16, flex: 1, marginRight: 8 },
  cardMeta: { color: "#E5E7EB", fontWeight: "700", marginTop: 2 },
  cardMetaMuted: { color: "#CBD5E1", marginTop: 2 },
  pill: {
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillText: { color: "#111827", fontWeight: "800", fontSize: 12 },
});
