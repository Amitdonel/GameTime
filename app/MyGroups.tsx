import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function MyGroupsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>My Groups Screen (Coming Soon)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  text: {
    fontSize: 18,
    fontWeight: "bold",
  },
});
