<script lang="ts">
	// Three.js 라이브러리 및 필요한 모듈 가져오기
	import * as THREE from 'three';
	import { STLLoader } from 'three/addons/loaders/STLLoader.js';
	import { onMount } from 'svelte';

	// 컴포넌트 props 정의
	export let stlUrls: string[]; // STL 파일 URL 배열
	export let unitScale: number = 1; // 모델 크기 조정을 위한 스케일 값
	export let spacing: number = 2; // STL 모델 간의 간격 (더 넓게 조정)

	// 뷰어 크기 props
	export let width: string = '100%'; // 뷰어 너비
	export let height: string = '100%'; // 뷰어 높이

	// Three.js 관련 변수들
	let canvas: HTMLCanvasElement; // 렌더링할 캔버스 요소
	let isDragging = false; // 마우스 드래그 상태
	let isRightClickDragging = false; // 우클릭 드래그 상태
	let previousMousePosition = { x: 0, y: 0 }; // 이전 마우스 위치
	let group: THREE.Group; // 3D 객체들을 그룹화할 컨테이너
	let camera: THREE.PerspectiveCamera; // 3D 씬을 보는 카메라
	let renderer: THREE.WebGLRenderer; // WebGL 렌더러
	let scene: THREE.Scene; // 3D 씬
	let currentZoom = 1; // 현재 줌 레벨
	const minZoom = 0.1; // 최소 줌 레벨
	const maxZoom = 10; // 최대 줌 레벨

	// stlUrls가 변경될 때마다 initScene 호출
	$: {
		if (stlUrls && stlUrls.length > 0) {
			console.log('STL URLs 변경됨:', stlUrls); // URL 로깅
			initScene();
		}
	}

	// 3D 씬 초기화 함수
	function initScene() {
		if (!canvas) return;

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
		const loader = new STLLoader();
		const meshes: THREE.Mesh[] = [];

		try {
			// 각 URL에 대해 순차적으로 로드
			for (const url of stlUrls) {
				console.log('로드 시도 중:', url); // 로드 시도 로깅
				try {
					const geometry = await new Promise<THREE.BufferGeometry>((resolve, reject) => {
						loader.load(
							url,
							(geometry) => {
								resolve(geometry);
							},
							(progress) => {},
							(error) => {
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
				} catch (error) {}
			}

			if (meshes.length > 0) {
				console.log('로드된 메쉬 수:', meshes.length);
				setupScene(meshes);
			} else {
				console.error('로드된 메쉬가 없습니다.');
			}
		} catch (error) {
			console.error('STL 파일 로드 중 오류 발생:', error);
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

		// 렌더링 시작
		animate();
	}

	// 애니메이션 루프 함수
	function animate() {
		if (!renderer || !scene || !camera) return;
		requestAnimationFrame(animate);
		renderer.render(scene, camera);
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
</script>

<div class="canvas-container">
	<canvas
		bind:this={canvas}
		style={`width: ${width}; height: ${height};`}
		on:mousedown={(e) => {
			if (e.button === 2) {
				isDragging = true;
				previousMousePosition = {
					x: e.clientX,
					y: e.clientY
				};
			} else if (e.button === 0) {
				isRightClickDragging = true;
				previousMousePosition = {
					x: e.clientX,
					y: e.clientY
				};
			}
		}}
		on:mousemove={(e) => {
			if (!isDragging && !isRightClickDragging) return;

			const deltaMove = {
				x: e.clientX - previousMousePosition.x,
				y: e.clientY - previousMousePosition.y
			};

			if (isDragging && group) {
				group.rotation.y += deltaMove.x * 0.01;
				group.rotation.x += deltaMove.y * 0.01;
			} else if (isRightClickDragging && group) {
				group.position.x += deltaMove.x * 0.01;
				group.position.z += deltaMove.y * 0.01;
			}

			previousMousePosition = {
				x: e.clientX,
				y: e.clientY
			};
		}}
		on:mouseup={() => {
			isDragging = false;
			isRightClickDragging = false;
		}}
		on:mouseleave={() => {
			isDragging = false;
			isRightClickDragging = false;
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
</div>

<style>
	canvas {
		display: block;
	}
</style>
