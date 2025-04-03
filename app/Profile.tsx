import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Main Content */}
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={styles.text}>Profile Screen</Text>
  
        {/* Edit Survey Button */}
        <TouchableOpacity
          style={styles.editSurveyButton}
          onPress={() =>
            router.push({ pathname: "/Survey", params: { from: "profile" } })
          }
        >
          <Text style={styles.editSurveyText}>Edit My Survey</Text>
        </TouchableOpacity>
      </View>
  
      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/Home")}>
          <Ionicons name="home" size={35} color="#1877F2" />
        </TouchableOpacity>
  
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/Plus")}>
          <Ionicons name="add-circle" size={35} color="#1877F2" />
        </TouchableOpacity>
  
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/Search")}>
          <Ionicons name="search" size={35} color="#000000" />
        </TouchableOpacity>
  
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/MyGroups")}>
          <Ionicons name="people" size={35} color="#1877F2" />
        </TouchableOpacity>
  
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/Settings")}>
          <Ionicons name="settings" size={35} color="#1877F2" />
        </TouchableOpacity>
      </View>
    </View>
  );
}  

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  text: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 30,
  },
  editSurveyButton: {
    backgroundColor: "#1877F2",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  editSurveyText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 30,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1, // Makes icons evenly spaced
  },
});
