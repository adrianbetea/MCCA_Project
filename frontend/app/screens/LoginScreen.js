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
import { login, googleLogin } from "../functions/authFunctions";
import { decodeToken } from "../functions/authHelper";
import { loginStyles } from "../styles/LoginStyles";
import * as SecureStore from "../functions/secureStore";
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

var animationDoneLogin = false;

export default function LoginScreen(props) {
  const navigation = useNavigation();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [emailWarning, setEmailWarning] = useState("");

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
        setError("Sign-In failed: Google ID token not returned.");
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
      setError(err.message || "Google Sign-In failed.");
    }
  };

  React.useEffect(() => {
    const unsubscribe = navigation.addListener("state", () => {
      animationDoneLogin = false;
      setError("");
      setEmailWarning("");
    });

    return unsubscribe;
  }, [navigation]);

  const loadingProgress = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!animationDoneLogin) {
      Animated.timing(loadingProgress, {
        toValue: 100,
        duration: 700,
        useNativeDriver: true,
      }).start(() => {
        animationDoneLogin = true;
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
    setError("");
  };

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      setError("Please enter both email and password.");
      return;
    }
    if (emailWarning) {
      setError("Please fix the errors before logging in.");
      return;
    }

    try {
      setError("");
      const result = await login(form.email, form.password);

      if (result.error) {
        setError(result.error);
      } else {
        // Store token
        await SecureStore.setItemAsync("token", result.token);

        // Decode token to get user info
        const decoded = decodeToken(result.token);
        if (decoded) {
          await SecureStore.setItemAsync("username", decoded.username);
          await SecureStore.setItemAsync("userId", decoded.userId);
        }

        navigation.navigate("Home");
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    }
  };

  const handleGoogleLogin = () => {
    setError("");
    const clientId = Constants.expoConfig?.extra?.GOOGLE_WEB_CLIENT_ID;
    
    if (!clientId) {
      console.warn("GOOGLE_WEB_CLIENT_ID not configured. Falling back to simulated login.");
      performMockGoogleLogin();
      return;
    }

    try {
      promptAsync();
    } catch (err) {
      setError(err.message || "Failed to initiate Google Sign-In.");
    }
  };

  const performMockGoogleLogin = async () => {
    const performGoogleLoginApi = async (email, name) => {
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
        setError(err.message || "Google Sign-In failed.");
      }
    };

    if (Platform.OS === 'web') {
      const email = prompt("Enter your Google Email to simulate login:", "john.doe@gmail.com");
      if (email) {
        const name = email.split('@')[0];
        await performGoogleLoginApi(email, name);
      }
    } else {
      Alert.alert(
        "Simulate Google Login",
        "Choose a Google account to simulate Sign-In:",
        [
          { text: "Cancel", style: "cancel" },
          { text: "traveler@gmail.com", onPress: () => performGoogleLoginApi("traveler@gmail.com", "Traveler") },
          { text: "explorer@gmail.com", onPress: () => performGoogleLoginApi("explorer@gmail.com", "Explorer") }
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
        style={loginStyles.background}
      >
        <SafeAreaView style={loginStyles.logoContainer}>
          <Animated.View style={moveDown}>
            <Image
              source={require("../assets/skyventures-logo.png")}
              style={loginStyles.logo}
            />
            <Text style={loginStyles.welcomeText}>Welcome Back</Text>
          </Animated.View>
        </SafeAreaView>

        <Animated.View style={[opacityClearToVisible, loginStyles.loginContainer]}>
          <View style={loginStyles.credentialsContainer}>
            {error ? (
              <View style={loginStyles.errorBox}>
                <Text style={loginStyles.errorText}>⚠️ {error}</Text>
              </View>
            ) : null}

            <TextInput
              inputMode="email"
              style={[
                loginStyles.inputControl,
                emailWarning ? { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" } : null
              ]}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="oneTimeCode"
              onChangeText={handleEmailChange}
              value={form.email}
              placeholder="Email"
              placeholderTextColor="#999"
            />
            {emailWarning ? (
              <Text style={loginStyles.warningText}>{emailWarning}</Text>
            ) : null}

            <TextInput
              secureTextEntry
              style={loginStyles.inputControl}
              onChangeText={handlePasswordChange}
              value={form.password}
              placeholder="Password"
              placeholderTextColor="#999"
            />

            <TouchableOpacity
              style={loginStyles.loginButton}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <Text style={loginStyles.loginButtonText}>Login</Text>
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
              onPress={handleGoogleLogin}
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
            style={loginStyles.registerContainer}
            onPress={() => navigation.navigate("Register")}
            activeOpacity={0.7}
          >
            <Text style={loginStyles.registerText}>
              Don't have an account? Register here
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