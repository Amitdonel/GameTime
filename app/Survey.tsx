import { db } from "../functions/lib/firebaseConfig";
import { getAuth } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import MapView, { Circle, Marker } from "react-native-maps";
import * as Location from "expo-location";
import DateTimePicker from "@react-native-community/datetimepicker";
import Slider from "@react-native-community/slider";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ImageBackground,
  Alert,
} from "react-native";

const backgroundImage = require("../assets/images/soccer.jpg");

export default function SurveyScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams();

  const [positions, setPositions] = useState<string[]>([]);
  const [skillLevel, setSkillLevel] = useState("");
  const [stamina, setStamina] = useState("");
  const [fieldType, setFieldType] = useState("");
  const [playFrequency, setPlayFrequency] = useState("");
  const [dob, setDob] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDob, setTempDob] = useState(new Date());
  const [playRadius, setPlayRadius] = useState(10);
  const [location, setLocation] = useState({
    latitude: 32.0853,
    longitude: 34.7818,
  });

  const [region, setRegion] = useState({
    latitude: 32.0853,
    longitude: 34.7818,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Map will use default location (Tel Aviv).");
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = currentLocation.coords;

      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      setLocation({ latitude, longitude });
    })();
  }, []);

  useEffect(() => {
    const fetchSurveyData = async () => {
      const user = getAuth().currentUser;
      if (!user) return;

      const docRef = doc(db, "surveys", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setPositions(data.positions || []);
        setSkillLevel(data.skillLevel || "");
        setStamina(data.stamina || "");
        setFieldType(data.fieldType || "");
        setPlayFrequency(data.playFrequency || "");
        setDob(data.dob ? new Date(data.dob) : new Date());
        setPlayRadius(data.playRadius || 10);
        if (data.location) {
          setLocation(data.location);
          setRegion({
            ...data.location,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      }
    };

    fetchSurveyData();
  }, []);

  const togglePosition = (role: string) => {
    setPositions((prevPositions) =>
      prevPositions.includes(role)
        ? prevPositions.filter((item) => item !== role)
        : [...prevPositions, role]
    );
  };

  const handleSubmit = async () => {
    if (
      positions.length === 0 ||
      !skillLevel ||
      !stamina ||
      !fieldType ||
      !playFrequency ||
      !playRadius
    ) {
      Alert.alert("Incomplete Form", "Please answer all questions before submitting.");
      return;
    }

    const user = getAuth().currentUser;
    if (!user) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    try {
      const docRef = doc(db, "surveys", user.uid);
      const docSnap = await getDoc(docRef);
      const existingData = docSnap.exists() ? docSnap.data() : {};

      let updatedPositionsTemp = existingData.positionsTemp || [...positions];
      const lastPositionPlayed = existingData.lastPositionPlayed || [];

      // Add any newly selected positions to positionsTemp only if not in temp or LPP
      for (const pos of positions) {
        if (
          !updatedPositionsTemp.includes(pos) &&
          !lastPositionPlayed.includes(pos)
        ) {
          updatedPositionsTemp.push(pos);
        }
      }

      const payload = {
        positions, // static preferred positions
        skillLevel,
        stamina,
        fieldType,
        playFrequency,
        playRadius,
        dob: dob.toISOString(),
        location,
        positionsTemp: updatedPositionsTemp,
        lastPositionPlayed,
      };

      await setDoc(docRef, { ...existingData, ...payload });

      Alert.alert("Success", "Survey updated successfully!", [
        {
          text: "OK",
          onPress: () => {
            if (from === "Profile") {
              router.push("/Profile");
            } else {
              router.push("/Login");
            }
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message || "An error occurred while saving survey.");
    }
  };


  return (
    <ImageBackground source={backgroundImage} style={styles.background}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header with Back Button and Title */}
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push(from === "Profile" ? "/Profile" : "/SignUp")}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.title}>Player Survey</Text>
          </View>
        </View>

        {/* Date of Birth */}
        <View style={styles.questionBox}>
          <Text style={styles.question}>What is your Date of Birth?</Text>
        </View>
        <TouchableOpacity style={styles.datePicker} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.optionText}>{dob.toDateString()}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <View style={styles.datePickerContainer}>
            <DateTimePicker
              value={tempDob}
              mode="date"
              display="spinner"
              minimumDate={new Date(1900, 0, 1)}
              maximumDate={new Date()}
              onChange={(event, selectedDate) => {
                if (selectedDate) setTempDob(selectedDate);
              }}
            />
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => {
                setDob(tempDob);
                setShowDatePicker(false);
              }}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Positions */}
        <View style={styles.questionBox}>
          <Text style={styles.question}>Which position would you like to play? (Select multiple)</Text>
        </View>
        {["Goalkeeper", "Defender", "Midfielder", "Attacker"].map((role) => (
          <TouchableOpacity
            key={role}
            style={[styles.option, positions.includes(role) && styles.selectedOption]}
            onPress={() => togglePosition(role)}
          >
            <Text style={styles.optionText}>{role}</Text>
          </TouchableOpacity>
        ))}

        {/* Skill Level */}
        <View style={styles.questionBox}>
          <Text style={styles.question}>What is your skill level (1-5)?</Text>
        </View>
        {["Beginner ⭐", "Average ⭐⭐", "Intermediate ⭐⭐⭐", "Advanced ⭐⭐⭐⭐", "Professional ⭐⭐⭐⭐⭐"].map((level) => (
          <TouchableOpacity
            key={level}
            style={[styles.option, skillLevel === level && styles.selectedOption]}
            onPress={() => setSkillLevel(level)}
          >
            <Text style={styles.optionText}>{level}</Text>
          </TouchableOpacity>
        ))}

        {/* Stamina */}
        <View style={styles.questionBox}>
          <Text style={styles.question}>How would you describe your stamina and athleticism?</Text>
        </View>
        {["Low", "Medium", "High"].map((level) => (
          <TouchableOpacity
            key={level}
            style={[styles.option, stamina === level && styles.selectedOption]}
            onPress={() => setStamina(level)}
          >
            <Text style={styles.optionText}>{level}</Text>
          </TouchableOpacity>
        ))}

        {/* Field Type */}
        <View style={styles.questionBox}>
          <Text style={styles.question}>What type of field do you prefer to play on?</Text>
        </View>
        {["Grass", "Asphalt", "No preference"].map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.option, fieldType === type && styles.selectedOption]}
            onPress={() => setFieldType(type)}
          >
            <Text style={styles.optionText}>{type}</Text>
          </TouchableOpacity>
        ))}

        {/* Play Frequency */}
        <View style={styles.questionBox}>
          <Text style={styles.question}>How often do you play football?</Text>
        </View>
        {[
          "Rarely (Only in video games)",
          "Occasionally (Once or twice a month)",
          "Regularly (Weekly or more)",
          "Frequently (Multiple times per week)",
        ].map((freq) => (
          <TouchableOpacity
            key={freq}
            style={[styles.option, playFrequency === freq && styles.selectedOption]}
            onPress={() => setPlayFrequency(freq)}
          >
            <Text style={styles.optionText}>{freq}</Text>
          </TouchableOpacity>
        ))}

        {/* Location */}
        <View style={styles.questionBox}>
          <Text style={styles.question}>Insert your location</Text>
        </View>

        {location && (
          <View style={{ width: "90%", height: 300, marginVertical: 20 }}>
            <MapView
              style={{ flex: 1 }}
              region={region}
              onRegionChangeComplete={(newRegion) => {
                setRegion(newRegion);
                setLocation({
                  latitude: newRegion.latitude,
                  longitude: newRegion.longitude,
                });
              }}
            >
              <Marker coordinate={region} pinColor="red" />
              {/* 🟢 Add the circle that updates live */}
              <Circle
                center={region}
                radius={playRadius * 1000} // Radius in meters
                strokeColor="rgba(24, 119, 242, 0.8)"
                fillColor="rgba(24, 119, 242, 0.2)"
              />
            </MapView>
          </View>
        )}

        {/* Match Radius */}
        <View style={styles.questionBox}>
          <Text style={styles.question}>Select your preferred match search radius (km)</Text>
        </View>
        <View style={styles.sliderContainer}>
          <Text style={styles.sliderValue}>{playRadius} km</Text>
          <Slider
            style={styles.slider}
            minimumValue={5}
            maximumValue={50}
            step={5}
            value={playRadius}
            onValueChange={(value) => {
              setPlayRadius(value);
              setRegion((prev) => ({
                ...prev,
                latitudeDelta: value / 50,
                longitudeDelta: value / 50,
              }));
            }}
            minimumTrackTintColor="#1877F2"
            maximumTrackTintColor="#ddd"
            thumbTintColor="#1877F2"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>
      </ScrollView>
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
  container: {
    flexGrow: 1,
    paddingBottom: 80,
    alignItems: "center",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    width: "90%",
    marginTop: 50,
    marginBottom: 20,
  },
  backButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  backArrow: {
    fontSize: 30,
    color: "white",
    fontWeight: "bold",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
  },
  questionBox: {
    width: "90%",
    padding: 15,
    backgroundColor: "black",
    borderRadius: 10,
    marginTop: 15,
  },
  question: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  datePicker: {
    width: "90%",
    padding: 15,
    backgroundColor: "white",
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  datePickerContainer: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    width: "90%",
    marginVertical: 10,
  },
  confirmButton: {
    marginTop: 10,
    backgroundColor: "#1877F2",
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: "#1877F2",
    padding: 15,
    borderRadius: 10,
    width: "90%",
    alignItems: "center",
    marginTop: 20,
  },
  submitButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
  option: {
    width: "90%",
    padding: 15,
    backgroundColor: "white",
    borderRadius: 10,
    marginVertical: 5,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  selectedOption: {
    backgroundColor: "#1877F2",
  },
  optionText: {
    fontSize: 16,
    color: "#333",
  },
  sliderContainer: {
    width: "90%",
    alignItems: "center",
    marginVertical: 20,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  sliderValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
  },
});
