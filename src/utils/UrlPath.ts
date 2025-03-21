// 현재 웹페이지의 URL 정보를 가져오는 함수
const getCurrentUrl = () => {
	if (typeof window !== 'undefined') {
		return `http://${window.location.hostname}/`;
	}
	return '';
};

// 현재 웹페이지의 경로(pathname) 정보를 가져오는 함수
const getCurrentPath = () => {
	if (typeof window !== 'undefined') {
		return window.location.pathname;
	}
	return '';
};

// 현재 웹페이지의 도메인 정보를 가져오는 함수
const getCurrentDomain = () => {
	if (typeof window !== 'undefined') {
		return window.location.hostname;
	}
	return '';
};

// URL 관련 정보들을 내보내기
export const urlPath = {
	currentUrl: getCurrentUrl(),
	currentPath: getCurrentPath(),
	currentDomain: getCurrentDomain()
};
