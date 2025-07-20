# 컴포넌트 가이드

## 📋 개요

ToothFairy 프로젝트의 컴포넌트 구조와 사용법에 대한 가이드입니다.

## 🏗️ 컴포넌트 구조

### 디렉토리 구조

```
src/app/view/
├── components/           # 공통 컴포넌트
│   ├── CustomDatePicker.svelte
│   ├── DropdownFilter.svelte
│   ├── PermissionGuard.svelte
│   └── progressBar/
│       └── ProgressBar.svelte
├── desktop/             # 데스크탑 전용 컴포넌트
│   ├── menu/
│   │   ├── HeaderMenu.svelte
│   │   └── SliderMenu.svelte
│   └── request/
│       ├── HeaderBar.svelte
│       ├── PatientInfo.svelte
│       └── TreatmentInfo.svelte
├── mobile/              # 모바일 전용 컴포넌트
│   ├── menu/
│   │   └── HeaderMenu.svelte
│   └── request/
│       ├── HeaderBar.svelte
│       ├── PatientInfo.svelte
│       └── TreatmentInfo.svelte
├── modal/               # 모달 컴포넌트
│   ├── DesktopModal.svelte
│   └── MobileModal.svelte
├── toast/               # 토스트 메시지
│   └── Toast.svelte
└── view-framework/      # 프레임워크 컴포넌트
    └── modal/
        ├── DesktopModal.svelte
        └── MobileModal.svelte
```

## 🎯 공통 컴포넌트

### CustomDatePicker

날짜 선택 컴포넌트

```svelte
<script lang="ts">
	import CustomDatePicker from '../components/CustomDatePicker.svelte';

	let selectedDate = $state(new Date());
</script>

<CustomDatePicker bind:selectedDate placeholder="날짜를 선택하세요" format="yyyy-MM-dd" />
```

**Props:**

- `selectedDate`: 선택된 날짜 (Date 객체)
- `placeholder`: 플레이스홀더 텍스트
- `format`: 날짜 형식 (기본값: "yyyy-MM-dd")
- `disabled`: 비활성화 여부

### DropdownFilter

드롭다운 필터 컴포넌트

```svelte
<script lang="ts">
	import DropdownFilter from '../components/DropdownFilter.svelte';

	const options = [
		{ value: 'all', label: '전체' },
		{ value: 'active', label: '활성' },
		{ value: 'inactive', label: '비활성' }
	];

	let selectedValue = $state('all');
</script>

<DropdownFilter {options} bind:selectedValue placeholder="필터 선택" />
```

**Props:**

- `options`: 옵션 배열 `{value: string, label: string}[]`
- `selectedValue`: 선택된 값
- `placeholder`: 플레이스홀더 텍스트
- `disabled`: 비활성화 여부

### PermissionGuard

권한 기반 접근 제어 컴포넌트

```svelte
<script lang="ts">
	import PermissionGuard from '../components/PermissionGuard.svelte';

	const requiredRoles = ['all_admin', 'all_lab'];
</script>

<PermissionGuard {requiredRoles}>
	<div>관리자만 볼 수 있는 내용</div>
</PermissionGuard>
```

**Props:**

- `requiredRoles`: 필요한 역할 배열
- `fallback`: 권한이 없을 때 표시할 내용 (선택사항)

### ProgressBar

진행률 표시 컴포넌트

```svelte
<script lang="ts">
	import ProgressBar from '../components/progressBar/ProgressBar.svelte';

	let progress = $state(75);
</script>

<ProgressBar {progress} max={100} label="진행률" showPercentage={true} />
```

**Props:**

- `progress`: 현재 진행률 (숫자)
- `max`: 최대값 (기본값: 100)
- `label`: 라벨 텍스트
- `showPercentage`: 퍼센트 표시 여부

## 🖥️ 데스크탑 컴포넌트

### HeaderMenu

데스크탑 헤더 메뉴

```svelte
<script lang="ts">
	import HeaderMenu from '../desktop/menu/HeaderMenu.svelte';

	const title = 'ToothFairy';
	const infoText = '토스트 메시지';
</script>

<HeaderMenu {title} {infoText} />
```

**Props:**

- `title`: 앱 제목
- `infoText`: 정보 텍스트

### SliderMenu

사이드바 메뉴

```svelte
<script lang="ts">
	import SliderMenu from '../desktop/menu/SliderMenu.svelte';

	const data = {
		user: { role: 'all_admin' },
		isMobile: false
	};
</script>

<SliderMenu {data} />
```

**Props:**

- `data`: 사용자 정보 및 환경 설정

### RequestInfo

의뢰서 정보 컴포넌트

```svelte
<script lang="ts">
	import RequestInfo from '../desktop/request/RequestInfo.svelte';

	const data = {
		// 의뢰서 데이터
	};
</script>

<RequestInfo {data} />
```

**구성 컴포넌트:**

- `HeaderBar`: 단계별 헤더
- `PatientInfo`: 환자 정보 입력
- `TreatmentInfo`: 치료 정보 입력

## 📱 모바일 컴포넌트

### MobileHeaderMenu

모바일 헤더 메뉴

```svelte
<script lang="ts">
	import MobileHeaderMenu from '../mobile/menu/HeaderMenu.svelte';

	const title = 'ToothFairy';
	const infoText = '토스트 메시지';
</script>

<MobileHeaderMenu {title} {infoText} />
```

### MobileRequestInfo

모바일 의뢰서 정보

```svelte
<script lang="ts">
	import MobileRequestInfo from '../mobile/request/RequestInfo.svelte';

	const data = {
		// 의뢰서 데이터
	};
</script>

<MobileRequestInfo {data} />
```

## 🪟 모달 컴포넌트

### DesktopModal

데스크탑 모달

```svelte
<script lang="ts">
	import DesktopModal from '../modal/DesktopModal.svelte';
	import { WindowService } from '../../service/WindowService';

	function openModal() {
		WindowService.openModal('user-edit');
	}
</script>

<button on:click={openModal}>모달 열기</button>
<DesktopModal />
```

### MobileModal

모바일 모달

```svelte
<script lang="ts">
	import MobileModal from '../modal/MobileModal.svelte';
</script>

<MobileModal />
```

## 🍞 토스트 컴포넌트

### Toast

토스트 메시지

```svelte
<script lang="ts">
	import Toast from '../toast/Toast.svelte';
	import { ToastService } from '../../service/ToastService';

	function showToast() {
		ToastService.show('성공적으로 저장되었습니다!', 'success');
	}
</script>

<button on:click={showToast}>토스트 표시</button>
<Toast />
```

**토스트 타입:**

- `success`: 성공 메시지 (녹색)
- `error`: 오류 메시지 (빨간색)
- `warning`: 경고 메시지 (노란색)
- `info`: 정보 메시지 (파란색)

## 🏭 서비스 컴포넌트

### WindowService

모달 및 윈도우 관리

```typescript
import { WindowService } from '../service/WindowService';

// 모달 열기
WindowService.openModal('user-edit');

// 모달 닫기
WindowService.closeModal();

// 모달 상태 확인
const isOpen = WindowService.isModalOpen();
```

### ToastService

토스트 메시지 관리

```typescript
import { ToastService } from '../service/ToastService';

// 토스트 표시
ToastService.show('메시지', 'success');

// 토스트 숨기기
ToastService.hide();

// 자동 숨김 설정
ToastService.show('메시지', 'info', 3000); // 3초 후 자동 숨김
```

## 📋 컴포넌트 사용 패턴

### 1. 조건부 렌더링

```svelte
<script lang="ts">
	const { data } = $props<{ data: any }>();
</script>

{#if data.isMobile}
	<MobileComponent />
{:else}
	<DesktopComponent />
{/if}
```

### 2. Props 전달

```svelte
<script lang="ts">
	const { user, settings } = $props<{
		user: any;
		settings: any;
	}>();
</script>

<CustomComponent {user} {settings} onSave={handleSave} />
```

### 3. 이벤트 처리

```svelte
<script lang="ts">
	function handleClick(event: MouseEvent) {
		console.log('클릭됨:', event);
	}

	function handleSubmit(data: any) {
		console.log('제출됨:', data);
	}
</script>

<button on:click={handleClick}>클릭</button>
<FormComponent on:submit={handleSubmit} />
```

### 4. 반응형 상태

```svelte
<script lang="ts">
	let count = $state(0);
	let doubled = $derived(count * 2);

	function increment() {
		count++;
	}
</script>

<div>Count: {count}</div>
<div>Doubled: {doubled}</div>
<button on:click={increment}>증가</button>
```

## 🎨 스타일링 가이드

### Tailwind CSS 사용

```svelte
<template>
	<div class="flex items-center justify-between rounded-lg bg-white p-4 shadow">
		<h1 class="text-2xl font-bold text-gray-900">제목</h1>
		<button class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"> 버튼 </button>
	</div>
</template>
```

### SCSS 사용

```svelte
<style lang="scss">
	.custom-component {
		@apply rounded-lg bg-white p-4;

		.title {
			@apply text-xl font-bold text-gray-900;
		}

		.button {
			@apply rounded bg-blue-500 px-4 py-2 text-white;

			&:hover {
				@apply bg-blue-600;
			}

			&:disabled {
				@apply cursor-not-allowed bg-gray-300;
			}
		}
	}
</style>
```

## 🧪 컴포넌트 테스트

### 단위 테스트 예시

```typescript
import { render, fireEvent } from '@testing-library/svelte';
import CustomButton from './CustomButton.svelte';

describe('CustomButton', () => {
	it('should render with correct text', () => {
		const { getByText } = render(CustomButton, { props: { text: 'Click me' } });
		expect(getByText('Click me')).toBeInTheDocument();
	});

	it('should call onClick when clicked', () => {
		const onClick = vi.fn();
		const { getByText } = render(CustomButton, { props: { onClick } });

		fireEvent.click(getByText('Click me'));
		expect(onClick).toHaveBeenCalled();
	});
});
```

## 📚 관련 문서

- [프로젝트 개요](./PROJECT_OVERVIEW.md)
- [개발 가이드](./DEVELOPMENT_GUIDE.md)
- [API 문서](./API_DOCUMENTATION.md)
- [Svelte 공식 문서](https://svelte.dev/docs)
