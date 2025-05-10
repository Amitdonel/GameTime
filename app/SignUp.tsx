import { auth } from "../functions/lib/firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../functions/lib/firebaseConfig"; // adjust if needed
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


// Import images
const soccerImage = require("../assets/images/soccer.jpg");
const soccerBall = require("../assets/images/soccer-ball.png"); // Soccer ball logo

export default function SignUpScreen() {
  const router = useRouter(); // Navigation
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const handleSignUp = async () => {
    if (!email || !password || !name || !username) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }
  
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      // ✅ Save user info in Firestore
      await setDoc(doc(db, "users", user.uid), {
        name,
        username,
        email,
      });
  
      Alert.alert("Success", "Account created successfully!", [
        { text: "OK", onPress: () => router.push("/Survey") },
      ]);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Sign Up Failed", error.message);
      } else {
        Alert.alert("Sign Up Failed", "An unknown error occurred.");
      }
    }
  };


  return (
    <ImageBackground source={soccerImage} style={styles.background}>
      <View style={styles.overlay}>

        {/* Title & Logo */}
        <View style={styles.header}>
          <Text style={styles.title}>Sign Up</Text>
          <Image source={soccerBall} style={styles.logo} />
        </View>

        {/* Input Fields */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#aaa"
            value={name}
            onChangeText={setName}
          />
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
            placeholder="Username"
            placeholderTextColor="#aaa"
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#aaa"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {/* Sign Up Button */}
          <TouchableOpacity style={styles.signupButton} onPress={handleSignUp}>
            <Text style={styles.signupButtonText}>Sign Up</Text>
          </TouchableOpacity>

        </View>

        {/* Full-Width Boxed Login Option */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.loginButtonBox} onPress={() => router.push("/Login")}>
            <Text style={styles.loginButtonText}>Already have an account? Log in</Text>
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
  signupButton: {
    backgroundColor: "#1877F2",
    paddingVertical: 15,
    borderRadius: 10,
    width: "90%",
    alignItems: "center",
    marginTop: 10,
  },
  signupButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },  
  footer: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
    paddingBottom: 30,
  },
  loginButtonBox: {
    borderWidth: 1,
    borderColor: "white",
    paddingVertical: 15,
    borderRadius: 10,
    width: "90%", // Full width like Instagram
    alignItems: "center",
  },
  loginButtonText: {
    color: "white",
    fontSize: 16,
  },
});
