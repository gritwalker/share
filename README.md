# 학교 안 아바다 (share)

초등학생용 학교 안 장터 · 물품 순환 경제 플랫폼입니다.  
Cloudflare Workers + D1 + Vue 3(모바일 퍼스트)로 동작합니다.

## 주요 기능

- **학생 로그인 / 회원가입**: 학교 검색(NEIS `schoolInfo`), 학년·반·아이디·비밀번호
- **장터 피드**: 전체 물건 / 무료 나눔 탭, 상단 에코코인 잔액
- **물품 등록**: 사진·이모지·제목·설명·판매/기증
- **에코코인 보상**
  - 가입 +50 · 판매 등록 +10 · 기증 등록 +30(+나눔 왕 뱃지)
  - 구매/나눔받기 +5 · 판매 완료 시 판매자 +가격+10
- **마이페이지**: 코인 내역, 기증 수, 내 물품 관리

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | Vue 3, Vue Router, Tailwind CSS |
| Backend | Cloudflare Workers, Hono |
| DB | Cloudflare D1 (SQLite) |
| 학교 API | 나이스 교육정보 오픈API `schoolInfo` |

## 시작하기

```sh
npm install
npm run db:migrate:local   # 로컬 D1 마이그레이션
npm run dev                # http://localhost:5173
```

### 나이스 API 키

`wrangler.jsonc`의 `vars.NEIS_API_KEY`를 사용합니다.

- `SAMPLE`(기본값) 또는 미설정 → **샘플 학교 목록**으로 동작
- 실제 키 설정 시 → `https://open.neis.go.kr/hub/schoolInfo` 호출

배포 환경에서는 시크릿 권장:

```sh
npx wrangler secret put NEIS_API_KEY
```

### D1 원격 DB 생성 (배포 시)

```sh
npx wrangler d1 create share-db
# 출력된 database_id를 wrangler.jsonc에 반영
npm run db:migrate:remote
npm run deploy
```

## 프로젝트 구조

```
migrations/0001_init.sql   # D1 스키마
server/index.ts            # Hono API (Workers)
server/neis.ts             # 나이스 학교검색 프록시
src/views/                 # 로그인 · 장터 · 등록 · 마이페이지
wrangler.jsonc             # Workers / D1 / 환경변수
wrangler.example.toml      # toml 형식 설정 예시
```

## API 요약

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/schools?query=` | 학교 검색 |
| POST | `/api/auth/register` | 회원가입 |
| POST | `/api/auth/login` | 로그인 |
| GET | `/api/items?tab=all\|donate` | 장터 목록 |
| POST | `/api/items` | 물품 등록 |
| POST | `/api/items/:id/buy` | 구매 |
| POST | `/api/items/:id/claim` | 나눔 받기 |
| GET | `/api/me` `/api/me/history` `/api/me/items` | 내 정보 |
