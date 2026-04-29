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
import { useCamera } from '@/composables/useCamera'
import { useOcr } from '@/composables/useOcr'
import { usePostMessage } from '@/composables/usePostMessage'
import type { CaptureState } from '@/types/ocr'

const { videoRef, isReady, cameraError, startCamera, captureFrame } = useCamera()
const { isUploading, analyzeImage } = useOcr()
const { sendOcrCompleted, sendOcrFailed } = usePostMessage()

const state = ref<CaptureState>('idle')
const guideRect = ref({ x: 0, y: 0, width: 0, height: 0 })
const capturedBlob = ref<Blob | null>(null)
const capturedImageSrc = ref<string | null>(null)
const errorMessage = ref('')
const toastMessage = ref('')
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
  state.value = 'capturing'
}

async function onConfirmCapture() {
  if (!capturedBlob.value) return

  const receiptId = uuidv4()
  state.value = 'uploading'

  try {
    const result = await analyzeImage(capturedBlob.value, receiptId)

    if (result.status !== 'COMPLETED') {
      throw new Error('OCR 분석이 완료되지 않았습니다.')
    }

    sendOcrCompleted(result.receiptId, result.mappedData)
    state.value = 'done'
  } catch (err) {
    const message = err instanceof Error ? err.message : 'OCR 분석 중 오류가 발생했습니다.'
    sendOcrFailed(receiptId)
    showToast(message)
    state.value = 'preview'
  }
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
