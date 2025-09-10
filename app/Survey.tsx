import { db } from "../functions/lib/firebaseConfig";
import { getAuth } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import MapView, { Circle, Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import DateTimePicker from "@react-native-community/datetimepicker";
import Slider from "@react-native-community/slider";
import axios from "axios";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ImageBackground,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";

const backgroundImage = require("../assets/images/soccer.jpg");

// Reusable brand tokens (keep aligned with Login/SignUp)
const BRAND = {
  primary: "#1877F2",
  textOnDark: "#ffffff",
  glassBg: "rgba(255,255,255,0.10)",
  glassBorder: "rgba(255,255,255,0.25)",
  darkOverlay: "rgba(0,0,0,0.55)",
  inputBg: "rgba(255,255,255,0.95)",
  muted: "#9CA3AF",
  surface: "#ffffff",
  border: "#E5E7EB",
};

type Suggestion = { display_name: string; lat: string; lon: string };

export default function SurveyScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams();

  // Form state
  const [positions, setPositions] = useState<string[]>([]);
  const [skillLevel, setSkillLevel] = useState("");
  const [stamina, setStamina] = useState("");
  const [fieldType, setFieldType] = useState("");
  const [playFrequency, setPlayFrequency] = useState("");
  const [dob, setDob] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDob, setTempDob] = useState(new Date());
  const [playRadius, setPlayRadius] = useState(10);

  // Location + map
  const [region, setRegion] = useState<Region>({
    latitude: 32.0853,
    longitude: 34.7818,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [location, setLocation] = useState({ latitude: 32.0853, longitude: 34.7818 });

  // Address search (debounced)
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reverseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSeq = useRef(0); // used to ignore stale results

  // On mount: ask permission and set current location
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Map will use default location (Tel Aviv)");
          return;
        }
        const currentLocation = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = currentLocation.coords;

        const newRegion = { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
        setRegion(newRegion);
        setLocation({ latitude, longitude });
        // Trigger a single reverse geocode for the initial location
        debouncedReverseGeocode(latitude, longitude);
      } catch {
        // Keep defaults on failure
      }
    })();
  }, []);

  // Load existing survey
  useEffect(() => {
    (async () => {
      const user = getAuth().currentUser;
      if (!user) return;
      const docRef = doc(db, "surveys", user.uid);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return;

      const data = snap.data();
      setPositions(data.positions || []);
      setSkillLevel(data.skillLevel || "");
      setStamina(data.stamina || "");
      setFieldType(data.fieldType || "");
      setPlayFrequency(data.playFrequency || "");
      setDob(data.dob ? new Date(data.dob) : new Date());
      setPlayRadius(data.playRadius || 10);

      if (data.location?.latitude && data.location?.longitude) {
        const r = {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };
        setRegion(r);
        setLocation({ latitude: r.latitude, longitude: r.longitude });
        debouncedReverseGeocode(r.latitude, r.longitude);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chip toggles
  const togglePosition = (role: string) => {
    setPositions((prev) => (prev.includes(role) ? prev.filter((x) => x !== role) : [...prev, role]));
  };

  // Debounced address search to avoid 429 from Nominatim
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
      const seq = ++searchSeq.current;
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
      // Ignore stale results
      if (seq !== searchSeq.current) return;
      setSuggestions(res.data ?? []);
    } catch (err) {
      // Swallow and keep UI snappy
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced reverse geocoding when the region settles
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
      // ignore reverse failures
    }
  };

  const handleSelectSuggestion = (place: Suggestion) => {
    const newLat = parseFloat(place.lat);
    const newLon = parseFloat(place.lon);
    const r = { latitude: newLat, longitude: newLon, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    setRegion(r);
    setLocation({ latitude: newLat, longitude: newLon });
    setSearchQuery(place.display_name);
    setSuggestions([]);
  };

  // Submit
  const handleSubmit = async () => {
    if (!canSubmit) {
      Alert.alert("Incomplete Form", "Please answer all questions before submitting.");
      return;
    }
    const user = getAuth().currentUser;
    if (!user) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    try {
      const docRef = doc(db, "surveys", user.uid);
      const snap = await getDoc(docRef);
      const existing = snap.exists() ? snap.data() : {};

      let updatedPositionsTemp = existing.positionsTemp || [...positions];
      const lastPositionPlayed = existing.lastPositionPlayed || [];

      // Add newly selected positions into positionsTemp only if not already in temp or LPP
      for (const pos of positions) {
        if (!updatedPositionsTemp.includes(pos) && !lastPositionPlayed.includes(pos)) {
          updatedPositionsTemp.push(pos);
        }
      }

      const payload = {
        positions,                       // static preferred positions
        skillLevel,
        stamina,
        fieldType,
        playFrequency,
        playRadius,
        dob: dob.toISOString(),
        location,
        positionsTemp: updatedPositionsTemp,
        lastPositionPlayed,
      };

      await setDoc(docRef, { ...existing, ...payload });
      Alert.alert("Success", "Survey updated successfully!", [
        {
          text: "OK",
          onPress: () => router.push(from === "Profile" ? "/Profile" : "/Login"),
        },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "An error occurred while saving survey.");
    }
  };

  // Derived UI helpers
  const canSubmit = useMemo(
    () =>
      positions.length > 0 &&
      !!skillLevel &&
      !!stamina &&
      !!fieldType &&
      !!playFrequency &&
      !!playRadius,
    [positions, skillLevel, stamina, fieldType, playFrequency, playRadius]
  );

  const POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Attacker"];
  const SKILL = [
    "Beginner ⭐",
    "Average ⭐⭐",
    "Intermediate ⭐⭐⭐",
    "Advanced ⭐⭐⭐⭐",
    "Professional ⭐⭐⭐⭐⭐",
  ];
  const STAMINA = ["Low", "Medium", "High"];
  const FIELD = ["Grass", "Asphalt", "No preference"];
  const FREQ = [
    "Rarely (Only in video games)",
    "Occasionally (Once or twice a month)",
    "Regularly (Weekly or more)",
    "Frequently (Multiple times per week)",
  ];

  return (
    <ImageBackground source={backgroundImage} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <SafeAreaView style={{ flex: 1, width: "100%" }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
              {/* Header */}
              <View style={styles.headerRow}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => router.push(from === "Profile" ? "/Profile" : "/SignUp")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Player Survey</Text>
                <View style={{ width: 36 }} />{/* spacer */}
              </View>

              {/* DOB */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Date of Birth</Text>
                <TouchableOpacity style={styles.inputBox} onPress={() => setShowDatePicker(true)}>
                  <Text style={styles.inputBoxText}>{dob.toDateString()}</Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <View style={styles.pickerWrap}>
                  <DateTimePicker
  value={tempDob}
  mode="date"
  display="spinner"        // iOS wheels style
  themeVariant="dark"      // dark background
  textColor="#ffffff"      // white numbers/months
  minimumDate={new Date(1900, 0, 1)}
  maximumDate={new Date()}
  onChange={(event, selectedDate) => {
    if (selectedDate) setTempDob(selectedDate);
  }}
/>

                    <TouchableOpacity
                      style={[styles.primaryBtn, { marginTop: 10 }]}
                      onPress={() => {
                        setDob(tempDob);
                        setShowDatePicker(false);
                      }}
                    >
                      <Text style={styles.primaryText}>Confirm</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Positions */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Preferred Positions (select multiple)</Text>
                <View style={styles.chipsWrap}>
                  {POSITIONS.map((r) => {
                    const selected = positions.includes(r);
                    return (
                      <TouchableOpacity
                        key={r}
                        onPress={() => togglePosition(r)}
                        style={[styles.chip, selected && styles.chipSelected]}
                        activeOpacity={0.9}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{r}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Skill */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Skill Level (1–5)</Text>
                <View style={styles.chipsWrap}>
                  {SKILL.map((l) => {
                    const selected = skillLevel === l;
                    return (
                      <TouchableOpacity
                        key={l}
                        onPress={() => setSkillLevel(l)}
                        style={[styles.chip, selected && styles.chipSelected]}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{l}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Stamina */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Stamina</Text>
                <View style={styles.chipsWrap}>
                  {STAMINA.map((l) => {
                    const selected = stamina === l;
                    return (
                      <TouchableOpacity
                        key={l}
                        onPress={() => setStamina(l)}
                        style={[styles.chip, selected && styles.chipSelected]}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{l}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Field type */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Preferred Field</Text>
                <View style={styles.chipsWrap}>
                  {FIELD.map((t) => {
                    const selected = fieldType === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => setFieldType(t)}
                        style={[styles.chip, selected && styles.chipSelected]}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{t}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Frequency */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Play Frequency</Text>
                <View style={{ gap: 10 }}>
                  {FREQ.map((f) => {
                    const selected = playFrequency === f;
                    return (
                      <TouchableOpacity
                        key={f}
                        onPress={() => setPlayFrequency(f)}
                        style={[styles.rowOption, selected && styles.rowOptionSelected]}
                      >
                        <Text style={[styles.rowOptionText, selected && styles.rowOptionTextSelected]}>{f}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Location / Search */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Your Location</Text>

                <View>
                  <View style={styles.searchRow}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search for address…"
                      placeholderTextColor={BRAND.muted}
                      value={searchQuery}
                      onChangeText={handleAddressChange}
                    />
                    {searchLoading ? <ActivityIndicator style={{ marginLeft: 8 }} /> : null}
                  </View>

                  {suggestions.length > 0 && (
                    <View style={styles.suggestBox}>
                      {suggestions.map((place, idx) => (
                        <TouchableOpacity
                          key={`${place.lat}-${place.lon}-${idx}`}
                          onPress={() => handleSelectSuggestion(place)}
                          style={styles.suggestItem}
                        >
                          <Text style={styles.suggestText}>{place.display_name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={{ width: "100%", height: 300, marginTop: 14, borderRadius: 16, overflow: "hidden" }}>
                  <MapView
                    style={{ flex: 1 }}
                    region={region}
                    onRegionChangeComplete={(r) => {
                      setRegion(r);
                      setLocation({ latitude: r.latitude, longitude: r.longitude });
                      debouncedReverseGeocode(r.latitude, r.longitude);
                    }}
                  >
                    <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} pinColor="red" />
                    <Circle
                      center={{ latitude: region.latitude, longitude: region.longitude }}
                      radius={playRadius * 1000}
                      strokeColor="rgba(24, 119, 242, 0.8)"
                      fillColor="rgba(24, 119, 242, 0.2)"
                    />
                  </MapView>
                </View>

                {/* Radius */}
                <View style={{ marginTop: 16, alignItems: "center" }}>
                  <Text style={styles.labelOnGlass}>Match search radius: {playRadius} km</Text>
                  <Slider
                    style={{ width: "100%", height: 40 }}
                    minimumValue={5}
                    maximumValue={50}
                    step={5}
                    value={playRadius}
                    onValueChange={(v) => {
                      setPlayRadius(v);
                      setRegion((prev) => ({
                        ...prev,
                        latitudeDelta: v / 50,
                        longitudeDelta: v / 50,
                      }));
                    }}
                    minimumTrackTintColor={BRAND.primary}
                    maximumTrackTintColor="#ddd"
                    thumbTintColor={BRAND.primary}
                  />
                </View>
              </View>

              {/* Submit */}
              <TouchableOpacity
                style={[styles.primaryBtn, !canSubmit && { opacity: 0.7 }]}
                onPress={handleSubmit}
                disabled={!canSubmit}
                activeOpacity={0.9}
              >
                <Text style={styles.primaryText}>Submit</Text>
              </TouchableOpacity>

              <View style={{ height: 28 }} />
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: BRAND.darkOverlay },
  container: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingBottom: 24,
  },

  // Header
  headerRow: {
    marginTop: 8,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: { paddingHorizontal: 6, paddingVertical: 4 },
  backArrow: { fontSize: 28, color: BRAND.textOnDark, fontWeight: "800" },
  title: { color: BRAND.textOnDark, fontSize: 26, fontWeight: "800" },

  // Glass card
  card: {
    width: "100%",
    backgroundColor: BRAND.glassBg,
    borderColor: BRAND.glassBorder,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginTop: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 6,
  },
  cardTitle: {
    color: BRAND.textOnDark,
    fontWeight: "800",
    marginBottom: 10,
    fontSize: 16,
  },

  // Input on glass
  inputBox: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: BRAND.inputBg,
    justifyContent: "center",
  },
  inputBoxText: { color: "#0F172A", fontSize: 16 },

  // Label on glass
  labelOnGlass: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    marginBottom: 6,
  },

  // Chips
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: BRAND.inputBg,
  },
  chipSelected: {
    backgroundColor: BRAND.primary,
  },
  chipText: { color: "#0F172A", fontWeight: "700" },
  chipTextSelected: { color: "#fff" },

  // Long row options
  rowOption: {
    backgroundColor: BRAND.inputBg,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowOptionSelected: { backgroundColor: BRAND.primary },
  rowOptionText: { color: "#0F172A", fontWeight: "600" },
  rowOptionTextSelected: { color: "#fff", fontWeight: "800" },

  // Search
  searchRow: { flexDirection: "row", alignItems: "center" },
  searchInput: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: BRAND.inputBg,
    color: "#0F172A",
    fontSize: 16,
  },
  suggestBox: {
    marginTop: 6,
    maxHeight: 180,
    backgroundColor: BRAND.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BRAND.border,
    overflow: "hidden",
  },
  suggestItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  suggestText: { color: "#0F172A" },

  // Buttons
  primaryBtn: {
    backgroundColor: BRAND.primary,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  primaryText: { color: "#fff", fontSize: 17, fontWeight: "800", letterSpacing: 0.3 },

  // Date picker wrap
  pickerWrap: { alignItems: "center", marginTop: 10 },
});
