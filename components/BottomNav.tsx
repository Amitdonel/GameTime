import React, { useEffect, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  LayoutChangeEvent,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useRouter, usePathname, Href } from "expo-router";

import { BlurView } from "expo-blur";

const BRAND_PRIMARY = "#1877F2";                 // your blue
const ICON_INACTIVE = "rgba(255,255,255,0.85)";  // inactive icon tint
const NAV_HEIGHT = 86;                            // total nav height
const SIDE_MARGIN = 16;                           // horizontal inset
const BUBBLE_W = 68;                              // bubble width
const BUBBLE_H = 48;                              // bubble height

const TABS = [
  { key: "home",    icon: "home",          route: "/Home" as Href },
  { key: "plus",    icon: "add-circle",    route: "/Plus" as Href },
  { key: "search",  icon: "search",        route: "/Search" as Href },
  { key: "events",  icon: "people",        route: "/MyEvents" as Href },
  { key: "profile", icon: "person-circle", route: "/Profile" as Href },
] as const satisfies ReadonlyArray<{ key: string; icon: string; route: Href }>;


export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  const [width, setWidth] = useState(0);
  const itemW = width > 0 ? width / TABS.length : 0;

  // figure out which tab is active from the current route
  const activeIndex = Math.max(
    0,
    TABS.findIndex((t) => (pathname || "").startsWith(String(t.route)))
  );

  // Animated values
  const x = useRef(new Animated.Value(0)).current;      // bubble X
  const scale = useRef(new Animated.Value(1)).current;  // press feedback

  useEffect(() => {
    // target X so that the bubble is centered under the active item
    const target =
      (activeIndex < 0 ? 0 : activeIndex * itemW) + (itemW - BUBBLE_W) / 2;

    Animated.spring(x, {
      toValue: isFinite(target) ? target : 0,
      useNativeDriver: true,
      stiffness: 220,
      damping: 22,
      mass: 0.8,
    }).start();
  }, [activeIndex, itemW]);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 1.08,
      useNativeDriver: true,
      stiffness: 300,
      damping: 20,
    }).start();

  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      stiffness: 260,
      damping: 20,
    }).start();

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={styles.host} onLayout={onLayout}>
        {/* Glass background */}
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.glassBorder} />

        {/* Liquid bubble indicator */}
        <Animated.View
          style={[
            styles.bubble,
            {
              width: BUBBLE_W,
              height: BUBBLE_H,
              transform: [{ translateX: x }, { scale }],
            },
          ]}
          pointerEvents="none"
        >
          {/* subtle highlight + shade to fake "liquid" depth */}
          <View style={styles.bubbleHighlight} />
          <View style={styles.bubbleShade} />
        </Animated.View>

        {/* Tabs row */}
        <View style={styles.row}>
          {TABS.map((t, i) => {
            const focused = i === activeIndex;
            return (
              <TouchableOpacity
                key={t.key}
                style={styles.item}
                onPressIn={pressIn}
                onPressOut={pressOut}
                onPress={() => router.push(t.route)}
                activeOpacity={0.9}
              >
                <Ionicons
                  name={t.icon as any}
                  size={28}
                  color={focused ? BRAND_PRIMARY : ICON_INACTIVE}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: SIDE_MARGIN,
    right: SIDE_MARGIN,
    bottom: Platform.OS === "ios" ? 24 : 16,
    height: NAV_HEIGHT,
    borderRadius: 26,
    overflow: "hidden",
    justifyContent: "center",
    // floating shadow
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 18,
  },
  glassBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
    paddingHorizontal: 6,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2, // above the moving bubble
  },
  bubble: {
    position: "absolute",
    left: 0,
    bottom: 18,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    zIndex: 1,
  },
  bubbleHighlight: {
    position: "absolute",
    top: 4,
    left: 10,
    right: 10,
    height: 10,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.35)",
    opacity: 0.6,
  },
  bubbleShade: {
    position: "absolute",
    bottom: 4,
    left: 8,
    right: 8,
    height: 8,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.14)",
    opacity: 0.45,
  },
});
