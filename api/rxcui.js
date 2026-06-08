// RxNorm CUI 조회를 서버에서 대신 처리 (브라우저 직접 호출 대신)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { name } = req.query;
  if (!name) { res.status(400).json({ error: 'name 필요' }); return; }
  try {
    const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}&search=1`;
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const data = await r.json();
    const rxcui = data?.idGroup?.rxnormId?.[0] || null;
    res.status(200).json({ rxcui });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
