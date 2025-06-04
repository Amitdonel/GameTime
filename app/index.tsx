import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Text,
  Image,
  Easing,
  ImageBackground,
  Dimensions,
} from "react-native";
import { Redirect } from "expo-router";

const soccerBall = require("../assets/images/soccer-ball.png");
const background = require("../assets/images/soccer.jpg");

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function Index() {
  const [redirectNow, setRedirectNow] = useState(false);

  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
    ]).start();

    setTimeout(() => {
      Animated.timing(translateY, {
        toValue: -SCREEN_HEIGHT * 0.3, // Move up to match Login screen header
        duration: 700,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => setRedirectNow(true), 400);
      });
    }, 2300);
  }, []);

  if (redirectNow) return <Redirect href="/Login" />;

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <ImageBackground source={background} style={styles.background}>
      <Animated.View
        style={[
          styles.header,
          {
            opacity,
            transform: [{ scale }, { translateY }],
          },
        ]}
      >
        <Text style={styles.title}>GameTime</Text>
        <Animated.Image
          source={soccerBall}
          style={[styles.logo, { transform: [{ rotate }] }]}
        />
      </Animated.View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
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
});
