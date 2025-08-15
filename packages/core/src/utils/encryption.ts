import * as crypto from 'node:crypto';

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Derives an encryption key from a password/secret using PBKDF2
 */
async function deriveKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const passwordBuffer = new TextEncoder().encode(password);

  const passwordKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypts a string using AES-GCM
 */
export async function encrypt(
  text: string,
  encryptionKey?: string,
): Promise<string> {
  if (!text) return text;

  // Use provided key or fallback to environment variable
  const masterKey = encryptionKey || process.env.ENCRYPTION_KEY;
  if (!masterKey) {
    throw new Error('Encryption key not provided');
  }

  try {
    // Generate random IV and salt
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const salt = crypto.getRandomValues(new Uint8Array(32));

    // Derive key from master key and salt
    const key = await deriveKey(masterKey, salt);

    // Encrypt the text
    const textBuffer = new TextEncoder().encode(text);
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      textBuffer,
    );

    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(
      salt.length + iv.length + encryptedBuffer.byteLength,
    );
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedBuffer), salt.length + iv.length);

    // Return base64 encoded result
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    throw new Error(
      `Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Decrypts a string that was encrypted with the encrypt function
 */
export async function decrypt(
  encryptedText: string,
  encryptionKey?: string,
): Promise<string> {
  if (!encryptedText) return encryptedText;

  // Use provided key or fallback to environment variable
  const masterKey = encryptionKey || process.env.ENCRYPTION_KEY;
  if (!masterKey) {
    throw new Error('Encryption key not provided');
  }

  try {
    // Decode base64
    const combined = Uint8Array.from(atob(encryptedText), (c) =>
      c.charCodeAt(0),
    );

    // Extract salt, iv, and encrypted data
    const salt = combined.slice(0, 32);
    const iv = combined.slice(32, 32 + IV_LENGTH);
    const encryptedData = combined.slice(32 + IV_LENGTH);

    // Derive key from master key and salt
    const key = await deriveKey(masterKey, salt);

    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      encryptedData,
    );

    // Convert back to string
    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Validates that the encryption setup is working correctly
 */
export async function validateEncryption(
  encryptionKey?: string,
): Promise<boolean> {
  try {
    const testData = 'test-encryption-validation';
    const encrypted = await encrypt(testData, encryptionKey);
    const decrypted = await decrypt(encrypted, encryptionKey);
    return decrypted === testData;
  } catch {
    return false;
  }
}
