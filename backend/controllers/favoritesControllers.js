const { db } = require('../config/firebase');
require("dotenv").config();

const addToFavorites = async (req, res) => {
    const userId = req.user.userId; // Get from JWT token
    const { placeId } = req.body;

    try {
        const snapshot = await db.collection("favorites")
            .where("placeId", "==", placeId)
            .where("userId", "==", userId)
            .get();

        // Check if place is already in favorites
        if (!snapshot.empty) {
            res.status(500).json({ message: "The place is already added to favorites" });
            return;
        }

        // Add to Firestore
        await db.collection("favorites").add({
            userId,
            placeId
        });

        res.status(200).json({ message: 'Place added to favorites successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

const getFavorites = async (req, res) => {
    const userId = req.user.userId; // Get from JWT token

    try {
        const snapshot = await db.collection("favorites")
            .where("userId", "==", userId)
            .get();

        const favorites = [];
        snapshot.forEach(doc => {
            favorites.push(doc.data());
        });

        res.status(200).json(favorites);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

const deleteFavorite = async (req, res) => {
    const userId = req.user.userId; // Get from JWT token
    const { placeId } = req.body;

    try {
        const snapshot = await db.collection("favorites")
            .where("userId", "==", userId)
            .where("placeId", "==", placeId)
            .get();

        if (snapshot.empty) {
            return res.status(404).json({ message: 'Favorite not found' });
        }

        // Delete from Firestore
        await db.collection("favorites").doc(snapshot.docs[0].id).delete();

        res.status(200).json({ message: 'Place deleted from favorites successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = {
    addToFavorites,
    getFavorites,
    deleteFavorite
}