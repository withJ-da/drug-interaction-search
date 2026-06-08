// 약품명 → RxCUI 변환
// 식약처 성분 API → 영문 성분명 추출 → RxNorm 조회 순서로 처리

const MFDS_KEY = process.env.MFDS_API_KEY;
const MFDS_BASE = 'https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07';

// 식약처 성분 상세 API로 영문 성분명 가져오기
async function getIngredientEnFromMFDS(seq) {
  if (!seq || !MFDS_KEY) return null;
  try {
    const params = new URLSearchParams({
      serviceKey: MFDS_KEY,
      type: 'json',
      numOfRows: '5',
      pageNo: '1',
      item_seq: seq,
    });
    const r = await fetch(`${MFDS_BASE}/getDrugPrdtMcpnDtlInq07?${params}`, {
      signal: AbortSignal.timeout(6000)
    });
    const data = await r.json();
    const items = data?.body?.items || [];
    // 영문 성분명 필드 순서대로 시도
    for (const item of items) {
      const en = item.INGR_ENG_NAME || item.MAIN_INGR_ENG || item.INGR_NAME_EN;
      if (en && /[a-zA-Z]/.test(en)) return cleanEnName(en);
    }
  } catch {}
  return null;
}

// 영문 성분명에서 불필요한 부분 제거
function cleanEnName(raw) {
  if (!raw) return null;
  return raw
    .replace(/\(.*?\)/g, '')           // 괄호 내용 제거
    .replace(/\b\d+(\.\d+)?\s*(mg|mcg|g|ml|%|iu|eq)\b/gi, '') // 용량 제거
    .replace(/\b(hydrochloride|hcl|sodium|calcium|potassium|besylate|maleate|tartrate|fumarate|succinate|phosphate|sulfate|acetate|monohydrate|anhydrous)\b/gi, '') // 염 제거
    .replace(/\s+/g, ' ')
    .trim();
}

// RxNorm에서 CUI 조회
async function queryRxNorm(name) {
  if (!name || name.length < 2) return null;
  const r = await fetch(
    `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}&search=1`,
    { signal: AbortSignal.timeout(8000) }
  );
  const data = await r.json();
  return data?.idGroup?.rxnormId?.[0] || null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { name, ingredient_en, ingredient_ko, item_seq } = req.query;
  if (!name) { res.status(400).json({ error: 'name 필요' }); return; }

  try {
    // 1. 영문 성분명이 이미 있으면 바로 사용
    if (ingredient_en && /[a-zA-Z]/.test(ingredient_en)) {
      const cleaned = cleanEnName(ingredient_en);
      if (cleaned) {
        const rxcui = await queryRxNorm(cleaned);
        if (rxcui) { res.status(200).json({ rxcui, matched: cleaned }); return; }
        // 첫 단어만으로 재시도 (예: "tamsulosin hydrochloride" → "tamsulosin")
        const firstWord = cleaned.split(' ')[0];
        if (firstWord !== cleaned) {
          const rxcui2 = await queryRxNorm(firstWord);
          if (rxcui2) { res.status(200).json({ rxcui: rxcui2, matched: firstWord }); return; }
        }
      }
    }

    // 2. item_seq로 식약처 성분 상세 API 조회 → 영문 성분명 획득
    if (item_seq) {
      const enFromMFDS = await getIngredientEnFromMFDS(item_seq);
      if (enFromMFDS) {
        const rxcui = await queryRxNorm(enFromMFDS);
        if (rxcui) { res.status(200).json({ rxcui, matched: enFromMFDS }); return; }
        const firstWord = enFromMFDS.split(' ')[0];
        if (firstWord !== enFromMFDS) {
          const rxcui2 = await queryRxNorm(firstWord);
          if (rxcui2) { res.status(200).json({ rxcui: rxcui2, matched: firstWord }); return; }
        }
      }
    }

    // 3. 한국어 성분명에서 괄호 안 추출 후 시도
    // 예: "탐스로신염산염" → ingredient.js API로 영문명 조회
    if (ingredient_ko) {
      const params2 = new URLSearchParams({
        serviceKey: MFDS_KEY,
        type: 'json',
        numOfRows: '3',
        pageNo: '1',
        ingr_name: ingredient_ko.split(/[,\/]/)[0].trim(), // 첫 번째 성분만
      });
      try {
        const r2 = await fetch(`${MFDS_BASE}/getDrugPrdtMcpnDtlInq07?${params2}`, {
          signal: AbortSignal.timeout(6000)
        });
        const d2 = await r2.json();
        const items2 = d2?.body?.items || [];
        for (const item of items2) {
          const en = item.INGR_ENG_NAME || item.MAIN_INGR_ENG;
          if (en && /[a-zA-Z]/.test(en)) {
            const cleaned = cleanEnName(en);
            const rxcui = await queryRxNorm(cleaned);
            if (rxcui) { res.status(200).json({ rxcui, matched: cleaned }); return; }
          }
        }
      } catch {}
    }

    // 4. 상품명 자체가 영문이면 직접 시도
    if (/^[a-zA-Z]/.test(name)) {
      const cleaned = cleanEnName(name);
      const rxcui = await queryRxNorm(cleaned);
      if (rxcui) { res.status(200).json({ rxcui, matched: cleaned }); return; }
    }

    res.status(200).json({ rxcui: null, matched: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
