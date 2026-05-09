# 메가푸른에셋 랜딩페이지

보험료 비교 및 상담 신청을 위한 고효율 랜딩페이지 프로젝트입니다.

## 기술 스택
- **Frontend**: React 19, Vite 6, Tailwind CSS 4
- **Backend**: Express 5 (API Server)
- **AI**: Google Gemini API (상담 분석용)
- **Deployment**: GitHub Pages (Frontend), Node.js (Backend)

## 주요 기능
- 실시간 보험료 비교 상담 신청 (Google Forms 연동)
- 전문가 1:1 매칭 솔루션 안내
- 개인정보 처리방침 및 필수 고지 사항 모달
- 반응형 디자인 (Mobile First)

## 설치 및 실행
1. 의존성 설치: `npm install`
2. 로컬 실행: `npm run dev`
3. 빌드: `npm run build`

## 환경 변수 설정
`.env` 파일에 다음 항목을 설정하세요:
- `GEMINI_API_KEY`: Google Gemini API 키 (선택 사항)

## 배포 안내
이 프로젝트는 GitHub Pages 배포를 위해 최적화되어 있습니다. `gh-pages` 브랜치를 통해 배포되며, SPA 새로고침 문제를 해결하기 위한 `404.html` 리디렉션 로직이 포함되어 있습니다.
