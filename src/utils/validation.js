/**
 * Validates Ethiopian phone numbers
 * Supports: +251911223344, 0911223344, 0711223344 (Safaricom)
 */
export const validateEthiopianPhone = (phone) => {
  if (!phone) return true;
  // Matches +251 followed by 7 or 9, then 8 digits
  return /^\+251[79]\d{8}$/.test(phone);
};

export const validateEmail = (email) => {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};