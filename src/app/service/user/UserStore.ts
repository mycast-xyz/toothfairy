import { writable, derived } from 'svelte/store';
import { userApiService, type User, type Role } from './UserApiService';
import { configService } from '../ConfigService';

// 상태 타입 정의
interface UserState {
	users: User[];
	roles: Role[];
	loading: boolean;
	error: string | null;
	successMessage: string | null;
	selectedRole: number | '';
	searchTerm: string;
}

// 초기 상태
const initialState: UserState = {
	users: [],
	roles: [],
	loading: false,
	error: null,
	successMessage: null,
	selectedRole: '',
	searchTerm: ''
};

// 메인 스토어
const createUserStore = () => {
	const { subscribe, set, update } = writable<UserState>(initialState);

	return {
		subscribe,

		// 상태 초기화
		reset: () => set(initialState),

		// 로딩 상태 설정
		setLoading: (loading: boolean) => update((state) => ({ ...state, loading })),

		// 에러 메시지 설정
		setError: (error: string | null) => update((state) => ({ ...state, error })),

		// 성공 메시지 설정
		setSuccessMessage: (message: string | null) =>
			update((state) => ({ ...state, successMessage: message })),

		// 검색어 설정
		setSearchTerm: (searchTerm: string) => update((state) => ({ ...state, searchTerm })),

		// 선택된 역할 설정
		setSelectedRole: (selectedRole: number | '') => update((state) => ({ ...state, selectedRole })),

		// 사용자 목록 설정
		setUsers: (users: User[]) => update((state) => ({ ...state, users })),

		// 역할 목록 설정
		setRoles: (roles: Role[]) => update((state) => ({ ...state, roles })),

		// 사용자 추가
		addUser: (user: User) =>
			update((state) => ({
				...state,
				users: [...state.users, user]
			})),

		// 사용자 업데이트
		updateUser: (updatedUser: User) =>
			update((state) => ({
				...state,
				users: state.users.map((user) => (user.id === updatedUser.id ? updatedUser : user))
			})),

		// 사용자 삭제
		removeUser: (userId: string) =>
			update((state) => ({
				...state,
				users: state.users.filter((user) => user.id !== userId)
			})),

		// 역할 추가
		addRole: (role: Role) =>
			update((state) => ({
				...state,
				roles: [...state.roles, role]
			})),

		// 역할 업데이트
		updateRole: (updatedRole: Role) =>
			update((state) => ({
				...state,
				roles: state.roles.map((role) => (role.id === updatedRole.id ? updatedRole : role))
			})),

		// 역할 삭제
		removeRole: (roleId: number) =>
			update((state) => ({
				...state,
				roles: state.roles.filter((role) => role.id !== roleId)
			})),

		// 필터 초기화
		clearFilters: () =>
			update((state) => ({
				...state,
				searchTerm: '',
				selectedRole: ''
			})),

		// 메시지 자동 제거 (3초 후)
		clearMessage: (type: 'error' | 'success') => {
			setTimeout(() => {
				update((state) => ({
					...state,
					[type === 'error' ? 'error' : 'successMessage']: null
				}));
			}, 3000);
		}
	};
};

// 스토어 인스턴스 생성
export const userStore = createUserStore();

// 필터링된 사용자 목록 (derived store)
export const filteredUsers = derived([userStore], ([$userStore]) => {
	return $userStore.users.filter((user) => {
		const matchesSearch =
			user.name.toLowerCase().includes($userStore.searchTerm.toLowerCase()) ||
			user.email.toLowerCase().includes($userStore.searchTerm.toLowerCase());
		const matchesRole = $userStore.selectedRole === '' || user.roleId === $userStore.selectedRole;
		return matchesSearch && matchesRole;
	});
});

// 승인된 사용자 목록
export const permittedUsers = derived([userStore], ([$userStore]) =>
	$userStore.users.filter((user) => user.isPermitted)
);

// 대기중인 사용자 목록
export const pendingUsers = derived([userStore], ([$userStore]) =>
	$userStore.users.filter((user) => !user.isPermitted)
);

// 사용자 통계
export const userStats = derived([userStore], ([$userStore]) => ({
	total: $userStore.users.length,
	permitted: $userStore.users.filter((user) => user.isPermitted).length,
	pending: $userStore.users.filter((user) => !user.isPermitted).length,
	roles: $userStore.roles.length
}));

// 액션 함수들
export const userActions = {
	/**
	 * 사용자 목록 조회
	 */
	async fetchUsers() {
		userStore.setLoading(true);
		userStore.setError(null);

		try {
			const response = await userApiService.getAllUsers();
			if (response.success && response.data) {
				userStore.setUsers(response.data);
			} else {
				userStore.setError(response.message || '사용자 목록을 불러오는데 실패했습니다.');
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
			userStore.setError(message);
		} finally {
			userStore.setLoading(false);
		}
	},

	/**
	 * 역할 목록 조회
	 */
	async fetchRoles() {
		try {
			const response = await userApiService.getAllRoles();
			if (response.success && response.data) {
				userStore.setRoles(response.data);
			}
		} catch (error) {
			console.error('역할 목록 로드 오류:', error);
		}
	},

	/**
	 * 사용자 승인
	 */
	async permitUser(userId: string) {
		try {
			const response = await userApiService.permitUser(userId);
			if (response.success && response.data) {
				userStore.updateUser(response.data);
				userStore.setSuccessMessage('사용자가 성공적으로 승인되었습니다.');
				userStore.clearMessage('success');
			} else {
				userStore.setError(response.message || '사용자 승인에 실패했습니다.');
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : '사용자 승인 중 오류가 발생했습니다.';
			userStore.setError(message);
		}
	},

	/**
	 * 사용자 역할 및 승인 상태 업데이트
	 */
	async updateUserRole(userId: string, data: { roleId?: number; isPermitted?: boolean }) {
		try {
			const response = await userApiService.updateUserRole(userId, data);
			if (response.success && response.data) {
				userStore.updateUser(response.data);
				userStore.setSuccessMessage('사용자 권한이 성공적으로 수정되었습니다.');
				userStore.clearMessage('success');
			} else {
				userStore.setError(response.message || '사용자 권한 수정에 실패했습니다.');
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : '사용자 권한 수정 중 오류가 발생했습니다.';
			userStore.setError(message);
		}
	},

	/**
	 * 사용자 삭제
	 */
	async deleteUser(userId: string) {
		try {
			const response = await userApiService.deleteUser(userId);
			if (response.success) {
				userStore.removeUser(userId);
				userStore.setSuccessMessage('사용자가 성공적으로 삭제되었습니다.');
				userStore.clearMessage('success');
			} else {
				userStore.setError(response.message || '사용자 삭제에 실패했습니다.');
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : '사용자 삭제 중 오류가 발생했습니다.';
			userStore.setError(message);
		}
	},

	/**
	 * 역할 생성
	 */
	async createRole(data: { name: string; description?: string }) {
		try {
			const response = await userApiService.createRole(data);
			if (response.success && response.data) {
				userStore.addRole(response.data);
				userStore.setSuccessMessage('역할이 성공적으로 생성되었습니다.');
				userStore.clearMessage('success');
			} else {
				userStore.setError(response.message || '역할 생성에 실패했습니다.');
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : '역할 생성 중 오류가 발생했습니다.';
			userStore.setError(message);
		}
	},

	/**
	 * 역할 수정
	 */
	async updateRole(id: number, data: { name?: string; description?: string }) {
		try {
			const response = await userApiService.updateRole(id, data);
			if (response.success && response.data) {
				userStore.updateRole(response.data);
				userStore.setSuccessMessage('역할이 성공적으로 수정되었습니다.');
				userStore.clearMessage('success');
			} else {
				userStore.setError(response.message || '역할 수정에 실패했습니다.');
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : '역할 수정 중 오류가 발생했습니다.';
			userStore.setError(message);
		}
	},

	/**
	 * 역할 삭제
	 */
	async deleteRole(roleId: number) {
		try {
			const response = await userApiService.deleteRole(roleId);
			if (response.success) {
				userStore.removeRole(roleId);
				userStore.setSuccessMessage('역할이 성공적으로 삭제되었습니다.');
				userStore.clearMessage('success');
			} else {
				userStore.setError(response.message || '역할 삭제에 실패했습니다.');
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : '역할 삭제 중 오류가 발생했습니다.';
			userStore.setError(message);
		}
	},

	/**
	 * 초기 데이터 로드
	 */
	async initialize() {
		try {
			// ConfigService가 로드될 때까지 기다리기
			const configLoaded = await configService.waitForConfig(5000);

			if (configLoaded) {
				console.log('✅ UserStore: ConfigService 로드 완료, 데이터 초기화 시작');
			} else {
				console.warn('⚠️ UserStore: ConfigService 로드 타임아웃, 기본 설정으로 진행');
			}

			// 사용자와 역할 데이터를 병렬로 로드
			await Promise.all([
				userActions.fetchUsers().catch((error) => {
					console.error('사용자 목록 로드 실패:', error);
					userStore.setError('사용자 목록을 불러오는데 실패했습니다.');
				}),
				userActions.fetchRoles().catch((error) => {
					console.error('역할 목록 로드 실패:', error);
					// 역할 로드 실패는 에러로 표시하지 않고 콘솔에만 기록
				})
			]);

			console.log('✅ 사용자 관리 데이터 초기화 완료');
		} catch (error) {
			console.error('❌ 데이터 초기화 중 오류:', error);
			userStore.setError('데이터 초기화 중 오류가 발생했습니다.');
		}
	}
};
