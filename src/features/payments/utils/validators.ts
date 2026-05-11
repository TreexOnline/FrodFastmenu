export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateCardNumber = (number: string): boolean => {
  const cleaned = number.replace(/\s/g, '');
  return cleaned.length >= 13 && cleaned.length <= 19 && /^\d+$/.test(cleaned);
};

export const validateCVV = (cvv: string): boolean => {
  return cvv.length >= 3 && cvv.length <= 4 && /^\d+$/.test(cvv);
};

export const validateExpiryDate = (month: string, year: string): boolean => {
  const currentYear = new Date().getFullYear();
  const expYear = parseInt(year);
  const expMonth = parseInt(month);
  
  if (!expMonth || expMonth < 1 || expMonth > 12) return false;
  if (!expYear || expYear < currentYear || expYear > currentYear + 10) return false;
  
  return true;
};
