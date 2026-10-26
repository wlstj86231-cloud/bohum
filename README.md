# 농기계 자산 수첩 (megapureunasset.kr)

농기계마다 기계 정보, 인수 상태 점검, 정비·사고 이력, 보험 확인 메모를 기록하는 정적 사이트입니다. 운영: 제이 미디어(Media), 보리장터 운영사.

## 구성
- `index.html` — 홈. 기록부 안내, 단계별 자료(`#guides`), 보험 상담 신청 양식과 보험대리점 필수 고지(문구 변경 금지), 그 아래 제이 미디어 운영 정보 꼬리말.
- `farm-assets/` — 농기계 자산 기록부. `assets/farm-record.js`가 브라우저 `localStorage`(`mpa-farm-record-v1`)에만 저장하고, 인쇄·JSON 백업·CSV 내보내기·백업 불러오기를 제공합니다. 서버 전송 없음. 점검 결과 규칙은 페이지의 `#how`에 설명합니다.
- `guides/farm-machinery-purchase-record/` — 중고 농기계 살 때 기록 순서.
- `guides/farm-machinery-inspection-by-type/` — 기록부 인수 점검 항목별 보는 법·적는 법(트랙터·콤바인·이앙기·경운기).
- `guides/farm-machinery-maintenance-log/` — 정비 기록 칸 적는 법, 가상 예시, 봄·장마철·겨울 점검과 보관.
- `guides/farm-machinery-safety-rules/` — 농기계 안전 수칙과 작업 전 점검표.
- `guides/used-farm-machinery-insurance-check/` — 보험 가입 전 질문표(답변 칸, 기록부로 보내기).
- `guides/farm-machinery-incident-record/` — 사고·침수 후 기록 순서.
- `about/`, `contact/`, `method/`(편집 원칙), `corrections/`(정정·수정 기록), `privacy/`, `terms/` — 사이트 정보.
- `assets/site.css`, `assets/sheet.js` — 공통 스타일과 안내 페이지의 기기 저장 스크립트.

외부 라이브러리나 빌드 단계 없이 GitHub Pages(main 브랜치 루트)로 그대로 배포됩니다.

## 페이지를 고칠 때
- 모든 페이지는 같은 머리말(주요 메뉴)과 꼬리말(자료 목록, 사이트 정보 링크, 운영자 줄)을 씁니다. 메뉴나 꼬리말을 바꾸면 모든 페이지에 똑같이 반영하세요.
- 안내·도구 페이지 위쪽에는 `<p class="meta-line">`으로 작성·관리, 게시일(그 페이지가 처음 공개된 커밋 날짜), 최종 확인일(출처를 실제로 다시 대조한 날), 출처 수를 적고, 아래쪽에 `id="sources"` 출처 목록(항목별 확인일)과 "범위와 한계"를 둡니다.
- JSON-LD는 운영자 Organization(`https://jnewmedia.com/#organization`)을 `@id`로 참조합니다. datePublished는 화면의 게시일과 같아야 합니다.
- 내용을 고치면 `corrections/`의 수정 기록에 날짜와 함께 남깁니다.

## 검사
`node scripts/validate-site.mjs` — 사이트맵·canonical·H1·제목/설명 중복·내부 링크·JSON-LD(운영자 @id, 날짜)·꼬리말 운영자 줄과 링크·작성 정보 줄·출처 수·범위와 한계·AdSense 코드와 `ads.txt`가 없는지·홈 화면 필수 고지와 상담 양식 ID를 확인합니다.

## 지켜야 할 것
- 홈 화면 꼬리말의 보험대리점 정보, 개인정보처리방침, 필수안내사항, 심의필 번호, 저작권 줄, 상담 신청 양식(Google Form 주소와 항목 ID)은 그대로 둡니다. 테스트할 때 상담 양식을 실제로 제출하지 마세요.
- 새 보험 상품 설명, 보험료·보장 수치, 보장 약속을 쓰지 않습니다. 공식 자료는 출처와 확인일을 함께 적습니다.
- 확보하지 않은 현장 경험, 전문가 감수, 후기, 이용자 수를 표시하지 않습니다. 설명용 사례는 "가상 예시"로 표시합니다.
- 인증 메타 태그, `robots.txt`의 Daum 인증 줄, 분석 ID는 바꾸지 않습니다.
- 이 사이트는 Google AdSense에 참여하지 않습니다(2026-10-26 결정). 어느 페이지에도 AdSense 코드나 `google-adsense-account` 메타를 넣지 않고, `ads.txt`를 두지 않습니다.
