// Vercel Serverless Function — 식약처 API 프록시
// 브라우저 CORS 문제 없이 서버에서 직접 호출

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { q } = req.query;
  if (!q) { res.status(400).json({ error: 'q 파라미터가 필요합니다' }); return; }

  const API_KEY = process.env.MFDS_API_KEY;
  const BASE = 'https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07';

  try {
    const params = new URLSearchParams({
      serviceKey: API_KEY,
      type: 'json',
      numOfRows: '20',
      pageNo: '1',
      item_name: q,
    });
    const response = await fetch(`${BASE}/getDrugPrdtPrmsnInq07?${params}`);
    if (!response.ok) throw new Error('식약처 API 오류: ' + response.status);
    const data = await response.json();
    const items = (data?.body?.items || []).map(item => ({
      name:          item.ITEM_NAME || '',
      ingredient_ko: item.MAIN_INGR || '',
      ingredient_en: item.MAIN_INGR_ENG || '',
      company:       item.ENTP_NAME || '',
      seq:           item.ITEM_SEQ || '',
      permit_date:   item.ITEM_PERMIT_DATE || '',
    }));
    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
