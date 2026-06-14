export const decodeToken = (token) => {
    try {
        const base64Payload = token.split('.')[1]; //JWT-ul are formatul header.payload.signature
        const jsonPayload = atob(base64Payload.replace(/-/g, '+').replace(/_/g, '/')); //convertim din Base64 URL-safe in Base64 normal
        const decoded = JSON.parse(jsonPayload);
        
        // Fallback mapping for standard Firebase Auth ID Tokens
        if (decoded) {
            if (!decoded.userId && decoded.sub) {
                decoded.userId = decoded.sub;
            }
            if (!decoded.username && decoded.name) {
                decoded.username = decoded.name;
            }
        }
        return decoded;
    } catch (error) {
        console.error("Error decoding token:", error);
        return null;
    }
};
