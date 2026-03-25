import "./global.css";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native";
import VideoChatApp from "./src/components/VideoChatApp";
import { useState } from "react";

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <StatusBar style="auto" />
      <VideoChatApp />
    </SafeAreaView>
  );
}
