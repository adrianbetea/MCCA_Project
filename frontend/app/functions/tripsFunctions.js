import Constants from 'expo-constants';
import * as SecureStore from "./secureStore";

const API_URL = Constants.expoConfig.extra.API_URL;

// Trip CRUD operations
export const getUserTrips = async () => {
  try {
    const token = await SecureStore.getItemAsync("token");
    const response = await fetch(`${API_URL}/trips`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
    });

    const data = await response.json();
    if (response.ok) {
      console.log('===== RECEIVED TRIPS FROM BACKEND =====');
      console.log('First trip dates:', data.trips[0]?.startDate, data.trips[0]?.endDate);
      return data;
    } else {
      return { error: data.error || "Failed to fetch trips" };
    }
  } catch (error) {
    console.error("Error fetching trips:", error);
    throw error;
  }
};

export const getTripById = async (tripId) => {
  try {
    const token = await SecureStore.getItemAsync("token");
    const response = await fetch(`${API_URL}/trips/${tripId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
    });

    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      return { error: data.error || "Failed to fetch trip" };
    }
  } catch (error) {
    console.error("Error fetching trip:", error);
    throw error;
  }
};

export const createTrip = async (destination, startDate, endDate, budget, description) => {
  try {
    const token = await SecureStore.getItemAsync("token");
    const body = {
      destination,
      startDate,
      endDate,
      budget: budget || 0,
      description: description || ''
    };

    const response = await fetch(`${API_URL}/trips`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      return { error: data.error || "Failed to create trip" };
    }
  } catch (error) {
    console.error("Error creating trip:", error);
    throw error;
  }
};

export const updateTrip = async (tripId, destination, startDate, endDate, budget, description) => {
  try {
    const token = await SecureStore.getItemAsync("token");
    const body = {
      destination,
      startDate,
      endDate,
      budget,
      description
    };

    const response = await fetch(`${API_URL}/trips/${tripId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      return { error: data.error || "Failed to update trip" };
    }
  } catch (error) {
    console.error("Error updating trip:", error);
    throw error;
  }
};

export const deleteTrip = async (tripId) => {
  try {
    const token = await SecureStore.getItemAsync("token");
    const response = await fetch(`${API_URL}/trips/${tripId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
    });

    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      return { error: data.error || "Failed to delete trip" };
    }
  } catch (error) {
    console.error("Error deleting trip:", error);
    throw error;
  }
};

// Itinerary operations
export const getItineraryItems = async (tripId) => {
  try {
    const token = await SecureStore.getItemAsync("token");
    const response = await fetch(`${API_URL}/trips/${tripId}/itinerary`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
    });

    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      return { error: data.error || "Failed to fetch itinerary items" };
    }
  } catch (error) {
    console.error("Error fetching itinerary items:", error);
    throw error;
  }
};

export const addItineraryItem = async (tripId, itemData) => {
  try {
    const body = {
      dayDate: itemData.dayDate,
      startTime: itemData.startTime || null,
      placeName: itemData.placeName,
      placeId: itemData.placeId || null,
      placeAddress: itemData.placeAddress || null,
      notes: itemData.notes || ''
    };

    console.log('Sending to backend:', body);

    const token = await SecureStore.getItemAsync("token");
    const response = await fetch(`${API_URL}/trips/${tripId}/itinerary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      return { error: data.error || "Failed to add itinerary item" };
    }
  } catch (error) {
    console.error("Error adding itinerary item:", error);
    throw error;
  }
};

export const updateItineraryItem = async (tripId, itemId, itemData) => {
  try {
    const token = await SecureStore.getItemAsync("token");
    const body = {
      dayDate: itemData.dayDate,
      startTime: itemData.startTime,
      placeName: itemData.placeName,
      placeId: itemData.placeId,
      placeAddress: itemData.placeAddress,
      notes: itemData.notes
    };

    const response = await fetch(`${API_URL}/trips/${tripId}/itinerary/${itemId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      return { error: data.error || "Failed to update itinerary item" };
    }
  } catch (error) {
    console.error("Error updating itinerary item:", error);
    throw error;
  }
};

export const deleteItineraryItem = async (tripId, itemId) => {
  try {
    const token = await SecureStore.getItemAsync("token");
    const response = await fetch(`${API_URL}/trips/${tripId}/itinerary/${itemId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
    });

    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      return { error: data.error || "Failed to delete itinerary item" };
    }
  } catch (error) {
    console.error("Error deleting itinerary item:", error);
    throw error;
  }
};

// Expense operations
export const getExpenses = async (tripId) => {
  try {
    const token = await SecureStore.getItemAsync("token");
    const response = await fetch(`${API_URL}/trips/${tripId}/expenses`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
    });

    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      return { error: data.error || "Failed to fetch expenses" };
    }
  } catch (error) {
    console.error("Error fetching expenses:", error);
    throw error;
  }
};

export const addExpense = async (tripId, expenseData) => {
  try {
    const token = await SecureStore.getItemAsync("token");
    const body = {
      category: expenseData.category,
      amount: expenseData.amount,
      description: expenseData.description || '',
      expenseDate: expenseData.expenseDate
    };

    const response = await fetch(`${API_URL}/trips/${tripId}/expenses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      return { error: data.error || "Failed to add expense" };
    }
  } catch (error) {
    console.error("Error adding expense:", error);
    throw error;
  }
};

export const deleteExpense = async (tripId, expenseId) => {
  try {
    const token = await SecureStore.getItemAsync("token");
    const response = await fetch(`${API_URL}/trips/${tripId}/expenses/${expenseId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
    });

    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      return { error: data.error || "Failed to delete expense" };
    }
  } catch (error) {
    console.error("Error deleting expense:", error);
    throw error;
  }
};

export const shareTrip = async (tripId) => {
  try {
    const token = await SecureStore.getItemAsync("token");
    const response = await fetch(`${API_URL}/trips/${tripId}/share`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
    });

    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      return { error: data.error || "Failed to share trip" };
    }
  } catch (error) {
    console.error("Error sharing trip:", error);
    throw error;
  }
};

export const getPublicTrips = async () => {
  try {
    const token = await SecureStore.getItemAsync("token");
    const response = await fetch(`${API_URL}/trips/public`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
    });

    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      return { error: data.error || "Failed to fetch public trips" };
    }
  } catch (error) {
    console.error("Error fetching public trips:", error);
    throw error;
  }
};

export const uploadTripCover = async (tripId, file) => {
  try {
    const token = await SecureStore.getItemAsync("token");
    const formData = new FormData();
    formData.append('cover', file);

    const response = await fetch(`${API_URL}/trips/${tripId}/upload-cover`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
        // Do NOT set Content-Type header so the boundary is automatically set
      },
      body: formData,
    });

    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      return { error: data.error || "Failed to upload cover photo" };
    }
  } catch (error) {
    console.error("Error uploading cover photo:", error);
    throw error;
  }
};

export const chatWithAI = async (message, conversationHistory) => {
  try {
    const token = await SecureStore.getItemAsync("token");
    const response = await fetch(`${API_URL}/ai/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ message, conversationHistory })
    });

    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      return { error: data.error || "Failed to get AI response" };
    }
  } catch (error) {
    console.error("Error in chatWithAI:", error);
    throw error;
  }
};

export const generateItinerary = async (tripId, destination, days, budget, interests) => {
  try {
    const token = await SecureStore.getItemAsync("token");
    const response = await fetch(`${API_URL}/ai/itinerary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ tripId, destination, days, budget, interests })
    });

    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      return { error: data.error || "Failed to generate itinerary" };
    }
  } catch (error) {
    console.error("Error in generateItinerary:", error);
    throw error;
  }
};

export const generateCompleteTrip = async (conversationContext) => {
  try {
    const token = await SecureStore.getItemAsync("token");
    const response = await fetch(`${API_URL}/ai/trip`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ conversationContext })
    });

    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      return { error: data.error || "Failed to generate trip" };
    }
  } catch (error) {
    console.error("Error in generateCompleteTrip:", error);
    throw error;
  }
};
