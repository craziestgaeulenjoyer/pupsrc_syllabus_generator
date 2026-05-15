<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Contracts\Encryption\DecryptException;

/**
 * URL-safe syllabus ID obfuscation.
 *
 * Wraps Laravel's built-in AES-256-CBC encryption (keyed from APP_KEY)
 * so raw database IDs are never exposed in the URL.
 *
 * Usage
 * ─────
 * Encode (controller → Inertia prop / Ziggy route param):
 *   SyllabusHashId::encode(4)  →  "eyJpdiI6Ij..."  (base64url string)
 *
 * Decode (controller ← incoming {hash} route segment):
 *   SyllabusHashId::decode($hash)  →  4  (int) or null on tamper/invalid
 *
 * Register alias in config/app.php 'aliases' if you want facade-style access,
 * or just use the static methods directly.
 */
class SyllabusHashId
{
    /**
     * Encrypt an integer ID into a URL-safe base64 string.
     */
    public static function encode(int $id): string
    {
        $encrypted = Crypt::encryptString((string) $id);

        // Make it URL-safe (standard base64url encoding)
        return rtrim(strtr(base64_encode($encrypted), '+/', '-_'), '=');
    }

    /**
     * Decrypt a URL-safe base64 string back to an integer ID.
     * Returns null if the token is tampered with or malformed.
     */
    public static function decode(string $hash): ?int
    {
        try {
            // Reverse the URL-safe encoding
            $padded    = str_pad(strtr($hash, '-_', '+/'), strlen($hash) % 4, '=', STR_PAD_RIGHT);
            $encrypted = base64_decode($padded, strict: true);

            if ($encrypted === false) {
                return null;
            }

            $plain = Crypt::decryptString($encrypted);

            return ctype_digit($plain) ? (int) $plain : null;
        } catch (DecryptException) {
            return null;
        }
    }
}