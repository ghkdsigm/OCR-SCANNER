import type { OcrMode } from '@/types/ocr'

export function getOcrMode(): OcrMode | null {
  const value = new URLSearchParams(window.location.search).get('mode')
  if (value === 'camera' || value === 'upload') return value
  return null
}
