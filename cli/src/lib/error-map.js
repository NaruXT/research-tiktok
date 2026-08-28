/**
 * A structured error every command throws instead of a bare Error.
 * code: stable, machine-readable, never changes once shipped.
 * message: human sentence.
 * hint: the actual next command that resolves it, when there is one.
 */
export class AppError extends Error {
  constructor(code, message, { hint, cause, exitCode = 1 } = {}) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.hint = hint;
    this.cause = cause;
    this.exitCode = exitCode;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      ...(this.hint ? { hint: this.hint } : {}),
    };
  }
}

export const Codes = {
  AUTH_MISSING: "AUTH_MISSING",
  AUTH_EXPIRED: "AUTH_EXPIRED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  API_ERROR: "API_ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  KILLSWITCH_ACTIVE: "KILLSWITCH_ACTIVE",
  CONFIRMATION_REQUIRED: "CONFIRMATION_REQUIRED",
  NOT_A_TTY: "NOT_A_TTY",
  UNKNOWN_COMMAND: "UNKNOWN_COMMAND",
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
};
