import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../functions/lib/firebaseConfig";
import DateTimePicker from "@react-native-community/datetimepicker";
import MapView from "react-native-maps";
import Slider from "@react-native-community/slider";
import Ionicons from "react-native-vector-icons/Ionicons";
import BottomNav from "../components/BottomNav";
import axios from "axios";
import * as ImagePicker from "expo-image-picker";


export default function EditEventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  const imageMap: { [key: string]: any } = {
    "soccer.jpg": require("../assets/images/soccer.jpg"),
    "soccer1.jpg": require("../assets/images/soccer1.jpg"),
    "soccer2.jpg": require("../assets/images/soccer2.jpg"),
    "soccer3.jpg": require("../assets/images/soccer3.jpg"),
  };

  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState<any>({});
  const [customImageUri, setCustomImageUri] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);

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
      console.error("Reverse geocoding failed:", err);
    }
  };

  const handleSelectSuggestion = (place: any) => {
    const newLat = parseFloat(place.lat);
    const newLon = parseFloat(place.lon);
    setEventData({
      ...eventData,
      location: { latitude: newLat, longitude: newLon },
    });
    setSearchQuery(place.display_name);
    setSuggestions([]);
  };

  useEffect(() => {
    if (!eventId) return;
    const fetchEvent = async () => {
      try {
        const ref = doc(db, "events", eventId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setEventData({
            ...data,
            date: data.date.toDate?.() || new Date(),
            image: data.image || "soccer.jpg",
            location: data.location || {
              latitude: 32.08,
              longitude: 34.78,
            },
          });

          if (data.image && typeof data.image === "string" && data.image.startsWith("http")) {
            setCustomImageUri(data.image);
          }

        } else {
          Alert.alert("Event not found");
          router.back();
        }
      } catch (err) {
        console.error(err);
        Alert.alert("Error loading event");
        router.back();
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "We need access to your gallery.");
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
      Alert.alert("Permission required", "We need access to your camera.");
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


  const handleSave = async () => {
    try {
      const ref = doc(db, "events", eventId!);

      const imageToSave = customImageUri || eventData.image || "https://via.placeholder.com/100";

      if (!imageToSave) {
        Alert.alert("Missing image", "Please select or upload an image.");
        return;
      }

      await updateDoc(ref, {
        name: eventData.name,
        date: Timestamp.fromDate(new Date(eventData.date)),
        gameMethod: eventData.gameMethod,
        maxPlayers: Number(eventData.maxPlayers),
        description: eventData.description,
        location: eventData.location,
        image: imageToSave,
      });

      Alert.alert("Success", "Event updated!");
      router.push({ pathname: "/EventDetail", params: { eventId } });
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Could not save event.");
    }
  };




  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Edit Event</Text>

        <TextInput
          style={styles.input}
          placeholder="Event Name"
          value={eventData.name}
          onChangeText={(text) => setEventData({ ...eventData, name: text })}
        />

        <TouchableOpacity
          style={styles.input}
          onPress={() => setDatePickerOpen(true)}
        >
          <Text>{eventData.date.toDateString()}</Text>
        </TouchableOpacity>

        {datePickerOpen && (
          <View style={styles.datePickerContainer}>
            <DateTimePicker
              value={eventData.date}
              mode="date"
              display="spinner"
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  const updated = new Date(eventData.date);
                  updated.setFullYear(selectedDate.getFullYear());
                  updated.setMonth(selectedDate.getMonth());
                  updated.setDate(selectedDate.getDate());
                  setEventData({ ...eventData, date: updated });
                }
              }}
            />
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => setDatePickerOpen(false)}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowTimePicker(true)}
        >
          <Text>{eventData.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </TouchableOpacity>

        {showTimePicker && (
          <View style={styles.datePickerContainer}>
            <DateTimePicker
              value={eventData.date}
              mode="time"
              display="spinner"
              onChange={(event, selectedTime) => {
                if (selectedTime) {
                  const updated = new Date(eventData.date);
                  updated.setHours(selectedTime.getHours());
                  updated.setMinutes(selectedTime.getMinutes());
                  setEventData({ ...eventData, date: updated });
                }
              }}
            />
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={styles.confirmButtonText}>Confirm Time</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.label}>Max Players: {eventData.maxPlayers}</Text>
        <Slider
          style={{ width: "100%", height: 40 }}
          minimumValue={1}
          maximumValue={50}
          step={1}
          value={eventData.maxPlayers}
          onValueChange={(val) => setEventData({ ...eventData, maxPlayers: val })}
          minimumTrackTintColor="#1877F2"
          maximumTrackTintColor="#ddd"
          thumbTintColor="#1877F2"
        />

        <Text style={styles.label}>Game Method:</Text>
        <View style={styles.radioContainer}>
          {["Match Making", "Optimization"].map((method) => (
            <TouchableOpacity
              key={method}
              style={[
                styles.radioButton,
                eventData.gameMethod === method && styles.radioButtonSelected,
              ]}
              onPress={() => setEventData({ ...eventData, gameMethod: method })}
            >
              <Text
                style={[
                  styles.radioText,
                  eventData.gameMethod === method && { color: "#fff" },
                ]}
              >
                {method}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Description:</Text>
        <TextInput
          style={styles.textarea}
          multiline
          value={eventData.description}
          onChangeText={(text) =>
            setEventData({ ...eventData, description: text })
          }
        />

        <Text style={styles.label}>Choose Image:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
          <View style={{ alignItems: "center", marginBottom: 10 }}>
            <TouchableOpacity onPress={openImageOptions}>
              <Image
                source={
                  customImageUri
                    ? { uri: customImageUri }
                    : { uri: "https://via.placeholder.com/100" }
                }
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: "#1877F2",
                  marginBottom: 5,
                }}
              />
              <Text style={{ color: "#1877F2" }}>Upload Custom Image</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row" }}>
            {["soccer.jpg", "soccer1.jpg", "soccer2.jpg", "soccer3.jpg"].map((img) => (
              <TouchableOpacity
                key={img}
                onPress={() => {
                  setCustomImageUri(null);
                  setEventData({ ...eventData, image: img });
                }}

                style={{ marginRight: 10 }}
              >
                <Image
                  source={imageMap[img]}
                  style={[
                    styles.thumbnail,
                    eventData.image === img && styles.selectedThumbnail,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.label}>Insert Address:</Text>
        <TextInput
          style={styles.input}
          placeholder="Search for address..."
          value={searchQuery}
          onChangeText={handleAddressChange}
        />
        {suggestions.length > 0 && (
          <View style={{ backgroundColor: "white", borderColor: "#ddd", borderWidth: 1, borderRadius: 8, maxHeight: 150 }}>
            {suggestions.map((place, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleSelectSuggestion(place)}
                style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: "#eee" }}
              >
                <Text>{place.display_name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.label}>Event Location:</Text>
        <View style={{ width: "100%", height: 300, marginVertical: 15 }}>
          <MapView
            style={{ flex: 1 }}
            region={{
              latitude: eventData.location.latitude,
              longitude: eventData.location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onRegionChangeComplete={(newRegion) => {
              setEventData({
                ...eventData,
                location: {
                  latitude: newRegion.latitude,
                  longitude: newRegion.longitude,
                },
              });
              reverseGeocode(newRegion.latitude, newRegion.longitude);
            }}
          />
          <View style={styles.pinContainer}>
            <Ionicons name="location-sharp" size={40} color="red" />
          </View>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomNav />
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingBottom: 150,
    paddingHorizontal: 20,
    backgroundColor: "#f5f5f5",
  },
  datePickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#1877F2",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 14,
    marginBottom: 10,
  },
  label: {
    fontWeight: "600",
    fontSize: 16,
    marginTop: 10,
  },
  radioContainer: {
    flexDirection: "row",
    marginVertical: 10,
  },
  radioButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    marginRight: 10,
  },
  radioButtonSelected: {
    backgroundColor: "#1877F2",
    borderColor: "#1877F2",
  },
  radioText: {
    fontWeight: "bold",
    color: "#000",
  },
  textarea: {
    minHeight: 80,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    textAlignVertical: "top",
  },
  saveButton: {
    backgroundColor: "#1877F2",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginVertical: 10,
  },
  selectedThumbnail: {
    borderWidth: 3,
    borderColor: "#1877F2",
  },
  pinContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -20 }, { translateY: -40 }],
    zIndex: 999,
  },
  confirmButton: {
    backgroundColor: "#1877F2",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
