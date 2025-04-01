import Ionicons from "react-native-vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../app/firebaseConfig";


import React from "react";
import {
  Text,
  View,
  Image,
  TouchableOpacity,
  StyleSheet
} from "react-native";
import { useRouter } from "expo-router";





export default function HomeScreen() {
  // Temporary user info (Replace with actual user data)
  const userImage = { uri: "https://via.placeholder.com/100" }; // Placeholder online image

  const [fullName, setFullName] = useState("Player");
  const router = useRouter();

  useEffect(() => {
    const fetchUserName = async () => {
      const user = getAuth().currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFullName(data.name); // 👈 make sure "name" is saved during sign-up
        }
      }
    };

    fetchUserName();
  }, []);

  return (
    <View style={styles.container}>

      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {fullName}</Text>
        <TouchableOpacity onPress={() => router.push("/Profile")} style={styles.profileWrapper}>
          <Image source={userImage} style={styles.profileIcon} />
          <Ionicons name="person" size={24} color="white" style={styles.profileIconOverlay} />
        </TouchableOpacity>
      </View>

      {/* Main Content (Placeholders for Future Features) */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Your Upcoming Events</Text>
        {/* TODO: Add event cards here */}

        <Text style={styles.sectionTitle}>Events Near You</Text>
        {/* TODO: Add map/list of nearby events */}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        {/* Home Icon */}
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/Home")}>
          <Ionicons name="home" size={35} color="#1877F2" />
        </TouchableOpacity>

        {/* Plus Icon (Already Implemented) */}
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/Plus")}>
          <Ionicons name="add-circle" size={35} color="#1877F2" />
        </TouchableOpacity>

         {/* Search Icon */}
         <TouchableOpacity style={styles.navItem} onPress={() => router.push("/Search")}>
          <Ionicons name="search" size={35} color="#000001" />
        </TouchableOpacity>

        {/* My Groups Icon */}
        <TouchableOpacity style={styles.navItem} onPress={() => router.push("/MyGroups")}>
          <Ionicons name="people" size={35} color="#1877F2" />
        </TouchableOpacity>

        {/* Settings Icon */}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#1877F2", // Blue header
    paddingTop: 60, // Moves the header down (Adjust as needed)
  },
  greeting: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 10,
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
  navText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1877F2",
  },
  profileWrapper: {
    position: "relative",
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ddd",
  },
  profileIconOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -12 }, { translateY: -12 }], // Centers the icon
  },
});