import Ionicons from "react-native-vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../app/firebaseConfig";
import BottomNav from "../components/BottomNav";

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
  const [userImage, setUserImage] = useState({ uri: "https://via.placeholder.com/100" });
  const [fullName, setFullName] = useState("Player");
  const [profileReady, setProfileReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const fetchUserData = async () => {
      const user = getAuth().currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists() && isMounted) {
          const data = docSnap.data();
          setFullName(data.name || "Player");

          if (data.photoUrl && data.photoUrl.length > 5 && data.photoUrl !== userImage.uri) {
            setUserImage({ uri: data.photoUrl });
          }
        }
      }
    };

    fetchUserData();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {fullName}</Text>
        <TouchableOpacity onPress={() => router.push("/Profile")} style={styles.profileWrapper}>
          <View style={styles.profileInnerWrapper}>
            <Image
              source={userImage}
              style={styles.profileIcon}
              onLoad={() => setProfileReady(true)}
              onError={() => setProfileReady(true)}
            />
            {profileReady && (
              <Ionicons
                name="person"
                size={24}
                color="white"
                style={styles.profileIconOverlay}
              />
            )}
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Your Upcoming Events</Text>
        <Text style={styles.sectionTitle}>Events Near You</Text>
      </View>
      <BottomNav />
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#1877F2",
    minHeight: 120,
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
    flex: 1,
  },
  navText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1877F2",
  },
  profileWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#ddd",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  profileInnerWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: "cover",
    backgroundColor: "#ccc",
  },
  profileIconOverlay: {
    position: "absolute",
    top: 8,
    left: 8,
  },
});