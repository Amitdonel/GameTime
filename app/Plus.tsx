import React, { useState, useEffect } from "react";
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


export default function PlusScreen() {
  const router = useRouter();
  const imageMap: Record<"soccer.jpg" | "soccer1.jpg" | "soccer2.jpg" | "soccer3.jpg", any> = {
    "soccer.jpg": require("../assets/images/soccer.jpg"),
    "soccer1.jpg": require("../assets/images/soccer1.jpg"),
    "soccer2.jpg": require("../assets/images/soccer2.jpg"),
    "soccer3.jpg": require("../assets/images/soccer3.jpg"),
  };

  const [eventName, setEventName] = useState("");
  const [customImageUri, setCustomImageUri] = useState<string | null>(null);
  const [eventDate, setEventDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [eventTime, setEventTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
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
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [gameMethod, setGameMethod] = useState("Match Making");
  const [description, setDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState("soccer.jpg");

  const [searchQuery, setSearchQuery] = useState("");
  type Suggestion = { display_name: string; lat: string; lon: string };
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

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

  const handleSelectSuggestion = (place: { display_name: any; lat: any; lon: any; }) => {
    const newLat = parseFloat(place.lat);
    const newLon = parseFloat(place.lon);
    setRegion({
      latitude: newLat,
      longitude: newLon,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    setSelectedLocation({ latitude: newLat, longitude: newLon });
    setSearchQuery(place.display_name);
    setSuggestions([]);
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Using default location (Tel Aviv)");
        return;
      }
      const currentLocation = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = currentLocation.coords;
      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(newRegion);
      setSelectedLocation({ latitude, longitude });
    })();
  }, []);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
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
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
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


  const handleCreateEvent = async () => {
    if (!eventName) {
      Alert.alert("Incomplete Form", "Please enter event name.");
      return;
    }
    try {
      const combinedDateTime = new Date(eventDate);
      combinedDateTime.setHours(eventTime.getHours());
      combinedDateTime.setMinutes(eventTime.getMinutes());
      combinedDateTime.setSeconds(0);
      await addDoc(collection(db, "events"), {
        name: eventName,
        date: Timestamp.fromDate(combinedDateTime),
        location: selectedLocation,
        createdAt: Timestamp.now(),
        maxPlayers,
        gameMethod,
        description,
        image: customImageUri || selectedImage,
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
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.headerTitle}>Create New Match</Text>

        <View style={styles.section}>
          <TextInput
            style={styles.input}
            placeholder="Event Name:"
            placeholderTextColor="#aaa"
            value={eventName}
            onChangeText={setEventName}
          />
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.inputText}>{eventDate.toDateString()}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={eventDate}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => selectedDate && setEventDate(selectedDate)}
              />
              <TouchableOpacity style={styles.confirmButton} onPress={() => setShowDatePicker(false)}>
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.input} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.inputText}>
              {eventTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </TouchableOpacity>
          {showTimePicker && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={eventTime}
                mode="time"
                display="spinner"
                onChange={(event, selectedTime) => selectedTime && setEventTime(selectedTime)}
              />
              <TouchableOpacity style={styles.confirmButton} onPress={() => setShowTimePicker(false)}>
                <Text style={styles.confirmButtonText}>Confirm Time</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Max Players: {maxPlayers}</Text>
          <Slider
            style={{ width: "100%", height: 40 }}
            minimumValue={1}
            maximumValue={50}
            step={1}
            value={maxPlayers}
            onValueChange={setMaxPlayers}
            minimumTrackTintColor="#1877F2"
            maximumTrackTintColor="#ddd"
            thumbTintColor="#1877F2"
          />

          <Text style={styles.label}>Game Method:</Text>
          <View style={styles.radioContainer}>
            {["Match Making", "Optimization"].map((method) => (
              <TouchableOpacity
                key={method}
                style={[styles.radioButton, gameMethod === method && styles.radioButtonSelected]}
                onPress={() => setGameMethod(method)}
              >
                <Text style={styles.radioText}>{method}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Description:</Text>
          <TextInput
            style={styles.descriptionInput}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            placeholder="Write something about the match..."
            placeholderTextColor="#888"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Choose Image:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
            <View style={{ alignItems: "center",}}>
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

            {(Object.keys(imageMap) as Array<keyof typeof imageMap>).map((img) => (
              <TouchableOpacity key={img} onPress={() => setSelectedImage(img)} style={{ marginRight: 10 }}>
                <Image
                  source={imageMap[img]}
                  style={[styles.thumbnail, selectedImage === img && styles.selectedThumbnail]}
                />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
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
          <Text style={styles.label}>Select Event Location:</Text>
          <View style={{ width: "100%", height: 300, marginVertical: 15 }}>
            <MapView
              style={{ flex: 1 }}
              region={region}
              onRegionChangeComplete={(newRegion) => {
                setRegion(newRegion);
                setSelectedLocation({
                  latitude: newRegion.latitude,
                  longitude: newRegion.longitude,
                });
                reverseGeocode(newRegion.latitude, newRegion.longitude);
              }}
            />
            <View style={styles.pinContainer}>
              <Ionicons name="location-sharp" size={40} color="red" />
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.createButton} onPress={handleCreateEvent}>
          <Text style={styles.createButtonText}>Create Event</Text>
        </TouchableOpacity>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: 120,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1877F2",
    textAlign: "center",
    marginVertical: 30,
    marginTop: 50,
  },
  section: {
    width: "100%",
    marginBottom: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  input: {
    width: "100%",
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  inputText: {
    color: "#333",
    fontSize: 16,
  },
  datePickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    marginBottom: 10,
  },
  confirmButton: {
    backgroundColor: "#1877F2",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  createButton: {
    backgroundColor: "#1877F2",
    padding: 15,
    borderRadius: 10,
    width: "90%",
    alignSelf: "center",
    alignItems: "center",
    marginTop: 20,
  },
  createButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
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
    color: "#000",
    fontWeight: "bold",
  },
  descriptionInput: {
    width: "100%",
    minHeight: 100,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#fff",
    textAlignVertical: "top",
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 10,
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
});
