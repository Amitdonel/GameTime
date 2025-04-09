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
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../app/firebaseConfig";
import DateTimePicker from "@react-native-community/datetimepicker";
import MapView from "react-native-maps";
import Slider from "@react-native-community/slider";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function EditEventScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState<any>({});
  const [datePickerOpen, setDatePickerOpen] = useState(false);

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

  const handleSave = async () => {
    try {
      const ref = doc(db, "events", eventId!);
      await updateDoc(ref, {
        name: eventData.name,
        date: eventData.date,
        gameMethod: eventData.gameMethod,
        maxPlayers: Number(eventData.maxPlayers),
        description: eventData.description,
        location: eventData.location,
        image: eventData.image,
      });
      Alert.alert("Success", "Event updated!");
      router.push(`/EventDetail?eventId=${eventId}`);
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
            onChange={(e, selectedDate) => {
              if (selectedDate) {
                setEventData({ ...eventData, date: selectedDate });
                setDatePickerOpen(false);
              }
            }}
          />
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
      <TouchableOpacity onPress={() => setEventData({ ...eventData, image: "soccer.jpg" })}>
        <Image
          source={require("../assets/images/soccer.jpg")}
          style={[
            styles.thumbnail,
            eventData.image === "soccer.jpg" && styles.selectedThumbnail,
          ]}
        />
      </TouchableOpacity>

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
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingBottom: 150,
    paddingHorizontal: 20,
    backgroundColor: "#f5f5f5",
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
});
