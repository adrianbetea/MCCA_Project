import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { tripsStyles } from "../../styles/TripsStyles";
import { deleteItineraryItem, updateItineraryItem } from "../../functions/tripsFunctions";
import AddItineraryModal from "../modals/AddItineraryModal";
import AIGeneratorModal from "../modals/AIGeneratorModal";

export default function ItineraryTab({ tripId, userId, items, trip, onUpdate }) {
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const navigation = useNavigation();

  const groupItemsByDay = () => {
    const grouped = {};
    items.forEach(item => {
      const dateKey = item.dayDate;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(item);
    });

    // Sort items within each day by startTime
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => {
        // If both have startTime, sort by time
        if (a.startTime && b.startTime) {
          return a.startTime.localeCompare(b.startTime);
        }
        // Items without time go to the end
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return 0;
      });
    });

    return grouped;
  };

  const formatDate = (dateString) => {
    const dateStr = dateString.split(/[T ]/)[0]; // Handle both 'T' and space
    const [year, month, day] = dateStr.split('-');
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${monthNames[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
  };

  const formatDateShort = (dateString) => {
    const dateStr = dateString.split(/[T ]/)[0]; // Handle both 'T' and space
    const [year, month, day] = dateStr.split('-');
    
    const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthShort[parseInt(month) - 1]} ${parseInt(day)}, ${year}`;
  };

  const formatTime = (timeString) => {
    if (!timeString) return null;

    // Simply extract HH:MM from the time string (format: HH:MM:SS)
    const [hours, minutes] = timeString.split(':');
    return `${hours}:${minutes}`;
  };

  const handleDeleteItem = (itemId) => {
    Alert.alert(
      "Delete Item",
      "Remove this item from your itinerary?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await deleteItineraryItem(tripId, itemId, userId);
              if (result.error) {
                Alert.alert("Error", result.error);
              } else {
                onUpdate();
              }
            } catch (error) {
              Alert.alert("Error", "Failed to delete item");
            }
          },
        },
      ]
    );
  };

  const handleViewPlace = (item) => {
    if (item.placeId) {
      navigation.navigate("PlaceScreen", {
        place: {
          place_id: item.placeId,
          name: item.placeName,
          vicinity: item.placeAddress
        }
      });
    }
  };

  const groupedItems = groupItemsByDay();
  const sortedDates = Object.keys(groupedItems).sort();

  if (items.length === 0) {
    return (
      <View>
        <View style={tripsStyles.emptyContainer}>
          <Text style={tripsStyles.emptyText}>
            No activities planned yet.{"\n"}Add your first activity!
          </Text>
        </View>

        <TouchableOpacity
          style={tripsStyles.addItineraryButton}
          onPress={() => setAddModalVisible(true)}
        >
          <Text style={tripsStyles.addItineraryButtonText}>
            + Add Activity
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[tripsStyles.addItineraryButton, { backgroundColor: '#4CAF50', marginTop: 10 }]}
          onPress={() => setAiModalVisible(true)}
        >
          <Text style={tripsStyles.addItineraryButtonText}>
            🤖 Generate Itinerary with AI
          </Text>
        </TouchableOpacity>

        <AddItineraryModal
          visible={addModalVisible}
          onClose={() => setAddModalVisible(false)}
          onSuccess={() => {
            setAddModalVisible(false);
            onUpdate();
          }}
          tripId={tripId}
          userId={userId}
          trip={trip}
        />

        <AIGeneratorModal
          visible={aiModalVisible}
          onClose={() => setAiModalVisible(false)}
          onSuccess={() => {
            setAiModalVisible(false);
            onUpdate();
          }}
          tripId={tripId}
          trip={trip}
        />
      </View>
    );
  }

  return (
    <View>
      {sortedDates.map(date => (
        <View key={date} style={tripsStyles.daySection}>
          <Text style={tripsStyles.dayHeader}>{formatDate(date)}</Text>

          {groupedItems[date].map((item, index) => (
            <View key={item.itemId} style={tripsStyles.itineraryItem}>
              <TouchableOpacity
                style={tripsStyles.itineraryItemContent}
                onPress={() => handleViewPlace(item)}
                disabled={!item.placeId}
              >
                {item.startTime && (
                  <Text style={{ fontSize: 13, color: '#886ae6', fontWeight: 'bold', marginBottom: 6 }}>
                    {formatTime(item.startTime)}
                  </Text>
                )}
                <Text style={tripsStyles.itineraryItemName}>
                  {item.placeName}
                </Text>
                {item.placeAddress ? (
                  <Text style={tripsStyles.itineraryItemAddress}>
                    {item.placeAddress}
                  </Text>
                ) : null}
                {item.notes ? (
                  <Text style={tripsStyles.itineraryItemAddress}>
                    {item.notes}
                  </Text>
                ) : null}
                {item.placeId && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
                    <Text style={{ fontSize: 12, color: '#886ae6', fontWeight: '500' }}>Tap for details</Text>
                    <Text style={{ fontSize: 18, color: '#886ae6' }}>›</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={tripsStyles.itineraryItemActions}>
                <TouchableOpacity
                  style={tripsStyles.actionButton}
                  onPress={() => handleDeleteItem(item.itemId)}
                >
                  <Text style={{ fontSize: 18, color: '#f44336' }}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ))}

      <TouchableOpacity
        style={tripsStyles.addItineraryButton}
        onPress={() => setAddModalVisible(true)}
      >
        <Text style={tripsStyles.addItineraryButtonText}>+ Add Activity</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[tripsStyles.addItineraryButton, { backgroundColor: '#4CAF50', marginTop: 10 }]}
        onPress={() => setAiModalVisible(true)}
      >
        <Text style={tripsStyles.addItineraryButtonText}>🤖 Generate Itinerary with AI</Text>
      </TouchableOpacity>

      <AddItineraryModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onSuccess={() => {
          setAddModalVisible(false);
          onUpdate();
        }}
        tripId={tripId}
        userId={userId}
        trip={trip}
      />

      <AIGeneratorModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        onSuccess={() => {
          setAiModalVisible(false);
          onUpdate();
        }}
        tripId={tripId}
        trip={trip}
      />
    </View>
  );
}
