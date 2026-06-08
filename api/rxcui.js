// 약품명 → RxCUI 변환 (서버사이드)
// 전략: 영문 성분명 정제 → RxNorm 조회 → 실패시 단어별 재시도

// 한국어 성분명 → 영문 매핑 (자주 쓰이는 성분)
const KO_TO_EN = {
  '탐스로신': 'tamsulosin', '탐스로신염산염': 'tamsulosin',
  '카르베딜롤': 'carvedilol', '카르베딜': 'carvedilol',
  '암로디핀': 'amlodipine', '베실산암로디핀': 'amlodipine',
  '아세트아미노펜': 'acetaminophen', '이부프로펜': 'ibuprofen',
  '아스피린': 'aspirin', '아세틸살리실산': 'aspirin',
  '와파린': 'warfarin', '와파린나트륨': 'warfarin',
  '클로피도그렐': 'clopidogrel', '황산클로피도그렐': 'clopidogrel',
  '아픽사반': 'apixaban', '리바록사반': 'rivaroxaban',
  '에스오메프라졸': 'esomeprazole', '오메프라졸': 'omeprazole',
  '란소프라졸': 'lansoprazole', '판토프라졸': 'pantoprazole',
  '파모티딘': 'famotidine', '라니티딘': 'ranitidine',
  '아토르바스타틴': 'atorvastatin', '로수바스타틴': 'rosuvastatin',
  '심바스타틴': 'simvastatin', '프라바스타틴': 'pravastatin',
  '메트포르민': 'metformin', '메트포르민염산염': 'metformin',
  '글리메피리드': 'glimepiride', '글리피지드': 'glipizide',
  '시타글립틴': 'sitagliptin', '다파글리플로진': 'dapagliflozin',
  '에스시탈로프람': 'escitalopram', '플루옥세틴': 'fluoxetine',
  '설트랄린': 'sertraline', '파록세틴': 'paroxetine',
  '벤라팍신': 'venlafaxine', '둘록세틴': 'duloxetine',
  '알프라졸람': 'alprazolam', '로라제팜': 'lorazepam',
  '디아제팜': 'diazepam', '졸피뎀': 'zolpidem',
  '레보티록신': 'levothyroxine', '레보티록신나트륨': 'levothyroxine',
  '아목시실린': 'amoxicillin', '아지트로마이신': 'azithromycin',
  '클래리트로마이신': 'clarithromycin', '레보플록사신': 'levofloxacin',
  '세티리진': 'cetirizine', '세티리진염산염': 'cetirizine',
  '로라타딘': 'loratadine', '펙소페나딘': 'fexofenadine',
  '트라마돌': 'tramadol', '트라마돌염산염': 'tramadol',
  '나프록센': 'naproxen', '나프록센나트륨': 'naproxen',
  '프레드니솔론': 'prednisolone', '덱사메타손': 'dexamethasone',
  '메틸프레드니솔론': 'methylprednisolone',
  '리시노프릴': 'lisinopril', '에날라프릴': 'enalapril',
  '로사르탄': 'losartan', '발사르탄': 'valsartan',
  '푸로세미드': 'furosemide', '스피로노락톤': 'spironolactone',
  '아테놀롤': 'atenolol', '메토프롤롤': 'metoprolol',
  '프로프라놀롤': 'propranolol', '딜티아젬': 'diltiazem',
  '리튬': 'lithium', '카르바마제핀': 'carbamazepine',
  '발프로산': 'valproic acid', '가바펜틴': 'gabapentin',
  '프레가발린': 'pregabalin', '리스페리돈': 'risperidone',
  '올란자핀': 'olanzapine', '퀘티아핀': 'quetiapine',
  '콜히친': 'colchicine', '알로퓨리놀': 'allopurinol',
  '실데나필': 'sildenafil', '타다라필': 'tadalafil',
  '시클로스포린': 'cyclosporine', '타크로리무스': 'tacrolimus',
};

function cleanEnName(raw) {
  if (!raw) return null;
  // 괄호 제거, 숫자/단위 제거, 앞뒤 공백 제거
  return raw
    .replace(/\(.*?\)/g, '')
    .replace(/\d+(\.\d+)?\s*(mg|mcg|g|ml|%|iu)/gi, '')
    .replace(/hydrochloride|hcl|sodium|calcium|besylate|maleate|tartrate|fumarate/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractIngredientFromKoreanName(name) {
  // 괄호 안의 성분명 추출: "하루날디정0.2밀리그램(탐스로신염산염)" → "탐스로신염산염"
  const match = name.match(/[（(]([^）)]+)[）)]/);
  if (match) {
    const inside = match[1].trim();
    // 한국어 성분명이면 영문 매핑
    if (KO_TO_EN[inside]) return KO_TO_EN[inside];
    // 이미 영어면 그대로
    if (/^[a-zA-Z]/.test(inside)) return cleanEnName(inside);
    // 공백으로 분리해서 각 단어 매핑 시도
    for (const word of inside.split(/[\s,\/]+/)) {
      if (KO_TO_EN[word.trim()]) return KO_TO_EN[word.trim()];
    }
  }
  // 괄호 없으면 전체 이름에서 한국어 성분 찾기
  for (const [ko, en] of Object.entries(KO_TO_EN)) {
    if (name.includes(ko)) return en;
  }
  return null;
}

async function queryRxNorm(name) {
  const url = `https://rxnav.nlm.nih.gov/REST/rxcui.json?name=${encodeURIComponent(name)}&search=1`;
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const data = await r.json();
  return data?.idGroup?.rxnormId?.[0] || null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { name, ingredient_en, ingredient_ko } = req.query;
  if (!name) { res.status(400).json({ error: 'name 필요' }); return; }

  try {
    // 1. 영문 성분명이 직접 전달된 경우
    if (ingredient_en) {
      const cleaned = cleanEnName(ingredient_en);
      if (cleaned) {
        const rxcui = await queryRxNorm(cleaned);
        if (rxcui) { res.status(200).json({ rxcui, matched: cleaned }); return; }
      }
    }

    // 2. 한국어 성분명에서 영문 추출 시도
    const fromKo = ingredient_ko ? KO_TO_EN[ingredient_ko.trim()] : null;
    if (fromKo) {
      const rxcui = await queryRxNorm(fromKo);
      if (rxcui) { res.status(200).json({ rxcui, matched: fromKo }); return; }
    }

    // 3. 상품명 자체에서 성분 추출
    const fromName = extractIngredientFromKoreanName(name);
    if (fromName) {
      const rxcui = await queryRxNorm(fromName);
      if (rxcui) { res.status(200).json({ rxcui, matched: fromName }); return; }
    }

    // 4. 영문 상품명/성분명 그대로 시도
    const directClean = cleanEnName(name);
    if (directClean && /^[a-zA-Z]/.test(directClean)) {
      const rxcui = await queryRxNorm(directClean);
      if (rxcui) { res.status(200).json({ rxcui, matched: directClean }); return; }
      // 첫 단어만 시도
      const firstWord = directClean.split(' ')[0];
      if (firstWord !== directClean) {
        const rxcui2 = await queryRxNorm(firstWord);
        if (rxcui2) { res.status(200).json({ rxcui: rxcui2, matched: firstWord }); return; }
      }
    }

    res.status(200).json({ rxcui: null, matched: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
