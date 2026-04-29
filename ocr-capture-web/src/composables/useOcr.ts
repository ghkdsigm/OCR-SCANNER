import { ref } from 'vue'
import type { OcrResponse } from '@/types/ocr'

const OCR_API_URL = import.meta.env.VITE_OCR_API_URL as string
const EXTERNAL_API_URL = import.meta.env.VITE_EXTERNAL_API_URL as string

export function useOcr() {
  const isUploading = ref(false)
  const isSaving = ref(false)
  const ocrError = ref<string | null>(null)

  async function analyzeImage(imageBlob: Blob, receiptId: string): Promise<OcrResponse> {
    return _callOcr(`${OCR_API_URL}/ocr/vehicle-registration/analyze`, imageBlob, receiptId)
  }

  async function requeryImage(imageBlob: Blob, receiptId: string): Promise<OcrResponse> {
    return _callOcr(`${OCR_API_URL}/ocr/vehicle-registration/requery`, imageBlob, receiptId)
  }

  async function _callOcr(url: string, imageBlob: Blob, receiptId: string): Promise<OcrResponse> {
    isUploading.value = true
    ocrError.value = null

    try {
      const formData = new FormData()
      formData.append('image', imageBlob, 'vehicle-registration.jpg')
      formData.append('receiptId', receiptId)

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`OCR 분석 실패 (${response.status}): ${errorBody}`)
      }

      const data: OcrResponse = await response.json()
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OCR 분석 중 오류가 발생했습니다.'
      ocrError.value = message
      throw err
    } finally {
      isUploading.value = false
    }
  }

  async function saveResult(result: OcrResponse): Promise<void> {
    isSaving.value = true

    try {
      const response = await fetch(`${EXTERNAL_API_URL}/external/ocr-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiptId: result.receiptId,
          mappedData: result.mappedData,
          confidence: result.confidence,
          status: result.status,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`저장 실패 (${response.status}): ${errorBody}`)
      }
    } finally {
      isSaving.value = false
    }
  }

  return { isUploading, isSaving, ocrError, analyzeImage, requeryImage, saveResult }
}
