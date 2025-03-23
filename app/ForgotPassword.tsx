import { useState } from "react";
import { useRouter } from "expo-router";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
} from "react-native";

// Import background image (same as Login page)
const soccerImage = require("../assets/images/soccer.jpg");

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  const handleReset = () => {
    console.log("Password reset requested for:", email);
    // TODO: Implement password reset logic with database
    alert("Password reset instructions sent to " + email);
  };

  return (
    <ImageBackground source={soccerImage} style={styles.background}>
      <View style={styles.overlay}>
        <Text style={styles.title}>Forgot Password</Text>
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
          />
          
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>Send Reset Instructions</Text>
          </TouchableOpacity>
        </View>

        {/* Back to Login */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.push("/Login")}>
          <Text style={styles.backButtonText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 20,
  },
  inputContainer: {
    width: "90%",
    alignItems: "center",
  },
  input: {
    width: "100%",
    padding: 15,
    marginVertical: 10,
    backgroundColor: "white",
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  resetButton: {
    backgroundColor: "#1877F2",
    paddingVertical: 15,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  resetButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  backButton: {
    marginTop: 20,
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    textDecorationLine: "underline",
  },
});
