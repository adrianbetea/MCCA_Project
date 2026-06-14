import { StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export const registerStyles = StyleSheet.create({
    background: {
        flex: 1,
        width: "100%",
        height: "100%",
    },

    logoContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingTop: height * 0.08,
    },

    logo: {
        width: width * 0.45,
        height: width * 0.45,
        resizeMode: "contain",
        marginBottom: 15,
        alignSelf: "center",
    },

    createAccountText: {
        fontSize: 28,
        fontWeight: "600",
        color: "#ffffff",
        textAlign: "center",
        letterSpacing: 0.5,
        marginBottom: 40,
    },

    registerContainer: {
        flex: 1,
        justifyContent: "flex-end",
        paddingBottom: height * 0.05,
        paddingHorizontal: 30,
    },

    credentialsContainer: {
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderRadius: 20,
        padding: 25,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },

    inputControl: {
        height: 55,
        backgroundColor: "#f5f5f5",
        borderRadius: 12,
        paddingHorizontal: 18,
        fontSize: 16,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: "#e0e0e0",
        color: "#333",
    },

    registerButton: {
        height: 55,
        backgroundColor: "#886ae6",
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 10,
        shadowColor: "#886ae6",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },

    registerButtonText: {
        color: "#ffffff",
        fontSize: 18,
        fontWeight: "600",
        letterSpacing: 0.5,
    },

    loginContainer: {
        backgroundColor: "rgba(255, 255, 255, 0.2)",
        borderRadius: 12,
        paddingVertical: 15,
        paddingHorizontal: 20,
        alignItems: "center",
    },

    loginText: {
        color: "#ffffff",
        fontSize: 15,
        fontWeight: "500",
    },
    errorBox: {
        backgroundColor: "#FEE2E2",
        borderColor: "#FCA5A5",
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        marginBottom: 15,
        alignItems: "center",
    },
    errorText: {
        color: "#B91C1C",
        fontSize: 14,
        fontWeight: "600",
    },
    warningText: {
        color: "#D97706",
        fontSize: 12,
        fontWeight: "500",
        marginTop: -10,
        marginBottom: 10,
        paddingLeft: 5,
    },
});