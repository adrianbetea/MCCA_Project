const axios = require('axios');
require('dotenv').config();

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const BASE_URL = "https://maps.googleapis.com/maps/api/place";

// Get nearby places
const getNearbyPlaces = async (req, res) => {
    const { latitude, longitude, type } = req.query;

    if (!latitude || !longitude) {
        return res.status(400).json({ error: "Missing latitude or longitude" });
    }

    try {
        const response = await axios.get(`${BASE_URL}/nearbysearch/json`, {
            params: {
                location: `${latitude},${longitude}`,
                radius: 2000,
                type: type,
                key: GOOGLE_PLACES_API_KEY,
            },
        });

        res.status(200).json(response.data);
    } catch (error) {
        console.error("Error fetching nearby places:", error);
        res.status(500).json({ error: "Failed to fetch nearby places" });
    }
};

// Get place photo URL
const getPlacePhotoUrl = async (req, res) => {
    const { photoReference, maxWidth = 400, maxHeight = 400 } = req.query;

    if (!photoReference) {
        return res.status(400).json({ error: "Missing photo reference" });
    }

    try {
        // Proxy the image through the backend instead of redirecting
        const photoUrl = `${BASE_URL}/photo?maxwidth=${maxWidth}&maxheight=${maxHeight}&photoreference=${photoReference}&key=${GOOGLE_PLACES_API_KEY}`;
        const response = await axios.get(photoUrl, { responseType: 'arraybuffer' });
        
        res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
        res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24h
        res.send(response.data);
    } catch (error) {
        console.error("Error fetching photo:", error);
        res.status(500).json({ error: "Failed to fetch photo" });
    }
};

// Get place details
const getPlaceDetails = async (req, res) => {
    const { placeId } = req.params;

    if (!placeId) {
        return res.status(400).json({ error: "Missing place ID" });
    }

    try {
        const response = await axios.get(`${BASE_URL}/details/json`, {
            params: {
                place_id: placeId,
                key: GOOGLE_PLACES_API_KEY,
            },
        });

        res.status(200).json(response.data.result);
    } catch (error) {
        console.error("Error fetching place details:", error);
        res.status(500).json({ error: "Failed to fetch place details" });
    }
};

// Search places
const searchPlaces = async (req, res) => {
    const { query, location } = req.query;

    if (!query) {
        return res.status(400).json({ error: "Missing search query" });
    }

    try {
        const searchQuery = location ? `${query} in ${location}` : query;

        const response = await axios.get(`${BASE_URL}/textsearch/json`, {
            params: {
                query: searchQuery,
                key: GOOGLE_PLACES_API_KEY,
            },
        });

        res.status(200).json(response.data);
    } catch (error) {
        console.error("Error searching places:", error);
        res.status(500).json({ error: "Failed to search places" });
    }
};

module.exports = {
    getNearbyPlaces,
    getPlacePhotoUrl,
    getPlaceDetails,
    searchPlaces
};
