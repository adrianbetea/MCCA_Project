import * as ExpoSecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const setItemAsync = async (key, value, options) => {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error("localStorage setItem error:", e);
    }
  } else {
    await ExpoSecureStore.setItemAsync(key, value, options);
  }
};

export const getItemAsync = async (key, options) => {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error("localStorage getItem error:", e);
      return null;
    }
  } else {
    return await ExpoSecureStore.getItemAsync(key, options);
  }
};

export const deleteItemAsync = async (key, options) => {
  if (Platform.OS === "web") {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error("localStorage removeItem error:", e);
    }
  } else {
    await ExpoSecureStore.deleteItemAsync(key, options);
  }
};
