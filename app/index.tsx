import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Text,
  ImageBackground,
  Dimensions,
  Easing,
} from "react-native";
import { Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";

const soccerBall = require("../assets/images/soccer-ball.png");
const background = require("../assets/images/soccer.jpg");

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function Index() {
  const [go, setGo] = useState(false);

  // Animations
  const fadeIn = useRef(new Animated.Value(0)).current;
  const scaleIn = useRef(new Animated.Value(0.92)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(10)).current;
  const flyUp = useRef(new Animated.Value(0)).current;
  // Loader dots
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;
  const d3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // header intro
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(scaleIn, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.timing(titleY, { toValue: 0, duration: 700, delay: 250, useNativeDriver: true }),
      Animated.loop(
        Animated.timing(rotate, {
          toValue: 1,
          duration: 2600,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
    ]).start();

    // loader
    const dotSeq = (v: Animated.Value) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      );
    Animated.stagger(180, [dotSeq(d1), dotSeq(d2), dotSeq(d3)]).start();

    // fly up & redirect
    const t = setTimeout(() => {
      Animated.timing(flyUp, {
        toValue: -SCREEN_HEIGHT * 0.28, // מרים כדי ליישר לוגו עם כותרת בלוגין
        duration: 650,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }).start(() => setTimeout(() => setGo(true), 400));
    }, 2100);

    return () => clearTimeout(t);
  }, []);

  if (go) return <Redirect href="/Login" />; 

  const rotateDeg = rotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <ImageBackground source={background} style={styles.background} resizeMode="cover">
      <StatusBar style="light" />

      {/* Overlay לשיפור ניגודיות (אפשר להחליף לגרדיאנט בהמשך) */}
      <View style={styles.overlay} />

      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: fadeIn,
            transform: [{ scale: scaleIn }, { translateY: flyUp }],
          },
        ]}
      >
        <View style={{ alignItems: "center", flexDirection: "row" }}>
          <Animated.Text style={[styles.title, { transform: [{ translateY: titleY }] }]}>
            GameTime
          </Animated.Text>
          <Animated.Image
            source={soccerBall}
            style={[styles.logo, { transform: [{ rotate: rotateDeg }] }]}
          />
        </View>
        <Text style={styles.subtitle}>Play smarter. Organize faster.</Text>
      </Animated.View>

      {/* Loader */}
      <View style={styles.loaderRow}>
        {[d1, d2, d3].map((v, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              { opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] },
            ]}
          />
        ))}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, justifyContent: "center", alignItems: "center" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)", // אם יש לך צבעי מותג כהים – עדכן כאן
  },
  header: {
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 44,
    color: "#fff",
    fontWeight: "800",
    marginLeft: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
  },
  logo: { width: 60, height: 60 },
  loaderRow: {
    position: "absolute",
    bottom: 60,
    flexDirection: "row",
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#fff",
  },
});
