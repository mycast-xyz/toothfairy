<script lang="ts">
	// Three.js 라이브러리 및 필요한 모듈 가져오기
	import * as THREE from 'three';
	import { STLLoader } from 'three/addons/loaders/STLLoader.js';
	import { onMount, onDestroy } from 'svelte';

	// 컴포넌트 props 정의
	export let stlUrls: string[]; // STL 파일 URL 배열
	export let unitScale: number = 1; // 모델 크기 조정을 위한 스케일 값
	export let spacing: number = 2; // STL 모델 간의 간격 (더 넓게 조정)

	// 뷰어 크기 props
	export let width: string = '100%'; // 뷰어 너비
	export let height: string = '100%'; // 뷰어 높이

	// Three.js 관련 변수들
	let canvas: HTMLCanvasElement; // 렌더링할 캔버스 요소
	let isRotating = false; // 회전(좌클릭 드래그) 상태
	let isPanning = false; // 이동(우클릭 또는 shift+좌클릭 드래그) 상태
	let previousMousePosition = { x: 0, y: 0 }; // 이전 마우스 위치
	let group: THREE.Group; // 3D 객체들을 그룹화할 컨테이너
	let camera: THREE.PerspectiveCamera; // 3D 씬을 보는 카메라
	let renderer: THREE.WebGLRenderer; // WebGL 렌더러
	let scene: THREE.Scene; // 3D 씬
	let currentZoom = 1; // 현재 줌 레벨
	const minZoom = 0.1; // 최소 줌 레벨
	const maxZoom = 10; // 최대 줌 레벨

	// 시점 초기화를 위해 초기 카메라/타깃 상태 저장
	let initialCameraPosition: THREE.Vector3 | null = null; // 초기 카메라 위치
	let cameraTarget: THREE.Vector3 | null = null; // 카메라가 바라보는 타깃(모델 중심)

	// 애니메이션 루프 제어용 프레임 id
	let animationFrameId: number | null = null;

	// 로딩/에러 상태 (캔버스 위 오버레이 표시용)
	let isLoading = false; // 로드 진행 중 여부
	let loadProgress = 0; // 전체 로드 진행률 (0~100)
	let errorMessage = ''; // 로드 실패 시 에러 메시지

	// stlUrls가 변경될 때마다 initScene 호출
	$: {
		if (stlUrls && stlUrls.length > 0) {
			console.log('[STL Viewer] STL URLs 변경됨:', stlUrls); // URL 로깅
			console.log('[STL Viewer] Props 상태:', { stlUrls, unitScale, width, height });
			initScene();
		} else {
			console.log('[STL Viewer] STL URLs가 비어있음:', stlUrls);
		}
	}

	// 3D 씬 초기화 함수
	function initScene() {
		if (!canvas) return;

		// 이전 렌더러/지오메트리 정리 (재초기화 시 메모리 누수 방지)
		disposeScene();

		// 씬, 카메라, 렌더러 설정
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
		renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

		// 렌더러 설정
		renderer.setSize(canvas.clientWidth, canvas.clientHeight);
		renderer.setClearColor(0xffffff); // 배경색을 흰색으로 설정

		// STL 파일 로드 시작
		loadSTLFiles();
	}

	// STL 파일들을 비동기적으로 로드하는 함수
	async function loadSTLFiles() {
		console.log('[STL Viewer] loadSTLFiles 시작:', {
			stlUrls,
			urlCount: stlUrls.length,
			unitScale,
			canvas: !!canvas
		});

		if (!canvas) {
			console.error('[STL Viewer] Canvas가 아직 준비되지 않음');
			return;
		}

		// 로딩 상태 초기화 (오버레이 표시 시작)
		isLoading = true;
		loadProgress = 0;
		errorMessage = '';

		const loader = new STLLoader();
		const meshes: THREE.Mesh[] = [];
		const totalFiles = stlUrls.length;

		try {
			// 각 URL에 대해 순차적으로 로드
			for (let i = 0; i < stlUrls.length; i++) {
				const url = stlUrls[i];
				console.log(`[STL Viewer] 파일 ${i + 1}/${stlUrls.length} 로드 시도:`, url);

				try {
					const geometry = await new Promise<THREE.BufferGeometry>((resolve, reject) => {
						loader.load(
							url,
							(geometry) => {
								console.log(`[STL Viewer] 파일 ${i + 1} 로드 성공:`, url);
								resolve(geometry);
							},
							(progress) => {
								// 파일별 진행률을 전체 진행률(%)로 환산하여 화면에 반영
								const fileFraction =
									progress.total > 0 ? progress.loaded / progress.total : 0;
								loadProgress = Math.round(((i + fileFraction) / totalFiles) * 100);
							},
							(error) => {
								console.error(`[STL Viewer] 파일 ${i + 1} 로드 실패:`, url, error);
								reject(error);
							}
						);
					});

					// 메쉬 생성 및 설정
					const material = new THREE.MeshNormalMaterial();
					const mesh = new THREE.Mesh(geometry, material);
					mesh.rotation.x = -Math.PI / 2; // 모델을 바닥에 맞게 회전
					mesh.scale.set(unitScale, unitScale, unitScale); // 스케일 적용
					meshes.push(mesh);
					// 파일 하나 완료 시 진행률 갱신
					loadProgress = Math.round(((i + 1) / totalFiles) * 100);
					console.log(`[STL Viewer] 메쉬 ${i + 1} 생성 완료`);
				} catch (error) {
					console.error(`[STL Viewer] 파일 ${i + 1} 처리 중 오류:`, error);
				}
			}

			if (meshes.length > 0) {
				console.log('[STL Viewer] 로드된 메쉬 수:', meshes.length);
				setupScene(meshes);
				isLoading = false;
			} else {
				console.error('[STL Viewer] 로드된 메쉬가 없습니다.');
				errorMessage = 'STL 파일을 불러오지 못했습니다.';
				isLoading = false;
			}
		} catch (error) {
			console.error('[STL Viewer] STL 파일 로드 중 오류 발생:', error);
			errorMessage = 'STL 파일 로드 중 오류가 발생했습니다.';
			isLoading = false;
		}
	}

	/**
	 * 3D 씬에 STL 메쉬들을 배치하고 카메라를 설정하는 함수
	 * @param meshes - 로드된 STL 메쉬 배열
	 */
	function setupScene(meshes: THREE.Mesh[]) {
		// 모든 메쉬를 담을 그룹 생성
		group = new THREE.Group();

		// 모든 메쉬의 최저 Y 좌표 찾기
		let lowestY = Infinity;
		meshes.forEach((mesh) => {
			const boundingBox = new THREE.Box3().setFromObject(mesh);
			const minY = boundingBox.min.y;
			if (minY < lowestY) lowestY = minY;
		});

		// 격자 배열을 위한 계산
		const numCols = Math.ceil(Math.sqrt(meshes.length)); // 열 수 계산
		const numRows = Math.ceil(meshes.length / numCols); // 행 수 계산

		// 모든 메쉬의 최대 크기 계산
		let maxSize = { x: 0, z: 0 };
		meshes.forEach((mesh) => {
			const boundingBox = new THREE.Box3().setFromObject(mesh);
			const size = boundingBox.getSize(new THREE.Vector3());
			maxSize.x = Math.max(maxSize.x, size.x);
			maxSize.z = Math.max(maxSize.z, size.z);
		});

		// 메쉬들을 격자 형태로 배치 (간격 증가)
		const spacingX = maxSize.x * 1.5; // X축 간격을 1.5배로 증가
		const spacingZ = maxSize.z * 1.5; // Z축 간격을 1.5배로 증가

		meshes.forEach((mesh, index) => {
			const row = Math.floor(index / numCols);
			const col = index % numCols;

			const boundingBox = new THREE.Box3().setFromObject(mesh);
			mesh.position.y -= boundingBox.min.y - lowestY; // Y 위치 조정

			// X와 Z 위치 계산 (간격 증가 적용)
			mesh.position.x = (col - (numCols - 1) / 2) * (spacingX + spacing);
			mesh.position.z = (row - (numRows - 1) / 2) * (spacingZ + spacing);

			group.add(mesh);
		});

		// 그룹을 씬에 추가
		scene.add(group);

		// 전체 그룹의 경계 상자를 계산하여 카메라 위치 설정
		const boundingBox = new THREE.Box3().setFromObject(group);
		const center = boundingBox.getCenter(new THREE.Vector3()); // 그룹의 중심점 계산
		const size = boundingBox.getSize(new THREE.Vector3()); // 그룹의 전체 크기 계산
		const maxDimension = Math.max(size.x, size.y, size.z); // 가장 큰 차원 찾기
		const cameraDistance = maxDimension * 2.5; // 카메라 거리 증가

		// 카메라 위치와 시점 설정
		camera.position.set(center.x, cameraDistance, center.z);
		camera.lookAt(center);

		// 시점 초기화를 위한 초기 상태 저장
		initialCameraPosition = camera.position.clone();
		cameraTarget = center.clone();
		currentZoom = 1;

		// 렌더링 시작
		animate();
	}

	// 시점 초기화: 카메라/타깃/그룹 변형을 초기 상태로 되돌림
	function resetView() {
		if (!camera || !initialCameraPosition || !cameraTarget) return;

		camera.position.copy(initialCameraPosition);
		camera.lookAt(cameraTarget);

		if (group) {
			group.rotation.set(0, 0, 0);
			group.position.set(0, 0, 0);
		}

		currentZoom = 1;
	}

	// 애니메이션 루프 함수
	function animate() {
		if (!renderer || !scene || !camera) return;
		animationFrameId = requestAnimationFrame(animate);
		renderer.render(scene, camera);
	}

	// 렌더러/지오메트리/머티리얼 정리 (메모리 누수 방지)
	function disposeScene() {
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}

		if (scene) {
			scene.traverse((object) => {
				const mesh = object as THREE.Mesh;
				if (mesh.geometry) {
					mesh.geometry.dispose();
				}
				if (mesh.material) {
					const material = mesh.material as THREE.Material | THREE.Material[];
					if (Array.isArray(material)) {
						material.forEach((m) => m.dispose());
					} else {
						material.dispose();
					}
				}
			});
		}

		if (renderer) {
			renderer.dispose();
		}
	}

	// 창 크기 변경 시 처리하는 함수
	function handleResize() {
		if (!canvas || !camera || !renderer) return;

		camera.aspect = canvas.clientWidth / canvas.clientHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(canvas.clientWidth, canvas.clientHeight);
	}

	// 컴포넌트 마운트 시 초기화
	onMount(() => {
		// 컴포넌트가 마운트되고 stlUrls가 있을 때 초기 렌더링
		if (stlUrls && stlUrls.length > 0) {
			console.log('컴포넌트 마운트, STL URLs:', stlUrls);
			initScene();
		}
		// 리사이즈 이벤트 리스너 등록
		window.addEventListener('resize', handleResize);
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});

	// 컴포넌트 파괴 시 리소스 정리
	onDestroy(() => {
		disposeScene();
	});
</script>

<div class="canvas-container">
	<canvas
		bind:this={canvas}
		style={`width: ${width}; height: ${height};`}
		on:mousedown={(e) => {
			// 좌클릭 = 회전, 좌클릭+Shift 또는 우클릭 = 이동(pan)
			if (e.button === 0 && !e.shiftKey) {
				isRotating = true;
			} else if (e.button === 2 || (e.button === 0 && e.shiftKey)) {
				isPanning = true;
			} else {
				return;
			}
			previousMousePosition = {
				x: e.clientX,
				y: e.clientY
			};
		}}
		on:mousemove={(e) => {
			if (!isRotating && !isPanning) return;

			const deltaMove = {
				x: e.clientX - previousMousePosition.x,
				y: e.clientY - previousMousePosition.y
			};

			if (isRotating && group) {
				// 좌클릭 드래그 = 회전
				group.rotation.y += deltaMove.x * 0.01;
				group.rotation.x += deltaMove.y * 0.01;
			} else if (isPanning && group) {
				// 우클릭(또는 shift+좌클릭) 드래그 = 이동
				group.position.x += deltaMove.x * 0.01;
				group.position.z += deltaMove.y * 0.01;
			}

			previousMousePosition = {
				x: e.clientX,
				y: e.clientY
			};
		}}
		on:mouseup={() => {
			isRotating = false;
			isPanning = false;
		}}
		on:mouseleave={() => {
			isRotating = false;
			isPanning = false;
		}}
		on:wheel={(e) => {
			e.preventDefault();
			if (!camera) return;

			const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
			currentZoom *= zoomFactor;
			currentZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom));

			camera.position.multiplyScalar(zoomFactor);
		}}
		on:contextmenu={(e) => e.preventDefault()}
	></canvas>

	<!-- 조작 안내 + 시점 초기화 버튼 -->
	<div class="viewer-hint">
		<span>좌클릭 회전 · 우클릭 이동 · 휠 확대</span>
		<button type="button" class="reset-btn" on:click={resetView}>시점 초기화</button>
	</div>

	<!-- 로딩 오버레이 (스피너 + 진행률) -->
	{#if isLoading}
		<div class="overlay">
			<div class="spinner"></div>
			<div class="overlay-text">로딩 중… {loadProgress}%</div>
		</div>
	{/if}

	<!-- 에러 오버레이 -->
	{#if errorMessage}
		<div class="overlay overlay-error">
			<div class="overlay-text">{errorMessage}</div>
		</div>
	{/if}
</div>

<style>
	.canvas-container {
		position: relative;
		width: 100%;
		height: 100%;
	}

	canvas {
		display: block;
	}

	.viewer-hint {
		position: absolute;
		top: 8px;
		right: 8px;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 8px;
		border-radius: 6px;
		background: rgba(0, 0, 0, 0.55);
		color: #fff;
		font-size: 11px;
		line-height: 1.4;
		pointer-events: none;
		z-index: 2;
	}

	.reset-btn {
		pointer-events: auto;
		cursor: pointer;
		border: none;
		border-radius: 4px;
		padding: 3px 8px;
		background: #7c3aed;
		color: #fff;
		font-size: 11px;
	}

	.reset-btn:hover {
		background: #6d28d9;
	}

	.overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		background: rgba(255, 255, 255, 0.75);
		z-index: 3;
	}

	.overlay-error {
		background: rgba(255, 255, 255, 0.9);
	}

	.overlay-text {
		font-size: 13px;
		color: #374151;
	}

	.overlay-error .overlay-text {
		color: #dc2626;
	}

	.spinner {
		width: 36px;
		height: 36px;
		border: 4px solid #d1d5db;
		border-top-color: #7c3aed;
		border-radius: 50%;
		animation: spin 0.9s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
