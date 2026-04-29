<template>
  <div class="absolute inset-0 pointer-events-none" ref="containerRef">
    <!-- 반투명 마스크 (가이드 바깥 영역) -->
    <svg class="absolute inset-0 w-full h-full">
      <defs>
        <mask id="guide-mask">
          <rect width="100%" height="100%" fill="white" />
          <rect
            :x="guide.x"
            :y="guide.y"
            :width="guide.width"
            :height="guide.height"
            rx="8"
            fill="black"
          />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#guide-mask)" />
    </svg>

    <!-- 가이드 프레임 테두리 -->
    <div
      class="absolute border-2 border-green-400 rounded-lg"
      :style="{
        left: `${guide.x}px`,
        top: `${guide.y}px`,
        width: `${guide.width}px`,
        height: `${guide.height}px`,
      }"
    >
      <!-- 모서리 강조 -->
      <span class="absolute -top-0.5 -left-0.5 w-5 h-5 border-t-4 border-l-4 border-green-400 rounded-tl" />
      <span class="absolute -top-0.5 -right-0.5 w-5 h-5 border-t-4 border-r-4 border-green-400 rounded-tr" />
      <span class="absolute -bottom-0.5 -left-0.5 w-5 h-5 border-b-4 border-l-4 border-green-400 rounded-bl" />
      <span class="absolute -bottom-0.5 -right-0.5 w-5 h-5 border-b-4 border-r-4 border-green-400 rounded-br" />
    </div>

    <!-- 안내 문구 -->
    <p
      class="absolute text-white text-sm text-center w-full"
      :style="{ top: `${guide.y + guide.height + 12}px` }"
    >
      자동차등록증을 가이드 안에 맞춰주세요
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

defineProps<{
  modelValue: { x: number; y: number; width: number; height: number }
}>()

const emit = defineEmits<{
  'update:modelValue': [value: { x: number; y: number; width: number; height: number }]
}>()

const containerRef = ref<HTMLDivElement | null>(null)

const guide = ref({ x: 0, y: 0, width: 0, height: 0 })

function computeGuide() {
  const el = containerRef.value?.parentElement
  if (!el) return

  const containerW = el.offsetWidth
  const containerH = el.offsetHeight

  const PADDING_H = 24
  const guideW = containerW - PADDING_H * 2
  // 자동차등록증 비율 약 1.42:1 (A4 가로)
  const guideH = Math.round(guideW / 1.42)
  const guideX = PADDING_H
  const guideY = Math.round((containerH - guideH) / 2)

  guide.value = { x: guideX, y: guideY, width: guideW, height: guideH }
  emit('update:modelValue', guide.value)
}

const ro = new ResizeObserver(computeGuide)

onMounted(() => {
  computeGuide()
  if (containerRef.value?.parentElement) {
    ro.observe(containerRef.value.parentElement)
  }
})

onUnmounted(() => {
  ro.disconnect()
})
</script>
