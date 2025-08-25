import { useState, useCallback, useMemo } from 'react';
import { ErrorMessageConfig, createValidationError, ERROR_MESSAGES } from '../utils/errorMessages';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
  email?: boolean;
  password?: boolean;
}

export interface FieldConfig {
  rules: ValidationRule;
  label: string;
}

export interface FormConfig {
  [fieldName: string]: FieldConfig;
}

export interface FormErrors {
  [fieldName: string]: ErrorMessageConfig | undefined;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: FormErrors;
  hasErrors: boolean;
  getFieldError: (fieldName: string) => ErrorMessageConfig | undefined;
  validateField: (fieldName: string, value: any) => ErrorMessageConfig | undefined;
  validateForm: (data: Record<string, any>) => boolean;
  clearErrors: () => void;
  clearFieldError: (fieldName: string) => void;
  setFieldError: (fieldName: string, error: ErrorMessageConfig) => void;
}

/**
 * Hook per la validazione dei form con messaggi di errore migliorati
 */
export const useFormValidation = (config: FormConfig): FormValidationResult => {
  const [errors, setErrors] = useState<FormErrors>({});

  const validateField = useCallback((fieldName: string, value: any): ErrorMessageConfig | undefined => {
    const fieldConfig = config[fieldName];
    if (!fieldConfig) return undefined;

    const { rules, label } = fieldConfig;
    const stringValue = String(value || '').trim();

    // Required validation
    if (rules.required && (!value || stringValue === '')) {
      return {
        ...ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD,
        message: `${label} è obbligatorio`,
        description: `Il campo "${label}" deve essere compilato per continuare.`,
      };
    }

    // Skip other validations if field is empty and not required
    if (!stringValue && !rules.required) {
      return undefined;
    }

    // Email validation
    if (rules.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(stringValue)) {
        return {
          ...ERROR_MESSAGES.VALIDATION.INVALID_EMAIL,
          description: `Inserisci un indirizzo email valido per "${label}" (es. nome@esempio.com).`,
        };
      }
    }

    // Password validation
    if (rules.password) {
      if (stringValue.length < 8) {
        return {
          type: 'validation',
          severity: 'error',
          title: 'Password troppo corta',
          message: `${label} deve essere di almeno 8 caratteri`,
          description: 'Scegli una password più lunga per garantire la sicurezza del tuo account.',
        };
      }

      // Check password strength
      let score = 0;
      if (/[a-z]/.test(stringValue)) score++;
      if (/[A-Z]/.test(stringValue)) score++;
      if (/[0-9]/.test(stringValue)) score++;
      if (/[^A-Za-z0-9]/.test(stringValue)) score++;
      if (stringValue.length >= 12) score++;

      if (score < 3) {
        return {
          ...ERROR_MESSAGES.VALIDATION.WEAK_PASSWORD,
          description: 'Usa una combinazione di lettere maiuscole, minuscole, numeri e simboli per rendere la password più sicura.',
        };
      }
    }

    // Min length validation
    if (rules.minLength && stringValue.length < rules.minLength) {
      return {
        type: 'validation',
        severity: 'error',
        title: 'Testo troppo corto',
        message: `${label} deve essere di almeno ${rules.minLength} caratteri`,
        description: `Inserisci almeno ${rules.minLength} caratteri per "${label}".`,
      };
    }

    // Max length validation
    if (rules.maxLength && stringValue.length > rules.maxLength) {
      return {
        type: 'validation',
        severity: 'error',
        title: 'Testo troppo lungo',
        message: `${label} non può superare ${rules.maxLength} caratteri`,
        description: `Riduci il testo di "${label}" a massimo ${rules.maxLength} caratteri.`,
      };
    }

    // Pattern validation
    if (rules.pattern && !rules.pattern.test(stringValue)) {
      return {
        type: 'validation',
        severity: 'error',
        title: 'Formato non valido',
        message: `${label} non ha un formato valido`,
        description: `Verifica che "${label}" rispetti il formato richiesto.`,
      };
    }

    // Custom validation
    if (rules.custom) {
      const customResult = rules.custom(value);
      if (customResult !== true) {
        return {
          type: 'validation',
          severity: 'error',
          title: 'Validazione personalizzata',
          message: typeof customResult === 'string' ? customResult : `${label} non è valido`,
          description: 'Correggi il valore inserito secondo i requisiti specificati.',
        };
      }
    }

    return undefined;
  }, [config]);

  const validateForm = useCallback((data: Record<string, any>): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    Object.keys(config).forEach(fieldName => {
      const error = validateField(fieldName, data[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [config, validateField]);

  const getFieldError = useCallback((fieldName: string): ErrorMessageConfig | undefined => {
    return errors[fieldName];
  }, [errors]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const setFieldError = useCallback((fieldName: string, error: ErrorMessageConfig) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: error,
    }));
  }, []);

  const hasErrors = useMemo(() => {
    return Object.keys(errors).length > 0;
  }, [errors]);

  const isValid = useMemo(() => {
    return !hasErrors;
  }, [hasErrors]);

  return {
    isValid,
    errors,
    hasErrors,
    getFieldError,
    validateField,
    validateForm,
    clearErrors,
    clearFieldError,
    setFieldError,
  };
};

/**
 * Hook semplificato per validazione di singoli campi
 */
export const useFieldValidation = (rules: ValidationRule, label: string) => {
  const config = useMemo(() => ({
    field: { rules, label }
  }), [rules, label]);
  
  const validation = useFormValidation(config);
  
  return {
    error: validation.getFieldError('field'),
    validate: (value: any) => validation.validateField('field', value),
    clearError: () => validation.clearFieldError('field'),
    setError: (error: ErrorMessageConfig) => validation.setFieldError('field', error),
  };
};

export default useFormValidation;