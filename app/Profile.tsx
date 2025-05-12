import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "react-native-vector-icons/Ionicons";
import { getAuth, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../functions/lib/firebaseConfig";
import BottomNav from "../components/BottomNav";

export default function ProfileScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState("Player");
  const anonymousImage = { uri: "https://via.placeholder.com/100" };

  useEffect(() => {
    const fetchUserName = async () => {
      const user = getAuth().currentUser;
      if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserName(docSnap.data().name || "Player");
        }
      }
    };
    fetchUserName();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(getAuth());
      router.push("/Login");
    } catch (error) {
      console.error("Error signing out: ", error);
      Alert.alert("Error", "Could not sign out. Please try again.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerBackground}>
          <Image source={anonymousImage} style={styles.avatar} />
        </View>
        <Text style={styles.title}>Hi, {userName}!</Text>
        <Text style={styles.subtitle}>Welcome back to GameTime</Text>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Matches</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>4</Text>
            <Text style={styles.statLabel}>Managed</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionCard}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push({ pathname: "/Survey", params: { from: "Profile" } })}>
            <Ionicons name="create-outline" size={20} color="#1877F2" />
            <Text style={styles.actionText}>Edit Survey</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push("/ForgotPassword")}>
            <Ionicons name="lock-closed-outline" size={20} color="#1877F2" />
            <Text style={styles.actionText}>Change Password</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#dc3545" />
            <Text style={[styles.actionText, { color: "#dc3545" }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 100 },
  headerBackground: {
    backgroundColor: "#1877F2",
    height: 180,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 50,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "white",
    position: "absolute",
    top: 120,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 60,
    color: "#1877F2",
  },
  subtitle: {
    textAlign: "center",
    color: "#555",
    marginBottom: 30,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 30,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1877F2",
  },
  statLabel: {
    fontSize: 14,
    color: "#555",
  },
  actionCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 3,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  actionText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#1877F2",
    fontWeight: "bold",
  },
});
