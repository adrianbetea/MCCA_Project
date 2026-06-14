const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { chatWithAI, generateItinerary, generateCompleteTrip } = require('../controllers/aiController');

// All AI routes require authentication
router.use(verifyToken);

router.post('/chat', chatWithAI);
router.post('/itinerary', generateItinerary);
router.post('/trip', generateCompleteTrip);

module.exports = router;
