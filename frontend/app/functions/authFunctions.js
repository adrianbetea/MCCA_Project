import * as SecureStore from "./secureStore";
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig.extra.API_URL;

export const login = async (email, password) => {
  try {
    const body = { email, password };
    const response = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json(); //returns an object or an error if parsing fails
    if (response.ok) {
      //returns true if status code 200-299, successful request
      return data; //parsed data from json to object, returned from response
    } else {
      return { error: data.message || "error" };
    }
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
};

export const register = async (username, email, password) => {
  try {
    const body = { username, email, password };

    const response = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = await response.json(); //returns an object or an error if parsing fails
    if (response.ok) {
      //returns true if status code 200-299, successful request
      return result;
    } else {
      return { error: result.message || "error" };
    }
  } catch (error) {
    console.error("Register error:", error);
    throw error;
  }
};

export const googleLogin = async (idToken, email, username) => {
  try {
    const body = { idToken, email, username };
    const response = await fetch(`${API_URL}/google-login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (response.ok) {
      return data;
    } else {
      return { error: data.message || "Google sign-in failed" };
    }
  } catch (error) {
    console.error("Google login error:", error);
    throw error;
  }
};

export const logout = async (navigation) => {
  try {
    const token = await SecureStore.getItemAsync("token");

    const response = await fetch(`${API_URL}/logout`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
    });

    const result = await response.json();

    if (response.ok) {
      await SecureStore.deleteItemAsync("token");
      await SecureStore.deleteItemAsync("username");
      await SecureStore.deleteItemAsync("userId");
      navigation.navigate("Start");
    }
  } catch (err) {
    console.error("Logout error:", err);
    throw err;
  }
};
