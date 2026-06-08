# 💊 약물 상호작용 검색기

한국어 상품명으로 두 약물의 상호작용을 검색하는 웹 서비스입니다.

## 배포 방법 (Vercel — 무료, 5분)

### 1단계: GitHub에 올리기
1. [github.com](https://github.com) → New repository → `drug-interaction-search`
2. 이 폴더 전체를 업로드 (Upload files)

### 2단계: Vercel 배포
1. [vercel.com](https://vercel.com) → Continue with GitHub
2. Import → `drug-interaction-search` 선택
3. **Environment Variables 설정** (중요!)
   - `MFDS_API_KEY` = `5a335539d89a4ff54a5e010b3d58f90eedbc4584fa23138f8c2d3aa8eacbba13`
4. Deploy 클릭

### 3단계: 완료
배포 후 `https://drug-interaction-search-xxx.vercel.app` 형태의 링크가 생깁니다.

## 구조
```
drug-app/
├── api/
│   ├── search.js       # 식약처 약품명 검색 (서버사이드)
│   └── ingredient.js   # 성분 상세 조회 (서버사이드)
├── public/
│   └── index.html      # 프론트엔드
├── vercel.json         # Vercel 설정
└── package.json
```

## 데이터 출처
- 식약처 의약품허가정보 서비스 (getDrugPrdtPrmsnInq07)
- 미국 NLM RxNorm API
