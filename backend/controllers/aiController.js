const { GoogleGenerativeAI } = require("@google/generative-ai");
const { db } = require('../config/firebase');
const { v4: uuid } = require('uuid');
const axios = require('axios');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const resolvePlace = async (placeName, destination) => {
    try {
        const apiKey = process.env.GOOGLE_PLACES_API_KEY;
        if (!apiKey) return { placeId: null, placeAddress: null };

        const query = `${placeName} in ${destination}`;
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
        
        const response = await axios.get(url, {
            params: {
                query,
                key: apiKey
            }
        });

        if (response.data && response.data.results && response.data.results.length > 0) {
            const firstResult = response.data.results[0];
            return {
                placeId: firstResult.place_id,
                placeAddress: firstResult.formatted_address
            };
        }
    } catch (e) {
        console.error(`Failed to resolve place for ${placeName} in ${destination}:`, e.message);
    }
    return { placeId: null, placeAddress: null };
};

// Chat with AI for trip planning
const chatWithAI = async (req, res) => {
    try {
        const { message, conversationHistory } = req.body;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const systemPrompt = `You are a helpful travel planning assistant. Help users plan their trips by asking questions about:
- Destination
- Number of days
- Budget
- Interests and preferences
- Type of accommodation they prefer
- Dietary restrictions if relevant

Keep responses concise and friendly. When the user provides all necessary information, confirm the details and ask if they want you to generate the itinerary.`;

        // Build conversation context
        let prompt = systemPrompt + "\n\n";
        if (conversationHistory && conversationHistory.length > 0) {
            conversationHistory.forEach(msg => {
                prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
            });
        }
        prompt += `User: ${message}\nAssistant:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ response: text });
    } catch (err) {
        console.error("Error in AI chat:", err);
        res.status(500).json({ error: "Failed to get AI response" });
    }
};

// Generate itinerary and automatically add to trip
const generateItinerary = async (req, res) => {
    try {
        const { tripId, destination, days, budget, interests } = req.body;
        const userId = req.user.userId;

        // Verify trip belongs to user
        const tripDoc = await db.collection("trips").doc(tripId).get();
        if (!tripDoc.exists || tripDoc.data().userId !== userId) {
            return res.status(404).json({ error: "Trip not found" });
        }

        const trip = tripDoc.data();
        let startDateStr = "";
        if (trip.startDate) {
            if (typeof trip.startDate === 'string') {
                startDateStr = trip.startDate.split(/[T ]/)[0];
            } else if (trip.startDate.toDate && typeof trip.startDate.toDate === 'function') {
                startDateStr = trip.startDate.toDate().toISOString().split('T')[0];
            } else if (trip.startDate instanceof Date) {
                startDateStr = trip.startDate.toISOString().split('T')[0];
            }
        }
        if (!startDateStr) {
            startDateStr = new Date().toISOString().split('T')[0];
        }
        const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const prompt = `Create a detailed ${days}-day itinerary for ${destination} with a budget of approximately ${budget} RON (Romanian Lei).

Trip details:
- Destination: ${destination}
- Duration: ${days} days
- Budget: ${budget} RON
- Interests: ${interests || 'general sightseeing'}

Please provide a day-by-day itinerary with 3-5 activities per day. For each activity include:
1. A time (in HH:MM format, 24-hour)
2. Activity name
3. Brief description
4. Estimated cost in RON

Format your response EXACTLY as JSON with this structure (no markdown, just pure JSON):
{
  "itinerary": [
    {
      "day": 1,
      "activities": [
        {
          "time": "09:00",
          "name": "Activity Name",
          "description": "Brief description",
          "estimatedCost": 50
        }
      ]
    }
  ],
  "totalEstimatedCost": 1200,
  "tips": ["Tip 1", "Tip 2"]
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up the response - remove markdown code blocks if present
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        console.log('Gemini response:', text);

        let itineraryData;
        try {
            itineraryData = JSON.parse(text);
        } catch (parseError) {
            console.error('Failed to parse JSON:', parseError);
            return res.status(500).json({ error: "Failed to parse AI response" });
        }

        // Add activities to the trip's itinerary
        const addedActivities = [];
        let currentDay = 0;

        for (const dayPlan of itineraryData.itinerary) {
            // Calculate date for this day
            const dayDate = new Date(startYear, startMonth - 1, startDay + currentDay);
            const dateString = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;

            for (const activity of dayPlan.activities) {
                try {
                    const { placeId, placeAddress } = await resolvePlace(activity.name, destination);
                    const itemId = uuid();
                    const itemData = {
                        tripId,
                        dayDate: dateString,
                        startTime: activity.time + ':00',
                        placeName: activity.name,
                        placeId: placeId,
                        placeAddress: placeAddress,
                        notes: `${activity.description}\n\nEstimated cost: ${activity.estimatedCost} RON`
                    };
                    await db.collection("itinerary_items").doc(itemId).set(itemData);

                    addedActivities.push({
                        itemId: itemId,
                        dayDate: dateString,
                        startTime: activity.time,
                        placeName: activity.name,
                        notes: activity.description
                    });
                } catch (dbError) {
                    console.error('Failed to insert activity:', dbError);
                }
            }

            currentDay++;
        }

        res.status(201).json({
            message: "Itinerary generated successfully",
            addedActivities: addedActivities.length,
            totalEstimatedCost: itineraryData.totalEstimatedCost,
            tips: itineraryData.tips,
            activities: addedActivities
        });

    } catch (err) {
        console.error("Error generating itinerary:", err);
        res.status(500).json({ error: "Failed to generate itinerary" });
    }
};

const generateCompleteTrip = async (req, res) => {
    try {
        const { conversationContext } = req.body;
        const userId = req.user.userId;

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

        const decisionPrompt = `Based on the following conversation, decide if you have enough information to create a complete trip OR if you need to ask for more details.

Conversation:
${conversationContext}

Analyze the conversation and respond EXACTLY as JSON (no markdown):

If you have enough information (destination, approximate duration, and can make reasonable assumptions for missing details):
{
  "action": "create",
  "destination": "City Name",
  "days": 3,
  "startDate": "2025-12-20",
  "budget": 5000,
  "interests": "extracted or guessed interests"
}

If you need more information:
{
  "action": "advice",
  "message": "Your friendly response asking for specific missing details or giving travel advice"
}

IMPORTANT RULES:
1. If user mentions dates in relative terms (e.g., "from 20 December"), assume year 2025
2. If no budget mentioned, estimate reasonable budget based on destination and duration
3. If no interests mentioned, assume general sightseeing
4. Start date MUST be YYYY-MM-DD format
5. Use RON for budget (1 EUR ≈ 5 RON, 1 USD ≈ 4.5 RON)
6. Only ask for more info if destination or duration is completely missing
7. Be friendly and concise in advice messages`;

        const decisionResult = await model.generateContent(decisionPrompt);
        const decisionResponse = await decisionResult.response;
        let decisionText = decisionResponse.text();

        // Clean up the response
        decisionText = decisionText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        console.log('AI Decision:', decisionText);

        let decision;
        try {
            decision = JSON.parse(decisionText);
        } catch (parseError) {
            console.error('Failed to parse decision JSON:', parseError);
            return res.status(500).json({ error: "AI response error. Please try describing your trip again." });
        }

        if (decision.action === "advice") {
            return res.status(200).json({ advice: decision.message });
        }

        if (decision.action === "create") {
            const tripPrompt = `Create a detailed ${decision.days}-day travel itinerary for ${decision.destination}.

Trip details:
- Destination: ${decision.destination}
- Duration: ${decision.days} days
- Budget: ${decision.budget} RON
- Interests: ${decision.interests}
- Start date: ${decision.startDate}

Create a day-by-day itinerary with 3-5 activities per day. For each activity include:
- Time (HH:MM format, 24-hour)
- Activity name
- Brief description
- Estimated cost in RON

Include practical travel tips.

Format response EXACTLY as JSON (no markdown):
{
  "tripName": "Trip to ${decision.destination}",
  "description": "Brief 2-3 sentence trip description",
  "itinerary": [
    {
      "day": 1,
      "activities": [
        {
          "time": "09:00",
          "name": "Activity Name",
          "description": "Brief description",
          "estimatedCost": 50
        }
      ]
    }
  ],
  "totalEstimatedCost": 1200,
  "tips": ["Tip 1", "Tip 2", "Tip 3"]
}`;

            const itineraryResult = await model.generateContent(tripPrompt);
            const itineraryResponse = await itineraryResult.response;
            let itineraryText = itineraryResponse.text();

            itineraryText = itineraryText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            console.log('Itinerary response:', itineraryText);

            let tripData;
            try {
                tripData = JSON.parse(itineraryText);
            } catch (parseError) {
                console.error('Failed to parse itinerary JSON:', parseError);
                return res.status(500).json({ error: "Failed to generate itinerary. Please try again." });
            }

            // Calculate end date
            const start = new Date(decision.startDate);
            const end = new Date(start);
            end.setDate(start.getDate() + parseInt(decision.days) - 1);

            const formatDate = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const endDateStr = formatDate(end);

            // Create the trip in database
            const tripId = uuid();
            const newTrip = {
                userId,
                destination: decision.destination,
                startDate: decision.startDate,
                endDate: endDateStr,
                budget: parseFloat(decision.budget || 0),
                description: tripData.description || '',
                coverUrl: null,
                createdAt: new Date().toISOString()
            };

            await db.collection("trips").doc(tripId).set(newTrip);

            // Add activities to the trip's itinerary
            const addedActivities = [];
            let currentDay = 0;

            for (const dayPlan of tripData.itinerary) {
                const dayDate = new Date(start);
                dayDate.setDate(start.getDate() + currentDay);
                const dateString = formatDate(dayDate);

                for (const activity of dayPlan.activities) {
                    try {
                        const { placeId, placeAddress } = await resolvePlace(activity.name, decision.destination);
                        const itemId = uuid();
                        const itemData = {
                            tripId,
                            dayDate: dateString,
                            startTime: activity.time + ':00',
                            placeName: activity.name,
                            placeId: placeId,
                            placeAddress: placeAddress,
                            notes: `${activity.description}\n\nEstimated cost: ${activity.estimatedCost} RON`
                        };
                        await db.collection("itinerary_items").doc(itemId).set(itemData);

                        addedActivities.push({
                            itemId: itemId,
                            dayDate: dateString,
                            startTime: activity.time,
                            placeName: activity.name,
                            notes: activity.description
                        });
                    } catch (dbError) {
                        console.error('Failed to insert activity:', dbError);
                    }
                }

                currentDay++;
            }

            res.status(201).json({
                message: "Trip created successfully",
                tripId: tripId,
                destination: decision.destination,
                addedActivities: addedActivities.length,
                totalEstimatedCost: tripData.totalEstimatedCost,
                tips: tripData.tips,
                trip: {
                    tripId: tripId,
                    destination: decision.destination,
                    startDate: decision.startDate,
                    endDate: endDateStr,
                    budget: decision.budget,
                    description: tripData.description
                }
            });
        } else {
            return res.status(400).json({ error: "Could not understand your request. Please try again." });
        }

    } catch (err) {
        console.error("Error generating complete trip:", err);
        res.status(500).json({ error: "Failed to process your request" });
    }
};

module.exports = {
    chatWithAI,
    generateItinerary,
    generateCompleteTrip
};
