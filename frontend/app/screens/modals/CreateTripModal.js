import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { tripsStyles } from "../../styles/TripsStyles";
import { createTrip } from "../../functions/tripsFunctions";

export default function CreateTripModal({ visible, onClose, onSuccess, userId }) {
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const scrollViewRef = useRef(null);
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTodayString());
  const [budget, setBudget] = useState("");
  const [description, setDescription] = useState("");
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    const todayStr = getTodayString();
    const today = new Date();
    setDestination("");
    setStartDate(todayStr);
    setEndDate(todayStr);
    setTempStartDate(today);
    setTempEndDate(today);
    setBudget("");
    setDescription("");
    setLoading(false);
  };

  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setTempStartDate(selectedDate);
      const year = selectedDate.getFullYear();
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const day = selectedDate.getDate().toString().padStart(2, '0');
      setStartDate(`${year}-${month}-${day}`);
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setTempEndDate(selectedDate);
      const year = selectedDate.getFullYear();
      const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
      const day = selectedDate.getDate().toString().padStart(2, '0');
      setEndDate(`${year}-${month}-${day}`);
    }
  };

  const handleCreate = async () => {
    if (!destination.trim()) {
      Alert.alert("Error", "Please enter a destination");
      return;
    }

    if (!startDate || !endDate) {
      Alert.alert("Error", "Please select start and end dates");
      return;
    }

    if (endDate < startDate) {
      Alert.alert("Error", "End date must be after start date");
      return;
    }

    setLoading(true);
    try {
      const result = await createTrip(
        destination.trim(),
        startDate,
        endDate,
        parseFloat(budget) || 0,
        description.trim()
      );

      if (result.error) {
        Alert.alert("Error", result.error);
      } else {
        resetForm();
        onSuccess();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to create trip");
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <View style={tripsStyles.modalOverlay}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'position'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={{ flex: 1, justifyContent: 'center' }}
      >
        <View style={tripsStyles.modalContent}>
          <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={tripsStyles.modalTitle}>Create New Trip</Text>

            <Text style={tripsStyles.inputLabel}>Destination *</Text>
            <TextInput
              style={tripsStyles.input}
              placeholder="Where are you going?"
              value={destination}
              onChangeText={setDestination}
            />

            <Text style={tripsStyles.inputLabel}>Start Date *</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                style={{
                  backgroundColor: '#f5f5f5',
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 16,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: '#ddd',
                  fontFamily: 'inherit',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
                value={startDate}
                onFocus={() => setStartDate('')}
                onChange={(e) => {
                  const val = e.target.value;
                  setStartDate(val);
                  const [year, month, day] = val.split('-').map(Number);
                  if (year && month && day) {
                    setTempStartDate(new Date(year, month - 1, day));
                  }
                }}
                disabled={loading}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={tripsStyles.input}
                  onPress={() => setShowStartDatePicker(true)}
                  disabled={loading}
                >
                  <Text style={{ fontSize: 16, color: '#333', paddingVertical: 2 }}>
                    {startDate}
                  </Text>
                </TouchableOpacity>

                {showStartDatePicker && (
                  <DateTimePicker
                    value={tempStartDate}
                    mode="date"
                    display="default"
                    onChange={handleStartDateChange}
                  />
                )}
              </>
            )}

            <Text style={tripsStyles.inputLabel}>End Date *</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                style={{
                  backgroundColor: '#f5f5f5',
                  borderRadius: 10,
                  padding: 12,
                  fontSize: 16,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: '#ddd',
                  fontFamily: 'inherit',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
                value={endDate}
                onFocus={() => setEndDate('')}
                onChange={(e) => {
                  const val = e.target.value;
                  setEndDate(val);
                  const [year, month, day] = val.split('-').map(Number);
                  if (year && month && day) {
                    setTempEndDate(new Date(year, month - 1, day));
                  }
                }}
                disabled={loading}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={tripsStyles.input}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Text style={{ fontSize: 16, color: '#333', paddingVertical: 2 }}>
                    {endDate}
                  </Text>
                </TouchableOpacity>

                {showEndDatePicker && (
                  <DateTimePicker
                    value={tempEndDate}
                    mode="date"
                    display="default"
                    onChange={handleEndDateChange}
                  />
                )}
              </>
            )}

            <Text style={tripsStyles.inputLabel}>Budget</Text>
            <TextInput
              style={tripsStyles.input}
              placeholder="0.00"
              value={budget}
              onChangeText={setBudget}
              keyboardType="decimal-pad"
            />

            <Text style={tripsStyles.inputLabel}>Description</Text>
            <TextInput
              style={[tripsStyles.input, tripsStyles.textArea]}
              placeholder="Add notes about your trip..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              onFocus={() => {
                setTimeout(() => {
                  scrollViewRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }}
            />

            <View style={tripsStyles.modalButtons}>
              <TouchableOpacity
                style={[tripsStyles.modalButton, tripsStyles.cancelButton]}
                onPress={() => {
                  resetForm();
                  onClose();
                }}
                disabled={loading}
              >
                <Text style={tripsStyles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[tripsStyles.modalButton, tripsStyles.submitButton, loading && { opacity: 0.5 }]}
                onPress={handleCreate}
                disabled={loading}
              >
                <Text style={tripsStyles.modalButtonText}>
                  {loading ? "Creating..." : "Create"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      {Platform.OS === 'web' ? (
        content
      ) : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          {content}
        </TouchableWithoutFeedback>
      )}
    </Modal>
  );
}
