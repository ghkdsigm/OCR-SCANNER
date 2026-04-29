<template>
  <div class="flex flex-col h-full bg-gray-950 text-white">

    <!-- ── OCR 결과 화면 ── -->
    <OcrResultPanel
      v-if="state === 'result' && editableMappedData"
      :data="editableMappedData"
      :is-loading="isUploading"
      :is-saving="isSaving"
      :is-saved="hasSaved"
      @update:data="onDataUpdated"
      @requery="onRequery"
      @save="onSave"
      @payment="onPayment"
    />

    <!-- ── 파일 선택 단계 ── -->
    <template v-else-if="state === 'idle'">
      <div class="flex-1 flex flex-col items-center justify-center p-8 gap-6">
        <div class="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center">
          <svg class="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        <div class="text-center">
          <p class="text-lg font-semibold mb-1">자동차등록증 첨부</p>
          <p class="text-sm text-gray-400">JPG · PNG · WEBP · PDF 지원 (최대 10MB)</p>
        </div>

        <button
          @click="triggerFileInput"
          class="w-full max-w-xs py-4 bg-green-500 text-white text-base font-semibold rounded-xl active:bg-green-600 transition-colors"
        >
          파일 선택
        </button>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
        class="hidden"
        @change="onFileSelected"
      />
    </template>

    <!-- ── 파일 미리보기 단계 ── -->
    <template v-else-if="state === 'preview'">
      <div class="flex-1 flex items-center justify-center p-4 overflow-hidden">
        <img
          v-if="previewSrc && !isPdf"
          :src="previewSrc"
          alt="첨부 파일 미리보기"
          class="max-w-full max-h-full object-contain rounded-lg"
        />
        <div v-else class="flex flex-col items-center gap-4">
          <svg class="w-20 h-20 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="text-sm text-gray-300 text-center break-all px-4">{{ selectedFileName }}</p>
        </div>
      </div>

      <div class="p-4 space-y-3">
        <button
          @click="onConfirm"
          class="w-full py-4 bg-green-500 text-white text-lg font-semibold rounded-xl active:bg-green-600 transition-colors"
        >
          OCR 분석 시작
        </button>
        <button
          @click="onReselect"
          class="w-full py-3 bg-gray-700 text-white text-base rounded-xl active:bg-gray-600 transition-colors"
        >
          다시 선택
        </button>
      </div>
    </template>

    <!-- ── 에러 단계 ── -->
    <div
      v-else-if="state === 'error'"
      class="flex flex-col items-center justify-center h-full p-8 text-center gap-6"
    >
      <svg class="w-16 h-16 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <p class="text-red-300 text-sm">{{ errorMessage }}</p>
      <button
        @click="onReselect"
        class="px-6 py-3 bg-green-500 text-white rounded-xl font-semibold"
      >
        다시 시도
      </button>
    </div>

    <!-- ── 로딩 오버레이 (초기 분석) ── -->
    <LoadingOverlay v-if="state === 'uploading'" message="OCR 분석 중…" />

    <!-- ── 토스트 ── -->
    <Transition name="fade">
      <div
        v-if="toastMessage"
        class="absolute bottom-8 inset-x-4 bg-red-500/90 text-white text-sm text-center py-3 px-4 rounded-xl z-50"
      >
        {{ toastMessage }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import OcrResultPanel from '@/components/OcrResultPanel.vue'
import { useOcr } from '@/composables/useOcr'
import { usePostMessage } from '@/composables/usePostMessage'
import type { CaptureState, OcrResponse, VehicleRegistrationData } from '@/types/ocr'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE_BYTES = 10 * 1024 * 1024

const { isUploading, isSaving, analyzeImage, requeryImage, saveResult } = useOcr()
const { sendOcrCompleted, sendOcrFailed } = usePostMessage()

const fileInputRef = ref<HTMLInputElement | null>(null)
const state = ref<CaptureState>('idle')
const selectedFile = ref<File | null>(null)
const previewSrc = ref<string | null>(null)
const selectedFileName = ref('')
const isPdf = ref(false)
const errorMessage = ref('')
const toastMessage = ref('')
const ocrResult = ref<OcrResponse | null>(null)
const editableMappedData = ref<VehicleRegistrationData | null>(null)
const receiptId = ref('')
const hasSaved = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | null = null

function triggerFileInput() {
  fileInputRef.value?.click()
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  input.value = ''

  if (!ALLOWED_TYPES.includes(file.type)) {
    showToast('JPG, PNG, WEBP, PDF 파일만 첨부할 수 있습니다.')
    return
  }

  if (file.size > MAX_SIZE_BYTES) {
    showToast('파일 크기는 10MB를 초과할 수 없습니다.')
    return
  }

  if (previewSrc.value) {
    URL.revokeObjectURL(previewSrc.value)
    previewSrc.value = null
  }

  selectedFile.value = file
  selectedFileName.value = file.name
  isPdf.value = file.type === 'application/pdf'

  if (!isPdf.value) {
    previewSrc.value = URL.createObjectURL(file)
  }

  state.value = 'preview'
}

function onReselect() {
  if (previewSrc.value) {
    URL.revokeObjectURL(previewSrc.value)
    previewSrc.value = null
  }
  selectedFile.value = null
  selectedFileName.value = ''
  isPdf.value = false
  ocrResult.value = null
  editableMappedData.value = null
  receiptId.value = ''
  hasSaved.value = false
  state.value = 'idle'
}

async function onConfirm() {
  if (!selectedFile.value) return

  receiptId.value = uuidv4()
  hasSaved.value = false
  state.value = 'uploading'

  try {
    const result = await analyzeImage(selectedFile.value, receiptId.value)

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
  if (!selectedFile.value || !receiptId.value || hasSaved.value) return

  try {
    const result = await requeryImage(selectedFile.value, receiptId.value)

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
    showToastSuccess('사전접수가 완료되었습니다.')
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
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 3500)
}

function showToastSuccess(message: string) {
  toastMessage.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 2500)
}
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
