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
  const [pastYourEvents, setPastYourEvents] = useState<any[]>([]);
  const [nearbyEvents, setNearbyEvents] = useState<any[]>([]);
  const router = useRouter();
  const user = getAuth().currentUser;

  const haversineDistance = (coord1: any, coord2: any) => {
    const toRad = (value: number) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(coord2.latitude - coord1.latitude);
    const dLon = toRad(coord2.longitude - coord1.longitude);
    const lat1 = toRad(coord1.latitude);
    const lat2 = toRad(coord2.latitude);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setFullName(data.name || "Player");
        if (data.photoUrl) setUserImage({ uri: data.photoUrl });
      }

      const surveyRef = doc(db, "surveys", user.uid);
      const surveySnap = await getDoc(surveyRef);
      if (!surveySnap.exists()) return;
      const { location, playRadius } = surveySnap.data();
      if (!location) return;

      const snapshot = await getDocs(collection(db, "events"));
      const allEvents = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      const now = Date.now();

      const yourUpcoming = allEvents.filter(e => e.createdBy === user.uid && e.date?.seconds * 1000 >= now);
      const yourPast = allEvents.filter(e => e.createdBy === user.uid && e.date?.seconds * 1000 < now);

      const nearby = allEvents.filter(e => {
        const isPast = e.date?.seconds * 1000 < now;
        const isOwned = e.createdBy === user.uid;
        const validLoc = e.location && typeof e.location.latitude === "number";
        if (isPast || !validLoc || isOwned) return false;
        const dist = haversineDistance(location, e.location);
        return dist <= playRadius;
      });

      if (isMounted) {
        setYourEvents(yourUpcoming);
        setPastYourEvents(yourPast);
        setNearbyEvents(nearby);
      }
    };

    fetchData();
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
        onPress={() => router.push({ pathname: "/EventDetail", params: { eventId: item.id } })}
      >
        <Image source={imgSrc} style={styles.eventImage} />
        <Text style={styles.eventTitle}>{item.name}</Text>
        <Text style={styles.eventInfo}>{item.gameMethod} | {confirmed}/{max} players</Text>
        {almostThere && <Text style={styles.almostThere}>ALMOST THERE!</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
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
              <Ionicons name="person" size={24} color="white" style={styles.profileIconOverlay} />
            )}
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Your Upcoming Events</Text>
          <FlatList
            data={yourEvents}
            keyExtractor={item => item.id}
            renderItem={renderEvent}
            scrollEnabled={false}
            ListEmptyComponent={<Text style={styles.noEvents}>No upcoming events found.</Text>}
          />

          <Text style={styles.sectionTitle}>Events Near You</Text>
          <FlatList
            data={nearbyEvents}
            keyExtractor={item => item.id}
            renderItem={renderEvent}
            scrollEnabled={false}
            ListEmptyComponent={<Text style={styles.noEvents}>No nearby events found.</Text>}
          />

          {pastYourEvents.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Your Past Events</Text>
              <FlatList
                data={pastYourEvents}
                keyExtractor={item => item.id}
                renderItem={renderEvent}
                scrollEnabled={false}
              />
            </>
          )}
        </View>
      </ScrollView>

      <BottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  scrollContent: { paddingBottom: 120 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: "#1877F2",
  },
  greeting: { fontSize: 22, fontWeight: "bold", color: "white" },
  content: { paddingHorizontal: 20, paddingTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10, marginTop: 20, color: "#1877F2" },
  noEvents: { fontSize: 14, fontStyle: "italic", color: "#777", marginBottom: 10 },
  eventCard: {
    backgroundColor: "white", borderRadius: 10, marginBottom: 16,
    borderWidth: 1, borderColor: "#ddd", overflow: "hidden",
  },
  eventImage: { width: "100%", height: 160, resizeMode: "cover" },
  eventTitle: { fontSize: 16, fontWeight: "bold", paddingHorizontal: 12, paddingTop: 10 },
  eventInfo: { fontSize: 14, paddingHorizontal: 12, paddingBottom: 4, color: "#333" },
  almostThere: { fontSize: 14, paddingHorizontal: 12, paddingBottom: 10, fontWeight: "bold", color: "#f44336" },
  profileWrapper: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#ddd",
    overflow: "hidden", justifyContent: "center", alignItems: "center",
  },
  profileInnerWrapper: {
    width: 40, height: 40, borderRadius: 20, overflow: "hidden", position: "relative",
  },
  profileIcon: { width: 40, height: 40, borderRadius: 20, resizeMode: "cover", backgroundColor: "#ccc" },
  profileIconOverlay: { position: "absolute", top: 8, left: 8 },
});
