import type { IAssetMime } from './Asset'

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff])

function isWebp(bytes: Buffer): boolean {
  if (bytes.length < 12) return false
  return (
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  )
}

function isSvg(bytes: Buffer): boolean {
  const head = bytes.subarray(0, 256).toString('utf8').replace(/^﻿/, '').trimStart()
  if (head.startsWith('<svg')) return true
  return head.startsWith('<?xml') && bytes.subarray(0, 1024).toString('utf8').includes('<svg')
}

export function detectImageMime(bytes: Buffer): IAssetMime | null {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) return null
  if (bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) return 'image/png'
  if (bytes.subarray(0, JPEG_SIGNATURE.length).equals(JPEG_SIGNATURE)) return 'image/jpeg'
  if (isWebp(bytes)) return 'image/webp'
  if (isSvg(bytes)) return 'image/svg+xml'
  return null
}

export function decodeBase64Payload(payload: string): Buffer {
  const commaIndex = payload.startsWith('data:') ? payload.indexOf(',') : -1
  const base64 = commaIndex >= 0 ? payload.slice(commaIndex + 1) : payload
  return Buffer.from(base64, 'base64')
}
