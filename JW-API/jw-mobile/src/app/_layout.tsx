import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";

import { AudioPlayerProvider } from "@/lib/audio-player";

const mobileTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#070809",
    card: "#12151b",
    primary: "#f36b21",
    text: "#f4eee5",
    border: "rgba(255,255,255,0.08)",
    notification: "#f36b21",
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={mobileTheme}>
      <AudioPlayerProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#070809" },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="radio" />
          <Stack.Screen name="playlists" />
          <Stack.Screen name="song/[id]" />
        </Stack>
      </AudioPlayerProvider>
    </ThemeProvider>
  );
}
