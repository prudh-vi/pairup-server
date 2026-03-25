import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Flame, Video, MessageCircle, Globe, Sparkles } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Animated } from "react-native";

interface StartScreenProps {
  onStart: () => void;
  isLoading?: boolean;
}

const StartScreen = ({ onStart, isLoading = false }: StartScreenProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, translateY]);

  const features = [
    { icon: Video, label: "HD Video" },
    { icon: MessageCircle, label: "Live Chat" },
    { icon: Globe, label: "Worldwide" },
    { icon: Sparkles, label: "Anonymous" },
  ];

  return (
    <View className="flex-1 bg-background items-center justify-center p-6">
      <Animated.View 
        className="items-center max-w-md w-full"
        style={{ opacity: fadeAnim, transform: [{ translateY }] }}
      >
        {/* Logo */}
        <View className="flex-row items-center gap-3 mb-8">
          <View className="relative">
            <View className="h-16 w-16 rounded-2xl bg-orange-500 items-center justify-center shadow-lg">
              <Flame size={32} color="#fff" />
            </View>
          </View>
          <Text className="text-5xl font-black text-orange-500">PairUp</Text>
        </View>

        {/* Tagline */}
        <Text className="text-xl text-muted-foreground mb-10 text-center">
          Meet new people. Make real connections.
        </Text>

        {/* Features */}
        <View className="flex-row justify-between w-full mb-10 px-4">
          {features.map((feature) => (
            <View key={feature.label} className="items-center gap-2">
              <View className="h-12 w-12 rounded-xl bg-orange-100 items-center justify-center">
                <feature.icon size={20} className="text-primary" stroke="#f97316" />
              </View>
              <Text className="text-xs text-muted-foreground font-medium">{feature.label}</Text>
            </View>
          ))}
        </View>

        {/* Start Button */}
        <TouchableOpacity
          onPress={onStart}
          disabled={isLoading}
          className={`w-full max-w-xs mx-auto py-4 px-8 rounded-2xl bg-orange-500 items-center justify-center flex-row gap-3 shadow-md ${
            isLoading ? "opacity-70" : ""
          }`}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text className="text-white font-bold text-lg">Connecting...</Text>
            </>
          ) : (
            <>
              <Video size={20} color="#ffffff" />
              <Text className="text-white font-bold text-lg">Start Chatting</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Disclaimer */}
        <Text className="mt-8 text-xs text-muted-foreground/60 text-center">
          By using PairUp, you agree to our community guidelines.{"\n"}
          Be respectful and have fun! 🎉
        </Text>
      </Animated.View>
    </View>
  );
};

export default StartScreen;
