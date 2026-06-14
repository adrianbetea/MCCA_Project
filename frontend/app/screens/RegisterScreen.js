import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  TextInput,
  Keyboard,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { register, googleLogin } from "../functions/authFunctions";
import { decodeToken } from "../functions/authHelper";
import * as SecureStore from "../functions/secureStore";
import { registerStyles } from "../styles/RegisterStyles";
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

var animationDoneRegister = false;

export default function RegisterScreen(props) {
  const navigation = useNavigation();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [emailWarning, setEmailWarning] = useState("");
  const [passwordWarning, setPasswordWarning] = useState("");
  const [usernameWarning, setUsernameWarning] = useState("");

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: Constants.expoConfig?.extra?.GOOGLE_WEB_CLIENT_ID,
    responseType: "id_token",
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { authentication, params } = response;
      const idToken = authentication?.idToken || params?.id_token;
      if (idToken) {
        handleGoogleLoginToken(idToken);
      } else {
        setError("Registration failed: Google ID token not returned.");
      }
    }
  }, [response]);

  const handleGoogleLoginToken = async (googleIdToken) => {
    try {
      setError("");
      const result = await googleLogin(googleIdToken);
      if (result.error) {
        setError(result.error);
      } else {
        await SecureStore.setItemAsync("token", result.token);
        const decoded = decodeToken(result.token);
        if (decoded) {
          await SecureStore.setItemAsync("username", decoded.username);
          await SecureStore.setItemAsync("userId", decoded.userId);
        }
        navigation.navigate("Home");
      }
    } catch (err) {
      setError(err.message || "Google registration failed.");
    }
  };

  React.useEffect(() => {
    const unsubscribe = navigation.addListener("state", () => {
      animationDoneRegister = false;
      setError("");
      setEmailWarning("");
      setPasswordWarning("");
      setUsernameWarning("");
    });

    return unsubscribe;
  }, [navigation]);

  const loadingProgress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!animationDoneRegister) {
      Animated.timing(loadingProgress, { //creste loadingProgress de la 0 la 100 în 700 ms
        toValue: 100,
        duration: 700,
        useNativeDriver: true,
      }).start(() => {
        animationDoneRegister = true;
      });
    }
  }, [loadingProgress]);

  const moveDown = {
    transform: [
      {
        translateY: loadingProgress.interpolate({
          inputRange: [0, 100],
          outputRange: [-350, 0],
          extrapolate: "clamp",
        }),
      },
    ],
  };

  const opacityClearToVisible = {
    opacity: loadingProgress.interpolate({
      inputRange: [0, 100],
      outputRange: [0, 1],
      extrapolate: "clamp",
    }),
  };

  const handleUsernameChange = (username) => {
    setForm({ ...form, username });
    if (username && username.trim().length < 3) {
      setUsernameWarning("Username must be at least 3 characters");
    } else {
      setUsernameWarning("");
    }
    setError("");
  };

  const handleEmailChange = (email) => {
    setForm({ ...form, email });
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      setEmailWarning("Invalid email format");
    } else {
      setEmailWarning("");
    }
    setError("");
  };

  const handlePasswordChange = (password) => {
    setForm({ ...form, password });
    if (password && password.length < 6) {
      setPasswordWarning("Password must be at least 6 characters");
    } else {
      setPasswordWarning("");
    }
    setError("");
  };

  const handleRegister = async () => {
    if (!form.email || !form.password || !form.username) {
      setError("Please complete all fields");
      return;
    }
    if (emailWarning || passwordWarning || usernameWarning) {
      setError("Please fix the errors before registering.");
      return;
    }

    try {
      setError("");
      const result = await register(form.username, form.email, form.password);
      if (result.error) {
        setError(result.error);
      } else {
        navigation.navigate("Login");
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    }
  };

  const handleGoogleRegister = () => {
    setError("");
    const clientId = Constants.expoConfig?.extra?.GOOGLE_WEB_CLIENT_ID;
    
    if (!clientId) {
      console.warn("GOOGLE_WEB_CLIENT_ID not configured. Falling back to simulated registration.");
      performMockGoogleRegister();
      return;
    }

    try {
      promptAsync();
    } catch (err) {
      setError(err.message || "Failed to initiate Google Sign-In.");
    }
  };

  const performMockGoogleRegister = async () => {
    const performGoogleRegisterApi = async (email, name) => {
      try {
        const mockToken = "mock-google-token-" + Math.random().toString(36).substring(7);
        const result = await googleLogin(mockToken, email, name);
        if (result.error) {
          setError(result.error);
        } else {
          await SecureStore.setItemAsync("token", result.token);
          const decoded = decodeToken(result.token);
          if (decoded) {
            await SecureStore.setItemAsync("username", decoded.username);
            await SecureStore.setItemAsync("userId", decoded.userId);
          }
          navigation.navigate("Home");
        }
      } catch (err) {
        setError(err.message || "Google registration failed.");
      }
    };

    if (Platform.OS === 'web') {
      const email = prompt("Enter your Google Email to simulate registration:", "jane.doe@gmail.com");
      if (email) {
        const name = email.split('@')[0];
        await performGoogleRegisterApi(email, name);
      }
    } else {
      Alert.alert(
        "Simulate Google Sign-Up",
        "Choose a Google account to simulate Registration:",
        [
          { text: "Cancel", style: "cancel" },
          { text: "traveler2@gmail.com", onPress: () => performGoogleRegisterApi("traveler2@gmail.com", "Traveler2") },
          { text: "explorer2@gmail.com", onPress: () => performGoogleRegisterApi("explorer2@gmail.com", "Explorer2") }
        ]
      );
    }
  };

  const content = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <LinearGradient
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 1 }}
        colors={["#8B5CF6", "#b794f6"]}
        style={registerStyles.background}
      >
        <SafeAreaView style={registerStyles.logoContainer}>
          <Animated.View style={moveDown}>
            <Image
              source={require("../assets/skyventures-logo.png")}
              style={registerStyles.logo}
            />
            <Text style={registerStyles.createAccountText}>Create Account</Text>
          </Animated.View>
        </SafeAreaView>

        <Animated.View style={[opacityClearToVisible, registerStyles.registerContainer]}>
          <View style={registerStyles.credentialsContainer}>
            {error ? (
              <View style={registerStyles.errorBox}>
                <Text style={registerStyles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}

            <TextInput
              inputMode="text"
              style={[
                registerStyles.inputControl,
                usernameWarning ? { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" } : null
              ]}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="oneTimeCode"
              onChangeText={handleUsernameChange}
              value={form.username}
              placeholder="Name"
              placeholderTextColor="#999"
            />
            {usernameWarning ? (
              <Text style={registerStyles.warningText}>{usernameWarning}</Text>
            ) : null}

            <TextInput
              inputMode="email"
              style={[
                registerStyles.inputControl,
                emailWarning ? { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" } : null
              ]}
              autoCorrect={false}
              autoCapitalize="none"
              textContentType="oneTimeCode"
              onChangeText={handleEmailChange}
              value={form.email}
              placeholder="Email"
              placeholderTextColor="#999"
            />
            {emailWarning ? (
              <Text style={registerStyles.warningText}>{emailWarning}</Text>
            ) : null}

            <TextInput
              secureTextEntry
              style={[
                registerStyles.inputControl,
                passwordWarning ? { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" } : null
              ]}
              onChangeText={handlePasswordChange}
              value={form.password}
              placeholder="Password"
              placeholderTextColor="#999"
            />
            {passwordWarning ? (
              <Text style={registerStyles.warningText}>{passwordWarning}</Text>
            ) : null}

            <TouchableOpacity
              style={registerStyles.registerButton}
              onPress={handleRegister}
              activeOpacity={0.8}
            >
              <Text style={registerStyles.registerButtonText}>Sign up</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: "#ffffff",
                padding: 15,
                borderRadius: 25,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                marginTop: 12,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 1,
              }}
              onPress={handleGoogleRegister}
              activeOpacity={0.8}
            >
              <View style={{ marginRight: 10, width: 18, height: 18, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#4285F4' }}>G</Text>
              </View>
              <Text style={{ color: "#1f2937", fontWeight: "bold", fontSize: 16 }}>
                Continue with Google
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={registerStyles.loginContainer}
            onPress={() => navigation.navigate("Login")}
            activeOpacity={0.7}
          >
            <Text style={registerStyles.loginText}>
              Already have an account? Login here
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );

  if (Platform.OS === 'web') {
    return content;
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      {content}
    </TouchableWithoutFeedback>
  );
}