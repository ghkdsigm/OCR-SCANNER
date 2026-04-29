import type { PostMessagePayload, VehicleRegistrationData } from '@/types/ocr'

const PARENT_ORIGIN = import.meta.env.VITE_PARENT_ORIGIN as string

export function usePostMessage() {
  function sendOcrCompleted(receiptId: string, payload: VehicleRegistrationData) {
    if (!PARENT_ORIGIN || PARENT_ORIGIN === '*') {
      console.error('VITE_PARENT_ORIGIN 환경변수가 올바르게 설정되지 않았습니다.')
      return
    }

    const message: PostMessagePayload = {
      type: 'VEHICLE_REGISTRATION_OCR_COMPLETED',
      receiptId,
      payload,
    }

    window.parent.postMessage(message, PARENT_ORIGIN)
  }

  function sendOcrFailed(receiptId: string) {
    const message: PostMessagePayload = {
      type: 'VEHICLE_REGISTRATION_OCR_FAILED',
      receiptId,
      payload: null,
    }

    window.parent.postMessage(message, PARENT_ORIGIN)
  }

  return { sendOcrCompleted, sendOcrFailed }
}
