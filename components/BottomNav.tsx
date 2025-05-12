import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useRouter } from "expo-router";

export default function BottomNav() {
  const router = useRouter();

  return (
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
      <TouchableOpacity style={styles.navItem} onPress={() => router.push("/MyEvents")}>
        <Ionicons name="people" size={35} color="#1877F2" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.navItem} onPress={() => router.push("/Profile")}>
  <Ionicons name="person-circle" size={35} color="#1877F2" />
</TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
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
