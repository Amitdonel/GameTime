import { auth } from "../functions/lib/firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
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
  StatusBar,
  SafeAreaView,
} from "react-native";

// Assets
const soccerImage = require("../assets/images/soccer.jpg");
const soccerBall = require("../assets/images/soccer-ball.png");

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);     // Password show/hide
  const [loading, setLoading] = useState(false);  // Button spinner
  const router = useRouter();

  // Basic email format check
  const isValidEmail = (e: string) => /\S+@\S+\.\S+/.test(e);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter your email and password.");
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push("/Home"); // Make sure app/Home.tsx exists (case-sensitive)
    } catch (error: any) {
      Alert.alert("Login Failed", error.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={soccerImage} style={styles.background} resizeMode="cover">
      <StatusBar barStyle="light-content" />
      {/* Dark overlay for contrast */}
      <View style={styles.overlay} />

      <SafeAreaView style={{ flex: 1, width: "100%" }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.container}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>GameTime</Text>
                <Image source={soccerBall} style={styles.logo} />
                
              </View>

              {/* Glass card */}
              <View style={styles.card}>
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

                {/* Password with show/hide */}
                <View style={styles.field}>
                  <Text style={styles.label}>Password</Text>
                  <View style={{ position: "relative" }}>
                    <TextInput
                      style={styles.input}
                      placeholder="Your password"
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

                {/* Login button */}
                <TouchableOpacity
                  onPress={handleLogin}
                  style={[
                    styles.loginButton,
                    (!email || !password || loading) && { opacity: 0.7 },
                  ]}
                  disabled={!email || !password || loading}
                  activeOpacity={0.9}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.loginButtonText}>Log in</Text>
                  )}
                </TouchableOpacity>

                {/* Forgot password */}
                <TouchableOpacity onPress={() => router.push("/ForgotPassword")}>
                  <Text style={styles.forgotPassword}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {/* Full-width outlined sign-up button */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.signupButtonBox}
                  onPress={() => router.push("/SignUp")}
                  activeOpacity={0.9}
                >
                  <Text style={styles.signupButtonText}>Create new account</Text>
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
  // Background and overlay
  background: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  // Layout
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },

  // Header
  header: {
    marginTop: 10,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: { width: 56, height: 56 },
  title: {
    color: "#fff",
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  // Glass card
  card: {
    width: "100%",
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.10)", // glass effect
    borderColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    // soft shadow
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
  eyeButton: {
    position: "absolute",
    right: 12,
    top: 12,
    padding: 4,
  },
  eyeText: { color: "#4B5563", fontWeight: "700" },

  // Buttons/links
  loginButton: {
    backgroundColor: "#1877F2", // keep your tone; replace if brand color differs
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  forgotPassword: {
    textAlign: "center",
    marginTop: 14,
    color: "#F8FAFC",
    opacity: 0.9,
  },

  // Footer sign-up
  footer: {
    paddingBottom: 24,
    alignItems: "center",
  },
  signupButtonBox: {
    width: "100%",
    borderWidth: 1.2,
    borderColor: "#ffffff",
    borderRadius: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  signupButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
