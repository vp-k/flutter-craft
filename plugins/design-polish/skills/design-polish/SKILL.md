---
name: design-polish
description: 디자인 레퍼런스 기반 폴리싱. 트렌드 검색, Gap 분석, WCAG 접근성 체크, 개선안 도출. /design-polish 명령으로 실행.
allowed-tools: Read, Write, Glob, Grep, Bash, WebSearch, Edit
version: "1.0.0"
---

# 디자인 폴리싱 스킬

디자인 레퍼런스 사이트에서 트렌드를 검색하고, 현재 프로젝트와 비교하여 개선안을 도출합니다.
WCAG 기본 접근성 체크를 포함합니다.

## 인수

- `--apply`: (옵션) 개선안을 코드에 직접 적용
- `--wcag-only`: (옵션) WCAG 접근성 체크만 수행
- `--no-wcag`: (옵션) WCAG 체크 생략
- $1: (옵션) 레퍼런스 사이트 (미지정시 프로젝트 유형에 맞게 자동 선택)
- $2: (옵션) 기능 키워드 (미지정시 전체 디자인 폴리싱)

## 사용 예시

```
/design-polish                    # 전체 자동 폴리싱 + WCAG 체크
/design-polish --apply            # 폴리싱 + 코드 적용
/design-polish --wcag-only        # WCAG 접근성 체크만
/design-polish mobbin             # Mobbin에서 검색
/design-polish godly hero         # Godly에서 hero 검색
/design-polish --apply godly hero # hero 폴리싱 + 코드 적용
```

---

## 실행 플로우 개요

```
전제조건 확인
    ↓
0단계: 프로젝트 분석 + 현재 스크린샷 캡처 [Glob, Read, Bash]
    ↓
1단계: WCAG 접근성 체크 (axe-core) [Bash, Read]
    ↓
2단계: 레퍼런스 사이트 선택
    ↓
3단계: 트렌드 검색 → 레퍼런스 캡처 [WebSearch, Bash]
    ↓
4단계: Gap 분석 (이미지 비교 + 접근성 비교) [Read]
    ↓
5단계: 개선안 도출
    ↓
6단계: 결과 출력
    ↓
7단계: 코드 적용 (--apply 시) [Edit]
```

---

## 전제조건 확인

실행 전 다음 조건을 확인합니다:

### 1. 개발 서버 실행 확인

```bash
# Mac/Linux - 서버 상태 확인
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

```powershell
# Windows PowerShell - 서버 상태 확인
try { (Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing -TimeoutSec 5).StatusCode } catch { 0 }
```

**자동 포트 감지** (서버가 3000이 아닐 수 있음):

```bash
# Mac/Linux - 실행 중인 개발 서버 포트 탐지
lsof -i -P | grep LISTEN | grep -E ':(3000|5173|8080|4200)'
```

```powershell
# Windows PowerShell - 실행 중인 개발 서버 포트 탐지
Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -in 3000,5173,8080,4200 }
```

서버가 실행 중이 아니면 사용자에게 안내:
> "개발 서버를 먼저 실행해주세요. (예: npm run dev)"

### 2. 플러그인 의존성 확인

```bash
# 플러그인 디렉토리에서 npm install 실행 여부 확인
ls ~/.claude/plugins/marketplaces/design-polish/node_modules/puppeteer
```

없으면 안내:
> "플러그인 의존성을 설치해주세요: cd ~/.claude/plugins/marketplaces/design-polish && npm install"

### 3. Node.js 확인

```bash
node --version
```

---

## 0단계: 프로젝트 분석

**사용 도구**: `Glob`, `Read`, `Bash`

### 프로젝트 유형 감지

- 디렉토리 구조: `src/`, `components/`, `pages/`, `app/` 등
- 프레임워크: React, Vue, Flutter, Next.js, Nuxt 등
- 스타일링: CSS, Tailwind, styled-components, CSS Modules, SCSS 등

### 디자인 파일 탐지

| 유형 | 패턴 |
|------|------|
| 컴포넌트 | `**/*.tsx`, `**/*.jsx`, `**/*.js`, `**/*.vue`, `**/*.svelte`, `**/*.dart` |
| 스타일 | `**/*.css`, `**/*.scss`, `**/tailwind.config.*` |
| 레이아웃 | `**/layout.*`, `**/App.*`, `**/page.*`, `**/_app.*` |

### 현재 디자인 스크린샷 캡처

**Bash로 캡처 스크립트 실행:**

```bash
# 캡처 스크립트 실행 (${CLAUDE_PLUGIN_ROOT}는 플러그인 설치 경로로 자동 치환됨)
node "${CLAUDE_PLUGIN_ROOT}/scripts/capture.cjs" / /about /pricing

# 포트 변경시
BASE_URL=http://localhost:5173 node "${CLAUDE_PLUGIN_ROOT}/scripts/capture.cjs" /
```

**저장 위치**: `.design-polish/screenshots/current-*.png`

### 캡처 후 Read로 이미지 분석

```
Read(".design-polish/screenshots/current-main.png")
```

분석 항목:
- 레이아웃 구조
- 색상 팔레트
- 타이포그래피
- 컴포넌트 스타일

---

## 1단계: WCAG 접근성 체크

**사용 도구**: `Bash`, `Read`

### 체크 실행

```bash
# WCAG 체크 포함 캡처
node "${CLAUDE_PLUGIN_ROOT}/scripts/capture.cjs" --wcag /
```

### 체크 항목 (axe-core 기반)

| 카테고리 | 체크 항목 | WCAG 기준 |
|----------|----------|-----------|
| 색상 대비 | 텍스트-배경 대비 | 4.5:1 (AA) |
| 색상 대비 | 대형 텍스트 대비 | 3:1 (AA) |
| 색상 대비 | UI 컴포넌트 대비 | 3:1 |
| 텍스트 크기 | 최소 텍스트 크기 | 12px 이상 권장 |
| 터치 타겟 | 최소 타겟 크기 | 44x44px (모바일) |
| 링크 | 링크 구분 | 밑줄 또는 3:1 대비 |

### 결과 저장

```
.design-polish/
├── screenshots/
│   └── current-main.png
└── accessibility/
    └── wcag-report.json
```

### 결과 확인

```
Read(".design-polish/accessibility/wcag-report.json")
```

---

## 2단계: 레퍼런스 사이트 선택

**사용 도구**: 판단 로직

### $1 미지정시 자동 선택

| 프로젝트 유형 | 판단 기준 | 우선 사이트 | 대체 사이트 |
|--------------|----------|-------------|------------|
| 앱 UI/UX | Flutter, React Native, 모바일 우선 | Mobbin | Page Flows, Refero |
| 모던 웹/SaaS | Next.js, Nuxt, 대시보드 | Godly | Dark Mode Design, Awwwards |
| 감각적/예술적 | 포트폴리오, 갤러리, 아트 키워드 | SiteInspire | Savee, Behance |
| 랜딩페이지 | 단일 페이지, 마케팅 중심 | Lapa Ninja | Httpster |
| UI 디테일 | 컴포넌트 중심, 버튼/카드 등 | Dribbble | - |

---

## 3단계: 트렌드 검색

**사용 도구**: `WebSearch`, `Bash`

### 3-1. WebSearch로 레퍼런스 검색

**기능 단위 검색 (업종별 X)**

```
올바른 검색:
- site:mobbin.com onboarding flow
- site:godly.website hero section
- site:dribbble.com dashboard UI 2024

잘못된 검색:
- "금융 앱 디자인"
- "게임 앱 UI"
```

### 3-2. 검색 결과에서 URL 추출

WebSearch 결과에서 유용한 레퍼런스 URL을 2-3개 선정.

### 3-3. Bash로 레퍼런스 캡처

```bash
# 단일 레퍼런스 캡처
node "${CLAUDE_PLUGIN_ROOT}/scripts/capture.cjs" ref "https://dribbble.com/shots/..." hero

# 여러 개 캡처 (브라우저 재사용으로 효율적)
node "${CLAUDE_PLUGIN_ROOT}/scripts/capture.cjs" ref "https://site1.com" ref1 "https://site2.com" ref2
```

**저장 위치**: `.design-polish/screenshots/reference-*.png`

### 검색 실패시 (자동 처리)

1. **대체 사이트로 재시도**: 위 표의 대체 사이트 순서대로
2. **site: 제거**: 일반 웹 검색으로 전환
3. **키워드 일반화**: 예) "checkout" → "ecommerce flow"

---

## 4단계: Gap 분석

**사용 도구**: `Read`

### Read로 이미지 비교 분석

```
Read(".design-polish/screenshots/current-main.png")
Read(".design-polish/screenshots/reference-hero.png")
```

### 분석 영역

| 영역 | 분석 항목 |
|------|----------|
| 레이아웃 | 그리드, 여백, 정보 계층, CTA 위치 |
| 타이포그래피 | 폰트, 크기, 행간, 웨이트 |
| 색상 | 팔레트, 대비, 다크모드 지원 |
| 인터랙션 | 호버, 전환, 애니메이션, 로딩 |
| 컴포넌트 | 버튼, 카드, 입력, 모달, 토스트 |
| 상태 | 로딩/성공/실패/빈 상태 처리 |
| **접근성** | **WCAG 위반 항목, 터치 타겟, 포커스 표시** |

### 플랫폼별 추가 기준

| 플랫폼 | 핵심 기준 |
|--------|----------|
| 웹 | 스캔 가능성, 정보 밀도, 반응형 |
| 앱 | 엄지 도달 범위, 제스처, 네이티브 패턴 |

---

## 5단계: 개선안 도출

### 우선순위 분류

| 우선순위 | 기준 | 예시 |
|---------|------|------|
| **Critical** | WCAG 위반 (심각) | 대비 부족, 터치 타겟 미달 |
| High | 사용성/접근성 문제, 명확한 트렌드 뒤처짐 | CTA 불명확, 네비게이션 |
| Medium | 시각적 개선 기회 | 여백 조정, 애니메이션 추가 |
| Low | 선택적 폴리싱 | 마이크로 인터랙션 |

---

## 6단계: 결과 출력

### 출력 형식

```markdown
## 프로젝트 요약

[프레임워크], [스타일링 방식] 기반 [프로젝트 유형]

## WCAG 접근성 체크

| 항목 | 상태 | 세부사항 |
|------|------|----------|
| 색상 대비 | X 3건 위반 | btn-primary: 3.2:1 (필요: 4.5:1) |
| 터치 타겟 | O 통과 | |
| 텍스트 크기 | ! 1건 주의 | caption: 11px |

## 트렌드 요약

- [핵심 트렌드 1]
- [핵심 트렌드 2]
- [핵심 트렌드 3]

## Gap 분석

| 영역 | 현재 | 트렌드 | Gap |
|------|------|--------|-----|
| 레이아웃 | ... | ... | ... |
| 타이포그래피 | ... | ... | ... |
| 색상 | ... | ... | ... |
| 인터랙션 | ... | ... | ... |
| 컴포넌트 | ... | ... | ... |
| 접근성 | 3건 위반 | WCAG AA 준수 | 색상 대비 수정 필요 |

## 개선안

### Critical (접근성)

- [ ] btn-primary 색상 대비 수정 (src/components/Button.tsx)

### High

- [ ] [개선안 + 대상 파일]

### Medium

- [ ] [개선안 + 대상 파일]

### Low

- [ ] [개선안 + 대상 파일]
```

---

## 7단계: 코드 적용 (--apply 옵션시만)

**사용 도구**: `Edit`

### 적용 순서

1. Critical (접근성) 우선순위부터 순차 적용
2. High 우선순위 적용
3. 각 수정 후 파일 저장
4. 적용 결과 요약 출력

### 적용하지 않는 것

- 새 라이브러리 설치 필요한 변경
- 대규모 구조 변경 (리팩토링 수준)
- 브레이킹 체인지

### 적용 결과 출력

```markdown
## 적용 완료

| 파일 | 변경 내용 |
|------|----------|
| src/components/Button.tsx | 색상 대비 수정 (4.5:1 이상) |
| src/components/Button.tsx | hover 스타일 추가 |
| src/styles/global.css | 여백 조정 |

## 미적용 (수동 필요)

- [ ] Framer Motion 설치 필요 (애니메이션)
```

---

## 레퍼런스 사이트 목록

### 실제 서비스 UX 흐름

| 사이트 | URL | 특징 |
|--------|-----|------|
| Mobbin | mobbin.com | 실 서비스 스크린샷, 플로우별 정리 |
| Page Flows | pageflows.com | 영상 기반 플로우, 인터랙션 참고 |
| Refero | refero.design | 실제 서비스 UI 요소 모음 |

### 모던 웹 트렌드 (Tech & SaaS)

| 사이트 | URL | 특징 |
|--------|-----|------|
| Godly | godly.website | 다크 모드, 마이크로 인터랙션 |
| Dark Mode Design | darkmodedesign.com | 다크 모드 UI 큐레이션 |
| Awwwards | awwwards.com | 창의적/기술적 웹사이트 |

### 감각적 & 예술적 영감

| 사이트 | URL | 특징 |
|--------|-----|------|
| SiteInspire | siteinspire.com | 레이아웃, 색감, 분위기 |
| Savee | savee.it | 무드보드용 시각적 자극 |
| Behance | behance.net | 브랜딩, Case Study |

### 랜딩 페이지 & 마케팅

| 사이트 | URL | 특징 |
|--------|-----|------|
| Lapa Ninja | lapa.ninja | 랜딩 페이지 레퍼런스 최다 |
| Httpster | httpster.net | 심플한 타이포그래피 |

### UI 디테일

| 사이트 | URL | 특징 |
|--------|-----|------|
| Dribbble | dribbble.com | 버튼, 카드 등 디테일 |
