import React, { useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert 
} from "react-native";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { db } from "../app/firebaseConfig";
import { collection, addDoc, Timestamp } from "firebase/firestore";

export default function PlusScreen() {
  const router = useRouter();
  
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState(new Date()); // Default to today
  const [eventLocation, setEventLocation] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleCreateEvent = async () => {
    if (!eventName || !eventLocation) {
      Alert.alert("Incomplete Form", "Please fill out all fields.");
      return;
    }

    try {
      await addDoc(collection(db, "events"), {
        name: eventName,
        date: Timestamp.fromDate(eventDate),
        location: eventLocation,
        createdAt: Timestamp.now(),
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
    <View style={styles.container}>
      <Text style={styles.title}>Create New Event</Text>

      <TextInput 
        style={styles.input} 
        placeholder="Event Name" 
        placeholderTextColor="#aaa" 
        value={eventName}
        onChangeText={setEventName}
      />

      {/* Date Picker Field */}
      <TouchableOpacity 
        style={styles.input} 
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={{ color: "#000" }}>
          {eventDate.toDateString()}  {/* Show selected date */}
        </Text>
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

      <TextInput 
        style={styles.input} 
        placeholder="Event Location" 
        placeholderTextColor="#aaa" 
        value={eventLocation}
        onChangeText={setEventLocation}
      />

      <TouchableOpacity style={styles.createButton} onPress={handleCreateEvent}>
        <Text style={styles.createButtonText}>Create Event</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
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
});

