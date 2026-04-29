<template>
  <div class="relative w-full h-full bg-black overflow-hidden">
    <!-- ── 카메라 에러 ── -->
    <div
      v-if="state === 'error' && cameraError"
      class="flex flex-col items-center justify-center h-full text-white p-8 text-center"
    >
      <svg class="w-16 h-16 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <p class="text-red-300 text-sm mb-6">{{ errorMessage }}</p>
      <button
        @click="initCamera"
        class="px-6 py-3 bg-green-500 text-white rounded-xl font-semibold"
      >
        다시 시도
      </button>
    </div>

    <OcrResultPanel
      v-else-if="state === 'result' && editableMappedData"
      :data="editableMappedData"
      :is-loading="isUploading"
      :is-saving="isSaving"
      :is-saved="hasSaved"
      @update:data="onDataUpdated"
      @requery="onRequery"
      @save="onSave"
      @payment="onPayment"
    />

    <!-- ── 프리뷰(미리보기) 단계 ── -->
    <ImagePreview
      v-else-if="state === 'preview' && capturedImageSrc"
      :image-src="capturedImageSrc"
      @confirm="onConfirmCapture"
      @retake="onRetake"
    />

    <!-- ── 카메라 뷰 ── -->
    <template v-else>
      <video
        ref="videoRef"
        class="absolute inset-0 w-full h-full object-cover"
        autoplay
        muted
        playsinline
      />

      <GuideFrame v-model="guideRect" />

      <!-- 촬영 버튼 -->
      <div class="absolute bottom-8 inset-x-0 flex justify-center">
        <button
          @click="onCapture"
          :disabled="!isReady || state === 'uploading'"
          class="w-20 h-20 rounded-full border-4 border-white bg-white/20 flex items-center justify-center
                 active:scale-95 transition-transform disabled:opacity-40"
          aria-label="촬영"
        >
          <div class="w-14 h-14 rounded-full bg-white" />
        </button>
      </div>
    </template>

    <!-- ── 로딩 오버레이 ── -->
    <LoadingOverlay v-if="state === 'uploading'" message="OCR 분석 중…" />

    <!-- ── OCR 처리 중 아닌 일반 에러 토스트 ── -->
    <Transition name="fade">
      <div
        v-if="toastMessage"
        class="absolute bottom-28 inset-x-4 bg-red-500/90 text-white text-sm text-center py-3 px-4 rounded-xl"
      >
        {{ toastMessage }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import GuideFrame from '@/components/GuideFrame.vue'
import ImagePreview from '@/components/ImagePreview.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import OcrResultPanel from '@/components/OcrResultPanel.vue'
import { useCamera } from '@/composables/useCamera'
import { useOcr } from '@/composables/useOcr'
import { usePostMessage } from '@/composables/usePostMessage'
import type { CaptureState, OcrResponse, VehicleRegistrationData } from '@/types/ocr'

const { videoRef, isReady, cameraError, startCamera, captureFrame } = useCamera()
const { isUploading, isSaving, analyzeImage, requeryImage, saveResult } = useOcr()
const { sendOcrCompleted, sendOcrFailed } = usePostMessage()

const state = ref<CaptureState>('idle')
const guideRect = ref({ x: 0, y: 0, width: 0, height: 0 })
const capturedBlob = ref<Blob | null>(null)
const capturedImageSrc = ref<string | null>(null)
const errorMessage = ref('')
const toastMessage = ref('')
const ocrResult = ref<OcrResponse | null>(null)
const editableMappedData = ref<VehicleRegistrationData | null>(null)
const receiptId = ref('')
const hasSaved = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | null = null

async function initCamera() {
  state.value = 'idle'
  await startCamera()
  if (cameraError.value) {
    errorMessage.value = cameraError.value
    state.value = 'error'
  } else {
    state.value = 'capturing'
  }
}

async function onCapture() {
  const blob = await captureFrame(guideRect.value)
  if (!blob) {
    showToast('캡처에 실패했습니다. 다시 시도해 주세요.')
    return
  }
  capturedBlob.value = blob
  capturedImageSrc.value = URL.createObjectURL(blob)
  state.value = 'preview'
}

function onRetake() {
  if (capturedImageSrc.value) {
    URL.revokeObjectURL(capturedImageSrc.value)
    capturedImageSrc.value = null
  }
  capturedBlob.value = null
  ocrResult.value = null
  editableMappedData.value = null
  receiptId.value = ''
  hasSaved.value = false
  state.value = 'capturing'
}

async function onConfirmCapture() {
  if (!capturedBlob.value) return

  receiptId.value = uuidv4()
  hasSaved.value = false
  state.value = 'uploading'

  try {
    const result = await analyzeImage(capturedBlob.value, receiptId.value)

    if (result.status !== 'COMPLETED') {
      throw new Error('OCR 분석이 완료되지 않았습니다.')
    }

    ocrResult.value = result
    editableMappedData.value = { ...result.mappedData }
    state.value = 'result'
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OCR 분석 중 오류가 발생했습니다.'
    sendOcrFailed(receiptId.value)
    showToast(message)
    state.value = 'preview'
  }
}

async function onRequery() {
  if (!capturedBlob.value || !receiptId.value || hasSaved.value) return

  try {
    const result = await requeryImage(capturedBlob.value, receiptId.value)

    if (result.status !== 'COMPLETED') {
      throw new Error('재분석이 완료되지 않았습니다.')
    }

    ocrResult.value = result
    editableMappedData.value = { ...result.mappedData }
    hasSaved.value = false
  } catch (err) {
    const message = err instanceof Error ? err.message : '재분석 중 오류가 발생했습니다.'
    showToast(message)
  }
}

async function onSave() {
  if (!ocrResult.value || !editableMappedData.value || hasSaved.value) return

  try {
    await saveResult({
      ...ocrResult.value,
      mappedData: editableMappedData.value,
    })
    sendOcrCompleted(ocrResult.value.receiptId, editableMappedData.value)
    hasSaved.value = true
    showToast('사전접수가 완료되었습니다.')
    state.value = 'result'
  } catch (err) {
    const message = err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.'
    showToast(message)
  }
}

function onPayment() {
  showToast('성능비 결재 기능은 준비 중입니다.')
}

function onDataUpdated(value: VehicleRegistrationData) {
  editableMappedData.value = value
}

function showToast(message: string) {
  toastMessage.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 3500)
}

onMounted(initCamera)
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
