import { auth } from "../functions/lib/firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  Image,
  StyleSheet,
  Alert
} from "react-native";

// Import background & logo
const soccerImage = require("../assets/images/soccer.jpg");
const soccerBall = require("../assets/images/soccer-ball.png"); // Soccer ball logo


export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter(); // ✅ Fix navigation issue

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter your email and password.");
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log("User logged in!");
      router.push("/Home"); // Redirect to Home
    } catch (error: any) {
      Alert.alert("Login Failed", error.message);
    }
  };

  return (
    <ImageBackground source={soccerImage} style={styles.background}>
      <View style={styles.overlay}>

        {/* Title & Logo */}
        <View style={styles.header}>
          <Text style={styles.title}>GameTime</Text>
          <Image source={soccerBall} style={styles.logo} />
        </View>

        {/* Input Fields */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#aaa"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#aaa"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {/* Login Button */}
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>Log in</Text>
          </TouchableOpacity>

          {/* Forgot Password */}
          <TouchableOpacity onPress={() => router.push("/ForgotPassword")}>
            <Text style={styles.forgotPassword}>Forgot password?</Text>
          </TouchableOpacity>
        </View>


        {/* Full-Width Boxed Sign-Up Option */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.signupButtonBox} onPress={() => router.push("/SignUp")}>
            <Text style={styles.signupButtonText}>Create new account</Text>
          </TouchableOpacity>
        </View>

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
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 20,
    paddingVertical: 50,
  },
  header: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    flexDirection: "row",
  },
  title: {
    fontSize: 50,
    fontWeight: "bold",
    color: "white",
    marginRight: 15,
  },
  logo: {
    width: 60,
    height: 60,
  },
  inputContainer: {
    flex: 2,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  input: {
    width: "90%",
    padding: 15,
    marginVertical: 10,
    backgroundColor: "white",
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  loginButton: {
    backgroundColor: "#1877F2",
    paddingVertical: 15,
    borderRadius: 10,
    width: "90%",
    alignItems: "center",
    marginTop: 10,
  },
  loginButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  forgotPassword: {
    marginTop: 15,
    color: "white",
    fontSize: 14,
  },
  footer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
    paddingBottom: 30,
  },
  signupButtonBox: {
    borderWidth: 1,
    borderColor: "white",
    paddingVertical: 15,
    borderRadius: 10,
    width: "90%",
    alignItems: "center",
  },
  signupButtonText: {
    color: "white",
    fontSize: 16,
  },
});