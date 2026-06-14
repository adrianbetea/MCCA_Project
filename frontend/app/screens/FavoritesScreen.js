import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Image,
  FlatList,
  RefreshControl,
} from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { tripsStyles } from "../styles/TripsStyles";
import * as SecureStore from "../functions/secureStore";
import { getFavoritePlacesDetails } from "../functions/googlePlacesFunction";
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig.extra.API_URL;

const FavoritesScreen = () => {
  const navigation = useNavigation();
  const [favorites, setFavorites] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = async () => {
    try {
      const token = await SecureStore.getItemAsync("token");
      const response = await fetch(
        `${API_URL}/favorites`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        }
      );
      const data = await response.json();
      const favoritePlaceIds = data.map((fav) => fav.placeId);
      const favoritePlacesDetails = await getFavoritePlacesDetails(favoritePlaceIds);
      setFavorites(favoritePlacesDetails);
    } catch (err) {
      console.log("Error fetching favorites: ", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFavorites();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchFavorites();
  };

  const handleRemoveFavorite = async (placeId) => {
    try {
      const token = await SecureStore.getItemAsync("token");
      const data = {
        placeId: placeId,
      };
      await fetch(`${API_URL}/favorites/delete`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      console.log("Removed from favorites");
      // Refresh the favorites list
      fetchFavorites();
    } catch (error) {
      console.error("Error removing favorite: ", error);
    }
  };

  const renderEmptyState = () => (
    <View style={tripsStyles.emptyContainer}>
      <Text style={tripsStyles.emptyText}>
        No favorites yet!{"\n"}Start exploring and save your favorite places
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={tripsStyles.container}>
      <View style={tripsStyles.header}>
        <Text style={tripsStyles.headerTitle}>My Favorites</Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 5 }}>
          Your saved places
        </Text>
      </View>

      <FlatList
        data={favorites}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={tripsStyles.tripCard}
            onPress={() => navigation.navigate("PlaceScreen", { place: item })}
            activeOpacity={0.7}
          >
            {item.photoUrl ? (
              <Image
                source={{
                  uri: item.photoUrl,
                }}
                style={{
                  width: '100%',
                  height: 180,
                  borderRadius: 10,
                  marginBottom: 12,
                }}
              />
            ) : (
              <View style={{
                width: '100%',
                height: 180,
                borderRadius: 10,
                backgroundColor: '#e0e0e0',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 12,
              }}>
                <Text style={{ color: '#999' }}>No Image</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Text style={[tripsStyles.tripDestination, { flex: 1, marginBottom: 8, marginRight: 10 }]} numberOfLines={2}>
                {item.name}
              </Text>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleRemoveFavorite(item.place_id || item.id);
                }}
                style={{ padding: 4 }}
              >
                <Text style={{ fontSize: 36, color: "red" }}>♥</Text>
              </TouchableOpacity>
            </View>

            <View style={tripsStyles.tripStats}>
              <View style={tripsStyles.tripStat}>
                <Text style={tripsStyles.tripStatValue}>
                  {item.rating && item.rating !== "No rating" ? item.rating : "N/A"}
                </Text>
                <Text style={tripsStyles.tripStatLabel}>Rating</Text>
              </View>
              <View style={[tripsStyles.tripStat, { alignItems: 'flex-end' }]}>
                <Text style={{ fontSize: 12, color: '#8B5CF6', fontWeight: '500' }}>Tap for details →</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={favorites.length === 0 ? { flex: 1, paddingBottom: 100 } : [tripsStyles.tripsList, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading && renderEmptyState()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
};
export default FavoritesScreen;
