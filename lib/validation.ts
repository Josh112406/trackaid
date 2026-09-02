const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,200}$/;

export function plainText(
  value: unknown,
  { min, max, name }: { min: number; max: number; name: string },
) {
  if (typeof value !== "string") throw new Error(`${name} is required.`);
  const normalized = value.normalize("NFKC").trim();
  if (
    normalized.length < min ||
    normalized.length > max ||
    CONTROL_CHARACTERS.test(normalized)
  ) {
    throw new Error(`${name} must be between ${min} and ${max} characters.`);
  }
  return normalized;
}

export function secretText(
  value: unknown,
  { min, max, name }: { min: number; max: number; name: string },
) {
  if (
    typeof value !== "string" ||
    value.length < min ||
    value.length > max ||
    CONTROL_CHARACTERS.test(value)
  ) {
    throw new Error(`${name} is invalid.`);
  }
  return value;
}

export function strongPassword(value: unknown) {
  const password = secretText(value, {
    min: 12,
    max: 200,
    name: "Password",
  });
  if (!STRONG_PASSWORD_PATTERN.test(password)) {
    throw new Error(
      "Use 12–200 characters with lowercase, uppercase, a number, and a symbol.",
    );
  }
  return password;
}

export function emailAddress(value: unknown) {
  const email = plainText(value, {
    min: 5,
    max: 254,
    name: "Email address",
  }).toLowerCase();
  if (!EMAIL_PATTERN.test(email))
    throw new Error("Enter a valid email address.");
  return email;
}

export function adminInviteRole(value: unknown) {
  if (value !== "reviewer" && value !== "auditor") {
    throw new Error("Choose a valid administrator role.");
  }
  return value;
}

export function httpsUrl(value: unknown, name: string) {
  const input = plainText(value, { min: 9, max: 2048, name });
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error(`${name} must be a complete HTTPS URL.`);
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    !parsed.hostname ||
    parsed.hostname.length > 253
  ) {
    throw new Error(`${name} must be a complete HTTPS URL.`);
  }
  return parsed;
}

export function uuid(value: unknown, name = "Record") {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new Error(`${name} is invalid.`);
  }
  return value;
}

export function pesoAmountToCentavos(value: unknown, name = "Funding goal") {
  if (typeof value !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(value.trim())) {
    throw new Error(`${name} must be a valid Philippine peso amount.`);
  }
  const [whole, decimal = ""] = value.trim().split(".");
  const centavos = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (!Number.isSafeInteger(centavos) || centavos < 10_000) {
    throw new Error(`${name} must be at least PHP 100.`);
  }
  if (centavos > 1_000_000_000_00) {
    throw new Error(`${name} is too large.`);
  }
  return centavos;
}

export function botSignals(value: { website?: unknown; startedAt?: unknown }) {
  if (typeof value.website === "string" && value.website.trim()) return false;
  const startedAt = Number(value.startedAt);
  const elapsed = Date.now() - startedAt;
  return Number.isFinite(startedAt) && elapsed >= 1200 && elapsed <= 86_400_000;
}
