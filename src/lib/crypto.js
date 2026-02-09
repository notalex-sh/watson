/**
 * Cryptographic utilities for Watson file encryption.
 * Uses Argon2id for key derivation and AES-256-GCM for encryption.
 */

const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ARGON2_TIME_COST = 3;
const ARGON2_MEMORY_COST = 65536;
const ARGON2_PARALLELISM = 1;
const ARGON2_HASH_LENGTH = 32;

/**
 * Loads the Argon2 library from CDN if not already available.
 */
export async function loadArgon2() {
    if (window.argon2) return window.argon2;

    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/argon2-browser@1.18.0/dist/argon2-bundled.min.js';
        script.onload = () => resolve(window.argon2);
        script.onerror = () => reject(new Error('Failed to load Argon2 library'));
        document.head.appendChild(script);
    });
}

/**
 * Derives an AES-GCM key from a password using Argon2id.
 */
export async function deriveKey(password, salt) {
    const argon2 = await loadArgon2();

    const result = await argon2.hash({
        pass: password,
        salt: salt,
        time: ARGON2_TIME_COST,
        mem: ARGON2_MEMORY_COST,
        parallelism: ARGON2_PARALLELISM,
        hashLen: ARGON2_HASH_LENGTH,
        type: argon2.ArgonType.Argon2id
    });

    return await crypto.subtle.importKey(
        'raw',
        result.hash,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypts data with AES-256-GCM using a password-derived key.
 */
export async function encrypt(data, password) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    const key = await deriveKey(password, salt);

    const encoder = new TextEncoder();
    const plaintext = encoder.encode(JSON.stringify(data));

    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        plaintext
    );

    const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(ciphertext), salt.length + iv.length);

    return combined;
}

/**
 * Decrypts AES-256-GCM encrypted data using a password-derived key.
 */
export async function decrypt(encryptedData, password) {
    const data = new Uint8Array(encryptedData);
    const salt = data.slice(0, SALT_LENGTH);
    const iv = data.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const ciphertext = data.slice(SALT_LENGTH + IV_LENGTH);

    const key = await deriveKey(password, salt);

    const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(plaintext));
}

/**
 * Converts an ArrayBuffer to a base64 string.
 */
export function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Converts a base64 string to a Uint8Array.
 */
export function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
}
