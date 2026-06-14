import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import * as SecureStore from "../functions/secureStore";
import { tripsStyles } from "../styles/TripsStyles";
import {
  getTripById,
  deleteTrip,
  getItineraryItems,
  getExpenses,
} from "../functions/tripsFunctions";
import OverviewTab from "./tripTabs/OverviewTab";
import ItineraryTab from "./tripTabs/ItineraryTab";
import ExpensesTab from "./tripTabs/ExpensesTab";
import MapTab from "./tripTabs/MapTab";

export default function TripDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { tripId } = route.params;

  const [userId, setUserId] = useState("");
  const [trip, setTrip] = useState(null);
  const [itineraryItems, setItineraryItems] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [categoryTotals, setCategoryTotals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const getUserData = async () => {
      const id = await SecureStore.getItemAsync("userId");
      setUserId(id);
    };
    getUserData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchAllData();
      }
    }, [userId, tripId])
  );

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTripDetails(),
        fetchItinerary(),
        fetchExpenseData(),
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTripDetails = async () => {
    try {
      const result = await getTripById(tripId, userId);
      if (result.error) {
        Alert.alert("Error", result.error);
      } else {
        setTrip(result.trip);
      }
    } catch (error) {
      console.error("Error fetching trip:", error);
    }
  };

  const fetchItinerary = async () => {
    try {
      const result = await getItineraryItems(tripId, userId);
      if (result.error) {
        console.error(result.error);
      } else {
        setItineraryItems(result.items || []);
      }
    } catch (error) {
      console.error("Error fetching itinerary:", error);
    }
  };

  const fetchExpenseData = async () => {
    try {
      const result = await getExpenses(tripId, userId);
      if (result.error) {
        console.error(result.error);
      } else {
        setExpenses(result.expenses || []);
        setCategoryTotals(result.categoryTotals || []);
      }
    } catch (error) {
      console.error("Error fetching expenses:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const handleDeleteTrip = () => {
    Alert.alert(
      "Delete Trip",
      "Are you sure you want to delete this trip? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await deleteTrip(tripId, userId);
              if (result.error) {
                Alert.alert("Error", result.error);
              } else {
                navigation.goBack();
              }
            } catch (error) {
              Alert.alert("Error", "Failed to delete trip");
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!trip) {
    return (
      <SafeAreaView style={tripsStyles.container}>
        <View style={tripsStyles.detailHeader}>
          <TouchableOpacity
            style={tripsStyles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={tripsStyles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={tripsStyles.detailDestination}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tripsStyles.container}>
      <View style={tripsStyles.detailHeader}>
        <TouchableOpacity
          style={tripsStyles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={tripsStyles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={tripsStyles.detailDestination}>{trip.destination}</Text>
        <Text style={tripsStyles.detailDates}>
          {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
        </Text>
      </View>

      <View style={tripsStyles.tabContainer}>
        <TouchableOpacity
          style={[
            tripsStyles.tab,
            activeTab === "overview" && tripsStyles.activeTab,
          ]}
          onPress={() => setActiveTab("overview")}
        >
          <Text
            style={[
              tripsStyles.tabText,
              activeTab === "overview" && tripsStyles.activeTabText,
            ]}
          >
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            tripsStyles.tab,
            activeTab === "itinerary" && tripsStyles.activeTab,
          ]}
          onPress={() => setActiveTab("itinerary")}
        >
          <Text
            style={[
              tripsStyles.tabText,
              activeTab === "itinerary" && tripsStyles.activeTabText,
            ]}
          >
            Itinerary
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            tripsStyles.tab,
            activeTab === "expenses" && tripsStyles.activeTab,
          ]}
          onPress={() => setActiveTab("expenses")}
        >
          <Text
            style={[
              tripsStyles.tabText,
              activeTab === "expenses" && tripsStyles.activeTabText,
            ]}
          >
            Expenses
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            tripsStyles.tab,
            activeTab === "map" && tripsStyles.activeTab,
          ]}
          onPress={() => setActiveTab("map")}
        >
          <Text
            style={[
              tripsStyles.tabText,
              activeTab === "map" && tripsStyles.activeTabText,
            ]}
          >
            Map
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={tripsStyles.tabContent}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === "overview" && (
          <OverviewTab
            trip={trip}
            userId={userId}
            onUpdate={fetchTripDetails}
            onDelete={handleDeleteTrip}
          />
        )}

        {activeTab === "itinerary" && (
          <ItineraryTab
            tripId={tripId}
            userId={userId}
            items={itineraryItems}
            trip={trip}
            onUpdate={fetchItinerary}
          />
        )}

        {activeTab === "expenses" && (
          <ExpensesTab
            tripId={tripId}
            userId={userId}
            expenses={expenses}
            categoryTotals={categoryTotals}
            budget={parseFloat(trip.budget || 0)}
            onUpdate={fetchExpenseData}
          />
        )}

        {activeTab === "map" && (
          <MapTab
            items={itineraryItems}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
