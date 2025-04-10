import Ionicons from "react-native-vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { doc, getDoc, getDocs, collection } from "firebase/firestore";
import { db } from "../app/firebaseConfig";
import BottomNav from "../components/BottomNav";

import React from "react";
import {
  Text,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";

// ✅ Image map for asset lookup
const imageMap: { [key: string]: any } = {
  "soccer.jpg": require("../assets/images/soccer.jpg"),
  "soccer1.jpg": require("../assets/images/soccer1.jpg"),
  "soccer2.jpg": require("../assets/images/soccer2.jpg"),
  "soccer3.jpg": require("../assets/images/soccer3.jpg"),
};

export default function HomeScreen() {
  const [userImage, setUserImage] = useState({ uri: "https://via.placeholder.com/100" });
  const [fullName, setFullName] = useState("Player");
  const [profileReady, setProfileReady] = useState(false);
  const [yourEvents, setYourEvents] = useState<any[]>([]);
  const [nearbyEvents, setNearbyEvents] = useState<any[]>([]);

  const router = useRouter();
  const user = getAuth().currentUser;

  const haversineDistance = (coord1: { latitude: number; longitude: number }, coord2: { latitude: number; longitude: number }) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(coord2.latitude - coord1.latitude);
    const dLon = toRad(coord2.longitude - coord1.longitude);
    const lat1 = toRad(coord1.latitude);
    const lat2 = toRad(coord2.latitude);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    let isMounted = true;

    const fetchUserData = async () => {
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists() && isMounted) {
        const data = docSnap.data();
        setFullName(data.name || "Player");

        if (data.photoUrl && data.photoUrl.length > 5 && data.photoUrl !== userImage.uri) {
          setUserImage({ uri: data.photoUrl });
        }
      }
    };

    const fetchEvents = async () => {
      if (!user) return;

      const surveyRef = doc(db, "surveys", user.uid);
      const surveySnap = await getDoc(surveyRef);
      if (!surveySnap.exists()) return;

      const surveyData = surveySnap.data();
      const userLocation = surveyData.location;
      const playRadius = surveyData.playRadius;
      if (!userLocation || typeof userLocation.latitude !== "number") return;

      const eventSnap = await getDocs(collection(db, "events"));
      const allEvents = eventSnap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any),
      }));

      const your: any[] = [];
      const nearby: any[] = [];

      allEvents.forEach((event) => {
        const isOwnedByUser = event.createdBy && event.createdBy === user.uid;
        const hasValidLocation = event.location && typeof event.location.latitude === "number";

        if (isOwnedByUser) {
          your.push(event);
        } else if (hasValidLocation) {
          const dist = haversineDistance(userLocation, event.location);
          if (dist <= playRadius) {
            nearby.push(event);
          }
        }
      });

      if (isMounted) {
        setYourEvents(your);
        setNearbyEvents(nearby);
      }
    };

    fetchUserData();
    fetchEvents();

    return () => {
      isMounted = false;
    };
  }, []);

  const renderEvent = ({ item }: { item: any }) => {
    const confirmed = item.players?.length || 0;
    const max = item.maxPlayers || 0;
    const spotsLeft = max - confirmed;
    const almostThere = spotsLeft >= 1 && spotsLeft <= 5;
    const imgSrc = imageMap[item.image] || imageMap["soccer.jpg"];

    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() =>
          router.push({
            pathname: "/EventDetail",
            params: { eventId: item.id },
          })
        }
      >
        <Image source={imgSrc} style={styles.eventImage} />
        <Text style={styles.eventTitle}>{item.name}</Text>
        <Text style={styles.eventInfo}>
          {item.gameMethod} | {confirmed} / {max} players
        </Text>
        {almostThere && (
          <Text style={styles.almostThere}>ALMOST THERE!</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
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

      {/* Scrollable Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Your Upcoming Events</Text>
          {yourEvents.length > 0 ? (
            <FlatList
              data={yourEvents}
              keyExtractor={(item) => item.id}
              renderItem={renderEvent}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.noEvents}>You haven't created any events yet.</Text>
          )}

          <Text style={styles.sectionTitle}>Events Near You</Text>
          {nearbyEvents.length > 0 ? (
            <FlatList
              data={nearbyEvents}
              keyExtractor={(item) => item.id}
              renderItem={renderEvent}
              scrollEnabled={false}
            />
          ) : (
            <Text style={styles.noEvents}>There are no events near you.</Text>
          )}
        </View>
      </ScrollView>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    paddingBottom: 120,
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
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    marginTop: 20,
    color: "#1877F2",
  },
  noEvents: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#777",
    marginBottom: 10,
  },
  eventCard: {
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    overflow: "hidden",
  },
  eventImage: {
    width: "100%",
    height: 160,
    resizeMode: "cover",
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "bold",
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  eventInfo: {
    fontSize: 14,
    paddingHorizontal: 12,
    paddingBottom: 4,
    color: "#333",
  },
  almostThere: {
    fontSize: 14,
    paddingHorizontal: 12,
    paddingBottom: 10,
    fontWeight: "bold",
    color: "#f44336",
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
