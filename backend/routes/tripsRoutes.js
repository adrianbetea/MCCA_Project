const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const {
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
} = require('../controllers/tripsControllers');

// authentication middleware to all routes
router.use(verifyToken);

// public/shared trips feed (Registered before parameter routes like :tripId to avoid clash)
router.get('/public', getPublicTripsList);

// trip routes
router.get('/', getUserTrips);
router.get('/:tripId', getTripById);
router.post('/', createTrip);
router.put('/:tripId', updateTrip);
router.delete('/:tripId', deleteTrip);
router.post('/:tripId/upload-cover', upload.single('cover'), uploadCoverImage);
router.post('/:tripId/share', shareTrip);

// itinerary routes
router.get('/:tripId/itinerary', getItineraryItems);
router.post('/:tripId/itinerary', addItineraryItem);
router.put('/:tripId/itinerary/:itemId', updateItineraryItem);
router.delete('/:tripId/itinerary/:itemId', deleteItineraryItem);

// expense routes
router.get('/:tripId/expenses', getExpenses);
router.post('/:tripId/expenses', addExpense);
router.delete('/:tripId/expenses/:expenseId', deleteExpense);

module.exports = router;
