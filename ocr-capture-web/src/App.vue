<template>
  <div class="w-full h-full bg-black">
    <CaptureView v-if="mode === 'camera'" />
    <UploadView v-else-if="mode === 'upload'" />

    <!-- mode 파라미터가 없거나 잘못된 경우 -->
    <div v-else class="flex flex-col items-center justify-center h-full text-white p-8 text-center">
      <svg class="w-14 h-14 text-yellow-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <p class="text-gray-300 text-sm">
        URL에 <code class="bg-white/10 px-1 rounded">?mode=camera</code> 또는
        <code class="bg-white/10 px-1 rounded">?mode=upload</code> 파라미터가 필요합니다.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getOcrMode } from '@/utils/queryParams'
import CaptureView from '@/views/CaptureView.vue'
import UploadView from '@/views/UploadView.vue'

const mode = getOcrMode()
</script>
