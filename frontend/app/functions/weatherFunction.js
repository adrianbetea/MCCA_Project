import axios from "axios";
import Constants from 'expo-constants';
import * as SecureStore from "./secureStore";

const API_URL = Constants.expoConfig.extra.API_URL;

export const getCurrentWeather = async (latitude, longitude) => {
  try {
    const token = await SecureStore.getItemAsync("token");
    const response = await axios.get(
      `${API_URL}/weather/current`,
      {
        params: {
          latitude,
          longitude,
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching weather:", error);
    return error;
  }
};
