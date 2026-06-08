// RxNorm 상호작용 조회를 서버에서 대신 처리
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { rxcui1, rxcui2 } = req.query;
  if (!rxcui1 || !rxcui2) { res.status(400).json({ error: 'rxcui1, rxcui2 필요' }); return; }
  try {
    const url = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${rxcui1}+${rxcui2}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await r.json();
    const interactions = data?.fullInteractionTypeGroup?.[0]?.fullInteractionType || [];
    res.status(200).json({ interactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
