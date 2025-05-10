import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "react-native-vector-icons/Ionicons";
import { getAuth, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../functions/lib/firebaseConfig";
import BottomNav from "../components/BottomNav";

export default function ProfileScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState("Loading...");
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
      router.push("/Login"); // Redirect to login page
    } catch (error) {
      console.error("Error signing out: ", error);
      Alert.alert("Error", "Could not sign out. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      {/* Profile Avatar */}
      <View style={styles.avatarWrapper}>
        <Image source={anonymousImage} style={styles.avatar} />
        <View style={styles.overlayCenter}>
          <Ionicons name="person" size={44} color="white" />
        </View>
      </View>
      <Text style={styles.title}>{userName}</Text>


      {/* Edit Survey Button */}
      <TouchableOpacity
        style={styles.editSurveyButton}
        onPress={() => router.push({ pathname: "/Survey", params: { from: "Profile" } })}
      >
        <Text style={styles.editSurveyText}>Edit My Survey</Text>
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <BottomNav />
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
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
    backgroundColor: "#ddd",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  avatar: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  overlayCenter: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
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
  logoutButton: {
    backgroundColor: "#dc3545",
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginBottom: 40,
  },
  logoutText: {
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
