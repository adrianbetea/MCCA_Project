import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import * as SecureStore from "../functions/secureStore";
import { LinearGradient } from "expo-linear-gradient";
import { tripsStyles } from "../styles/TripsStyles";
import { getUserTrips } from "../functions/tripsFunctions";
import CreateTripModal from "./modals/CreateTripModal";
import AITripGeneratorModal from "./modals/AITripGeneratorModal";

export default function TripsScreen() {
  const navigation = useNavigation();
  const [userId, setUserId] = useState("");
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);

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
        fetchTrips();
      }
    }, [userId])
  );

  const fetchTrips = async () => {
    try {
      const result = await getUserTrips(userId);
      if (result.error) {
        Alert.alert("Error", result.error);
      } else {
        setTrips(result.trips || []);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load trips");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrips();
  };

  const handleTripPress = (trip) => {
    navigation.navigate("TripDetail", { tripId: trip.tripId });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const dateStr = dateString.split(/[T ]/)[0]; // Handle both 'T' and space
      const parts = dateStr.split('-');
      if (parts.length < 3) return dateString;
      const [year, month, day] = parts.map(Number);
      if (isNaN(year) || isNaN(month) || isNaN(day)) return dateString;
      const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const m = monthShort[month - 1] || 'Jan';
      return `${m} ${day}, ${year}`;
    } catch (e) {
      return dateString || "N/A";
    }
  };

  const calculateBudgetPercentage = (spent, budget) => {
    if (budget === 0) return 0;
    return (spent / budget) * 100;
  };

  const renderTripCard = ({ item }) => {
    const totalSpent = parseFloat(item.totalSpent || 0);
    const totalBudget = parseFloat(item.budget || 0);
    const budgetRemaining = totalBudget - totalSpent;
    const budgetPercentage = calculateBudgetPercentage(totalSpent, totalBudget);
    const isOverBudget = budgetPercentage > 100;

    return (
      <TouchableOpacity
        style={tripsStyles.tripCard}
        onPress={() => handleTripPress(item)}
        activeOpacity={0.7}
      >
        {item.coverUrl ? (
          <Image
            source={{ uri: item.coverUrl }}
            style={{
              width: '100%',
              height: 150,
              borderRadius: 10,
              marginBottom: 12,
              resizeMode: 'cover'
            }}
          />
        ) : null}
        <Text style={tripsStyles.tripDestination}>{item.destination}</Text>
        <Text style={tripsStyles.tripDates}>
          {formatDate(item.startDate)} - {formatDate(item.endDate)}
        </Text>

        <View style={tripsStyles.tripBudgetContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={tripsStyles.tripBudgetText}>
              Spent: {totalSpent.toFixed(2)} RON
            </Text>
            <Text style={[tripsStyles.tripBudgetText, { color: isOverBudget ? '#f44336' : '#4caf50' }]}>
              Remaining: {budgetRemaining.toFixed(2)} RON
            </Text>
          </View>
          <Text style={[tripsStyles.tripBudgetText, { fontSize: 12, color: '#999', marginBottom: 6 }]}>
            Total Budget: ${totalBudget.toFixed(2)}
          </Text>
          <View style={tripsStyles.budgetProgressBar}>
            <View
              style={[
                tripsStyles.budgetProgressFill,
                isOverBudget && tripsStyles.budgetOverFill,
                { width: `${Math.min(budgetPercentage, 100)}%` },
              ]}
            />
          </View>
        </View>

        <View style={tripsStyles.tripStats}>
          <View style={tripsStyles.tripStat}>
            <Text style={tripsStyles.tripStatValue}>
              {item.itineraryCount || 0}
            </Text>
            <Text style={tripsStyles.tripStatLabel}>Activities</Text>
          </View>
          <View style={tripsStyles.tripStat}>
            <Text style={tripsStyles.tripStatValue}>
              {(() => {
                try {
                  const startStr = (item.startDate || "").split(/[T ]/)[0];
                  const endStr = (item.endDate || "").split(/[T ]/)[0];
                  if (!startStr || !endStr) return 0;

                  const [startYear, startMonth, startDay] = startStr.split('-').map(Number);
                  const [endYear, endMonth, endDay] = endStr.split('-').map(Number);
                  if (isNaN(startYear) || isNaN(endYear)) return 0;

                  const start = new Date(startYear, startMonth - 1, startDay);
                  const end = new Date(endYear, endMonth - 1, endDay);

                  const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                  return isNaN(diff) || diff < 0 ? 0 : diff;
                } catch (e) {
                  return 0;
                }
              })()}
            </Text>
            <Text style={tripsStyles.tripStatLabel}>Days</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={tripsStyles.emptyContainer}>
      <Text style={tripsStyles.emptyText}>
        No trips yet!{"\n"}Tap the + button to create your first trip
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={tripsStyles.container}>
      <View style={tripsStyles.header}>
        <Text style={tripsStyles.headerTitle}>My Trips</Text>
      </View>

      <FlatList
        data={trips}
        renderItem={renderTripCard}
        keyExtractor={(item) => item.tripId.toString()}
        contentContainerStyle={trips.length === 0 ? { flex: 1, paddingBottom: 100 } : [tripsStyles.tripsList, { paddingBottom: 100 }]}
        ListEmptyComponent={!loading && renderEmptyState()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      <TouchableOpacity
        style={tripsStyles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={tripsStyles.fabText}>+</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[tripsStyles.fab, { bottom: 100, backgroundColor: '#4CAF50' }]}
        onPress={() => setAiModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 28 }}>🤖</Text>
      </TouchableOpacity>

      <CreateTripModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={() => {
          setModalVisible(false);
          fetchTrips();
        }}
        userId={userId}
      />

      <AITripGeneratorModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        onSuccess={() => {
          setAiModalVisible(false);
          fetchTrips();
        }}
      />
    </SafeAreaView>
  );
}
