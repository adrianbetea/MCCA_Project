import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { tripsStyles } from "../../styles/TripsStyles";
import { getItineraryItems } from "../../functions/tripsFunctions";

export default function PublicItineraryModal({ visible, onClose, trip }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && trip?.tripId) {
      fetchItinerary();
    }
  }, [visible, trip]);

  const fetchItinerary = async () => {
    setLoading(true);
    try {
      const result = await getItineraryItems(trip.tripId);
      if (result.error) {
        if (Platform.OS === 'web') {
          alert(`Error: ${result.error}`);
        } else {
          Alert.alert("Error", result.error);
        }
      } else {
        setItems(result.items || []);
      }
    } catch (error) {
      console.error("Error fetching public itinerary:", error);
      if (Platform.OS === 'web') {
        alert("Error: Failed to fetch itinerary items");
      } else {
        Alert.alert("Error", "Failed to fetch itinerary items");
      }
    } finally {
      setLoading(false);
    }
  };

  const groupItemsByDay = () => {
    const grouped = {};
    items.forEach((item) => {
      const dateKey = item.dayDate;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(item);
    });

    // Sort items within each day by startTime
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => {
        if (a.startTime && b.startTime) {
          return a.startTime.localeCompare(b.startTime);
        }
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return 0;
      });
    });

    return grouped;
  };

  const formatDate = (dateString) => {
    const dateStr = dateString.split(/[T ]/)[0];
    const [year, month, day] = dateStr.split("-");
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
  };

  const formatTime = (timeString) => {
    if (!timeString) return null;
    const [hours, minutes] = timeString.split(":");
    return `${hours}:${minutes}`;
  };

  const groupedItems = groupItemsByDay();
  const sortedDates = Object.keys(groupedItems).sort();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={tripsStyles.modalOverlay}>
        <View style={[tripsStyles.modalContent, { maxHeight: "80%", height: "80%" }]}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 15,
            }}
          >
            <View>
              <Text style={tripsStyles.modalTitle}>
                📋 Shared Itinerary
              </Text>
              <Text style={{ fontSize: 13, color: "#666", marginTop: 2 }}>
                Trip to {trip?.destination} by @{trip?.username || "traveler"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 5 }}>
              <Text style={{ fontSize: 24, color: "#666", fontWeight: "bold" }}>×</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <ActivityIndicator size="large" color="#886ae6" />
              <Text style={{ marginTop: 10, color: "#666" }}>Loading itinerary...</Text>
            </View>
          ) : items.length === 0 ? (
            <View
              style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingHorizontal: 20,
              }}
            >
              <Text style={{ fontSize: 16, color: "#999", textAlign: "center" }}>
                No activities planned in this shared itinerary.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
              {sortedDates.map((date) => (
                <View key={date} style={tripsStyles.daySection}>
                  <Text style={tripsStyles.dayHeader}>{formatDate(date)}</Text>

                  {groupedItems[date].map((item) => (
                    <View key={item.itemId} style={[tripsStyles.itineraryItem, { paddingRight: 15 }]}>
                      <View style={{ flex: 1 }}>
                        {item.startTime && (
                          <Text
                            style={{
                              fontSize: 13,
                              color: "#886ae6",
                              fontWeight: "bold",
                              marginBottom: 6,
                            }}
                          >
                            {formatTime(item.startTime)}
                          </Text>
                        )}
                        <Text style={tripsStyles.itineraryItemName}>
                          {item.placeName}
                        </Text>
                        {item.placeAddress ? (
                          <Text style={tripsStyles.itineraryItemAddress}>
                            📍 {item.placeAddress}
                          </Text>
                        ) : null}
                        {item.notes ? (
                          <Text
                            style={[
                              tripsStyles.itineraryItemAddress,
                              { color: "#475569", fontStyle: "italic", marginTop: 4 },
                            ]}
                          >
                            {item.notes}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          )}

          <TouchableOpacity
            style={[tripsStyles.addItineraryButton, { marginTop: 15 }]}
            onPress={onClose}
          >
            <Text style={tripsStyles.addItineraryButtonText}>Close View</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
