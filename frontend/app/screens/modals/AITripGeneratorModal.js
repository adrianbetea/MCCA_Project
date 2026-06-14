import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { tripsStyles } from "../../styles/TripsStyles";
import { generateCompleteTrip } from "../../functions/tripsFunctions";

export default function AITripGeneratorModal({
  visible,
  onClose,
  onSuccess,
}) {
  const scrollViewRef = useRef(null);
  const [message, setMessage] = useState("");
  const [conversation, setConversation] = useState([
    {
      role: "assistant",
      content: "Hi! I'm your AI travel assistant. Tell me where you want to go and I'll create a complete trip for you!\n\nExample: 'I want to go to Prague for 4 days, I have a budget of 1000 euro, from 20 December 2025'"
    }
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (conversation.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [conversation]);

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userMessage = { role: "user", content: message };
    const newConversation = [...conversation, userMessage];
    setConversation(newConversation);
    setMessage("");
    setLoading(true);

    // Extract conversation history as context for AI
    const conversationText = newConversation
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    try {
      // Call backend to generate trip with conversation context
      const result = await generateCompleteTrip(conversationText);

      if (result.error) {
        // If error, show as AI response (could be asking for more info)
        setConversation([
          ...newConversation,
          { role: "assistant", content: result.error }
        ]);
      } else if (result.advice) {
        // AI is giving advice, not creating trip yet
        setConversation([
          ...newConversation,
          { role: "assistant", content: result.advice }
        ]);
      } else {
        // Trip was created successfully!
        if (Platform.OS === 'web') {
          alert(
            `Success! 🎉\n\nTrip "${result.destination}" created with ${result.addedActivities} activities!\n\n📅 ${result.trip.startDate} to ${result.trip.endDate}\n💰 Estimated cost: ${result.totalEstimatedCost} RON\n\nTips:\n${result.tips?.slice(0, 2).join('\n\n')}`
          );
          onSuccess();
          onClose();
        } else {
          Alert.alert(
            "Success! 🎉",
            `Trip "${result.destination}" created with ${result.addedActivities} activities!\n\n📅 ${result.trip.startDate} to ${result.trip.endDate}\n💰 Estimated cost: ${result.totalEstimatedCost} RON\n\n${result.tips?.slice(0, 2).join('\n\n')}`,
            [
              {
                text: "View Trip",
                onPress: () => {
                  onSuccess();
                  onClose();
                }
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error("AI error:", error);
      Alert.alert("Error", "Failed to communicate with AI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={tripsStyles.modalOverlay}>
          <View style={[tripsStyles.modalContent, { maxHeight: '80%', height: '80%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={tripsStyles.modalTitle}>🤖 AI Trip Planner</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={{ fontSize: 24, color: '#666' }}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={scrollViewRef}
              style={{ flex: 1, marginBottom: 15 }}
              showsVerticalScrollIndicator={false}
            >
              {conversation.map((msg, idx) => (
                <View
                  key={idx}
                  style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    backgroundColor: msg.role === 'user' ? '#886ae6' : '#f0f0f0',
                    padding: 12,
                    borderRadius: 12,
                    marginBottom: 10,
                    maxWidth: '85%',
                  }}
                >
                  <Text style={{ 
                    color: msg.role === 'user' ? '#fff' : '#333',
                    fontSize: 14,
                    lineHeight: 20
                  }}>
                    {msg.content}
                  </Text>
                </View>
              ))}
              
              {loading && (
                <View style={{ alignItems: 'center', padding: 10 }}>
                  <ActivityIndicator size="large" color="#886ae6" />
                  <Text style={{ marginTop: 5, color: '#666', fontSize: 12 }}>
                    AI is working...
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={{ borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: '#ddd',
                    borderRadius: 20,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    fontSize: 14
                  }}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Describe your trip..."
                  multiline
                  maxLength={500}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={sendMessage}
                  disabled={loading || !message.trim()}
                  style={{
                    backgroundColor: (!loading && message.trim()) ? '#886ae6' : '#ccc',
                    borderRadius: 20,
                    paddingHorizontal: 20,
                    justifyContent: 'center',
                    minWidth: 60,
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                    Send
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
