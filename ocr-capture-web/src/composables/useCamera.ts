import { ref, onUnmounted } from 'vue'

export function useCamera() {
  const videoRef = ref<HTMLVideoElement | null>(null)
  const stream = ref<MediaStream | null>(null)
  const cameraError = ref<string | null>(null)
  const isReady = ref(false)

  async function startCamera() {
    cameraError.value = null
    isReady.value = false

    try {
      stream.value = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      if (videoRef.value) {
        videoRef.value.srcObject = stream.value
        await videoRef.value.play()
        isReady.value = true
      }
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          cameraError.value = '카메라 접근 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.'
        } else if (err.name === 'NotFoundError') {
          cameraError.value = '카메라를 찾을 수 없습니다.'
        } else {
          cameraError.value = `카메라 오류: ${err.message}`
        }
      } else {
        cameraError.value = '카메라를 시작할 수 없습니다.'
      }
    }
  }

  function stopCamera() {
    stream.value?.getTracks().forEach((track) => track.stop())
    stream.value = null
    isReady.value = false
  }

  // guide 영역 기준으로 crop된 이미지 blob 반환 (toBlob은 비동기이므로 Promise 반환)
  function captureFrame(guideRect: {
    x: number
    y: number
    width: number
    height: number
  }): Promise<Blob | null> {
    return new Promise((resolve) => {
      const video = videoRef.value
      if (!video || !isReady.value) return resolve(null)

      const canvas = document.createElement('canvas')
      canvas.width = guideRect.width
      canvas.height = guideRect.height

      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(null)

      // video 실제 해상도 vs 표시 크기 비율
      const scaleX = video.videoWidth / video.offsetWidth
      const scaleY = video.videoHeight / video.offsetHeight

      ctx.drawImage(
        video,
        guideRect.x * scaleX,
        guideRect.y * scaleY,
        guideRect.width * scaleX,
        guideRect.height * scaleY,
        0,
        0,
        guideRect.width,
        guideRect.height,
      )

      canvas.toBlob(resolve, 'image/jpeg', 0.92)
    })
  }

  onUnmounted(() => {
    stopCamera()
  })

  return { videoRef, isReady, cameraError, startCamera, stopCamera, captureFrame }
}
