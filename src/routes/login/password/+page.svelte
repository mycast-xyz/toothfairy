<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { toastStore } from '../../../app/service/ToastService';

	const { data } = $props<{ data: any }>();
	const currentUrl = data.url;

	// 이메일 검증 상태
	let isEmailValid = $state(false);
	let emailError = $state('');

	// 비밀번호 검증 상태
	let isPasswordValid = $state(false);
	let passwordError = $state('');

	// 닉네임 검증 상태
	let isNameValid = $state(false);
	let nameError = $state('');

	// 이메일 검증 함수
	const validateEmail = async (email: string) => {
		const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

		if (!email) {
			emailError = '이메일을 입력해주세요.';
			isEmailValid = false;
			return false;
		}

		if (!emailRegex.test(email)) {
			emailError = '올바른 이메일 형식이 아닙니다.';
			isEmailValid = false;
			return false;
		}
		// 이메일 중복 확인을 위한 서버 요청
		try {
			const response = await fetch(`${currentUrl}/api/v0/account/validate/email`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ email })
			});

			if (!response.ok) {
				const data = await response.json();
				emailError = data.resultMsg || '이메일 확인 중 오류가 발생했습니다.';
				isEmailValid = false;
				toastStore.error(emailError);
				return false;
			}
		} catch (error) {
			emailError = '서버 연결 중 오류가 발생했습니다.';
			isEmailValid = false;
			toastStore.error(emailError);
			return false;
		}
		emailError = '';
		isEmailValid = true;
		return true;
	};

	// 비밀번호 검증 함수
	const validatePassword = (password: string, passwordChk: string) => {
		// 비밀번호 최소 길이 검사
		if (password.length < 8) {
			passwordError = '비밀번호는 최소 8자 이상이어야 합니다.';
			isPasswordValid = false;
			return false;
		}

		// 비밀번호 확인 일치 검사
		if (password !== passwordChk) {
			passwordError = '비밀번호가 일치하지 않습니다.';
			isPasswordValid = false;
			return false;
		}

		passwordError = '';
		isPasswordValid = true;
		return true;
	};

	const handleSubmit = async () => {
		const formData = new FormData(document.getElementById('createForm') as HTMLFormElement);
		const data = Object.fromEntries(formData.entries());

		// 이메일 검증
		if (!data.email) {
			emailError = '이메일을 입력해주세요.';
			return;
		}
		if (!validateEmail(data.email as string)) {
			return;
		}
		// 비밀번호 검증
		if (!data.password) {
			passwordError = '비밀번호를 입력해주세요.';
			return;
		}
		if (!data.passwordChk) {
			passwordError = '비밀번호 확인을 입력해주세요.';
			return;
		}
		if (!validatePassword(data.password as string, data.passwordChk as string)) {
			return;
		}

		// 서버 요청
		try {
			const response = await fetch(`${currentUrl}/api/v0/account/create/account`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(data)
			});
			if (!response.ok) {
				const data = await response.json();
				switch (data.item) {
					case 'email':
						emailError = data.resultMsg;
						isEmailValid = false;
						break;
					case 'password':
						passwordError = data.resultMsg;
						isPasswordValid = false;
						break;
					case 'name':
						nameError = data.resultMsg;
						isNameValid = false;
						break;
					case 'user':
						break;
					default:
						break;
				}
				toastStore.error(data.resultMsg ? data.resultMsg : '회원가입에 실패했습니다.');
			} else {
				toastStore.success('회원가입이 완료되었습니다.');
				goto('/login');
			}
		} catch (error) {
			console.error('서버 연결 중 오류가 발생했습니다.', error);
			toastStore.error('서버 연결 중 오류가 발생했습니다.');
		}

		// 회원가입 완료 후 로그인 페이지로 이동
	};
</script>

<div class="h-screen w-screen overflow-hidden overflow-x-hidden bg-gray-100 dark:bg-gray-800">
	<div class="flex h-full w-full items-center justify-center">
		<!-- Left side - Image -->
		<div class="hidden h-full w-2/3 bg-gray-50 md:flex">
			<div class="flex h-full items-center justify-center overflow-hidden">
				<img
					src="/assets/login/bg_02.webp"
					alt="Login illustration"
					class="h-full w-full object-cover object-center"
				/>
			</div>
		</div>
		<!-- Right side - Login form -->
		<div class="ml-auto flex h-full w-full flex-col justify-center bg-white p-8 md:w-1/3">
			<div class="mb-8">
				<img src="/assets/logo/500.png" alt="Logo" class="mb-4 h-20 w-20 rounded-full" />
				<h2 class="mb-2 text-2xl font-bold">비밀번호찾기</h2>
				<p class="text-sm text-gray-600">비밀번호를 찾기 위해 정보를 입력해주세요.</p>
			</div>

			<form class="flex flex-col gap-4" onsubmit={handleSubmit} id="createForm">
				<div>
					<label for="email" class="mb-1 block text-sm font-medium">이메일</label>
					<input
						type="email"
						id="email"
						name="email"
						class="h-14 w-full rounded-lg border border-gray-300 p-4 text-sm font-medium focus:border-orange-500 focus:outline-none"
						placeholder="이메일을 입력하세요"
						oninput={(e) => validateEmail(e.currentTarget.value)}
					/>
					{#if emailError}
						<p class="mt-1 text-sm text-red-500">{emailError}</p>
					{/if}
				</div>
				<div>
					<label for="password" class="mb-1 block text-sm font-medium">비밀번호</label>
					<input
						type="password"
						id="password"
						name="password"
						class="h-14 w-full rounded-lg border border-gray-300 p-2 text-sm font-medium focus:border-orange-500 focus:outline-none"
						placeholder="비밀번호를 입력하세요"
						oninput={(e) => {
							const passwordChk = (document.getElementById('passwordChk') as HTMLInputElement)
								.value;
							validatePassword(e.currentTarget.value, passwordChk);
						}}
					/>
				</div>
				<div>
					<label for="passwordChk" class="mb-1 block text-sm font-medium">비밀번호 확인</label>
					<input
						type="password"
						id="passwordChk"
						name="passwordChk"
						class="h-14 w-full rounded-lg border border-gray-300 p-2 text-sm font-medium focus:border-orange-500 focus:outline-none"
						placeholder="비밀번호를 입력하세요"
						oninput={(e) => {
							const password = (document.getElementById('password') as HTMLInputElement).value;
							validatePassword(password, e.currentTarget.value);
						}}
					/>
					{#if passwordError}
						<p class="mt-1 text-sm text-red-500">{passwordError}</p>
					{/if}
				</div>
				<button
					type="submit"
					class="mt-2 h-14 rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-orange-500"
				>
					비밀번호 찾기
				</button>
				<a
					href="/login"
					class=" mt-2 flex h-14 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
				>
					<span>뒤로가기</span>
				</a>
			</form>
		</div>
	</div>
</div>
