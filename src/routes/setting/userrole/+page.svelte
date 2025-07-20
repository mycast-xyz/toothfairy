<script lang="ts">
	import { onMount } from 'svelte';
	import { WindowService } from '../../../app/service/WindowService';
	import { userStore, userActions } from '../../../app/service/user/UserStore';
	import Toast from '../../../app/view/toast/Toast.svelte';

	// 페이지 로드 시 데이터 가져오기
	onMount(() => {
		console.log('🔄 역할 관리 페이지 로드 시작');
		userActions.initialize();
	});

	// 새 역할 추가 모달 열기
	function openAddRoleModal() {
		WindowService.openModal('userrole-add');
	}

	// 역할 편집 모달 열기
	function openEditRoleModal(role: any) {
		// 역할 데이터를 전역 상태에 저장 (모달에서 접근할 수 있도록)
		(window as any).roleData = role;
		WindowService.openModal('userrole-edit');
	}

	// 역할 삭제 확인 모달 열기
	function openDeleteRoleModal(role: any) {
		(window as any).deleteData = {
			type: 'role',
			id: role.id,
			name: role.name
		};
		WindowService.openModal('delete-confirm');
	}

	// 데이터 재로드
	function reloadData() {
		console.log('🔄 역할 관리 데이터 재로드 시작');
		userStore.setError(null);
		userStore.setSuccessMessage(null);
		userActions.initialize();
	}
</script>

<main class="ml-64 mt-8 min-h-screen flex-1 bg-gray-100 p-8">
	<article class="w-full pl-3 pr-5 pt-3">
		<nav
			class="role-list content-nav-box block h-auto w-full rounded-lg border border-gray-200 bg-white px-4 py-3 shadow"
		>
			<div class="role-list-title flex w-full flex-row items-center justify-between">
				<div class="box-title inline-block items-center">
					<h3 class="py-1 py-px text-3xl font-extrabold text-violet-500">역할 관리</h3>
				</div>
				<div class="flex space-x-2">
					<button
						type="button"
						onclick={reloadData}
						class="rounded-lg bg-gray-500 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-300"
					>
						재로드
					</button>
					<button
						type="button"
						onclick={openAddRoleModal}
						class="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-300"
					>
						새 역할 추가
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

		<!-- 역할 목록 테이블 -->
		<article class="role-list">
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
											역할 이름
										</th>
										<th
											scope="col"
											class="px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400"
										>
											설명
										</th>
										<th
											scope="col"
											class="px-4 py-3.5 text-left text-sm font-normal text-gray-500 dark:text-gray-400"
										>
											사용자 수
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
											<td colspan="4" class="px-4 py-8 text-center text-gray-500"> 로딩 중... </td>
										</tr>
									{:else if $userStore.roles.length === 0}
										<tr>
											<td colspan="4" class="px-4 py-8 text-center text-gray-500">
												역할이 없습니다.
											</td>
										</tr>
									{:else}
										{#each $userStore.roles as role}
											<tr class="hover:bg-gray-50">
												<td class="px-4 py-3.5 text-sm text-gray-900">
													{role.name}
												</td>
												<td class="px-4 py-3.5 text-sm text-gray-900">
													{role.description || '-'}
												</td>
												<td class="px-4 py-3.5 text-sm text-gray-900">
													{$userStore.users.filter((user) => user.roleId === role.id).length}명
												</td>
												<td class="px-4 py-3.5 text-sm text-gray-900">
													<div class="flex space-x-2">
														<button
															type="button"
															onclick={() => openEditRoleModal(role)}
															class="rounded bg-blue-500 px-3 py-1 text-sm font-bold text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
														>
															<i class="ri-edit-line pr-1 text-base"></i>
															편집
														</button>
														<button
															type="button"
															onclick={() => openDeleteRoleModal(role)}
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
