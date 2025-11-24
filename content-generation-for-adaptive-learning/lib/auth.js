import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Verifies and decodes a raw JWT string to extract the user ID.
 * This function is now a pure utility and does not access cookies directly.
 * @param {string} token - The raw JWT string from the cookie.
 * @returns {string | number | null} The user ID or null if the token is invalid or missing.
 */
export function decodeAuthToken(token) {
  if (!JWT_SECRET) {
    console.error("JWT_SECRET environment variable is not set!");
    return null;
  }

  if (!token) {
    return null;
  }

  try {
    // Verify and decode the JWT payload
    const decoded = jwt.verify(token, JWT_SECRET);

    // Return the user ID (make sure 'userId' is the key you use in your token)
    return decoded.id;
  } catch (e) {
    // Token is expired, invalid, or tampered with
    console.error("Invalid token:", e);
    return null;
  }
}
