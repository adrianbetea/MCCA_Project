import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Platform
} from "react-native";
import * as Location from "expo-location";
import { getPlaceDetails } from "../../functions/googlePlacesFunction";

export default function MapTab({ items }) {
  const [markers, setMarkers] = useState([]);
  const [activeMarker, setActiveMarker] = useState(null);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const isLargeScreen = width > 768;

  useEffect(() => {
    loadMapData();
  }, [items]);

  const loadMapData = async () => {
    setLoading(true);
    try {
      const itemsWithPlaces = items.filter(item => item.placeId);

      if (itemsWithPlaces.length > 0) {
        const markerPromises = itemsWithPlaces.map(async (item) => {
          try {
            const placeDetails = await getPlaceDetails(item.placeId);
            if (placeDetails && placeDetails.geometry) {
              return {
                id: item.itineraryId,
                coordinate: {
                  latitude: placeDetails.geometry.location.lat,
                  longitude: placeDetails.geometry.location.lng,
                },
                title: item.placeName,
                description: item.notes || placeDetails.formatted_address || "",
              };
            }
            return null;
          } catch (error) {
            console.error(`Error fetching place details for ${item.placeName}:`, error);
            return null;
          }
        });

        const fetchedMarkers = await Promise.all(markerPromises);
        const validMarkers = fetchedMarkers.filter(m => m !== null);

        if (validMarkers.length > 0) {
          setMarkers(validMarkers);
          setActiveMarker(validMarkers[0]);
        } else {
          setMarkers([]);
          setActiveMarker(null);
        }
      } else {
        setMarkers([]);
        setActiveMarker(null);
      }
    } catch (error) {
      console.error("Error loading map data on web:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#469fd1" />
        <Text style={styles.loadingText}>Loading interactive map...</Text>
      </View>
    );
  }

  if (markers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📍</Text>
        <Text style={styles.emptyTitle}>No Locations to Show</Text>
        <Text style={styles.emptyText}>
          Add places to your itinerary to see them on the map.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, isLargeScreen ? styles.row : styles.column]}>
      {/* Sidebar List */}
      <View style={[styles.sidebar, isLargeScreen ? styles.sidebarLarge : styles.sidebarSmall]}>
        <Text style={styles.sidebarTitle}>Itinerary Locations</Text>
        <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
          {markers.map((marker) => {
            const isActive = activeMarker && activeMarker.id === marker.id;
            return (
              <TouchableOpacity
                key={marker.id}
                style={[styles.card, isActive && styles.activeCard]}
                onPress={() => setActiveMarker(marker)}
                activeOpacity={0.8}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.pinIcon}>📍</Text>
                  <Text style={[styles.cardTitle, isActive && styles.activeCardTitle]} numberOfLines={1}>
                    {marker.title}
                  </Text>
                </View>
                {marker.description ? (
                  <Text style={[styles.cardDesc, isActive && styles.activeCardDesc]} numberOfLines={2}>
                    {marker.description}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Map Iframe Panel */}
      <View style={styles.mapContainer}>
        {activeMarker ? (
          <View style={styles.iframeWrapper}>
            <iframe
              src={`https://maps.google.com/maps?q=${activeMarker.coordinate.latitude},${activeMarker.coordinate.longitude}&z=15&output=embed`}
              width="100%"
              height="100%"
              style={{ border: 0, borderRadius: 12 }}
              allowFullScreen=""
              loading="lazy"
              title={activeMarker.title}
            />
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderText}>Select a location to view on the map</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    minHeight: 500,
    marginVertical: 10,
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.02)",
  },
  row: {
    flexDirection: "row",
  },
  column: {
    flexDirection: "column",
  },
  sidebar: {
    backgroundColor: "#f8fafc",
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    padding: 16,
  },
  sidebarLarge: {
    width: "35%",
    borderBottomWidth: 0,
  },
  sidebarSmall: {
    width: "100%",
    maxHeight: 220,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },
  listContainer: {
    flex: 1,
  },
  card: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  activeCard: {
    backgroundColor: "#f0f9ff",
    borderColor: "#38bdf8",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  pinIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
    flex: 1,
  },
  activeCardTitle: {
    color: "#0369a1",
  },
  cardDesc: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 20,
  },
  activeCardDesc: {
    color: "#0284c7",
  },
  mapContainer: {
    flex: 1,
    height: 500,
    backgroundColor: "#f1f5f9",
    padding: 12,
  },
  iframeWrapper: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#ffffff",
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#64748b",
    fontSize: 14,
  },
  loadingContainer: {
    height: 500,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748b",
  },
  emptyContainer: {
    height: 500,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    maxWidth: 300,
  },
});
