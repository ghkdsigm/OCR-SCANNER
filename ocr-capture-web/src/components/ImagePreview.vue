<template>
  <div class="flex flex-col h-full bg-black">
    <div class="flex-1 flex items-center justify-center p-4">
      <img
        :src="imageSrc"
        alt="촬영된 자동차등록증"
        class="max-w-full max-h-full object-contain rounded-lg"
      />
    </div>

    <div class="p-4 space-y-3">
      <button
        @click="emit('confirm')"
        class="w-full py-4 bg-green-500 text-white text-lg font-semibold rounded-xl active:bg-green-600 transition-colors"
      >
        OCR 분석 시작
      </button>
      <button
        @click="emit('retake')"
        class="w-full py-3 bg-gray-700 text-white text-base rounded-xl active:bg-gray-600 transition-colors"
      >
        다시 촬영
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  imageSrc: string
}>()

const emit = defineEmits<{
  confirm: []
  retake: []
}>()
</script>
