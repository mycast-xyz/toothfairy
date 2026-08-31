import type { User } from '../app/model/user/UserRole';

/**
 * 레이아웃 서버 로드.
 *
 * 사용자/권한 판별의 단일 소스(Single Source of Truth)는 `hooks.server.ts` 다.
 *
 * 예전에는 이 파일이 쿠키를 다시 읽어 JWT를 독자적으로 디코딩했다. 그래서
 * hooks 와 판정이 갈리면 hooks 는 all_admin 으로 통과시키는데 레이아웃은
 * user 를 만들지 못하고, SliderMenu 의 `|| 'user'` 기본값에 걸려
 * **전체관리자에게 일반 사용자 메뉴가 렌더링되는** 상태가 될 수 있었다.
 * (쿠키 이름 설정 로딩 타이밍, base64url 디코딩 실패 등 갈릴 여지가 여럿 있었다.)
 *
 * 판정 로직을 두 벌 유지하지 않고 hooks 가 만든 locals.user 를 그대로 내려준다.
 */
export const load = async ({ locals }: { locals: any }): Promise<{ user: User | null }> => {
	return { user: (locals.user as User | null) ?? null };
};
