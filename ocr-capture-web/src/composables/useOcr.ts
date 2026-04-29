import { ref } from 'vue'
import type { OcrResponse } from '@/types/ocr'

const OCR_API_URL = import.meta.env.VITE_OCR_API_URL as string

export function useOcr() {
  const isUploading = ref(false)
  const ocrError = ref<string | null>(null)

  async function analyzeImage(imageBlob: Blob, receiptId: string): Promise<OcrResponse> {
    isUploading.value = true
    ocrError.value = null

    try {
      const formData = new FormData()
      formData.append('image', imageBlob, 'vehicle-registration.jpg')
      formData.append('receiptId', receiptId)

      const response = await fetch(`${OCR_API_URL}/ocr/vehicle-registration/analyze`, {
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

  return { isUploading, ocrError, analyzeImage }
}
