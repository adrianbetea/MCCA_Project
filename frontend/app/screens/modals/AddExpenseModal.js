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
import { Picker } from "@react-native-picker/picker";
import { tripsStyles } from "../../styles/TripsStyles";
import { addExpense } from "../../functions/tripsFunctions";

const EXPENSE_CATEGORIES = [
  "Accommodation",
  "Transportation",
  "Food & Dining",
  "Activities",
  "Shopping",
  "Other",
];

export default function AddExpenseModal({
  visible,
  onClose,
  onSuccess,
  tripId,
  userId,
}) {
  const scrollViewRef = useRef(null);
  const [category, setCategory] = useState("Food & Dining");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setCategory("Food & Dining");
    setAmount("");
    setDescription("");
    setExpenseDate(new Date());
    setLoading(false);
  };

  const formatDateDisplay = (date) => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setExpenseDate(selectedDate);
    }
  };

  const handleAdd = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (!expenseDate) {
      Alert.alert("Error", "Please select a date");
      return;
    }

    const expenseData = {
      category,
      amount: parseFloat(amount),
      description: description.trim(),
      expenseDate: formatDateDisplay(expenseDate),
    };

    setLoading(true);
    try {
      const result = await addExpense(tripId, expenseData);
      if (result.error) {
        Alert.alert("Error", result.error);
      } else {
        resetForm();
        onSuccess();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to add expense");
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
            <Text style={tripsStyles.modalTitle}>Add Expense</Text>

            <Text style={tripsStyles.inputLabel}>Category *</Text>
            <View style={tripsStyles.pickerContainer}>
              <Picker
                selectedValue={category}
                onValueChange={(itemValue) => setCategory(itemValue)}
                itemStyle={{ color: '#000000' }}
              >
                {EXPENSE_CATEGORIES.map((cat, index) => (
                  <Picker.Item key={index} label={cat} value={cat} color="#000000" />
                ))}
              </Picker>
            </View>

            <Text style={tripsStyles.inputLabel}>Amount *</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 20, marginRight: 5 }}>$</Text>
              <TextInput
                style={[tripsStyles.input, { flex: 1 }]}
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={tripsStyles.inputLabel}>Date *</Text>
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
                value={formatDateDisplay(expenseDate)}
                onFocus={() => setExpenseDate(null)}
                onChange={(e) => {
                  const val = e.target.value;
                  const [year, month, day] = val.split('-').map(Number);
                  if (year && month && day) {
                    setExpenseDate(new Date(year, month - 1, day));
                  } else {
                    setExpenseDate(null);
                  }
                }}
                disabled={loading}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={tripsStyles.input}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={{ fontSize: 16, color: '#333', paddingVertical: 2 }}>
                    {formatDateDisplay(expenseDate)}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={expenseDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                  />
                )}
              </>
            )}

            <Text style={tripsStyles.inputLabel}>Description</Text>
            <TextInput
              style={tripsStyles.input}
              placeholder="What was this for?"
              value={description}
              onChangeText={setDescription}
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
                onPress={handleAdd}
                disabled={loading}
              >
                <Text style={tripsStyles.modalButtonText}>
                  {loading ? "Adding..." : "Add"}
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
