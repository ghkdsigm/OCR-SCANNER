# OCR Scanner Start Guide

컴퓨터를 다시 켠 뒤 이 프로젝트를 다시 실행할 때 따라하면 되는 순서입니다.

## 1. 기본 구조

이 프로젝트는 보통 2개를 실행합니다.

- 프론트: `ocr-capture-web`
- 백엔드: `ocr-api`

기본 포트는 아래와 같습니다.

- 프론트: `http://localhost:3339`
- 백엔드: `http://localhost:3000`

## 2. PC에서만 확인할 때

### 터미널 1: 프론트 실행

```powershell
cd C:\workspace\ocr-scanner\ocr-capture-web
npm run dev
```

### 터미널 2: 백엔드 실행

```powershell
cd C:\workspace\ocr-scanner\ocr-api
npm run start
```

### PC에서 접속 주소

- 업로드 화면: `http://localhost:3339/?mode=upload`
- 촬영 화면: `http://localhost:3339/?mode=camera`

## 3. parent-example까지 같이 볼 때

`parent-example.html`도 확인하려면 정적 서버를 하나 더 띄웁니다.

### 터미널 3: 정적 서버 실행

```powershell
cd C:\workspace\ocr-scanner
npx http-server . -p 8080
```

### PC에서 접속 주소

- `http://localhost:8080/parent-example.html`

주의:

- `http://localhost:8080/parent-example` 가 아니라
- `http://localhost:8080/parent-example.html` 로 들어가야 합니다.

## 4. 모바일에서도 같이 테스트할 때

PC에서만 볼 때와 똑같이 먼저 아래 2개를 반드시 실행합니다.

1. 프론트 `npm run dev`
2. 백엔드 `npm run start`

그 다음 모바일에서 접속할 수 있게 공개 터널을 2개 엽니다.

### 터미널 4: 프론트 공개 주소 열기

```powershell
cd C:\workspace\ocr-scanner
ssh -o StrictHostKeyChecking=no -R 80:localhost:3339 nokey@localhost.run
```

실행 후 아래처럼 주소가 나옵니다.

```text
https://xxxxxxxxxxxxxx.lhr.life
```

이 주소가 모바일에서 열 프론트 주소입니다.

### 터미널 5: 백엔드 공개 주소 열기

```powershell
cd C:\workspace\ocr-scanner
ssh -o StrictHostKeyChecking=no -R 80:localhost:3000 nokey@localhost.run
```

실행 후 아래처럼 주소가 나옵니다.

```text
https://yyyyyyyyyyyyyy.lhr.life
```

이 주소가 모바일에서 호출할 API 주소입니다.

## 5. 모바일 테스트 전 꼭 바꿔야 하는 값

터널 주소는 실행할 때마다 바뀔 수 있습니다.

그래서 모바일 테스트 전에 아래 2개 파일 값을 새 주소로 맞춰야 합니다.

### `ocr-capture-web/.env`

```env
VITE_OCR_API_URL=https://백엔드_터널주소
VITE_EXTERNAL_API_URL=https://백엔드_터널주소
VITE_PARENT_ORIGIN=https://프론트_터널주소
```

예시:

```env
VITE_OCR_API_URL=https://yyyyyyyyyyyyyy.lhr.life
VITE_EXTERNAL_API_URL=https://yyyyyyyyyyyyyy.lhr.life
VITE_PARENT_ORIGIN=https://xxxxxxxxxxxxxx.lhr.life
```

### `ocr-api/.env`

```env
ALLOWED_ORIGINS=https://프론트_터널주소,http://localhost:3339,http://localhost:8080,http://localhost:5173
```

예시:

```env
ALLOWED_ORIGINS=https://xxxxxxxxxxxxxx.lhr.life,http://localhost:3339,http://localhost:8080,http://localhost:5173
```

## 6. `.env` 수정 후 해야 하는 것

`.env`를 바꿨으면 서버를 다시 시작합니다.

### 프론트 재시작

기존 `npm run dev`를 끄고 다시 실행:

```powershell
cd C:\workspace\ocr-scanner\ocr-capture-web
npm run dev
```

### 백엔드 재시작

기존 `npm run start`를 끄고 다시 실행:

```powershell
cd C:\workspace\ocr-scanner\ocr-api
npm run start
```

## 7. 모바일에서 접속하는 주소

프론트 터널 주소 기준으로 아래처럼 접속합니다.

- 업로드 화면: `https://프론트_터널주소/?mode=upload`
- 촬영 화면: `https://프론트_터널주소/?mode=camera`

예시:

- `https://xxxxxxxxxxxxxx.lhr.life/?mode=upload`
- `https://xxxxxxxxxxxxxx.lhr.life/?mode=camera`

## 8. parent-example를 모바일에서도 쓰고 싶을 때

먼저 이 서버를 켭니다.

```powershell
cd C:\workspace\ocr-scanner
npx http-server . -p 8080
```

그 다음 필요하면 이것도 공개 터널을 엽니다.

```powershell
cd C:\workspace\ocr-scanner
ssh -o StrictHostKeyChecking=no -R 80:localhost:8080 nokey@localhost.run
```

그리고 아래처럼 접속합니다.

```text
https://parent용_터널주소/parent-example.html?ocrOrigin=https://프론트_터널주소
```

예시:

```text
https://zzzzzzzzzzzzzz.lhr.life/parent-example.html?ocrOrigin=https://xxxxxxxxxxxxxx.lhr.life
```

## 9. 제일 자주 헷갈리는 부분

- PC만 볼 때는 `localhost:3339`, `localhost:3000`만 보면 됩니다.
- 모바일은 `localhost`로 절대 안 들어갑니다. 반드시 공개 터널 주소로 들어가야 합니다.
- 컴퓨터를 재부팅하면 터널 주소는 다시 바뀔 수 있습니다.
- 그래서 모바일 테스트할 때는 터널을 다시 열고 `.env`도 다시 확인해야 합니다.
- `EADDRINUSE: 3000` 에러가 나면 이미 백엔드가 하나 켜져 있는 상태입니다.

## 10. 가장 짧은 실행 순서 요약

### PC만 테스트

1. `ocr-capture-web`에서 `npm run dev`
2. `ocr-api`에서 `npm run start`
3. PC에서 `http://localhost:3339`

### 모바일까지 테스트

1. `ocr-capture-web`에서 `npm run dev`
2. `ocr-api`에서 `npm run start`
3. 프론트 터널 열기
4. 백엔드 터널 열기
5. `ocr-capture-web/.env` 수정
6. `ocr-api/.env` 수정
7. 프론트/백엔드 재시작
8. 모바일에서 프론트 터널 주소 접속
