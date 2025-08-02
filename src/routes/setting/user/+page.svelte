<script lang="ts">
	import { onMount } from 'svelte';
	import { WindowService } from '../../../app/service/WindowService';
	import {
		userStore,
		filteredUsers,
		userStats,
		userActions
	} from '../../../app/service/user/UserStore';
	import Toast from '../../../app/view/toast/Toast.svelte';
	import PageHeaderBar from '../../../app/view/components/PageHeaderBar.svelte';

	// 페이지 로드 시 데이터 가져오기
	onMount(() => {
		console.log('🔄 사용자 관리 페이지 로드 시작');
		userActions.initialize();
	});

	// 검색 및 필터 초기화
	function clearFilters() {
		userStore.clearFilters();
	}

	// 데이터 재로드
	function reloadData() {
		console.log('🔄 사용자 관리 데이터 재로드 시작');
		userStore.setError(null);
		userStore.setSuccessMessage(null);
		userActions.initialize();
	}

	// 사용자 삭제 확인 모달 열기
	function openDeleteUserModal(user: any) {
		(window as any).deleteData = {
			type: 'user',
			id: user.id,
			name: user.name
		};
		WindowService.openModal('delete-confirm');
	}

	// 사용자 권한 수정 모달 열기
	function openEditUserRoleModal(user: any) {
		(window as any).userData = user;
		WindowService.openModal('edit-user-role');
	}
</script>

<main class="ml-64 mt-8 min-h-screen flex-1 bg-gray-100 p-8">
	<article class="w-full">
		<PageHeaderBar title="사용자 관리" description="사용자 관리 페이지입니다.">
			<div class="flex flex-wrap items-center gap-2">
				<!-- 필터 초기화 -->
				<button
					type="button"
					onclick={clearFilters}
					class="h-10 rounded-lg bg-gray-500 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-300"
				>
					<i class="ri-delete-bin-line pr-1 text-base"></i>
					초기화
				</button>

				<!-- 새로고침 -->
				<button
					type="button"
					onclick={reloadData}
					class="h-10 rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 focus:outline-none focus:ring-4 focus:ring-violet-300"
				>
					<i class="ri-refresh-line pr-1 text-base"></i>
					재로드
				</button>
			</div>
		</PageHeaderBar>

		<!-- 메시지 표시 -->
		{#if $userStore.error}
			<div class="mt-4 rounded-lg border border-red-400 bg-red-100 px-4 py-3 text-red-700">
				<div class="flex items-center justify-between">
					<span>{$userStore.error}</span>
					<button
						type="button"
						onclick={reloadData}
						class="ml-4 rounded bg-red-500 px-3 py-1 text-sm font-medium text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
					>
						재시도
					</button>
				</div>
			</div>
		{/if}

		{#if $userStore.successMessage}
			<div class="mt-4 rounded-lg border border-green-400 bg-green-100 px-4 py-3 text-green-700">
				{$userStore.successMessage}
			</div>
		{/if}

		<!-- 사용자 목록 테이블 -->
		<article class="user-list">
			<div class="flex flex-col">
				<div class="-mx-4 -my-2 sm:-mx-6 lg:-mx-8">
					<div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
						<div
							class="overflow-auto border border-gray-200 shadow-lg dark:border-gray-700 md:rounded-lg"
						>
							<!-- 상단 탭 및 필터 바 UI (이미지 참고) -->
							<div class="user-tab-bar w-full border-b border-gray-200 bg-white">
								<div class="flex flex-wrap items-center justify-between">
									<!-- 탭 메뉴 -->
									<div class="flex w-full px-2 pt-2">
										<button
											class="tab-btn min-w-24 border-b-2 border-violet-500 px-4 py-3 pt-2 text-sm font-semibold text-violet-600 focus:outline-none"
											disabled
										>
											전체
										</button>
										<button
											class="tab-btn min-w-24 cursor-not-allowed border-b-2 border-transparent px-4 py-3 pt-2 text-sm font-semibold text-gray-400"
											disabled
										>
											승인대기
										</button>
										<button
											class="tab-btn min-w-24 cursor-not-allowed border-b-2 border-transparent px-4 py-3 pt-2 text-sm font-semibold text-gray-400"
											disabled
										>
											승인됨
										</button>
									</div>
									<!-- 오른쪽 필터/검색 -->
									<div
										class="flex w-full items-center gap-2 border-t border-gray-200 bg-gray-100 px-2 py-4"
									>
										<!-- 검색 입력 -->
										<div class="relative">
											<div class="relative">
												<i
													class="ri-search-line absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
												></i>
												<input
													type="text"
													class="h-12 w-80 rounded border border-gray-300 py-4 pl-8 pr-2 text-sm text-gray-600 placeholder-gray-400 focus:border-violet-500 focus:outline-none"
													placeholder="이름을 적어주세요 (예: 홍길동)"
													bind:value={$userStore.searchTerm}
												/>
											</div>
										</div>
										<!-- 상태 필터 select (예시 코드와 동일하게 구현) -->
										<div class="relative ml-auto">
											<select
												class="h-12 w-32 rounded border border-gray-300 px-2 py-1 text-sm focus:border-violet-500 focus:outline-none"
												bind:value={$userStore.selectedRole}
											>
												<option value="">모든 역할</option>
												<option value="admin">관리자</option>
												<option value="user">일반 사용자</option>
												<option value="manager">매니저</option>
											</select>
										</div>
									</div>
								</div>
							</div>
							<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
								<thead class="bg-gray-50 dark:bg-gray-800">
									<tr>
										<th
											scope="col"
											class="px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400"
										>
											이름
										</th>
										<th
											scope="col"
											class="px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400"
										>
											이메일
										</th>
										<th
											scope="col"
											class="px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400"
										>
											역할
										</th>
										<th
											scope="col"
											class="px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400"
										>
											승인 상태
										</th>
										<th
											scope="col"
											class="px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400"
										>
											가입일
										</th>
										<th
											scope="col"
											class="px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400"
										>
											작업
										</th>
									</tr>
								</thead>
								<tbody
									class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900"
								>
									{#if $userStore.loading}
										<tr>
											<td colspan="6" class="px-4 py-8 text-center text-gray-500"> 로딩 중... </td>
										</tr>
									{:else if $filteredUsers.length === 0}
										<tr>
											<td colspan="6" class="px-4 py-8 text-center text-gray-500">
												사용자가 없습니다.
											</td>
										</tr>
									{:else}
										{#each $filteredUsers as user}
											<tr class="hover:bg-gray-50">
												<td class="px-4 py-3.5 text-sm font-normal text-gray-900">
													{user.name}
												</td>
												<td class="px-4 py-3.5 text-sm font-normal text-gray-900">
													{user.email}
												</td>
												<td class="px-4 py-3.5 text-sm font-normal text-gray-900">
													{user.role?.name || '역할 없음'}
												</td>
												<td class="px-4 py-3.5 text-sm font-normal">
													{#if user.isPermitted}
														<span
															class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"
														>
															승인됨
														</span>
													{:else}
														<span
															class="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800"
														>
															대기중
														</span>
													{/if}
												</td>
												<td class="px-4 py-3.5 text-sm font-normal text-gray-900">
													{new Date(user.createdAt).toLocaleDateString('ko-KR')}
												</td>
												<td class="px-4 py-3.5 text-sm font-normal text-gray-900">
													<div class="flex space-x-2">
														<button
															type="button"
															onclick={() => openEditUserRoleModal(user)}
															class="rounded border border-gray-300 px-3 py-1 text-sm font-normal text-gray-500 hover:border-violet-800 hover:bg-violet-500 hover:font-bold hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
														>
															<i class="ri-settings-3-line pr-1 text-base"></i>
															권한
														</button>
														{#if !user.isPermitted}
															<button
																type="button"
																onclick={() => userActions.permitUser(user.id)}
																class="rounded border border-gray-300 px-3 py-1 text-sm font-normal text-gray-500 hover:border-green-600 hover:bg-green-500 hover:font-bold hover:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
															>
																<i class="ri-check-line pr-1 text-base"></i>
																승인
															</button>
														{/if}
														<button
															type="button"
															onclick={() => openDeleteUserModal(user)}
															class="rounded bg-red-500 px-3 py-1 text-sm font-bold text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
														>
															<i class="ri-close-circle-fill pr-1 text-base"></i>
															삭제
														</button>
													</div>
												</td>
											</tr>
										{/each}
									{/if}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
		</article>
	</article>
</main>

<Toast />

<style lang="scss">
	#sidebar {
		&.hover {
			.collapsed-hidden {
				display: block;
			}
		}
		&.active {
			.collapsed-hidden {
				display: block;
			}
		}

		.collapsed-hidden {
			display: none;
		}
	}

	.dropdownMenu {
		&.active {
			.dropdownMenuContnet {
				display: block;
			}
		}
	}

	.nav-search-box {
		button.active {
			background-color: rgb(236 72 153 / var(--tw-text-opacity, 1));
			border-color: rgb(236 72 153 / var(--tw-text-opacity, 1));
			color: white;
		}
	}
</style>
