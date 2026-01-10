/**
 * Crypto utilities para auth JWT próprio
 * PBKDF2-SHA256 com 150k iterações
 */

/**
 * Gera salt aleatório (16 bytes)
 */
export function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return arrayBufferToBase64(bytes);
}

/**
 * Gera token aleatório (32 bytes para refresh token, 24 bytes para reset)
 */
export function generateToken(bytes: number = 32): string {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes));
  return arrayBufferToBase64url(buffer);
}

/**
 * Hash de senha com PBKDF2-SHA256
 */
export async function hashPassword(
  password: string,
  salt: string,
  iterations: number = 150000
): Promise<string> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const saltBuffer = base64ToArrayBuffer(salt);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256 // 32 bytes
  );

  return arrayBufferToBase64(new Uint8Array(derivedBits));
}

/**
 * Verifica senha
 */
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string,
  iterations: number = 150000
): Promise<boolean> {
  const computed = await hashPassword(password, salt, iterations);
  return computed === hash;
}

/**
 * Hash de token (SHA-256) para armazenar refresh/reset tokens
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return arrayBufferToBase64(new Uint8Array(hashBuffer));
}

/**
 * Gera JWT (access token)
 */
export async function generateJWT(
  payload: Record<string, any>,
  secret: string,
  expiresIn: number = 900 // 15 min
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);

  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn,
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(jwtPayload));

  const message = `${encodedHeader}.${encodedPayload}`;
  const signature = await signHS256(message, secret);

  return `${message}.${signature}`;
}

/**
 * Verifica e decodifica JWT
 */
export async function verifyJWT(
  token: string,
  secret: string
): Promise<Record<string, any> | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const message = `${encodedHeader}.${encodedPayload}`;

  const validSignature = await verifyHS256(message, signature, secret);
  if (!validSignature) return null;

  const payload = JSON.parse(base64urlDecode(encodedPayload));

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) return null;

  return payload;
}

/**
 * Assina mensagem com HMAC-SHA256
 */
async function signHS256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  return arrayBufferToBase64url(new Uint8Array(signature));
}

/**
 * Verifica assinatura HMAC-SHA256
 */
async function verifyHS256(
  message: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  const signatureData = base64urlToArrayBuffer(signature);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  return await crypto.subtle.verify('HMAC', key, signatureData, messageData);
}

// Helpers de encoding
function arrayBufferToBase64(buffer: Uint8Array): string {
  const binary = String.fromCharCode(...buffer);
  return btoa(binary);
}

function arrayBufferToBase64url(buffer: Uint8Array): string {
  return arrayBufferToBase64(buffer)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64ToArrayBuffer(base64: string): Uint8Array {
  // Ensure proper padding for base64
  const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(paddedBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64urlToArrayBuffer(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return base64ToArrayBuffer(padded);
}

function base64urlEncode(str: string): string {
  // Proper UTF-8 encoding for Cloudflare Workers
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  const binary = String.fromCharCode(...bytes);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(str: string): string {
  // Proper UTF-8 decoding for Cloudflare Workers
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

/**
 * Validação de força de senha
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Senha deve ter no mínimo 8 caracteres');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Senha deve conter pelo menos um número');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Senha deve conter pelo menos um caractere especial');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
