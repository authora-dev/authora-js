import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';
import { sha256 } from '@noble/hashes/sha256';

ed.etc.sha512Sync = (...m: Uint8Array[]) => sha512(ed.etc.concatBytes(...m));

const encoder = new TextEncoder();

export function toBase64Url(bytes: Uint8Array): string {
  const bin = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export interface KeyPair {
  privateKey: string;
  publicKey: string;
}

export function generateKeyPair(): KeyPair {
  const priv = ed.utils.randomPrivateKey();
  return { privateKey: toBase64Url(priv), publicKey: toBase64Url(ed.getPublicKey(priv)) };
}

export function getPublicKey(privateKeyB64: string): string {
  return toBase64Url(ed.getPublicKey(fromBase64Url(privateKeyB64)));
}

export function buildSignaturePayload(
  method: string,
  path: string,
  timestamp: string,
  body: string | null,
): string {
  const hash = body ? toBase64Url(sha256(encoder.encode(body))) : '';
  return `${method.toUpperCase()}\n${path}\n${timestamp}\n${hash}`;
}

export function sign(message: string, privateKeyB64: string): string {
  return toBase64Url(ed.sign(encoder.encode(message), fromBase64Url(privateKeyB64)));
}

export function verify(message: string, signatureB64: string, publicKeyB64: string): boolean {
  try {
    return ed.verify(fromBase64Url(signatureB64), encoder.encode(message), fromBase64Url(publicKeyB64));
  } catch {
    return false;
  }
}

export function sha256Hash(input: string): string {
  return toBase64Url(sha256(encoder.encode(input)));
}
