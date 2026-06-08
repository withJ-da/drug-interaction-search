// 성분명 상세 조회 (영문 성분명 획득용)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { seq } = req.query;
  if (!seq) { res.status(400).json({ error: 'seq 필요' }); return; }

  const API_KEY = process.env.MFDS_API_KEY;
  const BASE = 'https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07';

  try {
    const params = new URLSearchParams({
      serviceKey: API_KEY,
      type: 'json',
      numOfRows: '5',
      pageNo: '1',
      item_seq: seq,
    });
    const response = await fetch(`${BASE}/getDrugPrdtMcpnDtlInq07?${params}`);
    const data = await response.json();
    const items = data?.body?.items || [];
    const en = items[0]?.INGR_ENG_NAME || items[0]?.INGR_NAME || '';
    res.status(200).json({ ingredient_en: en });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
