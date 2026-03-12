export interface InitDataValidationResult {
  isValid: boolean;
  userId?: string;
  reason?: string;
}

export function validateTelegramInitData(rawInitData: string): InitDataValidationResult {
  void rawInitData;
  return {
    isValid: false,
    reason: "not_implemented"
  };
}
