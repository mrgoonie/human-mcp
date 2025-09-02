export class HumanMCPError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "HumanMCPError";
  }
}

export class ValidationError extends HumanMCPError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
  }
}

export class ProcessingError extends HumanMCPError {
  constructor(message: string) {
    super(message, "PROCESSING_ERROR", 500);
  }
}

export class APIError extends HumanMCPError {
  constructor(message: string, statusCode: number = 500) {
    super(message, "API_ERROR", statusCode);
  }
}

export function handleError(error: unknown): HumanMCPError {
  if (error instanceof HumanMCPError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new ProcessingError(error.message);
  }
  
  return new ProcessingError("An unknown error occurred");
}