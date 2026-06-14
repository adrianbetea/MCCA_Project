import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { tripsStyles } from "../../styles/TripsStyles";
import { addItineraryItem } from "../../functions/tripsFunctions";
import { searchPlaces } from "../../functions/googlePlacesFunction";

export default function AddItineraryModal({
  visible,
  onClose,
  onSuccess,
  tripId,
  userId,
  trip,
  placeData = null,
}) {
  const scrollViewRef = useRef(null);
  const [placeName, setPlaceName] = useState("");
  const [dayDate, setDayDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      if (placeData) {
        setPlaceName(placeData.placeName || "");
        setSelectedPlace(placeData);
        setManualEntry(false);
        setSearchQuery("");
        setSearchResults([]);
        setNotes("");
      } else {
        setPlaceName("");
        setSelectedPlace(null);
        setManualEntry(false);
        setSearchQuery("");
        setSearchResults([]);
        setNotes("");
      }
      // Set initial date to trip start date
      if (trip) {
        const startDateStr = trip.startDate.split(/[T ]/)[0];
        const [year, month, day] = startDateStr.split('-').map(Number);
        const startDate = new Date(year, month - 1, day);
        setDayDate(startDate);
      }
      // Set default time to 9:00 AM
      const defaultTime = new Date();
      defaultTime.setHours(9, 0, 0, 0);
      setStartTime(defaultTime);
    }
  }, [visible, placeData, trip]);

  const resetForm = () => {
    setPlaceName("");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedPlace(null);
    setManualEntry(false);
    setNotes("");
    if (trip) {
      const startDateStr = trip.startDate.split(/[T ]/)[0];
      const [year, month, day] = startDateStr.split('-').map(Number);
      const startDate = new Date(year, month - 1, day);
      setDayDate(startDate);
    }
    const defaultTime = new Date();
    defaultTime.setHours(9, 0, 0, 0);
    setStartTime(defaultTime);
    setLoading(false);
  };

  const handleSearch = async (query) => {
    setSearchQuery(query);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const location = trip?.destination || "";
      const results = await searchPlaces(query, location);
      setSearchResults(results || []);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPlace = (place) => {
    setSelectedPlace({
      placeName: place.name,
      placeId: place.place_id,
      placeAddress: place.vicinity || place.formatted_address,
      placePhoto: place.photoUrl,
      placeRating: place.rating,
    });
    setPlaceName(place.name);
    setSearchQuery("");
    setSearchResults([]);
    setManualEntry(false);
  };

  const handleManualEntry = () => {
    setManualEntry(true);
    setSelectedPlace(null);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDayDate(selectedDate);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setStartTime(selectedTime);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleAdd = async () => {
    if (!placeName.trim()) {
      Alert.alert("Error", "Please enter a place name");
      return;
    }

    if (!dayDate) {
      Alert.alert("Error", "Please select a date");
      return;
    }

    if (!startTime) {
      Alert.alert("Error", "Please select a start time");
      return;
    }

    const timeString = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}:00`;

    // Use local date components instead of UTC
    const year = dayDate.getFullYear();
    const month = (dayDate.getMonth() + 1).toString().padStart(2, '0');
    const day = dayDate.getDate().toString().padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const itemData = {
      dayDate: dateString,
      startTime: timeString,
      placeName: placeName.trim(),
      placeId: selectedPlace?.placeId || placeData?.placeId || null,
      placeAddress: selectedPlace?.placeAddress || placeData?.placeAddress || null,
      notes: notes.trim(),
    };

    setLoading(true);
    try {
      const result = await addItineraryItem(tripId, itemData);
      if (result.error) {
        Alert.alert("Error", result.error);
      } else {
        resetForm();
        onSuccess();
      }
    } catch (error) {
      console.error("Error adding activity:", error);
      Alert.alert("Error", "Failed to add activity");
    } finally {
      setLoading(false);
    }
  };

  const formatDateDisplay = (date) => {
    if (!date) return "";
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTripDates = () => {
    if (!trip) return [];

    const dates = [];
    const startDateStr = trip.startDate.split(/[T ]/)[0];
    const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
    const start = new Date(startYear, startMonth - 1, startDay);
    
    const endDateStr = trip.endDate.split(/[T ]/)[0];
    const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);
    const end = new Date(endYear, endMonth - 1, endDay);

    console.log('Trip dates - start:', start, 'end:', end);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    console.log('Generated trip dates:', dates);
    console.log('First date:', dates[0]);
    console.log('Last date:', dates[dates.length - 1]);

    return dates;
  };

  const tripDates = getTripDates();

  const content = (
    <View style={tripsStyles.modalOverlay}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'position'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={{ flex: 1, justifyContent: 'center' }}
      >
        <View style={tripsStyles.modalContent}>
          <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={tripsStyles.modalTitle}>Add Activity</Text>

            {/* Place Name Section */}
            <Text style={tripsStyles.inputLabel}>Place Name *</Text>

            {!manualEntry && !placeData && (
              <>
                <TextInput
                  style={tripsStyles.input}
                  placeholder="Search for a place..."
                  value={searchQuery}
                  onChangeText={handleSearch}
                />

                {searching && (
                  <View style={{ padding: 10, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#886ae6" />
                  </View>
                )}

                {searchResults.length > 0 && (
                  <View style={tripsStyles.searchResultsContainer}>
                    <ScrollView
                      style={{ maxHeight: 200 }}
                      nestedScrollEnabled={true}
                    >
                      {searchResults.map((item, index) => (
                        <TouchableOpacity
                          key={item.place_id || index.toString()}
                          style={tripsStyles.searchResultItem}
                          onPress={() => handleSelectPlace(item)}
                        >
                          <Text style={tripsStyles.searchResultName}>
                            {item.name}
                          </Text>
                          {item.vicinity && (
                            <Text style={tripsStyles.searchResultAddress}>
                              {item.vicinity}
                            </Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <TouchableOpacity
                  style={tripsStyles.manualEntryButton}
                  onPress={handleManualEntry}
                >
                  <Text style={tripsStyles.manualEntryText}>
                    Or enter manually
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {(manualEntry || selectedPlace || placeData) && (
              <TextInput
                style={tripsStyles.input}
                placeholder="Enter place or activity name"
                value={placeName}
                onChangeText={setPlaceName}
                editable={manualEntry || !placeData}
              />
            )}

            {/* Time Picker */}
            <Text style={tripsStyles.inputLabel}>Start Time *</Text>
            {Platform.OS === 'web' ? (
              <input
                type="time"
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
                value={startTime ? `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}` : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  const [hours, minutes] = val.split(':').map(Number);
                  if (!isNaN(hours) && !isNaN(minutes)) {
                    const newTime = new Date();
                    newTime.setHours(hours, minutes, 0, 0);
                    setStartTime(newTime);
                  } else {
                    setStartTime(null);
                  }
                }}
                disabled={loading}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={tripsStyles.input}
                  onPress={() => setShowTimePicker(true)}
                  disabled={loading}
                >
                  <Text style={{ fontSize: 16, color: '#333', paddingVertical: 2 }}>
                    {formatTime(startTime)}
                  </Text>
                </TouchableOpacity>

                {showTimePicker && (
                  <DateTimePicker
                    value={startTime}
                    mode="time"
                    is24Hour={false}
                    display="default"
                    onChange={handleTimeChange}
                  />
                )}
              </>
            )}

            {/* Day Picker */}
            <Text style={tripsStyles.inputLabel}>Select Day *</Text>
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
                value={dayDate ? `${dayDate.getFullYear()}-${(dayDate.getMonth() + 1).toString().padStart(2, '0')}-${dayDate.getDate().toString().padStart(2, '0')}` : ""}
                onFocus={() => setDayDate(null)}
                onChange={(e) => {
                  const val = e.target.value;
                  const [year, month, day] = val.split('-').map(Number);
                  if (year && month && day) {
                    setDayDate(new Date(year, month - 1, day));
                  } else {
                    setDayDate(null);
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
                    {formatDateDisplay(dayDate)}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={dayDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                  />
                )}
              </>
            )}

            <Text style={tripsStyles.inputLabel}>Notes</Text>
            <TextInput
              style={[tripsStyles.input, tripsStyles.textArea]}
              placeholder="Add any notes or details..."
              value={notes}
              onChangeText={setNotes}
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
