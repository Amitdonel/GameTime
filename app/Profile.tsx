import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ImageBackground,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "react-native-vector-icons/Ionicons";
import { getAuth, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../functions/lib/firebaseConfig";
import BottomNav from "../components/BottomNav";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";

// Brand tokens (consistent with the other screens)
const BRAND = {
  primary: "#1877F2",
  textOnDark: "#ffffff",
  overlay: "rgba(0,0,0,0.55)",
  glassBg: "rgba(255,255,255,0.10)",
  glassBorder: "rgba(255,255,255,0.25)",
  inputBg: "rgba(255,255,255,0.95)",
  muted: "rgba(255,255,255,0.85)",
  danger: "#ef4444",
};

const bgImage = require("../assets/images/soccer.jpg");

export default function ProfileScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState("Player");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPhoto, setSavingPhoto] = useState(false);

  // Simple stats
  const [managedCount, setManagedCount] = useState<number>(0);
  const [joinedCount, setJoinedCount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      try {
        const user = getAuth().currentUser;
        if (!user) return;

        // Fetch profile
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() || {};
          setUserName((data.name as string) || "Player");
          if (data.photoURI) setImageUri(String(data.photoURI));
        }

        // Stats: managed (createdBy == me), joined (players array-contains me)
        const managedSnap = await getDocs(
          query(collection(db, "events"), where("createdBy", "==", user.uid))
        );
        setManagedCount(managedSnap.size);

        const joinedSnap = await getDocs(
          query(collection(db, "events"), where("players", "array-contains", user.uid))
        );
        setJoinedCount(joinedSnap.size);
      } catch (e) {
        // keep defaults if anything fails
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(getAuth());
      router.replace("/Login");
    } catch (error) {
      Alert.alert("Error", "Could not sign out. Please try again.");
    }
  };

  // Pickers
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "We need access to your gallery to choose a profile picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.length) {
      await savePhoto(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "We need access to your camera to take a profile picture.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (!result.canceled && result.assets?.length) {
      await savePhoto(result.assets[0].uri);
    }
  };

  const openImageOptions = () => {
    Alert.alert("Profile Picture", "Choose an option", [
      { text: "Camera", onPress: takePhoto },
      { text: "Gallery", onPress: pickImage },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // Save local URI into Firestore profile (note: not uploading to storage here)
  const savePhoto = async (uri: string) => {
    try {
      setSavingPhoto(true);
      const user = getAuth().currentUser;
      if (!user) return;
      await updateDoc(doc(db, "users", user.uid), { photoURI: uri });
      setImageUri(uri);
    } catch {
      Alert.alert("Error", "Could not update profile photo.");
    } finally {
      setSavingPhoto(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#fff" />
        <Text style={{ color: "#fff", marginTop: 8 }}>Loading…</Text>
      </View>
    );
  }

  return (
    <ImageBackground source={bgImage} style={{ flex: 1 }} resizeMode="cover">
      <StatusBar style="light" />
      <View style={styles.overlay} />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header (glass) with avatar */}
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={styles.avatarWrap}>
              <Image
                source={imageUri ? { uri: imageUri } : { uri: "https://via.placeholder.com/100" }}
                style={styles.avatar}
              />
              <TouchableOpacity style={styles.editBadge} onPress={openImageOptions} activeOpacity={0.9}>
                {savingPhoto ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Ionicons name="camera" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
            <View style={{ maxWidth: "70%" }}>
              <Text style={styles.greet}>Hi,</Text>
              <Text style={styles.name} numberOfLines={1}>{userName}</Text>
              <Text style={styles.subtitle} numberOfLines={1}>Welcome back to GameTime</Text>
            </View>
          </View>
        </View>

        {/* Stats chips */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <View style={styles.statIconWrap}><Ionicons name="trophy-outline" size={16} color="#fff" /></View>
            <Text style={styles.statLabel}>Matches</Text>
            <Text style={styles.statValue}>{joinedCount}</Text>
          </View>
          <View style={styles.stat}>
            <View style={styles.statIconWrap}><Ionicons name="people-outline" size={16} color="#fff" /></View>
            <Text style={styles.statLabel}>Managed</Text>
            <Text style={styles.statValue}>{managedCount}</Text>
          </View>
          <View style={styles.stat}>
            <View style={styles.statIconWrap}><Ionicons name="settings-outline" size={16} color="#fff" /></View>
            <Text style={styles.statLabel}>Actions</Text>
            <Text style={styles.statValue}>3</Text>
          </View>
        </View>

        {/* Actions (glass card) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick actions</Text>

          <TouchableOpacity
            style={styles.rowAction}
            onPress={() => router.push({ pathname: "/Survey", params: { from: "Profile" } })}
            activeOpacity={0.9}
          >
            <View style={styles.rowLeft}>
              <View style={styles.rowIcon}><Ionicons name="create-outline" size={18} color="#111827" /></View>
              <Text style={styles.rowText}>Edit Survey</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowAction}
            onPress={() => router.push("/ForgotPassword")}
            activeOpacity={0.9}
          >
            <View style={styles.rowLeft}>
              <View style={styles.rowIcon}><Ionicons name="lock-closed-outline" size={18} color="#111827" /></View>
              <Text style={styles.rowText}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rowAction, { borderBottomWidth: 0 }]}
            onPress={handleLogout}
            activeOpacity={0.9}
          >
            <View style={styles.rowLeft}>
              <View style={[styles.rowIcon, { backgroundColor: "rgba(239,68,68,0.15)" }]}>
                <Ionicons name="log-out-outline" size={18} color={BRAND.danger} />
              </View>
              <Text style={[styles.rowText, { color: BRAND.danger }]}>Logout</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Spacer for BottomNav */}
        <View style={{ height: 120 }} />
      </ScrollView>

      <BottomNav />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: BRAND.overlay },
  scrollContent: { paddingHorizontal: 16, paddingTop: 46, paddingBottom: 24 },

  // Header glass
  header: {
    backgroundColor: BRAND.glassBg,
    borderWidth: 1,
    borderColor: BRAND.glassBorder,
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    // soft shadow
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  greet: { color: BRAND.muted, fontSize: 12, marginBottom: 2 },
  name: { color: BRAND.textOnDark, fontSize: 22, fontWeight: "800", letterSpacing: 0.2 },
  subtitle: { color: BRAND.muted, fontSize: 12 },

  // Avatar
  avatarWrap: { position: "relative" },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  editBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: BRAND.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  
  // Stats chips
  statsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  stat: {
    flex: 1,
    backgroundColor: BRAND.glassBg,
    borderColor: BRAND.glassBorder,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  statIconWrap: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    padding: 6,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  statLabel: { color: BRAND.muted, fontSize: 12 },
  statValue: { color: BRAND.textOnDark, fontWeight: "800", fontSize: 18 },

  // Actions card
  card: {
    marginTop: 14,
    backgroundColor: BRAND.glassBg,
    borderColor: BRAND.glassBorder,
    borderWidth: 1,
    borderRadius: 20,
    padding: 10,
    // shadow
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  cardTitle: {
    color: BRAND.textOnDark,
    fontWeight: "800",
    fontSize: 16,
    paddingHorizontal: 6,
    paddingTop: 6,
    paddingBottom: 10,
  },
  rowAction: {
    paddingVertical: 14,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.15)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowIcon: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 999,
    padding: 8,
  },
  rowText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
