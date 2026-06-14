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
import { chatWithAI, generateItinerary } from "../../functions/tripsFunctions";

export default function AIGeneratorModal({
    visible,
    onClose,
    onSuccess,
    tripId,
    trip,
}) {
    const scrollViewRef = useRef(null);
    const [message, setMessage] = useState("");
    const [conversation, setConversation] = useState([
        {
            role: "assistant",
            content: "Hello! I'm your AI travel assistant. Tell me about your trip! For example: 'I want to travel to Budapest for 3 days with a budget of 1500 RON'"
        }
    ]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (conversation.length > 0) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [conversation]);

    const showAlert = (title, message) => {
        if (Platform.OS === 'web') {
            alert(`${title}: ${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const sendMessage = async () => {
        if (!message.trim() || loading) return;

        const userMessage = { role: "user", content: message };
        const newConversation = [...conversation, userMessage];
        setConversation(newConversation);
        setMessage("");
        setLoading(true);

        try {
            const result = await chatWithAI(message, conversation);

            if (result.error) {
                showAlert("Error", result.error);
            } else {
                setConversation([
                    ...newConversation,
                    { role: "assistant", content: result.response }
                ]);
            }
        } catch (error) {
            showAlert("Error", "Failed to communicate with AI");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateItinerary = () => {
        if (Platform.OS === 'web') {
            const proceed = window.confirm("Based on our conversation, should I generate the itinerary now?\n\nPlease provide:\n• Destination\n• Number of days\n• Budget (RON)\n• Your interests");
            if (proceed) {
                promptForDetails();
            }
        } else {
            Alert.alert(
                "Generate Itinerary",
                "Based on our conversation, should I generate the itinerary now?\n\nPlease provide:\n• Destination\n• Number of days\n• Budget (RON)\n• Your interests",
                [
                    { text: "Not Yet", style: "cancel" },
                    {
                        text: "Generate",
                        onPress: () => promptForDetails()
                    }
                ]
            );
        }
    };

    const promptForDetails = () => {
        const defaultValue = trip?.destination ? `${trip.destination}, 3, 1500, sightseeing` : "";
        if (Platform.OS === 'web') {
            const input = prompt(
                "Enter details separated by commas:\nDestination, Days, Budget (RON), Interests\nExample: Budapest, 3, 1500, food and culture",
                defaultValue
            );
            if (input !== null) {
                const parts = input.split(',').map(p => p.trim());
                if (parts.length >= 3) {
                    generateFromDetails(parts[0], parts[1], parts[2], parts[3] || "general");
                } else {
                    showAlert("Error", "Please provide all details separated by commas");
                }
            }
        } else if (Platform.OS === 'ios') {
            // iOS native Prompt
            Alert.prompt(
                "Trip Details",
                "Enter: Destination, Days, Budget (RON), Interests\nExample: Budapest, 3, 1500, food and culture",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Generate",
                        onPress: async (input) => {
                            const parts = input.split(',').map(p => p.trim());
                            if (parts.length >= 3) {
                                await generateFromDetails(parts[0], parts[1], parts[2], parts[3] || "general");
                            } else {
                                Alert.alert("Error", "Please provide all details separated by commas");
                            }
                        }
                    }
                ],
                "plain-text",
                defaultValue
            );
        } else {
            // Android/other platforms fallback: use trip details directly or fallback safely
            const dest = trip?.destination || "Prague";
            let days = 3;
            if (trip?.startDate && trip?.endDate) {
                const startStr = trip.startDate.split(/[T ]/)[0];
                const [startYear, startMonth, startDay] = startStr.split('-').map(Number);
                const endStr = trip.endDate.split(/[T ]/)[0];
                const [endYear, endMonth, endDay] = endStr.split('-').map(Number);
                const start = new Date(startYear, startMonth - 1, startDay);
                const end = new Date(endYear, endMonth - 1, endDay);
                days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
            }
            const budget = trip?.budget || 1500;
            const interests = "sightseeing";

            Alert.alert(
                "Generate Itinerary",
                `Generating itinerary for ${dest} (${days} days, budget ${budget} RON)...`,
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Generate", onPress: () => generateFromDetails(dest, days, budget, interests) }
                ]
            );
        }
    };

    const generateFromDetails = async (destination, days, budget, interests) => {
        setGenerating(true);

        try {
            const result = await generateItinerary(
                tripId,
                destination,
                parseInt(days),
                parseFloat(budget),
                interests
            );

            if (result.error) {
                showAlert("Error", result.error);
            } else {
                if (Platform.OS === 'web') {
                    alert(
                        `Success! 🎉\n\nGenerated ${result.addedActivities} activities!\n\nEstimated cost: ${result.totalEstimatedCost} RON\n\nTips:\n${result.tips?.slice(0, 2).join('\n\n')}`
                    );
                    onSuccess();
                    onClose();
                } else {
                    Alert.alert(
                        "Success! 🎉",
                        `Generated ${result.addedActivities} activities!\n\nEstimated cost: ${result.totalEstimatedCost} RON\n\n${result.tips?.slice(0, 2).join('\n\n')}`,
                        [
                            {
                                text: "View Itinerary",
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
            showAlert("Error", "Failed to generate itinerary");
        } finally {
            setGenerating(false);
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
                            <Text style={tripsStyles.modalTitle}>🤖 AI Travel Assistant</Text>
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
                                    <ActivityIndicator size="small" color="#886ae6" />
                                    <Text style={{ marginTop: 5, color: '#666', fontSize: 12 }}>
                                        AI is thinking...
                                    </Text>
                                </View>
                            )}

                            {generating && (
                                <View style={{ alignItems: 'center', padding: 20, backgroundColor: '#f9f9f9', borderRadius: 12, marginTop: 10 }}>
                                    <ActivityIndicator size="large" color="#886ae6" />
                                    <Text style={{ marginTop: 10, color: '#886ae6', fontSize: 14, fontWeight: 'bold' }}>
                                        Generating your itinerary...
                                    </Text>
                                    <Text style={{ marginTop: 5, color: '#666', fontSize: 12, textAlign: 'center' }}>
                                        This may take a few moments
                                    </Text>
                                </View>
                            )}
                        </ScrollView>

                        <View style={{ borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 10 }}>
                            <TouchableOpacity
                                style={{
                                    backgroundColor: '#4CAF50',
                                    padding: 12,
                                    borderRadius: 8,
                                    alignItems: 'center',
                                    marginBottom: 10
                                }}
                                onPress={handleGenerateItinerary}
                                disabled={generating}
                            >
                                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>
                                    ✨ Generate Itinerary
                                </Text>
                            </TouchableOpacity>

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
                                    placeholder="Type your message..."
                                    multiline
                                    maxLength={500}
                                    editable={!loading && !generating}
                                />
                                <TouchableOpacity
                                    onPress={sendMessage}
                                    disabled={loading || generating || !message.trim()}
                                    style={{
                                        backgroundColor: (!loading && !generating && message.trim()) ? '#886ae6' : '#ccc',
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
