import React from "react";
import { View, Text, StyleSheet } from "react-native";
import BottomNav from "../components/BottomNav"; // adjust path if needed

export default function SearchScreen() {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.text}>Search Screen (Coming Soon)</Text>
      </View>
      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
    backgroundColor: "#f5f5f5",
  },
  text: {
    fontSize: 22,
    fontWeight: "bold",
  },
});
