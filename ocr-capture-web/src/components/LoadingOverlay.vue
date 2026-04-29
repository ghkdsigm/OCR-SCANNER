<template>
  <div class="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-50">
    <div class="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4" />
    <p class="text-white text-sm">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message: string
}>()
</script>
