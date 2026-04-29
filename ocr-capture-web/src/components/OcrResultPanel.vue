<template>
  <div class="flex flex-col h-full bg-gray-950 text-white">
    <!-- 로딩 오버레이 (다시 조회 중) -->
    <LoadingOverlay v-if="isLoading || isSaving" :message="isSaving ? '사전접수 저장 중…' : '재분석 중…'" />

    <!-- 결과 데이터 -->
    <div class="flex-1 overflow-y-auto p-4">
      <h2 class="text-center text-sm font-bold text-green-400 mb-3">자동차등록증 분석 결과</h2>
      <div class="divide-y divide-gray-800">
        <div
          v-for="row in rows"
          :key="row.key"
          class="py-2"
        >
          <label class="block text-gray-400 text-xs leading-5 mb-1">{{ row.label }}</label>
          <input
            :value="row.value"
            :disabled="isFieldDisabled"
            type="text"
            class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-green-500 disabled:opacity-60"
            :placeholder="`${row.label} 입력`"
            @input="updateField(row.key, $event)"
          />
        </div>
      </div>
    </div>

    <!-- 3개 버튼 -->
    <div class="p-3 pb-safe">
      <div class="flex gap-2">
        <button
          @click="emit('requery')"
          :disabled="isActionDisabled"
          class="flex-1 py-3 bg-gray-700 text-white text-xs font-semibold rounded-xl
                 active:bg-gray-600 transition-colors disabled:opacity-40"
        >
          다시 조회하기
        </button>
        <button
          @click="emit('save')"
          :disabled="isActionDisabled || isSaved"
          class="flex-1 py-3 bg-green-600 text-white text-xs font-semibold rounded-xl
                 active:bg-green-700 transition-colors disabled:opacity-40"
        >
          {{ isSaved ? '사전접수 완료' : '사전접수(저장)' }}
        </button>
        <button
          @click="emit('payment')"
          :disabled="isActionDisabled"
          class="flex-1 py-3 bg-blue-600 text-white text-xs font-semibold rounded-xl
                 active:bg-blue-700 transition-colors disabled:opacity-40"
        >
          성능비 결재
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LoadingOverlay from './LoadingOverlay.vue'
import type { VehicleRegistrationData } from '@/types/ocr'

const props = defineProps<{
  data: VehicleRegistrationData
  isLoading: boolean
  isSaving: boolean
  isSaved: boolean
}>()

const emit = defineEmits<{
  'update:data': [value: VehicleRegistrationData]
  requery: []
  save: []
  payment: []
}>()

const FIELD_LABELS: Record<keyof VehicleRegistrationData, string> = {
  carNumber:             '자동차등록번호',
  carType:               '차종',
  purpose:               '용도',
  carName:               '차명',
  modelInfo:             '형식/모델연도',
  vin:                   '차대번호',
  engineType:            '원동기형식',
  displacement:          '배기량(cc)',
  passengerCapacity:     '승차정원',
  maxLoadCapacity:       '최대적재량',
  fuelType:              '연료',
  location:              '사용본거지',
  ownerName:             '소유자 성명',
  firstRegistrationDate: '최초등록일',
  inspectionValidity:    '검사유효기간',
}

const rows = computed(() =>
  (Object.keys(FIELD_LABELS) as (keyof VehicleRegistrationData)[]).map((key) => ({
    key,
    label: FIELD_LABELS[key],
    value: props.data[key] ?? '',
  }))
)

const isActionDisabled = computed(() => props.isLoading || props.isSaving || props.isSaved)
const isFieldDisabled = computed(() => props.isLoading || props.isSaving || props.isSaved)

function updateField(key: keyof VehicleRegistrationData, event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:data', {
    ...props.data,
    [key]: target.value,
  })
}
</script>
