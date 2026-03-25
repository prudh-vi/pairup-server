import { useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { Send, MessageCircle } from "lucide-react-native";

interface Message {
  sender: string;
  message: string;
}

interface ChatPanelProps {
  messages: Message[];
  currentUserId?: string;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  isConnected: boolean;
}

const ChatPanel = ({
  messages,
  currentUserId,
  inputValue,
  onInputChange,
  onSend,
  isConnected,
}: ChatPanelProps) => {
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.sender === currentUserId;
    return (
      <View className={`flex-row mb-3 ${isMe ? "justify-end" : "justify-start"}`}>
        <View
          style={{ maxWidth: '80%' }}
          className={`px-4 py-2.5 rounded-2xl ${
            isMe
              ? "bg-orange-500 rounded-br-sm"
              : "bg-gray-100 rounded-bl-sm"
          }`}
        >
          <Text className={`text-sm ${isMe ? "text-white" : "text-gray-900"}`}>
            {item.message}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      {/* Header */}
      <View className="flex-row items-center gap-3 p-4 border-b border-gray-100">
        <View className="rounded-full bg-orange-100 p-2">
          <MessageCircle size={20} color="#f97316" />
        </View>
        <View className="flex-1">
          <Text className="font-semibold text-gray-900">Chat</Text>
          <Text className="text-xs text-gray-500">
            {isConnected ? "Connected with stranger" : "Waiting for connection..."}
          </Text>
        </View>
      </View>

      {/* Messages */}
      <View className="flex-1 p-4">
        {messages.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <MessageCircle size={40} color="#d1d5db" className="mb-3" />
            <Text className="text-sm text-gray-500 font-medium">No messages yet</Text>
            <Text className="text-xs text-gray-400 mt-1">Say hi to your new friend! 👋</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(_, index) => index.toString()}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 10 }}
          />
        )}
      </View>

      {/* Input */}
      <View className="p-4 border-t border-gray-100 bg-white">
        <View className="flex-row items-center gap-2">
          <TextInput
            value={inputValue}
            onChangeText={onInputChange}
            placeholder={isConnected ? "Type a message..." : "Connect to start chatting"}
            placeholderTextColor="#9ca3af"
            editable={isConnected}
            className={`flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-900 border border-gray-100 ${
              !isConnected ? "opacity-50" : ""
            }`}
            onSubmitEditing={onSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            onPress={onSend}
            disabled={!isConnected || !inputValue.trim()}
            className={`h-12 w-12 rounded-xl bg-orange-500 items-center justify-center ${
              !isConnected || !inputValue.trim() ? "opacity-50" : ""
            }`}
          >
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default ChatPanel;
