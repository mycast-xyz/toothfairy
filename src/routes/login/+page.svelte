<script lang="ts">
	import type { PageData } from './$types';
	import { toastStore } from '../../app/service/ToastService';
	import { fade, fly } from 'svelte/transition';

	const { data, form } = $props<{ data: any; form: any }>();
	const currentUrl = data.url;

	// 에러 메시지를 관리할 상태
	let emailError = $state('');
	let passwordError = $state('');

	// 폼의 상태가 변경될 때마다 에러 메시지 업데이트
	$effect(() => {
		emailError = '';
		passwordError = '';
		if (form?.error) {
			if (form.item === 'email') {
				emailError = form.message;
			} else if (form.item === 'password') {
				passwordError = form.message;
			} else {
				// 특정 필드 에러가 아니면 토스트 메시지로 표시
				toastStore.error(form.message);
			}
		}
	});

	const images = [
		'/assets/login/bg_01.webp',
		'/assets/login/bg_02.webp',
		'/assets/login/bg_03.webp',
		'/assets/login/bg_05.webp',
		'/assets/login/bg_04.webp'
	];

	let currentImageIndex = $state(0);

	$effect(() => {
		const interval = setInterval(() => {
			currentImageIndex = (currentImageIndex + 1) % images.length;
		}, 10000);

		return () => clearInterval(interval);
	});
</script>

<div class="h-screen w-screen overflow-hidden overflow-x-hidden bg-gray-100 dark:bg-gray-800">
	<div class="flex h-full w-full items-center justify-center">
		<!-- Left side - Image -->
		<div class="h-full w-2/3 bg-gray-50 md:flex">
			<div class="grid h-full w-full overflow-hidden">
				{#key currentImageIndex}
					<img
						src={images[currentImageIndex]}
						alt="Login illustration"
						class="col-start-1 row-start-1 h-full w-full object-cover object-center"
						transition:fade={{ duration: 1000 }}
					/>
				{/key}
			</div>
		</div>
		<!-- Right side - Login form -->
		<div class="ml-auto flex h-full w-full flex-col justify-center bg-white p-8 md:w-1/3">
			<div class="mb-8">
				<a href="/">
					<img src="/assets/logo/500.png" alt="Logo" class="mb-4 h-20 w-20 rounded-full" />
				</a>
				<h2 class="mb-2 text-2xl font-bold">환영합니다!</h2>
				<p class="text-sm text-gray-600">계정에 로그인해주세요</p>
			</div>

			<form class="flex flex-col gap-4" id="createForm" action="?/login" method="POST">
				<div>
					<label for="idtext" class="mb-1 block text-sm font-medium">아이디</label>
					<input
						type="text"
						id="idtext"
						name="id"
						class="h-14 w-full rounded-lg border border-gray-300 p-4 text-sm font-medium focus:border-violet-500 focus:outline-none"
						placeholder="아이디를 입력하세요"
					/>
				</div>
				<div>
					<label for="password" class="mb-1 block text-sm font-medium">비밀번호</label>
					<input
						type="password"
						id="password"
						name="password"
						class="h-14 w-full rounded-lg border border-gray-300 p-2 text-sm font-medium focus:border-violet-500 focus:outline-none"
						placeholder="비밀번호를 입력하세요"
					/>
				</div>
				<div class="flex items-center justify-between">
					<a href="/login/password" class="text-sm text-violet-600 hover:underline">비밀번호 찾기</a
					>
				</div>
				<button
					type="submit"
					class="mt-2 h-14 rounded-lg bg-gray-600 px-4 py-2 text-white hover:bg-violet-500"
				>
					로그인
				</button>

				<div class="flex items-center pt-4">
					<p class="pr-4 text-base font-normal text-gray-400">아직 회원이 아니신가요?</p>
					<a href="/login/create" class="text-base text-violet-600 hover:underline"> 회원가입 </a>
				</div>
			</form>
		</div>
	</div>
</div>
