export const PHONE_MAX_LENGTH = 11;
export const PHONE_DIGITS_REGEX = /^\d{11}$/;
export const PHONE_PLACEHOLDER = "03001234567";
export const PHONE_VALIDATION_MESSAGE = "Phone number must be exactly 11 digits";

export function sanitizePhoneInput(value: string): string {
  return value.replace(/\D/g, "").slice(0, PHONE_MAX_LENGTH);
}

type PhoneMessages = {
  required: string;
  invalid: string;
};

export function getPhoneValidationError(
  value: string | null | undefined,
  options: { required?: boolean; messages?: PhoneMessages } = {},
): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  const requiredMsg = options.messages?.required ?? "Phone number is required";
  const invalidMsg = options.messages?.invalid ?? "Phone number must be exactly 11 digits";

  if (!digits) {
    return options.required ? requiredMsg : null;
  }
  if (!PHONE_DIGITS_REGEX.test(digits)) {
    return invalidMsg;
  }
  return null;
}
