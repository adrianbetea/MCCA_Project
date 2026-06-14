import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  SafeAreaView,
  Image,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Dropdown } from "react-native-element-dropdown";
import * as Location from "expo-location";
import {
  getNearbyPlaces,
  getPlacePhotoUrl,
} from "../functions/googlePlacesFunction";
import { tripsStyles } from "../styles/TripsStyles";
import * as SecureStore from "../functions/secureStore";
import { logout } from "../functions/authFunctions";
import axios from "axios";
import Constants from 'expo-constants';
import { getPublicTrips } from "../functions/tripsFunctions";
import PublicItineraryModal from "./modals/PublicItineraryModal";

const API_URL = Constants.expoConfig.extra.API_URL;

export default function HomeScreen(props) {
  const navigation = useNavigation();

  const [placeType, setPlaceType] = useState(null); // Get placeType from route params
  const [location, setLocation] = useState(null);
  const [places, setPlaces] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [activeFeed, setActiveFeed] = useState("explore");
  const [publicTrips, setPublicTrips] = useState([]);
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicItineraryVisible, setPublicItineraryVisible] = useState(false);
  const [selectedPublicTrip, setSelectedPublicTrip] = useState(null);

  const fetchCommunityFeed = async () => {
    setPublicLoading(true);
    try {
      const result = await getPublicTrips();
      if (result.error) {
        console.error(result.error);
      } else {
        setPublicTrips(result.trips || []);
      }
    } catch (err) {
      console.error("Error fetching community feed:", err);
    } finally {
      setPublicLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeFeed === "community") {
      fetchCommunityFeed();
    }
  }, [activeFeed]);

  useEffect(() => {
    const fetchLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      const location = await Location.getLastKnownPositionAsync(); // Use last known position
      if (location) {
        setLocation(location.coords);
        fetchNearbyPlaces(location.coords.latitude, location.coords.longitude);
      } else {
        // Fall back to current position if last known is unavailable
        const currentLocation = await Location.getCurrentPositionAsync();
        setLocation(currentLocation.coords);
        fetchNearbyPlaces(currentLocation.coords.latitude, currentLocation.coords.longitude);
      }
    };

    fetchLocation();
  }, [placeType]);

  useEffect(() => {
    const getUserData = async () => {
      const username = await SecureStore.getItemAsync("username");
      setUsername(username);
      const userId = await SecureStore.getItemAsync("userId");
      setUserId(userId);
    };
    getUserData();
  }, []);

  const [loading, setLoading] = useState(true); // Add loading state

  const fetchNearbyPlaces = async (latitude, longitude) => {
    setLoading(true); // Start loading
    try {
      const data = await getNearbyPlaces(latitude, longitude, placeType);
      setPlaces(data.results.slice(0, 20));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false); // Stop loading
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (activeFeed === "explore") {
      if (location) {
        fetchNearbyPlaces(location.latitude, location.longitude);
      } else {
        setRefreshing(false);
      }
    } else {
      fetchCommunityFeed();
    }
  };

  const data = [
    { label: "All Places", value: null },
    { label: "Restaurants", value: "restaurant" },
    { label: "Hotels", value: "lodging" },
    { label: "Cafes", value: "cafe" },
    { label: "Parks", value: "park" },
    { label: "Museums", value: "museum" },
    { label: "Gyms", value: "gym" },
    { label: "Hospitals", value: "hospital" },
    { label: "Shops", value: "store" },
  ];

  const handlePlaceTypeSelection = (item) => {
    setPlaceType(item.value);
  };

  const [favorites, setFavorites] = useState([]);

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

  // Function to toggle favorite status for each item
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

  const renderPublicTripCard = ({ item }) => {
    const totalBudget = parseFloat(item.budget || 0);
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const dateStr = dateString.split(/[T ]/)[0];
      const [year, month, day] = dateStr.split('-').map(Number);
      const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthShort[month - 1]} ${day}, ${year}`;
    };

    return (
      <View style={tripsStyles.tripCard}>
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

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={tripsStyles.tripDestination}>{item.destination}</Text>
          <View style={{ backgroundColor: '#f3e8ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
            <Text style={{ fontSize: 11, color: '#8B5CF6', fontWeight: 'bold' }}>
              👤 @{item.username || 'traveler'}
            </Text>
          </View>
        </View>

        <Text style={tripsStyles.tripDates}>
          📅 {formatDate(item.startDate)} - {formatDate(item.endDate)}
        </Text>

        {item.description ? (
          <Text style={{ fontSize: 13, color: '#475569', marginBottom: 10, fontStyle: 'italic' }}>
            "{item.description}"
          </Text>
        ) : null}

        <View style={[tripsStyles.tripStats, { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 }]}>
          <View style={tripsStyles.tripStat}>
            <Text style={tripsStyles.tripStatValue}>{item.itineraryCount || 0}</Text>
            <Text style={tripsStyles.tripStatLabel}>Activities</Text>
          </View>
          {totalBudget > 0 && (
            <View style={tripsStyles.tripStat}>
              <Text style={tripsStyles.tripStatValue}>{totalBudget.toFixed(0)} RON</Text>
              <Text style={tripsStyles.tripStatLabel}>Est. Budget</Text>
            </View>
          )}
          <View style={[tripsStyles.tripStat, { alignItems: 'flex-end', justifyContent: 'center' }]}>
            <View style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }}>
              <Text style={{ fontSize: 11, color: '#059669', fontWeight: '600' }}>Shared Trip</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: '#886ae6',
            paddingVertical: 8,
            borderRadius: 8,
            alignItems: 'center',
            marginTop: 12
          }}
          onPress={() => {
            setSelectedPublicTrip(item);
            setPublicItineraryVisible(true);
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>
            📋 View Itinerary
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={tripsStyles.container}>
      <View style={tripsStyles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={tripsStyles.headerTitle}>Explore</Text>
            <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 5 }}>Hello, {username}</Text>
          </View>
          <TouchableOpacity
            onPress={() => logout(navigation)}
          >
            <Image
              source={require("../assets/exit.png")}
              style={{ width: 30, height: 30, tintColor: 'white' }}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Group Toggle */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: '#e2e8f0',
        padding: 4,
        borderRadius: 12,
        marginHorizontal: 15,
        marginVertical: 10,
      }}>
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 8,
            backgroundColor: activeFeed === 'explore' ? '#ffffff' : 'transparent',
            borderRadius: 8,
            alignItems: 'center',
            shadowColor: activeFeed === 'explore' ? '#000' : 'transparent',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: activeFeed === 'explore' ? 2 : 0,
          }}
          onPress={() => setActiveFeed('explore')}
        >
          <Text style={{
            fontWeight: '600',
            fontSize: 14,
            color: activeFeed === 'explore' ? '#8B5CF6' : '#64748b'
          }}>
            Explore Nearby
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 8,
            backgroundColor: activeFeed === 'community' ? '#ffffff' : 'transparent',
            borderRadius: 8,
            alignItems: 'center',
            shadowColor: activeFeed === 'community' ? '#000' : 'transparent',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: activeFeed === 'community' ? 2 : 0,
          }}
          onPress={() => setActiveFeed('community')}
        >
          <Text style={{
            fontWeight: '600',
            fontSize: 14,
            color: activeFeed === 'community' ? '#8B5CF6' : '#64748b'
          }}>
            Community Feed
          </Text>
        </TouchableOpacity>
      </View>

      {activeFeed === 'explore' ? (
        <View style={{ flex: 1 }}>
          <View style={{ backgroundColor: '#f5f5f5', paddingHorizontal: 15, paddingTop: 5 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 10 }}>
              What are you looking for?
            </Text>
            <Dropdown
              style={[tripsStyles.input, { marginBottom: 15 }]}
              placeholderStyle={{ fontSize: 14, color: '#999' }}
              selectedTextStyle={{ fontSize: 14, color: '#333' }}
              inputSearchStyle={{ fontSize: 14 }}
              iconStyle={{ width: 20, height: 20 }}
              data={data}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder="Select category"
              searchPlaceholder="Search..."
              value={placeType}
              onChange={handlePlaceTypeSelection}
            />
          </View>
          <FlatList
            style={{ flex: 1, backgroundColor: '#f5f5f5' }}
            contentContainerStyle={[tripsStyles.tripsList, { paddingBottom: 100 }]}
            data={places}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item) => item.place_id}
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
                    <Text style={{ fontSize: 12, color: '#8B5CF6', fontWeight: '500' }}>Tap for details →</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : (
        <FlatList
          style={{ flex: 1, backgroundColor: '#f5f5f5' }}
          contentContainerStyle={[tripsStyles.tripsList, { paddingBottom: 100 }]}
          data={publicTrips}
          showsVerticalScrollIndicator={false}
          keyExtractor={(item, index) => `pub-${item.tripId}-${index}`}
          refreshControl={
            <RefreshControl refreshing={refreshing || publicLoading} onRefresh={onRefresh} />
          }
          renderItem={renderPublicTripCard}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 20 }}>
              <Text style={{ fontSize: 18, color: '#94a3b8', textAlign: 'center', fontWeight: '500' }}>
                No shared trips yet!
              </Text>
              <Text style={{ fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
                Share your itinerary from the My Trips tab to publish the first one!
              </Text>
            </View>
          }
        />
      )}

      <PublicItineraryModal
        visible={publicItineraryVisible}
        onClose={() => {
          setPublicItineraryVisible(false);
          setSelectedPublicTrip(null);
        }}
        trip={selectedPublicTrip}
      />
    </SafeAreaView>
  );
}
