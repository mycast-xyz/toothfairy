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
	<article class="w-full pl-3 pr-5 pt-3">
		<nav
			class="user-list content-nav-box block h-auto w-full rounded-lg border border-gray-200 bg-white px-4 py-3 shadow"
		>
			<div class="user-list-title flex w-full flex-row">
				<div class="box-title inline-block items-center">
					<h3 class="py-1 py-px text-3xl font-extrabold text-violet-500">사용자 관리</h3>
				</div>
			</div>

			<!-- 검색 및 필터 -->
			<div class="nav-search-box mt-4 border-t border-gray-100 pt-4">
				<div class="flex flex-wrap items-center gap-4">
					<!-- 검색 입력 -->
					<div class="relative">
						<input
							type="text"
							class="h-10 w-64 rounded-lg border border-gray-300 px-4 py-1 text-sm focus:border-blue-500 focus:outline-none"
							placeholder="이름 또는 이메일로 검색..."
							bind:value={$userStore.searchTerm}
						/>
					</div>

					<!-- 역할 필터 -->
					<div class="relative">
						<select
							class="h-10 w-40 rounded-lg border border-gray-300 px-4 py-1 text-sm focus:border-blue-500 focus:outline-none"
							bind:value={$userStore.selectedRole}
						>
							<option value="">모든 역할</option>
							{#each $userStore.roles as role}
								<option value={role.id}>{role.name}</option>
							{/each}
						</select>
					</div>

					<!-- 필터 초기화 -->
					<button
						type="button"
						onclick={clearFilters}
						class="h-10 rounded-lg bg-gray-500 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-300"
					>
						초기화
					</button>

					<!-- 새로고침 -->
					<button
						type="button"
						onclick={reloadData}
						class="h-10 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-300"
					>
						재로드
					</button>
				</div>
			</div>
		</nav>

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
			<div class="mt-6 flex flex-col">
				<div class="-mx-4 -my-2 sm:-mx-6 lg:-mx-8">
					<div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
						<div
							class="overflow-auto border border-gray-200 shadow-lg dark:border-gray-700 md:rounded-lg"
						>
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
															class="rounded bg-blue-500 px-3 py-1 text-sm font-bold text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
														>
															<i class="ri-settings-3-line pr-1 text-base"></i>
															권한
														</button>
														{#if !user.isPermitted}
															<button
																type="button"
																onclick={() => userActions.permitUser(user.id)}
																class="rounded bg-green-500 px-3 py-1 text-xs text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
															>
																<i class="ri-check-line"></i>
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
