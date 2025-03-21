<script lang="ts">
	/*
	import { AdminSideMenuService } from '../../service/AdminSiedMenuService';

	// 사이드바 토글 상태
	let isSidebarCollapsed = $state(AdminSideMenuService.SidebarCollapsed);

	// 사이드바 토글 함수
	function toggleSidebar() {
		AdminSideMenuService.toggleSidebar();
	}

	// 사이드바 너비 상태 감시
	let sidebarWidth = $derived($isSidebarCollapsed.collapsed ? 'w-64' : 'w-20');
*/
</script>

<aside
	id="logo-sidebar"
	class="fixed left-0 top-0 z-40 h-screen w-64 -translate-x-full border-r border-gray-200 bg-white pt-20 transition-transform dark:border-gray-700 dark:bg-gray-800 sm:translate-x-0"
	aria-label="Sidebar"
>
	<div class="h-full overflow-y-auto bg-white px-3 pb-4 dark:bg-gray-800">
		<ul class="space-y-2 font-medium">
			<li>
				<a
					href="main"
					class="group flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
				>
					<div
						class="h-5 w-5 text-center text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					>
						<i class="ri-home-6-line text-xl leading-5"></i>
					</div>
					<span
						class="ms-3 text-sm font-medium text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						>대시보드
					</span>
				</a>
			</li>
			<!--
			<hr class="my-8 h-px border-0 bg-gray-100 dark:bg-gray-800" />

			<li>
				<a
					href="request"
					class="group flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
				>
					<div
						class="h-5 w-5 text-center text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					>
						<i class="ri-edit-box-line text-xl leading-5"></i>
					</div>
					<span
						class="ms-3 text-sm font-medium text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						>의뢰서 등록
					</span>
				</a>
			</li>-->

			<hr class="my-8 h-px border-0 bg-gray-100 dark:bg-gray-800" />

			<h3 class="ml-2 text-sm font-medium text-gray-500">마스터치과기공소</h3>
			<li>
				<a
					href="requestlist"
					class="group flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
				>
					<div
						class="h-5 w-5 text-center text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					>
						<i class="ri-folder-user-line text-xl leading-5"></i>
					</div>
					<span
						class="ms-3 text-sm font-medium text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						>의뢰 목록
					</span>
				</a>
			</li>
			<li>
				<a
					href="requestlist"
					class="group flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
				>
					<div
						class="h-5 w-5 text-center text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					>
						<i class="ri-compasses-2-line text-xl leading-5"></i>
					</div>
					<span
						class="ms-3 text-sm font-medium text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						>커스텀 확인
					</span>
				</a>
			</li>
			<!--<li>
				<a
					href="calculate"
					class="group flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
				>
					<div
						class="h-5 w-5 text-center text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					>
						<i class="ri-currency-line text-xl leading-5"></i>
					</div>
					<span
						class="ms-3 text-sm font-medium text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						>정산 목록
					</span>
				</a>
			</li>
			<li>
				<a
					href="delivery"
					class="group flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
				>
					<div
						class="h-5 w-5 text-center text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					>
						<i class="fa-solid fa-truck text-xl leading-5"></i>
					</div>
					<span
						class="ms-3 text-sm font-medium text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						>배송 목록
					</span>
				</a>
			</li>-->

			<hr class="my-8 h-px border-0 bg-gray-100 dark:bg-gray-800" />

			<h3 class="ml-2 text-sm font-medium text-gray-500">공백기공센터</h3>

			<li>
				<a
					href="medicalcost"
					class="group flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
				>
					<div
						class="h-5 w-5 text-center text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					>
						<i class="ri-fingerprint-line text-xl leading-5"></i>
					</div>
					<span
						class="ms-3 text-sm font-medium text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						>출력물 관리
					</span>
				</a>
			</li>
			<li>
				<a
					href="company"
					class="group flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
				>
					<div
						class="h-5 w-5 text-center text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					>
						<i class="ri-file-list-3-line text-xl leading-5"></i>
					</div>
					<span
						class="ms-3 text-sm font-medium text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						>청구서 관리
					</span>
				</a>
			</li>
			<li>
				<a
					href="company"
					class="group flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
				>
					<div
						class="h-5 w-5 text-center text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					>
						<i class="ri-building-line text-xl leading-5"></i>
					</div>
					<span
						class="ms-3 text-sm font-medium text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						>거래처 관리
					</span>
				</a>
			</li>

			<hr class="my-8 h-px border-0 bg-gray-100 dark:bg-gray-800" />

			<li>
				<a
					href="setting"
					class="group flex items-center rounded-lg p-2 text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
				>
					<div
						class="h-5 w-5 text-center text-gray-500 transition duration-75 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
					>
						<i class="ri-settings-2-line text-xl leading-5"></i>
					</div>
					<span
						class="ms-3 text-sm font-medium text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white"
						>설정
					</span>
				</a>
			</li>
		</ul>
	</div>
</aside>

<style lang="scss">
</style>
