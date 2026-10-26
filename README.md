# 농기계 자산 수첩 (megapureunasset.kr)

농기계마다 기계 정보, 인수 상태 점검, 정비·사고 이력, 보험 확인 메모를 기록하는 정적 사이트입니다. 운영: 제이 미디어(Media), 보리장터 운영사.

## 구성
- `index.html` — 홈. 기록부 안내, 단계별 자료, 보험 상담 신청 양식과 보험대리점 필수 고지(문구 변경 금지).
- `farm-assets/` — 농기계 자산 기록부. `assets/farm-record.js`가 브라우저 `localStorage`(`mpa-farm-record-v1`)에만 저장하고, 인쇄·JSON 백업·CSV 내보내기·백업 불러오기를 제공합니다. 서버 전송 없음.
- `guides/farm-machinery-purchase-record/` — 중고 농기계 살 때 기록 순서.
- `guides/used-farm-machinery-insurance-check/` — 보험 가입 전 질문표(답변 칸, 기록부로 보내기).
- `guides/farm-machinery-incident-record/` — 사고·침수 후 기록 순서.
- `method/` — 운영자, 저장 방식, 작성 기준, 정정 방법.
- `assets/site.css`, `assets/sheet.js` — 공통 스타일과 안내 페이지의 기기 저장 스크립트.

외부 라이브러리나 빌드 단계 없이 GitHub Pages(main 브랜치 루트)로 그대로 배포됩니다.

## 검사
`node scripts/validate-site.mjs` — 사이트맵·canonical·H1·내부 링크·JSON-LD·제목 중복을 확인합니다.

## 지켜야 할 것
- 홈 화면 꼬리말의 보험대리점 정보, 개인정보처리방침, 필수안내사항, 심의필 번호는 그대로 둡니다.
- 새 보험 상품 설명, 보험료·보장 수치, 보장 약속을 쓰지 않습니다. 공식 자료는 출처와 확인일을 함께 적습니다.
- 인증 메타 태그, `robots.txt`의 Daum 인증 줄, `ads.txt`, 광고·분석 ID는 바꾸지 않습니다.
