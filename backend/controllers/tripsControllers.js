const { v4: uuid } = require("uuid");
const { db, savePublicTrip, getPublicTrips } = require('../config/firebase');
const { uploadCoverPhoto } = require('../config/s3');

// Helper to normalize and format dates safely across all database/SDK types
const formatDateString = (dateVal) => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    return dateVal.split(/[T ]/)[0];
  }
  if (dateVal.toDate && typeof dateVal.toDate === 'function') {
    dateVal = dateVal.toDate();
  }
  if (dateVal instanceof Date) {
    const year = dateVal.getFullYear();
    const month = String(dateVal.getMonth() + 1).padStart(2, '0');
    const day = String(dateVal.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return dateVal.toString();
};

// Get all trips for a user
const getUserTrips = async (req, res) => {
  const userId = req.user.userId;

  try {
    const tripsSnapshot = await db.collection("trips").where("userId", "==", userId).get();
    const trips = [];

    for (const doc of tripsSnapshot.docs) {
      const trip = doc.data();
      trip.tripId = doc.id;

      // Format dates
      trip.startDate = formatDateString(trip.startDate);
      trip.endDate = formatDateString(trip.endDate);

      // Fetch expenses to sum totalSpent
      const expensesSnapshot = await db.collection("expenses").where("tripId", "==", trip.tripId).get();
      let totalSpent = 0;
      expensesSnapshot.forEach(exp => {
        totalSpent += parseFloat(exp.data().amount || 0);
      });
      trip.totalSpent = totalSpent;

      // Fetch itineraryItems count
      const itinerarySnapshot = await db.collection("itinerary_items").where("tripId", "==", trip.tripId).get();
      trip.itineraryCount = itinerarySnapshot.docs.length;

      trips.push(trip);
    }

    // Sort by startDate ascending
    trips.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    res.status(200).json({ trips });
  } catch (err) {
    console.error("Error fetching trips:", err);
    res.status(500).json({ error: "Failed to fetch trips" });
  }
};

// Get single trip details
const getTripById = async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user.userId;

  try {
    const tripDoc = await db.collection("trips").doc(tripId).get();

    if (!tripDoc.exists) {
      return res.status(404).json({ error: "Trip not found" });
    }

    const trip = tripDoc.data();
    trip.tripId = tripDoc.id;

    // Verify ownership
    if (trip.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized access to trip details" });
    }

    // Format dates
    trip.startDate = formatDateString(trip.startDate);
    trip.endDate = formatDateString(trip.endDate);

    // Sum expenses
    const expensesSnapshot = await db.collection("expenses").where("tripId", "==", tripId).get();
    let totalSpent = 0;
    expensesSnapshot.forEach(exp => {
      totalSpent += parseFloat(exp.data().amount || 0);
    });
    trip.totalSpent = totalSpent;

    res.status(200).json({ trip });
  } catch (err) {
    console.error("Error fetching trip:", err);
    res.status(500).json({ error: "Failed to fetch trip" });
  }
};

// Create new trip
const createTrip = async (req, res) => {
  const userId = req.user.userId;
  const { destination, startDate, endDate, budget, description } = req.body;

  if (!destination || !startDate || !endDate) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const tripId = uuid();
    const newTrip = {
      userId,
      destination,
      startDate: formatDateString(startDate),
      endDate: formatDateString(endDate),
      budget: parseFloat(budget || 0),
      description: description || '',
      coverUrl: null,
      createdAt: new Date().toISOString()
    };

    await db.collection("trips").doc(tripId).set(newTrip);
    newTrip.tripId = tripId;

    res.status(201).json({
      message: "Trip created successfully",
      trip: newTrip
    });
  } catch (err) {
    console.error("Error creating trip:", err);
    res.status(500).json({ error: "Failed to create trip" });
  }
};

// Update trip
const updateTrip = async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user.userId;
  const { destination, startDate, endDate, budget, description } = req.body;

  try {
    const tripDoc = await db.collection("trips").doc(tripId).get();

    if (!tripDoc.exists) {
      return res.status(404).json({ error: "Trip not found" });
    }

    if (tripDoc.data().userId !== userId) {
      return res.status(403).json({ error: "Unauthorized access to update trip" });
    }

    const updatedTrip = {
      destination,
      startDate: formatDateString(startDate),
      endDate: formatDateString(endDate),
      budget: parseFloat(budget || 0),
      description: description || ''
    };

    await db.collection("trips").doc(tripId).update(updatedTrip);
    
    updatedTrip.tripId = tripId;

    res.status(200).json({
      message: "Trip updated successfully",
      trip: updatedTrip
    });
  } catch (err) {
    console.error("Error updating trip:", err);
    res.status(500).json({ error: "Failed to update trip" });
  }
};

// Delete trip
const deleteTrip = async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user.userId;

  try {
    const tripDoc = await db.collection("trips").doc(tripId).get();

    if (!tripDoc.exists) {
      return res.status(404).json({ error: "Trip not found" });
    }

    if (tripDoc.data().userId !== userId) {
      return res.status(403).json({ error: "Unauthorized access to delete trip" });
    }

    // Delete trip document
    await db.collection("trips").doc(tripId).delete();

    // Delete associated itinerary items
    const itinerarySnapshot = await db.collection("itinerary_items").where("tripId", "==", tripId).get();
    for (const doc of itinerarySnapshot.docs) {
      await db.collection("itinerary_items").doc(doc.id).delete();
    }

    // Delete associated expenses
    const expensesSnapshot = await db.collection("expenses").where("tripId", "==", tripId).get();
    for (const doc of expensesSnapshot.docs) {
      await db.collection("expenses").doc(doc.id).delete();
    }

    res.status(200).json({ message: "Trip deleted successfully" });
  } catch (err) {
    console.error("Error deleting trip:", err);
    res.status(500).json({ error: "Failed to delete trip" });
  }
};

// Get itinerary items for a trip
const getItineraryItems = async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user.userId;

  try {
    // Check if trip belongs to user
    const tripDoc = await db.collection("trips").doc(tripId).get();
    let isAllowed = false;

    if (tripDoc.exists && tripDoc.data().userId === userId) {
      isAllowed = true;
    } else {
      // If not the owner, check if the trip has been shared in the public feed
      const publicTripDoc = await db.collection("public_trips").doc(tripId).get();
      if (publicTripDoc.exists) {
        isAllowed = true;
      }
    }

    if (!isAllowed) {
      return res.status(403).json({ error: "Unauthorized access to itinerary items" });
    }

    const itemsSnapshot = await db.collection("itinerary_items").where("tripId", "==", tripId).get();
    const items = [];

    itemsSnapshot.forEach(doc => {
      const item = doc.data();
      item.itemId = doc.id;
      item.dayDate = formatDateString(item.dayDate);
      items.push(item);
    });

    // Sort by dayDate ascending, then startTime ascending
    items.sort((a, b) => {
      const dateDiff = new Date(a.dayDate) - new Date(b.dayDate);
      if (dateDiff !== 0) return dateDiff;
      return (a.startTime || '').localeCompare(b.startTime || '');
    });

    res.status(200).json({ items });
  } catch (err) {
    console.error("Error fetching itinerary items:", err);
    res.status(500).json({ error: "Failed to fetch itinerary items" });
  }
};

// Add itinerary item
const addItineraryItem = async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user.userId;
  const { dayDate, startTime, placeName, placeId, placeAddress, notes } = req.body;

  if (!dayDate || !placeName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Verify trip belongs to user
    const tripDoc = await db.collection("trips").doc(tripId).get();
    if (!tripDoc.exists || tripDoc.data().userId !== userId) {
      return res.status(404).json({ error: "Trip not found" });
    }

    const itemId = uuid();
    const itemData = {
      tripId,
      dayDate: formatDateString(dayDate),
      startTime: startTime || null,
      placeName,
      placeId: placeId || null,
      placeAddress: placeAddress || null,
      notes: notes || '',
      createdAt: new Date().toISOString()
    };

    await db.collection("itinerary_items").doc(itemId).set(itemData);
    itemData.itemId = itemId;

    res.status(201).json({
      message: "Itinerary item added successfully",
      item: itemData
    });
  } catch (err) {
    console.error("Error adding itinerary item:", err);
    res.status(500).json({ error: "Failed to add itinerary item" });
  }
};

// Update itinerary item
const updateItineraryItem = async (req, res) => {
  const { tripId, itemId } = req.params;
  const userId = req.user.userId;
  const { dayDate, startTime, placeName, placeId, placeAddress, notes } = req.body;

  try {
    // Verify trip belongs to user
    const tripDoc = await db.collection("trips").doc(tripId).get();
    if (!tripDoc.exists || tripDoc.data().userId !== userId) {
      return res.status(404).json({ error: "Trip not found" });
    }

    const itemDoc = await db.collection("itinerary_items").doc(itemId).get();
    if (!itemDoc.exists || itemDoc.data().tripId !== tripId) {
      return res.status(404).json({ error: "Itinerary item not found" });
    }

    const updatedData = {
      dayDate: formatDateString(dayDate),
      startTime: startTime || null,
      placeName,
      placeId: placeId || null,
      placeAddress: placeAddress || null,
      notes: notes || ''
    };

    await db.collection("itinerary_items").doc(itemId).update(updatedData);
    updatedData.itemId = itemId;
    updatedData.tripId = tripId;

    res.status(200).json({
      message: "Itinerary item updated successfully",
      item: updatedData
    });
  } catch (err) {
    console.error("Error updating itinerary item:", err);
    res.status(500).json({ error: "Failed to update itinerary item" });
  }
};

// Delete itinerary item
const deleteItineraryItem = async (req, res) => {
  const { tripId, itemId } = req.params;
  const userId = req.user.userId;

  try {
    // Verify trip belongs to user
    const tripDoc = await db.collection("trips").doc(tripId).get();
    if (!tripDoc.exists || tripDoc.data().userId !== userId) {
      return res.status(404).json({ error: "Trip not found" });
    }

    const itemDoc = await db.collection("itinerary_items").doc(itemId).get();
    if (!itemDoc.exists || itemDoc.data().tripId !== tripId) {
      return res.status(404).json({ error: "Itinerary item not found" });
    }

    await db.collection("itinerary_items").doc(itemId).delete();

    res.status(200).json({ message: "Itinerary item deleted successfully" });
  } catch (err) {
    console.error("Error deleting itinerary item:", err);
    res.status(500).json({ error: "Failed to delete itinerary item" });
  }
};

// Get expenses for a trip
const getExpenses = async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user.userId;

  try {
    // Verify trip belongs to user
    const tripDoc = await db.collection("trips").doc(tripId).get();
    if (!tripDoc.exists || tripDoc.data().userId !== userId) {
      return res.status(404).json({ error: "Trip not found" });
    }

    const expensesSnapshot = await db.collection("expenses").where("tripId", "==", tripId).get();
    const expenses = [];
    const categoryTotalsMap = {};

    expensesSnapshot.forEach(doc => {
      const expense = doc.data();
      expense.expenseId = doc.id;
      expense.expenseDate = formatDateString(expense.expenseDate);
      expenses.push(expense);

      const cat = expense.category;
      const amt = parseFloat(expense.amount || 0);
      categoryTotalsMap[cat] = (categoryTotalsMap[cat] || 0) + amt;
    });

    const categoryTotals = Object.keys(categoryTotalsMap).map(category => ({
      category,
      total: categoryTotalsMap[category]
    }));

    // Sort expenses descending by expenseDate
    expenses.sort((a, b) => new Date(b.expenseDate) - new Date(a.expenseDate));

    res.status(200).json({ expenses, categoryTotals });
  } catch (err) {
    console.error("Error fetching expenses:", err);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
};

// Add expense
const addExpense = async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user.userId;
  const { category, amount, description, expenseDate } = req.body;

  if (!category || !amount || !expenseDate) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // Verify trip belongs to user
    const tripDoc = await db.collection("trips").doc(tripId).get();
    if (!tripDoc.exists || tripDoc.data().userId !== userId) {
      return res.status(404).json({ error: "Trip not found" });
    }

    const expenseId = uuid();
    const expenseData = {
      tripId,
      category,
      amount: parseFloat(amount),
      description: description || '',
      expenseDate: formatDateString(expenseDate),
      createdAt: new Date().toISOString()
    };

    await db.collection("expenses").doc(expenseId).set(expenseData);
    expenseData.expenseId = expenseId;

    res.status(201).json({
      message: "Expense added successfully",
      expense: expenseData
    });
  } catch (err) {
    console.error("Error adding expense:", err);
    res.status(500).json({ error: "Failed to add expense" });
  }
};

// Delete expense
const deleteExpense = async (req, res) => {
  const { tripId, expenseId } = req.params;
  const userId = req.user.userId;

  try {
    // Verify trip belongs to user
    const tripDoc = await db.collection("trips").doc(tripId).get();
    if (!tripDoc.exists || tripDoc.data().userId !== userId) {
      return res.status(404).json({ error: "Trip not found" });
    }

    const expenseDoc = await db.collection("expenses").doc(expenseId).get();
    if (!expenseDoc.exists || expenseDoc.data().tripId !== tripId) {
      return res.status(404).json({ error: "Expense not found" });
    }

    await db.collection("expenses").doc(expenseId).delete();

    res.status(200).json({ message: "Expense deleted successfully" });
  } catch (err) {
    console.error("Error deleting expense:", err);
    res.status(500).json({ error: "Failed to delete expense" });
  }
};

// Upload cover photo
const uploadCoverImage = async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user.userId;

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    // Verify ownership
    const tripDoc = await db.collection("trips").doc(tripId).get();
    if (!tripDoc.exists || tripDoc.data().userId !== userId) {
      return res.status(404).json({ error: "Trip not found" });
    }

    // Determine host URL dynamically from request headers
    const hostUrl = `${req.protocol}://${req.get('host')}`;

    // Upload to S3 (or local disk fallback)
    const fileUrl = await uploadCoverPhoto(req.file, hostUrl);

    // Save to Firestore
    await db.collection("trips").doc(tripId).update({ coverUrl: fileUrl });

    // Also update the public_trips document if this trip was shared
    try {
      const publicDoc = await db.collection("public_trips").doc(tripId).get();
      if (publicDoc.exists) {
        await db.collection("public_trips").doc(tripId).update({ coverUrl: fileUrl });
      }
    } catch (syncErr) {
      console.error("Error syncing cover to public_trips:", syncErr);
    }

    res.status(200).json({
      message: "Cover photo uploaded successfully",
      coverUrl: fileUrl
    });
  } catch (err) {
    console.error("Error uploading cover image:", err);
    res.status(500).json({ error: "Failed to upload cover image" });
  }
};

// Share trip to community feed
const shareTrip = async (req, res) => {
  const { tripId } = req.params;
  const userId = req.user.userId;

  try {
    const tripDoc = await db.collection("trips").doc(tripId).get();

    if (!tripDoc.exists || tripDoc.data().userId !== userId) {
      return res.status(404).json({ error: "Trip not found or unauthorized" });
    }

    const trip = tripDoc.data();
    trip.tripId = tripDoc.id;

    // Fetch user details for username
    const userDoc = await db.collection("users").doc(userId).get();
    const username = userDoc.exists ? userDoc.data().username : 'traveler';

    // Fetch itinerary item count
    const itinerarySnapshot = await db.collection("itinerary_items").where("tripId", "==", tripId).get();
    const itineraryCount = itinerarySnapshot.docs.length;

    const tripDataToShare = {
      tripId: trip.tripId,
      destination: trip.destination,
      startDate: formatDateString(trip.startDate),
      endDate: formatDateString(trip.endDate),
      budget: trip.budget,
      description: trip.description,
      username: username,
      coverUrl: trip.coverUrl || null,
      itineraryCount: itineraryCount
    };

    await savePublicTrip(tripDataToShare);

    res.status(200).json({
      message: "Trip shared successfully with community!"
    });
  } catch (err) {
    console.error("Error sharing trip:", err);
    res.status(500).json({ error: "Failed to share trip" });
  }
};

// Fetch list of public trips
const getPublicTripsList = async (req, res) => {
  try {
    const publicTrips = await getPublicTrips();
    res.status(200).json({ trips: publicTrips });
  } catch (err) {
    console.error("Error getting public trips:", err);
    res.status(500).json({ error: "Failed to fetch public trips" });
  }
};

module.exports = {
  getUserTrips,
  getTripById,
  createTrip,
  updateTrip,
  deleteTrip,
  getItineraryItems,
  addItineraryItem,
  updateItineraryItem,
  deleteItineraryItem,
  getExpenses,
  addExpense,
  deleteExpense,
  uploadCoverImage,
  shareTrip,
  getPublicTripsList
};
