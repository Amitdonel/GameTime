import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function ProfileScreen() {
  const router = useRouter();

  // Anonymous placeholder image
  const anonymousImage = { uri: "https://via.placeholder.com/100" };

  return (
    <View style={styles.container}>
      {/* Profile Avatar */}
      <View style={styles.avatarWrapper}>
        <Image source={anonymousImage} style={styles.avatar} />
        <Ionicons
          name="person"
          size={24}
          color="white"
          style={styles.avatarOverlay}
        />
      </View>

      {/* User Info */}
      <Text style={styles.title}>Anonymous Player</Text>

      {/* TODO: Add image upload here later */}
      <Text style={styles.todo}>TODO: Add profile image upload</Text>

      {/* Edit Survey Button */}
      <TouchableOpacity
        style={styles.editSurveyButton}
        onPress={() =>
          router.push({ pathname: "/Survey", params: { from: "profile" } })
        }
      >
        <Text style={styles.editSurveyText}>Edit My Survey</Text>
      </TouchableOpacity>

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
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    paddingTop: 80,
  },
  avatarWrapper: {
    position: "relative",
    width: 100,
    height: 100,
    marginBottom: 15,
    overflow: "hidden",
    borderRadius: 50,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ddd",
    resizeMode: "cover",
  },
  avatarOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -12 }, { translateY: -12 }],
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
  },
  todo: {
    color: "#888",
    fontStyle: "italic",
    marginBottom: 30,
  },
  editSurveyButton: {
    backgroundColor: "#1877F2",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginBottom: 40,
  },
  editSurveyText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingVertical: 30,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    position: "absolute",
    bottom: 0,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
});
