import { db } from "../app/firebaseConfig"; // Adjust path if needed
import { getAuth } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import { useRouter } from "expo-router";
import {
    Text,
    View,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ImageBackground,
    Alert
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Slider from "@react-native-community/slider";

// Import the background image (same as Login page)
const backgroundImage = require("../assets/images/soccer.jpg");

export default function SurveyScreen() {
    const router = useRouter();

    // State for selected answers
    const [positions, setPositions] = useState<string[]>([]);
    const [skillLevel, setSkillLevel] = useState("");
    const [stamina, setStamina] = useState("");
    const [fieldType, setFieldType] = useState("");
    const [playFrequency, setPlayFrequency] = useState("");
    const [dob, setDob] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [tempDob, setTempDob] = useState(new Date()); // Temp value before confirmation
    const [playRadius, setPlayRadius] = useState(10);

    // Toggle selection for multi-choice question
    const togglePosition = (role: string) => {
        setPositions((prevPositions) =>
            prevPositions.includes(role)
                ? prevPositions.filter((item) => item !== role)
                : [...prevPositions, role]
        );
    };

    const handleSubmit = async () => {
        if (positions.length === 0 || !skillLevel || !stamina || !fieldType || !playFrequency || !playRadius) {
          Alert.alert("Incomplete Form", "Please answer all questions before submitting.");
          return;
        }
      
        const user = getAuth().currentUser;
      
        if (!user) {
          Alert.alert("Error", "User not authenticated");
          return;
        }
      
        try {
          // Write the survey data to Firestore under the user's UID
          await setDoc(doc(db, "surveys", user.uid), {
            positions,
            skillLevel,
            stamina,
            fieldType,
            playFrequency,
            playRadius,
            dob: dob.toISOString(),
          });
      
          Alert.alert("Success", "Survey submitted successfully!", [
            { text: "OK", onPress: () => router.push("/Login") },
          ]);
        } catch (error: any) {
          Alert.alert("Error", error.message || "An error occurred while saving survey.");
        }
      };


    return (
        <ImageBackground source={backgroundImage} style={styles.background}>
            <ScrollView contentContainerStyle={styles.container}>

                {/* Back Button Positioned to the Left of "Player Survey" */}
                <View style={styles.headerContainer}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.push("/SignUp")}>
                        <Text style={styles.backArrow}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Player Survey</Text>
                </View>

                {/* Question 6: Date of Birth */}
                <View style={styles.questionBox}>
                    <Text style={styles.question}>What is your Date of Birth?</Text>
                </View>
                <TouchableOpacity style={styles.datePicker} onPress={() => setShowDatePicker(true)}>
                    <Text style={styles.optionText}>{dob.toDateString()}</Text>
                </TouchableOpacity>

                {/* Date Picker Modal */}
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

                {/* Question: Preferred Match Search Radius */}
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
                        onValueChange={(value) => setPlayRadius(value)}
                        minimumTrackTintColor="#1877F2"
                        maximumTrackTintColor="#ddd"
                        thumbTintColor="#1877F2"
                    />
                </View>


                {/* Question 1: Multi-Choice Position Selection */}
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

                {/* Question 2: Skill Level */}
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

                {/* Question 3: Stamina */}
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

                {/* Question 4: Field Type */}
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

                {/* Question 5: Play Frequency */}
                <View style={styles.questionBox}>
                    <Text style={styles.question}>How often do you play football?</Text>
                </View>
                {["Rarely (Only in video games)", "Occasionally (Once or twice a month)", "Regularly (Weekly or more)", "Frequently (Multiple times per week)"].map((freq) => (
                    <TouchableOpacity
                        key={freq}
                        style={[styles.option, playFrequency === freq && styles.selectedOption]}
                        onPress={() => setPlayFrequency(freq)}
                    >
                        <Text style={styles.optionText}>{freq}</Text>
                    </TouchableOpacity>
                ))}

                {/* Submit Button */}
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
        flexGrow: 1, // ✅ Ensures scrolling works properly
        paddingBottom: 80, // ✅ Extra space so Submit button isn't cut off
        alignItems: "center",
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: "white",
        marginTop: 70, // ✅ Prevents title from being cut off
        marginBottom: 20,
        textAlign: "center",
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
        color: "#333",  // 🔥 Fix: Added optionText style
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
    headerContainer: {
        flexDirection: "row",
        alignItems: "center",
        width: "90%",
        marginTop: 50, // Ensures it's fully visible
        marginBottom: 20,
      },
      backButton: {
        marginRight: 50, // Adds spacing between arrow & title
      },
      backArrow: {
        marginTop: -40,
        marginLeft: -20,
        fontSize: 30,
        color: "white",
        fontWeight: "bold",
      },
});
