import React, { useState } from "react";
import { useRouter } from "expo-router";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../functions/lib/firebaseConfig";

// Background image
const soccerImage = require("../assets/images/soccer.jpg");

// Simple email validator
const isValidEmail = (e: string) => /\S+@\S+\.\S+/.test(e);

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleReset = async () => {
    const e = email.trim();
    if (!e) {
      setErr("Please enter your email address.");
      return;
    }
    if (!isValidEmail(e)) {
      setErr("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      setErr(null);
      await sendPasswordResetEmail(auth, e);
      Alert.alert(
        "Reset Email Sent",
        "Check your inbox for password reset instructions.",
        [{ text: "OK", onPress: () => router.replace("/Login") }]
      );
    } catch (error: any) {
      const msg =
        error?.code === "auth/user-not-found"
          ? "No account found with that email."
          : error?.message || "Something went wrong.";
      setErr(msg);
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={soccerImage} style={styles.bg} resizeMode="cover">
      <StatusBar style="light" />
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
                <Text style={styles.title}>Forgot Password</Text>
                <Text style={styles.subtitle}>
                  Enter your email and we’ll send reset instructions.
                </Text>
              </View>

              {/* Glass card */}
              <View style={styles.card}>
                {err ? <Text style={styles.error}>{err}</Text> : null}

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
                    returnKeyType="send"
                    onSubmitEditing={handleReset}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, (!email || loading) && { opacity: 0.7 }]}
                  onPress={handleReset}
                  disabled={loading}
                  activeOpacity={0.9}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryText}>Send Reset Instructions</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Back link */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.outlineBtn}
                  onPress={() => router.push("/Login")}
                  activeOpacity={0.9}
                >
                  <Text style={styles.outlineText}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const BRAND = {
  primary: "#1877F2",
  glassBg: "rgba(255,255,255,0.10)",
  glassBorder: "rgba(255,255,255,0.25)",
  inputBg: "rgba(255,255,255,0.95)",
  textOnDark: "#ffffff",
};

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },

  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "space-between",
  },

  // Header
  header: { alignItems: "center", marginTop: 10 },
  title: { color: BRAND.textOnDark, fontSize: 32, fontWeight: "800", letterSpacing: 0.4 },
  subtitle: {
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    marginTop: 6,
  },

  // Glass card
  card: {
    width: "100%",
    backgroundColor: BRAND.glassBg,
    borderColor: BRAND.glassBorder,
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 6,
  },

  // Field
  field: { marginBottom: 12 },
  label: { color: "rgba(255,255,255,0.9)", marginBottom: 6, fontWeight: "600" },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: BRAND.inputBg,
    color: "#0F172A",
    fontSize: 16,
  },

  // Buttons
  primaryBtn: {
    backgroundColor: BRAND.primary,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  primaryText: { color: "#fff", fontSize: 17, fontWeight: "800", letterSpacing: 0.3 },

  // Error
  error: {
    color: "#FEE2E2",
    backgroundColor: "rgba(239,68,68,0.25)",
    padding: 8,
    borderRadius: 10,
    marginBottom: 10,
  },

  // Footer
  footer: { alignItems: "center", paddingBottom: 24 },
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
