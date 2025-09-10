import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { db } from "../functions/lib/firebaseConfig";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import MapView from "react-native-maps";
import * as Location from "expo-location";
import Ionicons from "react-native-vector-icons/Ionicons";
import BottomNav from "../components/BottomNav";
import Slider from "@react-native-community/slider";
import { getAuth } from "firebase/auth";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";

// Brand tokens (consistent with other screens)
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

// Option images
const imageMap: Record<"soccer.jpg" | "soccer1.jpg" | "soccer2.jpg" | "soccer3.jpg", any> = {
  "soccer.jpg": require("../assets/images/soccer.jpg"),
  "soccer1.jpg": require("../assets/images/soccer1.jpg"),
  "soccer2.jpg": require("../assets/images/soccer2.jpg"),
  "soccer3.jpg": require("../assets/images/soccer3.jpg"),
};

type Suggestion = { display_name: string; lat: string; lon: string };

export default function PlusScreen() {
  const router = useRouter();

  // Form state
  const [eventName, setEventName] = useState("");
  const [customImageUri, setCustomImageUri] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<keyof typeof imageMap>("soccer.jpg");
  const [eventDate, setEventDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [eventTime, setEventTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [gameMethod, setGameMethod] = useState<"Match Making" | "Optimization">("Match Making");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  // Location + map
  const [region, setRegion] = useState({
    latitude: 32.0853,
    longitude: 34.7818,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [selectedLocation, setSelectedLocation] = useState({
    latitude: 32.0853,
    longitude: 34.7818,
  });

  // Address search (debounced)
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reverseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    // Prefill time to nearest half-hour for a nicer default
    const d = new Date();
    const mins = d.getMinutes();
    const add = mins < 30 ? 30 - mins : 60 - mins;
    const t = new Date(d.getTime() + add * 60000);
    setEventTime(t);
  }, []);

  // Ask for location + set initial region
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Using default location (Tel Aviv).");
        return;
      }
      const current = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = current.coords;
      const newRegion = { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
      setRegion(newRegion);
      setSelectedLocation({ latitude, longitude });
      debouncedReverseGeocode(latitude, longitude);
    })();
  }, []);

  // Debounced forward search
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
      if (seq !== seqRef.current) return; // ignore stale responses
      setSuggestions(res.data ?? []);
    } catch {
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced reverse geocode
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
    const newRegion = { latitude: newLat, longitude: newLon, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    setRegion(newRegion);
    setSelectedLocation({ latitude: newLat, longitude: newLon });
    setSearchQuery(place.display_name);
    setSuggestions([]);
  };

  // Image picking
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "We need access to your gallery to choose a picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.length) {
      setCustomImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "We need access to your camera to take a picture.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.length) {
      setCustomImageUri(result.assets[0].uri);
    }
  };

  const openImageOptions = () => {
    Alert.alert("Upload Image", "Choose source", [
      { text: "Camera", onPress: takePhoto },
      { text: "Gallery", onPress: pickImage },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const canCreate =
    eventName.trim().length > 0 &&
    selectedLocation?.latitude != null &&
    selectedLocation?.longitude != null;

  const handleCreateEvent = async () => {
    if (!canCreate) {
      Alert.alert("Incomplete Form", "Please enter event name and set a location.");
      return;
    }
    try {
      setCreating(true);
      const combined = new Date(eventDate);
      combined.setHours(eventTime.getHours());
      combined.setMinutes(eventTime.getMinutes());
      combined.setSeconds(0);

      await addDoc(collection(db, "events"), {
        name: eventName.trim(),
        date: Timestamp.fromDate(combined),
        location: selectedLocation,
        createdAt: Timestamp.now(),
        maxPlayers,
        gameMethod,
        description: description.trim(),
        image: customImageUri || selectedImage, // NOTE: If URI, adjust Home to render {uri}
        createdBy: getAuth().currentUser?.uid || null,
        players: [],
        playerPositions: {},
      });

      Alert.alert("Success", "Event created successfully!", [
        { text: "OK", onPress: () => router.push("/Home") },
      ]);
    } catch (error) {
      console.error("Error creating event:", error);
      Alert.alert("Error", "Could not create event. Try again later.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <ImageBackground source={bgImage} style={{ flex: 1 }} resizeMode="cover">
      <StatusBar style="light" />
      <View style={styles.overlay} />

      <SafeAreaView style={{ flex: 1, width: "100%" }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }}>
              {/* Glass header */}
              <View style={styles.header}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="add-circle-outline" size={22} color={BRAND.textOnDark} />
                  <Text style={styles.headerTitle}>Create New Match</Text>
                </View>
              </View>

              <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
                {/* Card: Basic info */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Basics</Text>

                  <Text style={styles.label}>Event name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Friday Night 5v5"
                    placeholderTextColor={BRAND.muted}
                    value={eventName}
                    onChangeText={setEventName}
                  />

                  <View style={styles.row2}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Date</Text>
                      <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                        <Text style={styles.inputText}>{eventDate.toDateString()}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ width: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Time</Text>
                      <TouchableOpacity style={styles.input} onPress={() => setShowTimePicker(true)}>
                        <Text style={styles.inputText}>
                          {eventTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {showDatePicker && (
                    <View style={styles.pickerWrap}>
                      <DateTimePicker
                        value={eventDate}
                        mode="date"
                        display="spinner"
                        themeVariant="dark"
                        // @ts-ignore iOS-only prop
                        textColor="#ffffff"
                        onChange={(e, d) => d && setEventDate(d)}
                      />
                      <TouchableOpacity style={[styles.primaryBtn, { marginTop: 10 }]} onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.primaryText}>Confirm</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {showTimePicker && (
                    <View style={styles.pickerWrap}>
                      <DateTimePicker
                        value={eventTime}
                        mode="time"
                        display="spinner"
                        themeVariant="dark"
                        // @ts-ignore iOS-only prop
                        textColor="#ffffff"
                        onChange={(e, t) => t && setEventTime(t)}
                      />
                      <TouchableOpacity style={[styles.primaryBtn, { marginTop: 10 }]} onPress={() => setShowTimePicker(false)}>
                        <Text style={styles.primaryText}>Confirm Time</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Card: Players & method */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Players & Method</Text>

                  <Text style={styles.label}>Max players: {maxPlayers}</Text>
                  <Slider
                    style={{ width: "100%", height: 40 }}
                    minimumValue={2}
                    maximumValue={50}
                    step={1}
                    value={maxPlayers}
                    onValueChange={setMaxPlayers}
                    minimumTrackTintColor={BRAND.primary}
                    maximumTrackTintColor="#ddd"
                    thumbTintColor={BRAND.primary}
                  />

                  <Text style={[styles.label, { marginTop: 8 }]}>Game method</Text>
                  <View style={styles.chipsRow}>
                    {(["Match Making", "Optimization"] as const).map((m) => {
                      const selected = gameMethod === m;
                      return (
                        <TouchableOpacity
                          key={m}
                          onPress={() => setGameMethod(m)}
                          style={[styles.chip, selected && styles.chipSelected]}
                          activeOpacity={0.9}
                        >
                          <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{m}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.label, { marginTop: 8 }]}>Description</Text>
                  <TextInput
                    style={styles.textarea}
                    multiline
                    numberOfLines={4}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Write something about the match…"
                    placeholderTextColor={BRAND.muted}
                  />
                </View>

                {/* Card: Cover image */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Cover Image</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                    {/* Custom upload tile */}
                    <TouchableOpacity onPress={openImageOptions} activeOpacity={0.9} style={styles.uploadTile}>
                      <Image
                        source={
                          customImageUri
                            ? { uri: customImageUri }
                            : { uri: "https://via.placeholder.com/100" }
                        }
                        style={styles.uploadThumb}
                      />
                      <Text style={styles.uploadText}>Upload</Text>
                    </TouchableOpacity>

                    {(Object.keys(imageMap) as Array<keyof typeof imageMap>).map((img) => (
                      <TouchableOpacity key={img} onPress={() => setSelectedImage(img)} style={{ marginRight: 10 }}>
                        <Image
                          source={imageMap[img]}
                          style={[
                            styles.thumb,
                            (customImageUri == null && selectedImage === img) && styles.thumbSelected,
                          ]}
                        />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Card: Location */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Location</Text>

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

                  <View style={{ width: "100%", height: 300, marginTop: 12, borderRadius: 16, overflow: "hidden" }}>
                    <MapView
                      style={{ flex: 1 }}
                      region={region}
                      onRegionChangeComplete={(r) => {
                        setRegion(r);
                        setSelectedLocation({ latitude: r.latitude, longitude: r.longitude });
                        debouncedReverseGeocode(r.latitude, r.longitude);
                      }}
                    />
                    <View style={styles.pinContainer}>
                      <Ionicons name="location-sharp" size={40} color="red" />
                    </View>
                  </View>
                </View>

                {/* Create button */}
                <TouchableOpacity
                  style={[styles.primaryBtn, (!canCreate || creating) && { opacity: 0.7 }]}
                  onPress={handleCreateEvent}
                  disabled={!canCreate || creating}
                  activeOpacity={0.9}
                >
                  {creating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryText}>Create Event</Text>
                  )}
                </TouchableOpacity>

                {/* Spacer for BottomNav */}
                <View style={{ height: 120 }} />
              </ScrollView>

              <BottomNav />
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: BRAND.overlay },

  scrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

  // Header glass
  header: {
    marginTop: 46,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: BRAND.glassBg,
    borderWidth: 1,
    borderColor: BRAND.glassBorder,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  headerTitle: { color: BRAND.textOnDark, fontSize: 18, fontWeight: "800" },

  // Card
  card: {
    marginTop: 14,
    backgroundColor: BRAND.glassBg,
    borderColor: BRAND.glassBorder,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  cardTitle: { color: BRAND.textOnDark, fontWeight: "800", marginBottom: 10, fontSize: 16 },

  // Labels + inputs
  label: { color: "rgba(255,255,255,0.9)", fontWeight: "600", marginBottom: 6 },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: BRAND.inputBg,
    color: "#0F172A",
    fontSize: 16,
  },
  inputText: { color: "#0F172A", fontSize: 16 },
  row2: { flexDirection: "row", marginTop: 8 },

  // Picker wrapper
  pickerWrap: { alignItems: "center", marginTop: 10 },

  // Chips
  chipsRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: BRAND.inputBg,
  },
  chipSelected: { backgroundColor: BRAND.primary },
  chipText: { color: "#0F172A", fontWeight: "700" },
  chipTextSelected: { color: "#fff" },

  // Textarea
  textarea: {
    minHeight: 100,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: BRAND.inputBg,
    color: "#0F172A",
    fontSize: 16,
    textAlignVertical: "top",
  },

  // Upload tile + thumbs
  uploadTile: {
    width: 110,
    alignItems: "center",
    marginRight: 10,
  },
  uploadThumb: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: BRAND.primary,
    marginBottom: 6,
  },
  uploadText: { color: BRAND.textOnDark, fontWeight: "700" },

  thumb: { width: 100, height: 100, borderRadius: 12, marginRight: 10 },
  thumbSelected: { borderWidth: 3, borderColor: BRAND.primary },

  // Search
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

  // Map
  pinContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -20 }, { translateY: -40 }],
    zIndex: 999,
  },

  // Primary button
  primaryBtn: {
    backgroundColor: BRAND.primary,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  primaryText: { color: "#fff", fontSize: 17, fontWeight: "800", letterSpacing: 0.3 },
});
