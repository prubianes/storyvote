import 'server-only'

import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

const SESSION_TTL_SECONDS = 60 * 60 * 8
const COOKIE_PREFIX = 'storyvote_admin_'

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) {
    throw new Error('Missing ADMIN_SESSION_SECRET environment variable.')
  }
  return secret
}

function normalizeRoomSlug(room) {
  return String(room ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 48)
}

function signPayload(payload) {
  return createHmac('sha256', getSessionSecret()).update(payload).digest('hex')
}

export function hashPasscode(passcode) {
  return createHash('sha256').update(String(passcode ?? '')).digest('hex')
}

export function getAdminCookieName(room) {
  return `${COOKIE_PREFIX}${normalizeRoomSlug(room)}`
}

export function createAdminSessionToken(room) {
  const normalizedRoom = normalizeRoomSlug(room)
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const payload = `${normalizedRoom}:${expiresAt}`
  const signature = signPayload(payload)
  return `${payload}:${signature}`
}

export function verifyAdminSessionToken(token, room) {
  if (!token) {
    return false
  }

  const [tokenRoom, expiresAtRaw, signature] = String(token).split(':')
  if (!tokenRoom || !expiresAtRaw || !signature) {
    return false
  }

  const normalizedRoom = normalizeRoomSlug(room)
  if (tokenRoom !== normalizedRoom) {
    return false
  }

  const expiresAt = Number.parseInt(expiresAtRaw, 10)
  if (Number.isNaN(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) {
    return false
  }

  const payload = `${tokenRoom}:${expiresAtRaw}`
  const expectedSignature = signPayload(payload)

  const signatureBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)
  if (signatureBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer)
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
  }
}
