import { auth } from "../functions/lib/firebaseConfig";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  Image,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../functions/lib/firebaseConfig";
import { StatusBar } from "expo-status-bar"; // use expo StatusBar for `style="light"`

// Assets
const soccerImage = require("../assets/images/soccer.jpg");
const soccerBall = require("../assets/images/soccer-ball.png");

export default function SignUpScreen() {
  const router = useRouter();

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Simple validators
  const isValidEmail = (e: string) => /\S+@\S+\.\S+/.test(e);
  const isValidUsername = (u: string) => /^[a-zA-Z0-9_]{3,16}$/.test(u);
  const isValidPassword = (p: string) => p.length >= 6;

  const handleSignUp = async () => {
    const trimmed = {
      name: name.trim(),
      email: email.trim(),
      username: username.trim().toLowerCase(),
      password,
    };

    if (!trimmed.name || !trimmed.email || !trimmed.username || !trimmed.password) {
      setErr("Please fill in all fields.");
      return;
    }
    if (!isValidEmail(trimmed.email)) {
      setErr("Please enter a valid email address.");
      return;
    }
    if (!isValidUsername(trimmed.username)) {
      setErr("Username must be 3–16 characters (letters, numbers, underscore).");
      return;
    }
    if (!isValidPassword(trimmed.password)) {
      setErr("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      setErr(null);

      const cred = await createUserWithEmailAndPassword(
        auth,
        trimmed.email,
        trimmed.password
      );

      // Optional: set auth display name
      await updateProfile(cred.user, { displayName: trimmed.name });

      // Save user profile in Firestore
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        name: trimmed.name,
        username: trimmed.username,
        email: trimmed.email,
        createdAt: serverTimestamp(),
      });

      Alert.alert("Success", "Account created successfully!");
      router.replace("/Survey"); // go straight to onboarding
    } catch (e: any) {
      const msg =
        e?.code === "auth/email-already-in-use"
          ? "This email is already in use."
          : e?.message || "Sign up failed.";
      setErr(msg);
      Alert.alert("Sign Up Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={soccerImage} style={styles.background} resizeMode="cover">
      <StatusBar style="light" />
      {/* dark overlay for contrast */}
      <View style={styles.overlay} />

      <SafeAreaView style={{ flex: 1, width: "100%" }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Create Account</Text>
                <Image source={soccerBall} style={styles.logo} />
              </View>

              {/* Glass card */}
              <View style={styles.card}>
                {err ? <Text style={styles.error}>{err}</Text> : null}

                {/* Full name */}
                <View style={styles.field}>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Your full name"
                    placeholderTextColor="#9CA3AF"
                    value={name}
                    onChangeText={setName}
                  />
                </View>

                {/* Email */}
                <View style={styles.field}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={email}
                    onChangeText={setEmail}
                  />
                </View>

                {/* Username */}
                <View style={styles.field}>
                  <Text style={styles.label}>Username</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="your_username"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={username}
                    onChangeText={(t) => setUsername(t.replace(/\s/g, ""))}
                  />
                  <Text style={styles.hint}>3–16 chars: letters, numbers, underscore</Text>
                </View>

                {/* Password + toggle */}
                <View style={styles.field}>
                  <Text style={styles.label}>Password</Text>
                  <View style={{ position: "relative" }}>
                    <TextInput
                      style={styles.input}
                      placeholder="Minimum 6 characters"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={secure}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setSecure((s) => !s)}
                      style={styles.eyeButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.eyeText}>{secure ? "Show" : "Hide"}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Sign Up */}
                <TouchableOpacity
                  style={[styles.primaryBtn, (loading || !name || !email || !username || !password) && { opacity: 0.7 }]}
                  onPress={handleSignUp}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Sign Up</Text>}
                </TouchableOpacity>
              </View>

              {/* Footer link */}
              <View style={styles.footer}>
                <TouchableOpacity style={styles.outlineBtn} onPress={() => router.push("/Login")} activeOpacity={0.9}>
                  <Text style={styles.outlineText}>Already have an account? Log in</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  // Background & overlay
  background: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },

  // Layout
  container: { flex: 1, paddingHorizontal: 20, justifyContent: "space-between" },

  // Header
  header: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 },
  logo: { width: 56, height: 56 },
  title: { color: "#fff", fontSize: 36, fontWeight: "800", letterSpacing: 0.4 },

  // Card
  card: {
    width: "100%",
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 6,
  },

  // Inputs
  field: { marginBottom: 14 },
  label: { color: "rgba(255,255,255,0.9)", marginBottom: 6, fontWeight: "600" },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    color: "#0F172A",
    fontSize: 16,
  },
  hint: { color: "rgba(255,255,255,0.8)", marginTop: 6, fontSize: 12 },
  eyeButton: { position: "absolute", right: 12, top: 12, padding: 4 },
  eyeText: { color: "#4B5563", fontWeight: "700" },

  // Error text
  error: { color: "#FEE2E2", backgroundColor: "rgba(239,68,68,0.25)", padding: 8, borderRadius: 10, marginBottom: 10 },

  // Buttons
  primaryBtn: {
    backgroundColor: "#1877F2", // keep your brand tone
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  primaryText: { color: "#fff", fontSize: 17, fontWeight: "800", letterSpacing: 0.3 },

  footer: { paddingBottom: 24, alignItems: "center" },
  outlineBtn: {
    width: "100%",
    borderWidth: 1.2,
    borderColor: "#ffffff",
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  outlineText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
