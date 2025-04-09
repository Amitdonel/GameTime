import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { db } from "../app/firebaseConfig";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import MapView from "react-native-maps";
import * as Location from "expo-location";
import Ionicons from "react-native-vector-icons/Ionicons";
import BottomNav from "../components/BottomNav";
import Slider from "@react-native-community/slider";
import { getAuth } from "firebase/auth";

export default function PlusScreen() {
  const router = useRouter();

  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
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

  const handleCreateEvent = async () => {
    if (!eventName) {
      Alert.alert("Incomplete Form", "Please enter event name.");
      return;
    }

    try {
      await addDoc(collection(db, "events"), {
        name: eventName,
        date: Timestamp.fromDate(eventDate),
        location: selectedLocation,
        createdAt: Timestamp.now(),
        maxPlayers,
        gameMethod,
        description,
        createdBy: getAuth().currentUser?.uid || null,
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
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.title}>Create New Event</Text>

          <TextInput
            style={styles.input}
            placeholder="Event Name"
            placeholderTextColor="#aaa"
            value={eventName}
            onChangeText={setEventName}
          />

          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text style={{ color: "#000" }}>{eventDate.toDateString()}</Text>
          </TouchableOpacity>

          {showDatePicker && (
            <View style={styles.datePickerContainer}>
              <DateTimePicker
                value={eventDate}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) setEventDate(selectedDate);
                }}
              />
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Max Players */}
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

          {/* Game Method */}
          <Text style={styles.label}>Game Method:</Text>
          <View style={styles.radioContainer}>
            {["Match Making", "Optimization"].map((method) => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.radioButton,
                  gameMethod === method && styles.radioButtonSelected,
                ]}
                onPress={() => setGameMethod(method)}
              >
                <Text style={styles.radioText}>{method}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
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

          {/* Map Section */}
          <Text style={styles.mapLabel}>Select Event Location:</Text>
          <View style={{ width: "100%", height: 300, marginVertical: 15 }}>
            <MapView
              style={{ flex: 1 }}
              region={region}
              onRegionChangeComplete={(newRegion) => {
                if (!newRegion?.latitude || !newRegion?.longitude) return;
                setRegion(newRegion);
                setSelectedLocation({
                  latitude: newRegion.latitude,
                  longitude: newRegion.longitude,
                });
              }}
            />
            <View style={styles.pinContainer}>
              <Ionicons name="location-sharp" size={40} color="red" />
            </View>
          </View>

          <TouchableOpacity style={styles.createButton} onPress={handleCreateEvent}>
            <Text style={styles.createButtonText}>Create Event</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingBottom: 120,
  },
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#1877F2",
  },
  input: {
    width: "100%",
    padding: 15,
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ddd",
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
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  createButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  mapLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    alignSelf: "flex-start",
    marginTop: 10,
  },
  pinContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -20 }, { translateY: -40 }],
    zIndex: 999,
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    alignSelf: "flex-start",
    marginTop: 10,
  },
  radioContainer: {
    flexDirection: "row",
    marginBottom: 10,
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
});
