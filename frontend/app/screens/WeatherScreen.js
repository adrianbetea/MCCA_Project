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
import * as Location from "expo-location";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { getCurrentWeather } from "../functions/weatherFunction";
import { tripsStyles } from "../styles/TripsStyles";
import {
  getNearbyPlaces,
  getPlacePhotoUrl,
} from "../functions/googlePlacesFunction";
import * as SecureStore from "../functions/secureStore";
import axios from "axios";
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig.extra.API_URL;

const WeatherScreen = () => {
  const navigation = useNavigation();

  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [places, setPlaces] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState("");
  const [favorites, setFavorites] = useState([]);
  const placeTypeMapping = {
    Rain: ["restaurant", "cafe", "museum", "theater"],
    Snow: ["restaurant", "cafe", "museum", "cinema"],
    Clear: ["park", "beach", "hiking"],
    Cloudy: ["mall", "art gallery", "cinema"],
    Sunny: ["park", "zoo"],
    Overcast: ["mall", "restaurant", "cafe"],
  };

  useEffect(() => {
    const getUserData = async () => {
      const id = await SecureStore.getItemAsync("userId");
      setUserId(id);
    };
    getUserData();
  }, []);

  const fetchFavorites = async () => {
    if (userId) {
      try {
        const token = await SecureStore.getItemAsync("token");
        const response = await axios.get(`${API_URL}/favorites`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const favoritePlaces = response.data.map((fav) => fav.placeId);
        setFavorites(favoritePlaces);
      } catch (err) {
        console.log("Error fetching favorites: ", err);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchFavorites();
      }
    }, [userId])
  );

  useEffect(() => {
    const fetchLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      const location = await Location.getLastKnownPositionAsync();
      if (location) {
        setLocation(location.coords);
      } else {
        const currentLocation = await Location.getCurrentPositionAsync();
        setLocation(currentLocation.coords);
      }
    };

    fetchLocation();
  }, []);

  const getPlaceTypesForWeather = (weatherCondition) => {
    const condition = weatherCondition.toLowerCase();

    switch (condition) {
      case "moderate rain at times":
      case "light rain":
      case "moderate rain":
      case "heavy rain":
      case "heavy rain at times":
        return placeTypeMapping["Rain"];
      case "snow":
      case "light snow":
      case "heavy snow":
      case "patchy snow possible":
      case "blowing snow":
      case "blizzard":
        return placeTypeMapping["Snow"];
      case "clear":
        return placeTypeMapping["Clear"];
      case "cloudy":
      case "partly cloudy":
      case "mist":
      case "fog":
        return placeTypeMapping["Cloudy"];
      case "sunny":
        return placeTypeMapping["Sunny"];
      case "overcast":
      case "patchy rain possible":
        return placeTypeMapping["Overcast"];
      default:
        return ["restaurant", "cafe", "mall"];
    }
  };

  const fetchWeather = async () => {
    if (location) {
      try {
        const response = await getCurrentWeather(
          location.latitude,
          location.longitude
        );
        setWeatherData(response.current.condition.text);

        const placeTypes = getPlaceTypesForWeather(
          response.current.condition.text
        );

        // Fetch nearby places for each recommended place type
        const recommendations = await Promise.all(
          placeTypes.map((type) =>
            getNearbyPlaces(location.latitude, location.longitude, type)
          )
        );

        const allPlaces = recommendations
          .map((response) => response.results)
          .flat()
          .filter(
            (place, index, self) =>
              index === self.findIndex((p) => p.place_id === place.place_id)
          );

        setPlaces(allPlaces);
      } catch (error) {
        setErrorMsg("Error retrieving weather data");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    fetchWeather();
  }, [location]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWeather();
  };

  const handleAddFavorites = async (placeId) => {
    const isFavorite = favorites.includes(placeId);

    const data = {
      placeId: placeId,
    };

    try {
      const token = await SecureStore.getItemAsync("token");
      if (isFavorite) {
        // Remove from favorites
        await axios.delete(`${API_URL}/favorites/delete`, {
          data,
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        setFavorites((prevFavorites) => prevFavorites.filter((id) => id !== placeId));
        console.log("Removed from favorites");
      } else {
        // Add to favorites
        await axios.post(`${API_URL}/favorites/add`, data, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        setFavorites((prevFavorites) => [...prevFavorites, placeId]);
        console.log("Added to favorites");
      }
    } catch (error) {
      console.error("Error toggling favorite: ", error);
    }
  };

  const renderEmptyState = () => (
    <View style={tripsStyles.emptyContainer}>
      <Text style={tripsStyles.emptyText}>
        {weatherData ? "No recommendations available" : "Loading weather data..."}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={tripsStyles.container}>
      <View style={tripsStyles.header}>
        <Text style={tripsStyles.headerTitle}>Weather Suggestions</Text>
        <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 5 }}>
          {weatherData ? `Current: ${weatherData}` : 'Loading...'}
        </Text>
      </View>

      <FlatList
        data={places}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item) => item.place_id}
        contentContainerStyle={places.length === 0 ? { flex: 1 } : tripsStyles.tripsList}
        ListEmptyComponent={!loading && renderEmptyState()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={tripsStyles.tripCard}
            onPress={() => navigation.navigate("PlaceScreen", { place: item })}
            activeOpacity={0.7}
          >
            {item.photos && item.photos.length > 0 ? (
              <Image
                source={{
                  uri: getPlacePhotoUrl(
                    item.photos[0].photo_reference,
                    400,
                    400
                  ),
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
                  handleAddFavorites(item.place_id);
                }}
                style={{ padding: 4 }}
              >
                <Text style={{
                  fontSize: 36,
                  color: favorites.includes(item.place_id) ? "red" : "#ccc",
                }}>
                  ♥
                </Text>
              </TouchableOpacity>
            </View>

            <View style={tripsStyles.tripStats}>
              <View style={tripsStyles.tripStat}>
                <Text style={tripsStyles.tripStatValue}>
                  {item.rating ? item.rating.toFixed(1) : "N/A"}
                </Text>
                <Text style={tripsStyles.tripStatLabel}>Rating</Text>
              </View>
              {item.user_ratings_total && (
                <View style={tripsStyles.tripStat}>
                  <Text style={tripsStyles.tripStatValue}>
                    {item.user_ratings_total}
                  </Text>
                  <Text style={tripsStyles.tripStatLabel}>Reviews</Text>
                </View>
              )}
              <View style={[tripsStyles.tripStat, { alignItems: 'flex-end' }]}>
                <Text style={{ fontSize: 12, color: '#8B5CF6', fontWeight: '500' }}>Recommended ✨</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};
export default WeatherScreen;
