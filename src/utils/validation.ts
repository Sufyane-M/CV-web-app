/**
 * Validation utilities for the application
 */

/**
 * File validation constants
 */
export const FILE_VALIDATION = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['application/pdf'],
  ALLOWED_EXTENSIONS: ['.pdf'],
} as const;

/**
 * Validate file type and size
 */
export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file size
  if (file.size > FILE_VALIDATION.MAX_SIZE) {
    return {
      isValid: false,
      error: `Il file deve essere inferiore a ${FILE_VALIDATION.MAX_SIZE / (1024 * 1024)}MB`,
    };
  }

  // Check file type
  if (!FILE_VALIDATION.ALLOWED_TYPES.includes(file.type as any)) {
    return {
      isValid: false,
      error: 'Solo file PDF sono supportati',
    };
  }

  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!FILE_VALIDATION.ALLOWED_EXTENSIONS.includes(extension as any)) {
    return {
      isValid: false,
      error: 'Solo file con estensione .pdf sono supportati',
    };
  }

  return { isValid: true };
};

/**
 * Validate email format
 */
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) {
    return { isValid: false, error: 'Email è richiesta' };
  }
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Formato email non valido' };
  }
  
  return { isValid: true };
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): { isValid: boolean; error?: string; strength?: 'weak' | 'medium' | 'strong' } => {
  if (!password) {
    return { isValid: false, error: 'Password è richiesta' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'La password deve essere di almeno 8 caratteri' };
  }
  
  // Check password strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  let score = 0;
  
  // Length check
  if (password.length >= 12) score += 2;
  else if (password.length >= 8) score += 1;
  
  // Character variety checks
  if (/[a-z]/.test(password)) score += 1; // lowercase
  if (/[A-Z]/.test(password)) score += 1; // uppercase
  if (/[0-9]/.test(password)) score += 1; // numbers
  if (/[^A-Za-z0-9]/.test(password)) score += 1; // special characters
  
  if (score >= 5) strength = 'strong';
  else if (score >= 3) strength = 'medium';
  
  return { isValid: true, strength };
};

/**
 * Validate required field
 */
export const validateRequired = (value: string, fieldName: string): { isValid: boolean; error?: string } => {
  if (!value || value.trim().length === 0) {
    return { isValid: false, error: `${fieldName} è richiesto` };
  }
  
  return { isValid: true };
};

/**
 * Validate minimum length
 */
export const validateMinLength = (
  value: string,
  minLength: number,
  fieldName: string
): { isValid: boolean; error?: string } => {
  if (value.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} deve essere di almeno ${minLength} caratteri`,
    };
  }
  
  return { isValid: true };
};

/**
 * Validate maximum length
 */
export const validateMaxLength = (
  value: string,
  maxLength: number,
  fieldName: string
): { isValid: boolean; error?: string } => {
  if (value.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} non può superare ${maxLength} caratteri`,
    };
  }
  
  return { isValid: true };
};

/**
 * Validate URL format
 */
export const validateUrl = (url: string): { isValid: boolean; error?: string } => {
  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'URL non valido' };
  }
};

/**
 * Validate phone number (Italian format)
 */
export const validatePhoneNumber = (phone: string): { isValid: boolean; error?: string } => {
  // Italian phone number regex (mobile and landline)
  const phoneRegex = /^(\+39)?\s?([0-9]{2,4}[\s\-]?[0-9]{6,8})$/;
  
  if (!phone) {
    return { isValid: false, error: 'Numero di telefono è richiesto' };
  }
  
  if (!phoneRegex.test(phone)) {
    return { isValid: false, error: 'Formato numero di telefono non valido' };
  }
  
  return { isValid: true };
};

/**
 * Validate credit card number (basic Luhn algorithm)
 */
export const validateCreditCard = (cardNumber: string): { isValid: boolean; error?: string } => {
  // Remove spaces and dashes
  const cleanNumber = cardNumber.replace(/[\s-]/g, '');
  
  // Check if it's all digits
  if (!/^\d+$/.test(cleanNumber)) {
    return { isValid: false, error: 'Il numero della carta deve contenere solo cifre' };
  }
  
  // Check length (13-19 digits for most cards)
  if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    return { isValid: false, error: 'Lunghezza numero carta non valida' };
  }
  
  // Luhn algorithm
  let sum = 0;
  let isEven = false;
  
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i), 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  if (sum % 10 !== 0) {
    return { isValid: false, error: 'Numero carta non valido' };
  }
  
  return { isValid: true };
};

/**
 * Validate form data with multiple validators
 */
export const validateForm = <T extends Record<string, any>>(
  data: T,
  validators: Record<keyof T, Array<(value: any) => { isValid: boolean; error?: string }>>
): { isValid: boolean; errors: Partial<Record<keyof T, string>> } => {
  const errors: Partial<Record<keyof T, string>> = {};
  let isValid = true;
  
  for (const field in validators) {
    const fieldValidators = validators[field];
    const value = data[field];
    
    for (const validator of fieldValidators) {
      const result = validator(value);
      if (!result.isValid) {
        errors[field] = result.error;
        isValid = false;
        break; // Stop at first error for this field
      }
    }
  }
  
  return { isValid, errors };
};

/**
 * Sanitize HTML to prevent XSS
 */
export const sanitizeHtml = (html: string): string => {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
};

/**
 * Validate and sanitize user input
 */
export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>"'&]/g, (char) => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;',
      };
      return entities[char] || char;
    });
};

/**
 * Check if a string contains only alphanumeric characters
 */
export const isAlphanumeric = (str: string): boolean => {
  return /^[a-zA-Z0-9]+$/.test(str);
};

/**
 * Validate Italian fiscal code (basic format check)
 */
export const validateFiscalCode = (code: string): { isValid: boolean; error?: string } => {
  const fiscalCodeRegex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
  
  if (!code) {
    return { isValid: false, error: 'Codice fiscale è richiesto' };
  }
  
  const upperCode = code.toUpperCase();
  
  if (!fiscalCodeRegex.test(upperCode)) {
    return { isValid: false, error: 'Formato codice fiscale non valido' };
  }
  
  return { isValid: true };
};