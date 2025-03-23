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

export default function PlusScreen() {
  const router = useRouter();
  
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");

  const handleCreateEvent = () => {
    if (!eventName || !eventDate || !eventLocation) {
      Alert.alert("Incomplete Form", "Please fill out all fields.");
      return;
    }

    console.log("Event Created:", { eventName, eventDate, eventLocation });

    Alert.alert("Success", "Event created successfully!", [
      { text: "OK", onPress: () => router.push("/Home") },
    ]);
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
      <TextInput 
        style={styles.input} 
        placeholder="Event Date" 
        placeholderTextColor="#aaa" 
        value={eventDate}
        onChangeText={setEventDate}
      />
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
