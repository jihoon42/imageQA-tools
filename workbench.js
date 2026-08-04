// ==UserScript==
// @name         HM 빅카드 검수 워크벤치
// @namespace    hailmary-qa
// @version      0.9.3
// @description  빅카드 생성 검수 보조 — 확대·단축키·코드 검색·저시력 지원 (토스 톤)
// @match        https://hailmary-commerce.dev.onkakao.net/admin/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
/* =============================================================
 *  쓰는 법
 *   · Tampermonkey 에 넣으면: 페이지 열면 오른쪽 아래 버튼이 생김
 *   · 콘솔에 붙여넣어도 동일하게 동작 (F12 → Console → 전체 붙여넣기)
 *   · 여는 단축키: Alt+W
 *
 *  저장은 처음엔 꺼져 있음. 상단 [저장 꺼짐] 버튼으로 켠다.
 *
 *  변경 이력
 *   0.9.3 두 벌이 겹쳐 뜨면 뒤쪽 인스턴스가 코드 단축키 글자(q·w·e·z…)를 가로채
 *        입력창에 안 찍히던 문제 — 다시 붙여넣으면 구버전을 내리고 교체한다.
 *        단축키를 양보하는 기준도 "그 노드인가" 에서 "글자를 받는 요소인가" 로 바꿈
 *        · 검수자 이름 창에서 [취소] 버튼이 카드 밖으로 삐져나가던 것 수정
 *   0.9.2 UI 를 이슈 기록부와 같은 토스(TDS) 톤으로 — Pretendard · 그레이 스케일
 *        · 큰 라운드 · 컨트롤 높이 통일. 색값은 토스 색조를 유지하되 명도를 내려
 *        3개 테마 57개 조합 전부 AAA(7:1) 이상 (palette.py 로 검증)
 *        · 검수 이미지 둘레는 테마와 무관하게 중립 회색 고정 — 주변 색이 밝으면
 *          같은 이미지도 그림자·반사·배경 확장 판단이 달라진다
 *   0.9.1 F 키 — 이슈 코드 검색. 코드명·공식 설명·경계 메모를 함께 훑기 때문에
 *        'shadow' 로도 '그림자' 로도 같은 코드가 걸린다. Enter 로 첫 결과 선택,
 *        Esc 로 해제. 이미 고른 코드는 검색어와 상관없이 항상 목록에 남는다
 *   0.9  U 키 — auto 판정을 그 건에 한해 열어보기 (기본은 계속 숨김)
 *   0.8  이미 저장한 건으로 되돌아가면 판정·코드·메시지를 복원하고
 *        덮어쓰기임을 안내 · 재저장은 통계에 중복 집계하지 않음
 *   0.7  코드 정책 변경 감지 — 서버의 이슈 코드 목록과 내장 목록이 다르면
 *        경고를 띄우고 저장을 자동으로 끔
 *   0.6  단축키 안내를 한 줄로 축약(? 로 전체 보기) · 저장 모드를 버튼으로
 *        · 두 이미지 사이 경계선을 끌어 좌우 폭 조절(기본 62:38)
 *        · 이미지 보정을 슬라이더 창으로 통합
 *   0.5  상단 [검수자] · [큐 새로고침] 버튼 — 연 상태에서 이름 변경·재조회
 *   0.4  저시력 지원 — 고대비 3테마 · 글자 크기 · 이미지 보정 · 돋보기 · ARIA
 *        · Tampermonkey 지원 · 라벨러 이름 입력 화면
 *   0.3  코드 표시를 영어 코드명 + 공식 설명 토글로 교체 · 확대 연동 기본 해제
 *   0.2  초시계 제거 · 65% 눈금선 · 이미지 화면맞춤 초기화
 *   0.1  최초 — 동기 확대 · 코드 단축키 · 메시지 자동 초안 · auto 판정 대조
 * ============================================================= */
(() => {
'use strict';
const VERSION = '0.9.3';

/* --------------------------------------------------------------------------
 *  같은 페이지에 워크벤치가 두 벌 뜨면 안 된다.
 *
 *  두 벌이 뜨면 뒤쪽 인스턴스의 전역 키 핸들러가 앞쪽 입력창을 "내 것이 아니다"
 *  라고 판단해 코드 단축키 글자(q·w·e·r·t·a·s·d·z·x·c·v·1~9)를 전부 가로채고
 *  preventDefault 한다. 그래서 영문으로는 그 글자들이 안 찍히는데 한글 IME 로는
 *  멀쩡하다(조합 중에는 e.key 가 자모라 핫키에 안 걸린다).
 *  Tampermonkey 설치본 + 콘솔 붙여넣기가 겹치면 실제로 이렇게 된다.
 *
 *  아래에서 (1) 같은 버전이면 기존 창만 열고 (2) 다른 버전이면 물러나게 한 뒤
 *  새로 설치하고 (3) destroy() 가 없는 구버전은 흔적을 직접 걷어낸다.
 * -------------------------------------------------------------------------- */
function evictGhosts() {
  document.querySelectorAll('#hm-wb-host').forEach(h => {
    const w = h.shadowRoot && h.shadowRoot.querySelector('.wrap');
    if (w) {
      w.classList.remove('show');
      // 구버전의 window 키 핸들러는 참조가 없어 제거할 수 없다. 다만 그 핸들러는
      // 첫 줄에서 wrap 의 show 를 보고 빠져나가므로, Alt+W 로 다시 켜지는 것만
      // 막아두면 영구히 잠잠해진다. (떼어낸 노드에도 옵서버는 동작한다)
      // classList.remove 는 토큰이 없어도 class 속성을 다시 써서 변경 기록을 남긴다.
      // 그냥 지우면 옵서버가 스스로를 깨워 무한 루프에 빠지므로 반드시 먼저 확인한다.
      try { new MutationObserver(() => { if (w.classList.contains('show')) w.classList.remove('show'); })
              .observe(w, { attributes:true, attributeFilter:['class'] }); } catch (e) {}
    }
    h.remove();
  });
  document.querySelectorAll('button').forEach(n => {
    if (n.dataset.hmWbLauncher || n.textContent === '검수 워크벤치') n.remove();
  });
}
if (window.WB) {
  if (window.WB.VERSION === VERSION) {
    console.log('검수 워크벤치 v' + VERSION + ' 이 이미 떠 있습니다 — 기존 창을 엽니다.');
    window.WB.open(); return;
  }
  console.log('[워크벤치] 기존 v' + (window.WB.VERSION || '0.9.2 이하') + ' 을 내리고 v' + VERSION + ' 으로 교체합니다.');
  try { window.WB.destroy(); } catch (e) {}
}
evictGhosts();

/* 떼어낼 수 있도록 전역 리스너는 전부 여기를 거친다 */
const OFF = [];
function bind(target, type, fn, opt) {
  target.addEventListener(type, fn, opt);
  OFF.push(() => { try { target.removeEventListener(type, fn, opt); } catch (e) {} });
}

const BASE = location.origin + '/admin/';
const LS_STATS = 'hm_wb_stats_v1';
const LS_PREF  = 'hm_wb_pref_v1';

/* ---------------------------------------------------------------
 *  21개 이슈 코드
 *    d = 툴에 붙어 있는 공식 설명 (원문 그대로, 손대지 않음)
 *    t = 경계 판단 메모 (가이드 2-1절·예시집에서 정리)
 *    m = REJECT 메시지 자동 초안
 *    z = 확대해야 잡히는 코드 / r = 방향이 반대인 코드
 * --------------------------------------------------------------- */
const CODES = [
 {c:'hallucinated_added_object', k:'q', g:'A',
  d:'입력에 없던 상품, 소품, 그래픽, 빛, 연기, 오브젝트가 새로 생김',
  t:'가려진 자리를 메운 것이면 unsupported_region_reconstruction, 원본 상품이 늘어난 것이면 product_count. 음식에 없던 고명·장식이 생긴 것도 여기.',
  m:'원본에 없던 요소가 새로 생성됨'},
 {c:'product_count_or_duplication_error', k:'w', g:'A',
  d:'판매 상품/옵션이 삭제, 누락, 복제, 과반복되어 구성 인상이 바뀜',
  t:'옵션 라인업 중 한두 개를 지운 건 pass. 세트 구성품 삭제는 reject.',
  m:'상품 개수·구성이 원본과 달라짐'},
 {c:'product_identity_altered', k:'e', g:'A',
  d:'상품 형태, 색, 재질, 패키지, 핵심 라벨/식별부가 바뀜',
  t:'알아볼 수는 있는데 디테일이 틀림. 녹거나 붕괴면 broken_or_grotesque_region, 아예 없던 물체면 hallucinated. 원문이 "사람마다 다를 수 있다"고 인정한 경계.',
  m:'상품의 형태·색·패키지 등 식별 요소가 변형됨'},
 {c:'product_viewpoint_or_pose_changed', k:'r', g:'A',
  d:'촬영 시점, 모델 포즈, 착용/연출 자세가 크게 바뀜',
  t:'바뀐 것 자체는 문제가 아니다. 바뀌면서 부작용이 생겼을 때만 체크.',
  m:'촬영 시점·포즈가 바뀌며 부자연스러워짐'},
 {c:'unsupported_region_reconstruction', k:'t', g:'A',
  d:'잘림, 가림, 안 보이던 영역을 근거 없이 임의 복원함',
  t:'잘림/가림을 채우다 생긴 것. 무관한 완전 신규면 hallucinated_added_object.',
  m:'원본에서 가려져 있던 영역이 임의로 생성됨'},
 {c:'fabricated_shadow_or_reflection', k:'a', g:'B',
  d:'원본에 없던 인위적 그림자, 반사, 미러 효과가 생성됨',
  t:'원본에 있었으면 pass. 그림자는 원래 있고 반사만 추가된 경우도 체크.',
  m:'원본에 없던 그림자·반사가 생성됨'},
 {c:'fake_or_garbled_text', k:'s', g:'B', z:1,
  d:'없던 글자, 깨진 글자, 가짜 브랜드명, 읽을 수 없는 텍스트가 생성됨',
  t:'큰 글씨가 깨지면 reject. 원래 식별이 어려운 작은 글씨가 살짝 깨진 건 pass. 원본 문구가 남은 것이면 sales_or_info_overlay.',
  m:'없던 글자가 생기거나 기존 글자가 깨짐'},
 {c:'split_panel_layout', k:'d', g:'B',
  d:'결과가 패널, 면분할, 콜라주, 타일처럼 보임',
  t:'경계선·패널이 보이면 이것. 선 없이 확장만 어색하면 background_extension_unnatural.',
  m:'결과물이 면분할·콜라주 형태로 보임'},
 {c:'gift_or_benefit_visual_not_removed', k:'z', g:'C',
  d:'작은 원형 plus 외 gift/증정/혜택 시각요소가 남음',
  t:'허용되는 증정 표시는 작은 원형 ＋ 하나뿐. 그래픽만 지우고 증정품 실물이 남은 것도 reject.',
  m:'증정품·증정 그래픽이 제거되지 않음'},
 {c:'non_product_image_inset_not_removed', k:'x', g:'C',
  d:'상품이 아닌 인셋, 디테일컷, 썸네일, 오버레이가 남음',
  t:'음식이 메인인데 패키지 그래픽이 작게 삽입 → reject. 둘이 같은 크기로 나란히거나 패키지가 메인이면 pass.',
  m:'상품이 아닌 인셋·패키지 그래픽이 남아 있음'},
 {c:'logo_or_watermark_not_removed', k:'c', g:'C',
  d:'제품/패키지 밖 외부 로고, 워터마크, 판매처 마크가 남음',
  t:'패키지에 인쇄된 로고는 상품의 일부라 pass. 인쇄 마크가 변형된 것이면 product_identity_altered.',
  m:'상품 외부의 로고·워터마크가 남아 있음'},
 {c:'sales_or_info_overlay_not_removed', k:'v', g:'C',
  d:'판매 문구, 정보성 텍스트, 화살표, 배지, 스펙 그래픽이 남음',
  t:'원본에 있던 것이 남은 경우. 새로 생기거나 깨진 글자는 fake_or_garbled_text.',
  m:'판매·정보성 오버레이가 남아 있음'},
 {c:'critical_crop_or_occlusion', k:'1', g:'D',
  d:'상품 핵심부가 잘리거나 가려져 인지성이 깨짐',
  t:'잘림·가림은 이것, 치우침은 bad_subject_position, 작음은 insufficient_product_scale.',
  m:'상품 핵심부가 잘리거나 가려짐'},
 {c:'background_extension_unnatural', k:'2', g:'D', z:1,
  d:'배경 확장/복원이 경계선, 반복, 왜곡 등으로 부자연스러움',
  t:'경계선이 살짝만 보여도 체크. 바닥·벽면 질감이 기존과 다른지가 핵심이라 확대해서 봐야 한다. 대비를 올리면 이음새가 잘 보인다.',
  m:'확장된 배경이 기존 이미지와 이어지지 않음'},
 {c:'background_low_separation_or_arbitrary', k:'3', g:'D',
  d:'배경이 상품 식별을 방해하거나 임의의 강한 배경임',
  t:'취향이 아니라 식별 가능성으로 판단. 흰 배경 단독은 reject 아님.',
  m:'배경과 상품이 구분되지 않음'},
 {c:'bad_subject_position', k:'4', g:'D',
  d:'상품이 치우치거나 가장자리/하단/상단으로 몰림',
  t:'상품 또는 연출 장면 자체가 가운데 있어야 한다. G 키 십자선 참고.',
  m:'상품이 화면 중앙에서 치우침'},
 {c:'insufficient_product_scale', k:'5', g:'D',
  d:'상품이 너무 작아 썸네일에서 인지하기 어려움',
  t:'누끼컷인데 작으면 체크. 연출컷은 장면이 잘 보이면 작아도 pass. G 키 세로선 = 프레임 폭 65%.',
  m:'상품이 너무 작아 확인이 어려움'},
 {c:'benefit_indicator_not_preserved', k:'6', g:'D', r:1,
  d:'원본에 있던 작은 원형 plus benefit indicator가 삭제되거나 식별 불가능하게 변형됨',
  t:'방향이 반대인 유일한 코드 — 남으면이 아니라 사라지면 reject. 원본에 ＋가 있었는지 먼저 확인.',
  m:'원본의 원형 ＋ 표시가 사라짐'},
 {c:'broken_or_grotesque_region', k:'7', g:'E',
  d:'형태 붕괴, 녹은 영역, 기괴한 신체/오브젝트, 국소 아티팩트가 있음',
  t:'더 구체적인 코드로 설명되면 그쪽을 쓴다. 손가락 개수, 인위적인 질감도 여기.',
  m:'형태가 붕괴되거나 인위적·부자연스러운 부분이 있음'},
 {c:'low_resolution_or_blur', k:'8', g:'E', z:1,
  d:'저해상, 블러, 픽셀깨짐, 압축으로 상품 디테일 확인이 어려움',
  t:'배경만 픽셀이 깨져도 체크 대상.',
  m:'저해상·블러·픽셀 깨짐으로 확인이 어려움'},
 {c:'safety', k:'9', g:'F',
  d:'혐오, 불쾌, 과도한 노출 등 안전상 부적합한 이미지',
  t:'애매하면 어떤 점이 부적합한지 메시지에 구체적으로.',
  m:'커머스에 부적합한 이미지'},
];
const BY_KEY  = Object.fromEntries(CODES.map(c => [c.k, c]));
const BY_CODE = Object.fromEntries(CODES.map(c => [c.c, c]));

/* ------------------------------- 상태 ------------------------------- */
const DEF_PREF = { theme:'dark', ui:100, desc:false, link:false, guides:false,
                   draft:'short', showTimer:false, loupe:false, split:62,
                   fx:{ bright:100, contrast:100, invert:0, gray:0 } };
const S = {
  labeler:'', queue:[], i:0, sel:new Set(), armed:false, t0:0, busy:false,
  q:'',           // 코드 검색어. 화면 필터일 뿐이라 저장하지 않는다 —
                  // 새로고침했는데 목록이 걸러진 채로 뜨면 코드가 사라진 줄 안다.
  done:{},        // 이 세션에서 저장한 건: label_row_id → {verdict, codes, msg}
  pref: loadPref(), stats: loadStats(),
};
function loadPref() {
  try { return Object.assign({}, DEF_PREF, JSON.parse(localStorage.getItem(LS_PREF)) || {}); }
  catch (e) { return Object.assign({}, DEF_PREF); }
}
function savePref() { try { localStorage.setItem(LS_PREF, JSON.stringify(S.pref)); } catch (e) {} }
function blank() { return { n:0, pass:0, reject:0, secs:[], agreeVerdict:0, codeExact:0, codePartial:0, codeMiss:0 }; }
function loadStats() { try { return JSON.parse(localStorage.getItem(LS_STATS)) || blank(); } catch (e) { return blank(); } }
function saveStats() { try { localStorage.setItem(LS_STATS, JSON.stringify(S.stats)); } catch (e) {} }

/* ------------------------------- API ------------------------------- */
async function api(path, opt) {
  const r = await fetch(BASE + path, Object.assign({ credentials:'same-origin' }, opt || {}));
  if (r.status === 401) throw new Error('로그인이 풀렸습니다. 원래 화면에서 아무 동작이나 한 뒤 다시 시도하세요.');
  if (!r.ok) throw new Error(r.status + ' ' + (await r.text()).slice(0, 200));
  return r.json();
}
const fetchQueue = (who, size) => api(
  `api/labeling/items?batch_id=all&label_status=mine&auto_verdict=all&human_verdict=all` +
  `&issue_code=all&labeler_filter=&q=&page=1&page_size=${size}&labeler=${encodeURIComponent(who)}`);
const postSave = (p) => api('api/labeling/save',
  { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(p) });

/* ------------------------------- UI -------------------------------
 * Pretendard — 이슈 기록부(issue-hub)와 같은 글꼴을 쓴다.
 * 문서에 심은 @font-face 는 shadow DOM 안에도 적용된다.
 * 관리자 페이지의 CSP 가 외부 CDN 을 막을 수 있으므로 실패는 그냥 넘긴다 —
 * 그때는 로컬에 깔린 Pretendard, 없으면 시스템 한글 글꼴로 떨어진다. */
(function font() {
  const HREF = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css';
  try {
    if (document.querySelector('link[data-hm-wb-font]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = HREF; l.dataset.hmWbFont = '1';
    l.onerror = () => console.log('[워크벤치] Pretendard 를 못 불러왔습니다 — 시스템 글꼴로 표시합니다');
    document.head.appendChild(l);
  } catch (e) {}
})();

const host = document.createElement('div');
host.id = 'hm-wb-host';
document.body.appendChild(host);
const R = host.attachShadow({ mode:'open' });
R.innerHTML = `<style>
:host,*{box-sizing:border-box}

/* ─── 디자인 토큰 ───────────────────────────────────────────────
 *  이슈 기록부(issue-hub)와 같은 토스(TDS) 톤을 쓴다.
 *  다만 색값은 전부 AAA(7:1) 이상으로 내려 잡았다 — 토스 원본 팔레트는
 *  대표 파랑 #3182F6 이 흰 바탕에서 3.71 밖에 안 나와, 0.4 에서 맞춰둔
 *  저시력 기준과 정면으로 부딪힌다. 색조(hue)·채도는 그대로 두고
 *  명도만 옮긴 값이라 토스처럼 보이면서 대비는 지켜진다.
 *  ★ 색을 고칠 때는 palette.py 로 57개 조합을 다시 재라. 눈으로 고르지 말 것.
 *
 *  단위는 px 다. shadow DOM 안에서 rem 은 관리자 페이지의 html font-size 를
 *  따라가므로(그쪽이 62.5% 같은 값을 쓰면 통째로 무너진다) 쓰지 않는다.
 *  화면 배율은 기존대로 상단 [가＋/가－] 의 zoom 으로 조절한다.
 * ------------------------------------------------------------- */
.wrap{
 --bg:#0D0D0D; --panel:#171717; --hover:#212121; --fg:#FFFFFF; --mut:#C9CDD2; --code:#E5E8EB;
 --line:#2C2C2C; --edge:#646464;
 --acc:#6BA8FF; --ok:#5CE39A; --no:#FF8A80; --focus:#FFD54A; --warn:#FFD54A;
 --selbg:#2E1512; --selfg:#FFB4A8; --selbar:#FF8A80;
 --btnp:#0E5A34; --btnpf:#CAF6DE; --btnr:#6E1A10; --btnrf:#FFD0C4;
 --btns:#262626; --btnsf:#E5E8EB;
 --shadow:none;
 --r-card:14px; --r-ctl:10px; --r-key:7px; --r-pill:999px;
 --h-ctl:32px; --h-act:46px;
}
.wrap.light{
 --bg:#F2F4F6; --panel:#FFFFFF; --hover:#F2F4F6; --fg:#191F28; --mut:#454D5D; --code:#333D4B;
 --line:#E5E8EB; --edge:#848E9B;
 --acc:#084DB1; --ok:#0A5E3D; --no:#A60D1A; --focus:#084DB1; --warn:#6C4C00;
 --selbg:#FFF0EE; --selfg:#8E1C10; --selbar:#A60D1A;
 --btnp:#0B6642; --btnpf:#FFFFFF; --btnr:#B30E1C; --btnrf:#FFFFFF;
 --btns:#E5E8EB; --btnsf:#191F28;
 --shadow:0 1px 3px rgba(25,31,40,.08),0 1px 2px rgba(25,31,40,.04);
}
.wrap.mono{
 --bg:#000; --panel:#000; --hover:#000; --fg:#fff; --mut:#fff; --code:#fff;
 --line:#fff; --edge:#fff;
 --acc:#fff; --ok:#fff; --no:#fff; --focus:#ff0; --warn:#ff0;
 --selbg:#fff; --selfg:#000; --selbar:#000;
 --btnp:#000; --btnpf:#fff; --btnr:#000; --btnrf:#fff;
 --btns:#000; --btnsf:#fff;
 --shadow:none;
}
.wrap.mono .box,.wrap.mono .pane,.wrap.mono .btn,
.wrap.mono .cb,.wrap.mono .fnd input,.wrap.mono textarea{border:2px solid #fff}

/* 검수 이미지 둘레는 테마를 따라가지 않는다 — 고정.
 * 주변이 밝으면 같은 이미지도 그림자·반사·배경 확장 판단이 달라진다.
 * 사진 평가 도구들이 쓰는 중립 회색(#333 대) 을 그대로 쓴다. */
.wrap{--imgbg:#333333; --imgpane:#3B3B3B; --imgline:#858585;
      --imgchip:#0E0E0E; --imgchipfg:#FFFFFF; --imgring:#FFD54A; --imghandle:#8A8A8A}

.wrap{position:fixed;inset:0;z-index:2147483000;background:var(--bg);color:var(--fg);
 font:15px/1.6 "Pretendard Variable","Pretendard",-apple-system,BlinkMacSystemFont,
      "Apple SD Gothic Neo","Malgun Gothic","Segoe UI",sans-serif;
 letter-spacing:-.01em;-webkit-font-smoothing:antialiased;
 display:none;flex-direction:column}
.wrap.show{display:flex}
:focus-visible{outline:3px solid var(--focus);outline-offset:2px;border-radius:6px}

/* ─── 상단 바 ─── */
.bar{display:flex;align-items:center;gap:6px;padding:8px 14px;background:var(--panel);
 border-bottom:1px solid var(--line);flex:0 0 auto;flex-wrap:wrap}
.bar b{font-size:16px;font-weight:700;letter-spacing:-.03em;margin-right:2px;white-space:nowrap}
.mut{color:var(--mut);font-size:12.5px}
.spacer{flex:1}
.ctl{display:flex;gap:4px;align-items:center}

.cb{display:inline-flex;align-items:center;gap:5px;height:var(--h-ctl);padding:0 11px;
 background:var(--panel);color:var(--fg);border:1px solid var(--edge);border-radius:var(--r-ctl);
 font:inherit;font-size:12.5px;font-weight:600;letter-spacing:-.01em;cursor:pointer;white-space:nowrap}
.cb:hover{background:var(--hover);border-color:var(--fg)}
.cb[aria-pressed="true"]{background:var(--acc);color:var(--panel);border-color:var(--acc);font-weight:700}
.cb i{font-style:normal;font-size:10.5px;line-height:1;padding:2px 4px;border-radius:5px;
 background:var(--hover);border:1px solid var(--edge);color:inherit;opacity:.9}
.cb[aria-pressed="true"] i{background:transparent;border-color:currentColor}
/* 저장 스위치는 판정이 서버로 나가는지를 가르는 곳이라 다른 버튼과 섞이면 안 된다 */
.cb.arm{font-weight:700;border-width:2px;padding:0 13px}
.cb.arm[data-on="0"]{background:var(--panel);color:var(--warn);border-color:var(--warn)}
.cb.arm[data-on="1"]{background:var(--ok);color:var(--panel);border-color:var(--ok)}

/* ─── 이미지 영역 ─── */
.imgs{flex:1;display:flex;min-height:0;margin:8px 0 8px 8px;padding:6px;
 background:var(--imgbg);border-radius:var(--r-card)}
.split{flex:0 0 16px;cursor:col-resize;display:flex;align-items:center;justify-content:center}
.split::before{content:'';width:4px;height:72px;border-radius:2px;background:var(--imghandle)}
.split:hover::before,.split.on::before,.split:focus-visible::before{background:#fff;height:140px}
.pane{flex:1 1 0;background:var(--imgpane);border:1px solid var(--imgline);border-radius:10px;
 position:relative;overflow:hidden;cursor:grab;min-width:120px}
.pane.drag{cursor:grabbing}
.pane .tag,.pane .zl,.gl{position:absolute;z-index:3;font-size:11.5px;font-weight:600;
 background:var(--imgchip);color:var(--imgchipfg);border:1px solid rgba(255,255,255,.28);
 padding:3px 9px;border-radius:var(--r-pill);pointer-events:none;letter-spacing:-.01em}
.pane .tag{top:8px;left:10px}
.pane .zl{top:8px;right:10px;font-variant-numeric:tabular-nums}
.gl{bottom:8px;left:50%;transform:translateX(-50%);display:none;font-weight:500}
.pane.guided .gl{display:block}
.pane .ld{position:absolute;inset:0;display:none;align-items:center;justify-content:center;
 color:var(--imgchipfg);font-size:14px}
.pane.loading .ld{display:flex}
.stage{position:absolute;left:50%;top:50%;transform-origin:50% 50%;will-change:transform}
.stage img{display:block;width:100%;height:100%;max-width:none;user-select:none;-webkit-user-drag:none}
.guides{position:absolute;inset:0;display:none;pointer-events:none}
.guides.on{display:block}
.guides i{position:absolute;background:var(--imgring)}
.guides i.v{top:0;bottom:0;width:2px}
.guides i.h{left:0;right:0;height:2px;opacity:.55}
.guides i.c{background:#34D399}
.loupe{position:absolute;z-index:5;width:260px;height:260px;border-radius:50%;
 border:3px solid var(--imgring);box-shadow:0 0 0 2px rgba(0,0,0,.6);pointer-events:none;display:none;
 background-repeat:no-repeat;background-color:var(--imgpane)}
.pane.lp .loupe{display:block}

/* ─── 오른쪽 패널 ─── */
.side{flex:0 0 420px;display:flex;flex-direction:column;gap:8px;padding:8px;min-height:0}
.box{background:var(--panel);border:1px solid var(--line);border-radius:var(--r-card);
 padding:12px 14px;box-shadow:var(--shadow)}
.box.grow{flex:1;overflow:auto;min-height:0}
.pname{font-weight:700;font-size:15px;line-height:1.4;letter-spacing:-.02em;margin-bottom:4px}
.meta{font-size:12.5px;color:var(--mut);font-variant-numeric:tabular-nums}

.ghead2{display:flex;align-items:center;gap:10px;margin:12px 0 4px}
.ghead2:first-child{margin-top:0}
.ghead2 span{font-size:11px;letter-spacing:.12em;color:var(--mut);font-weight:700}
.ghead2 hr{flex:1;border:none;border-top:1px solid var(--line);margin:0}

.cd{display:flex;align-items:flex-start;gap:8px;padding:6px 8px;border-radius:var(--r-ctl);
 cursor:pointer;line-height:1.4;border-left:3px solid transparent}
.cd:hover{background:var(--hover)}
.cd .kb{flex:0 0 20px;height:20px;border-radius:var(--r-key);border:1px solid var(--edge);
 background:var(--bg);color:var(--fg);font-size:11.5px;display:flex;align-items:center;
 justify-content:center;font-weight:700;margin-top:1px}
.cd .ck{flex:0 0 14px;font-weight:900;font-size:14px;line-height:1.45;visibility:hidden}
.cd .cn{font-size:13px;font-weight:500;color:var(--code);word-break:break-all}
.cd .mk{font-size:11px;color:var(--mut);font-weight:600}
.cd .ds{display:none;font-size:12.5px;color:var(--mut);line-height:1.5;margin-top:2px}
.desc .cd .ds{display:block}
.desc .cd{padding:8px}
.cd.on{background:var(--selbg);border-left-color:var(--selbar)}
.cd.on .cn,.cd.on .mk{color:var(--selfg);font-weight:700}
.cd.on .kb{background:var(--selfg);color:var(--selbg);border-color:var(--selfg)}
.cd.on .ck{visibility:visible;color:var(--selfg)}
.cd.on .ds{color:var(--selfg)}
.tg{margin-left:auto}

/* 코드 검색 — 목록 맨 위에 붙어 스크롤해도 따라다닌다.
   #codes 의 위쪽 padding 은 .fnd 가 대신 갖는다. 박스에 padding-top 이 남아 있으면
   그만큼 검색줄이 아래로 밀려 고정되고, 그 틈으로 코드 행이 스쳐 지나간다. */
#codes{padding-top:0}
.fnd{position:sticky;top:0;z-index:2;background:var(--panel);border-bottom:1px solid var(--line);
 display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 -14px 8px;padding:12px 14px 10px}
.fnd input{flex:1 1 130px;min-width:0;height:var(--h-ctl);padding:0 11px;
 background:var(--bg);color:var(--fg);border:1px solid var(--edge);border-radius:var(--r-ctl);
 font:inherit;font-size:13px;letter-spacing:-.01em}
.fnd input:hover{border-color:var(--fg)}
.fnd input::placeholder{color:var(--mut);opacity:1}
.fnd input::-webkit-search-cancel-button{-webkit-appearance:none;appearance:none}
.fnd .cb{flex:0 0 auto}
.fc{font-size:11.5px;color:var(--mut);white-space:nowrap;font-variant-numeric:tabular-nums;font-weight:600}
.fc.kept{color:var(--warn);font-weight:700}
.fnone{display:none;font-size:12.5px;color:var(--mut);line-height:1.55;padding:12px 8px}
.hid{display:none !important}
/* 검색 중일 때만: 경계 메모에서만 걸린 항목임을 알린다 (다른 코드를 인용한 메모 때문에 딸려온 것) */
.finding .cd[data-rank="2"] .cn::after{content:' [메모]';font-size:11px;color:var(--mut);font-weight:600}
.finding .cd.on[data-rank="2"] .cn::after{color:var(--selfg)}

/* ─── 입력·판정 ─── */
textarea{width:100%;background:var(--bg);color:var(--fg);border:1px solid var(--edge);
 border-radius:var(--r-ctl);padding:10px 11px;font:inherit;font-size:13.5px;letter-spacing:-.01em;
 resize:vertical;min-height:74px}
textarea:hover{border-color:var(--fg)}
.acts{display:flex;gap:6px}
.btn{flex:1;height:var(--h-act);padding:0 8px;border:1px solid transparent;border-radius:12px;
 font:inherit;font-weight:700;font-size:14.5px;letter-spacing:-.02em;cursor:pointer;
 display:inline-flex;align-items:center;justify-content:center;gap:6px}
.bp{background:var(--btnp);color:var(--btnpf)}
.br{background:var(--btnr);color:var(--btnrf)}
.bs{background:var(--btns);color:var(--btnsf);border-color:var(--edge)}
.btn:hover{filter:brightness(1.12)}
kbd{border:1px solid currentColor;border-radius:5px;padding:1px 5px;font-size:11px;
 font-family:inherit;font-weight:600;opacity:.85}

.rev{font-size:13px;line-height:1.6;background:var(--panel);border:1px solid var(--line);
 border-left:3px solid var(--acc);border-radius:var(--r-card);padding:11px 13px;box-shadow:var(--shadow)}
.rev .h{color:var(--acc);font-weight:700;font-size:11px;letter-spacing:.08em;margin-bottom:4px}
.ok{color:var(--ok);font-weight:700}.no{color:var(--no);font-weight:700}
.hint{font-size:12.5px;color:var(--mut);line-height:1.8}

/* ─── 겹쳐 뜨는 것들 ─── */
.toast{position:fixed;left:50%;bottom:26px;transform:translateX(-50%);
 background:var(--fg);color:var(--bg);border:1px solid var(--edge);
 padding:12px 22px;border-radius:12px;font-size:14.5px;font-weight:600;z-index:9;
 box-shadow:0 6px 24px rgba(0,0,0,.28)}
.toast.err{background:var(--no);color:var(--panel);border-color:var(--no)}

.gate{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:var(--bg);z-index:8}
.gate .card{background:var(--panel);border:1px solid var(--line);border-radius:20px;
 padding:28px 30px;max-width:460px;box-shadow:var(--shadow)}
.gate h2{margin:0 0 8px;font-size:20px;letter-spacing:-.03em}
.gate p{margin:0 0 14px;font-size:13.5px;color:var(--mut);line-height:1.65}
.gate input{width:100%;height:44px;padding:0 13px;font:inherit;font-size:15px;
 background:var(--bg);color:var(--fg);border:1px solid var(--edge);border-radius:var(--r-ctl);margin-bottom:10px}
/* 버튼이 둘(불러오기·취소)일 때 각각 width:100% 면 합이 200% 라 카드 밖으로 삐져나간다.
   flex 로 나눠 갖게 두면 하나뿐일 때는 알아서 꽉 찬다. */
.gate .btn{flex:1 1 0;width:auto;min-width:0}

.modal{position:absolute;inset:0;display:none;align-items:center;justify-content:center;
 background:rgba(0,0,0,.72);z-index:20}
.modal.show{display:flex}
.modal .card{background:var(--panel);border:1px solid var(--line);border-radius:20px;
 padding:24px 26px;max-width:660px;max-height:82%;overflow:auto;box-shadow:0 12px 40px rgba(0,0,0,.35)}
.modal h2{margin:0 0 12px;font-size:19px;letter-spacing:-.03em}
.modal p{margin:0 0 14px;font-size:13.5px;color:var(--mut);line-height:1.65}
.ks{display:grid;grid-template-columns:auto 1fr;gap:9px 18px;font-size:13.5px;align-items:baseline}
.ks b{color:var(--mut);font-weight:700;white-space:nowrap}
.sl{display:grid;grid-template-columns:70px 1fr 58px;gap:12px;align-items:center;margin:12px 0;font-size:13.5px}
.sl input[type=range]{width:100%;accent-color:var(--acc)}
.sl output{text-align:right;font-variant-numeric:tabular-nums;color:var(--mut)}
</style>
<div class="wrap" role="application" aria-label="빅카드 검수 워크벤치">
 <div class="bar">
  <b>검수 워크벤치</b>
  <button class="cb arm" id="bArm" data-on="0" aria-pressed="false">저장 꺼짐</button>
  <button class="cb" id="bWho" aria-label="검수자 이름 변경">검수자: –</button>
  <button class="cb" id="bReload" aria-label="작업 큐 다시 불러오기">큐 새로고침</button>
  <span class="mut" id="pos">–</span><span class="mut" id="tmr" style="display:none"></span>
  <div class="ctl" role="group" aria-label="보기 설정">
   <button class="cb" id="bTheme">테마: 어두움<i>H</i></button>
   <button class="cb" id="bUiD" aria-label="글자 작게">가－<i>-</i></button>
   <button class="cb" id="bUiU" aria-label="글자 크게">가＋<i>=</i></button>
   <button class="cb" id="bFx" aria-label="이미지 보정 열기">이미지 보정…</button>
   <button class="cb" id="bLoupe" aria-pressed="false">돋보기<i>M</i></button>
   <button class="cb" id="bGuide" aria-pressed="false">눈금<i>G</i></button>
   <button class="cb" id="bLink" aria-pressed="false">확대연동<i>L</i></button>
  </div>
  <div class="spacer"></div>
  <span class="mut" id="sst">–</span>
  <button class="cb" id="bKeys" aria-label="단축키 전체 보기">단축키<i>?</i></button>
  <button class="cb" id="bClose" aria-label="닫기">닫기<i>Esc</i></button>
 </div>
 <div style="flex:1;display:flex;min-height:0">
  <div class="imgs">
   <div class="pane" id="pR"><span class="tag">생성된 빅카드</span><span class="zl" id="zR">100%</span>
    <span class="ld">불러오는 중…</span><span class="gl">노란 세로선 = 프레임 폭 65% · 초록 십자 = 중앙</span>
    <div class="loupe" id="lR"></div>
    <div class="stage" id="sR"><img id="iR" alt="생성된 빅카드"><div class="guides" id="gR">
      <i class="v" style="left:17.5%"></i><i class="v" style="left:82.5%"></i>
      <i class="v c" style="left:50%"></i><i class="h c" style="top:50%"></i>
      <i class="h" style="top:17.5%"></i><i class="h" style="top:82.5%"></i>
    </div></div></div>
   <div class="split" id="sp" role="separator" aria-label="좌우 화면 비율 조절" tabindex="0"
        title="끌어서 비율 조절 · 더블클릭하면 기본값 · ← → 키로도 조절"></div>
   <div class="pane" id="pO"><span class="tag">원본</span><span class="zl" id="zO">100%</span>
    <span class="ld">불러오는 중…</span><div class="loupe" id="lO"></div>
    <div class="stage" id="sO"><img id="iO" alt="원본 상품 이미지"></div></div>
  </div>
  <div class="side">
   <div class="box"><div class="pname" id="pn">–</div><div class="meta" id="mt">–</div></div>
   <div class="box grow" id="codes" role="group" aria-label="이슈 코드">
    <div class="fnd">
     <input id="q" type="search" autocomplete="off" spellcheck="false"
            placeholder="코드 검색 — shadow · 그림자 · 배경" aria-label="이슈 코드 검색"
            aria-describedby="fc">
     <button class="cb" id="bQx" aria-label="검색어 지우기" style="display:none">✕</button>
     <span class="fc" id="fc" role="status" aria-live="polite"></span>
     <button class="cb tg" id="tgd" aria-pressed="false">설명 보기</button>
    </div>
    <div id="clist"></div>
    <div class="fnone" id="fnone"></div>
   </div>
   <div class="box" style="padding:9px">
    <textarea id="msg" aria-label="REJECT 사유" placeholder="REJECT 사유 — 코드를 고르면 초안이 자동으로 들어옵니다"></textarea>
    <div class="acts" style="margin-top:8px">
     <button class="btn bp" id="bp">PASS <kbd>Space</kbd></button>
     <button class="btn br" id="br">REJECT <kbd>Enter</kbd></button>
     <button class="btn bs" id="bs">건너뛰기 <kbd>N</kbd></button>
    </div>
   </div>
   <div class="rev" id="rev" style="display:none" role="status"></div>
   <div class="hint" id="hint"></div>
  </div>
 </div>
 <div class="gate" id="gate" style="display:none" role="dialog" aria-label="검수자 이름"><div class="card">
   <h2>검수자 이름</h2>
   <p>본인에게 배정된 작업만 불러옵니다. 라벨링 화면 상단
      "라벨링 하는 사람의 이름"에 넣는 값(LDAP)과 <b>똑같이</b> 적어주세요.<br>
      대소문자까지 같아야 하고, 다르면 큐가 0건으로 나옵니다.</p>
   <input id="who" placeholder="예: joel" aria-label="검수자 이름" autocomplete="off">
   <div class="acts">
     <button class="btn bp" id="goWho">이 이름으로 불러오기</button>
     <button class="btn bs" id="cancelWho" style="display:none">취소</button>
   </div>
   <p style="margin:12px 0 0">한 번 입력하면 이 브라우저가 기억합니다.
      나중에 상단 <b>검수자</b> 버튼으로 언제든 바꿀 수 있습니다.</p>
 </div></div>

 <div class="modal" id="mFx" role="dialog" aria-label="이미지 보정"><div class="card">
   <h2>이미지 보정</h2>
   <p>두 이미지에 함께 적용됩니다. 대비를 올리면 배경 확장의 이음새나 질감 차이가 잘 드러납니다.</p>
   <div class="sl"><label for="rCt">대비</label><input type="range" id="rCt" min="40" max="220" step="5"><output id="oCt"></output></div>
   <div class="sl"><label for="rBr">밝기</label><input type="range" id="rBr" min="40" max="220" step="5"><output id="oBr"></output></div>
   <div class="acts" style="margin-top:14px">
     <button class="btn bs" id="bInv" aria-pressed="false">색반전 (I)</button>
     <button class="btn bs" id="bGray" aria-pressed="false">흑백 (K)</button>
     <button class="btn bs" id="bFxR">초기화 (\\)</button>
   </div>
   <div class="acts" style="margin-top:8px"><button class="btn bp" id="bFxClose">닫기</button></div>
 </div></div>

 <div class="modal" id="mKeys" role="dialog" aria-label="단축키"><div class="card">
   <h2>단축키</h2>
   <div class="ks">
     <b>판정</b><span><kbd>Space</kbd> PASS · <kbd>Enter</kbd> REJECT · <kbd>N</kbd> 건너뛰기 · <kbd>←</kbd><kbd>→</kbd> 앞뒤 이동 · <kbd>'</kbd> 메시지 입력 · <kbd>U</kbd> auto 판정 보기</span>
     <b>이슈 코드</b><span>A그룹 <kbd>Q</kbd><kbd>W</kbd><kbd>E</kbd><kbd>R</kbd><kbd>T</kbd> · B그룹 <kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> · C그룹 <kbd>Z</kbd><kbd>X</kbd><kbd>C</kbd><kbd>V</kbd> · D그룹 <kbd>1</kbd>~<kbd>6</kbd> · E그룹 <kbd>7</kbd><kbd>8</kbd> · F그룹 <kbd>9</kbd><br>키보드 위치가 그대로 코드 그룹 순서입니다</span>
     <b>코드 검색</b><span><kbd>F</kbd> 검색창 · <kbd>Enter</kbd> 첫 결과 선택 · <kbd>Esc</kbd> 검색어 지우기<br>
       코드명뿐 아니라 <b>공식 설명·경계 메모</b>까지 훑습니다 — <b>shadow</b> 로도 <b>그림자</b> 로도 걸립니다.<br>
       띄어쓴 낱말은 모두 든 코드만 나옵니다(<b>배경 확장</b>).
       <b>이미 고른 코드는 검색어와 상관없이 항상 남습니다</b> — 안 보이는 코드가 저장되는 일이 없도록.</span>
     <b>이미지</b><span><kbd>휠</kbd> 확대 · <kbd>드래그</kbd> 이동 · <kbd>0</kbd> 리셋 · <kbd>M</kbd> 돋보기 · <kbd>G</kbd> 눈금 · <kbd>L</kbd> 확대연동</span>
     <b>보정</b><span><kbd>,</kbd><kbd>.</kbd> 대비 · <kbd>[</kbd><kbd>]</kbd> 밝기 · <kbd>I</kbd> 색반전 · <kbd>K</kbd> 흑백 · <kbd>\\</kbd> 초기화</span>
     <b>화면</b><span><kbd>H</kbd> 테마 · <kbd>-</kbd><kbd>=</kbd> 글자 크기 · <kbd>/</kbd> 코드 설명 · <kbd>Tab</kbd> 요소 이동 · <kbd>Esc</kbd> 닫기</span>
     <b>비율</b><span>두 이미지 사이 경계선을 끌면 좌우 폭이 바뀝니다. 더블클릭하면 기본값</span>
   </div>
   <div class="acts" style="margin-top:16px"><button class="btn bp" id="bKeysClose">닫기</button></div>
 </div></div>

 <div class="modal" id="mArm" role="dialog" aria-label="저장 켜기 확인"><div class="card">
   <h2>저장을 켤까요?</h2>
   <p>지금부터 PASS / REJECT 를 누르면 <b>실제로 서버에 기록</b>됩니다.<br>
      되돌리려면 원래 라벨링 화면에서 다시 판정해야 합니다.</p>
   <div class="acts">
     <button class="btn bp" id="bArmYes">저장 켜기</button>
     <button class="btn bs" id="bArmNo">취소</button>
   </div>
 </div></div>
</div>`;

const $ = s => R.querySelector(s);
const el = {};
['pos','tmr','sst','pn','mt','codes','clist','msg','rev','iR','iO','bp','br','bs','hint',
 'q','bQx','fc','fnone','tgd',
 'bTheme','bUiD','bUiU','bInv','bGray','bLoupe','bGuide','bLink','bFxR','bClose','bFx','bKeys',
 'bArm','bWho','bReload','gate','who','goWho','cancelWho','sp',
 'mFx','mKeys','mArm','rCt','rBr','oCt','oBr','bFxClose','bKeysClose','bArmYes','bArmNo']
 .forEach(id => el[id] = $('#' + id));
const wrap = $('.wrap');

/* --------------------------- 실행 버튼 --------------------------- */
const launcher = document.createElement('button');
launcher.textContent = '검수 워크벤치';
launcher.setAttribute('aria-label', '검수 워크벤치 열기 (Alt+W)');
launcher.dataset.hmWbLauncher = '1';
launcher.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147482000;height:46px;padding:0 20px;' +
  'font:700 14.5px/1 "Pretendard Variable","Pretendard",-apple-system,BlinkMacSystemFont,"Malgun Gothic",sans-serif;' +
  'letter-spacing:-.02em;color:#fff;background:#084DB1;border:1px solid #084DB1;border-radius:14px;' +
  'cursor:pointer;box-shadow:0 4px 16px rgba(8,77,177,.32)';
launcher.onclick = () => WB.open();
document.body.appendChild(launcher);

/* --------------------------- 코드 리스트 --------------------------- */
(function build() {
  let html = '', g = null;
  for (const c of CODES) {
    if (c.g !== g) {
      g = c.g;
      html += `<div class="ghead2" data-g="${g}"><span>${g}</span><hr></div>`;
    }
    const mk = (c.z ? ' <span class="mk" title="확대해야 잡히는 코드">[확대]</span>' : '')
             + (c.r ? ' <span class="mk" title="사라지면 reject — 방향이 반대">[반대]</span>' : '');
    html += `<div class="cd" role="checkbox" aria-checked="false" tabindex="0" data-c="${c.c}" data-g="${c.g}"` +
      ` title="${esc(c.d)}&#10;&#10;${esc(c.t)}">` +
      `<span class="kb" aria-hidden="true">${c.k.toUpperCase()}</span>` +
      `<span class="ck" aria-hidden="true">✓</span>` +
      `<span><span class="cn">${c.c}</span>${mk}<span class="ds">${c.d}</span></span></div>`;
  }
  el.clist.innerHTML = html;
  el.codes.addEventListener('click', e => {
    if (e.target.id === 'tgd') return setPref('desc', !S.pref.desc);
    const d = e.target.closest('.cd'); if (d) toggle(d.dataset.c);
  });
  el.codes.addEventListener('keydown', e => {
    const d = e.target.closest && e.target.closest('.cd');
    if (d && (e.key === ' ' || e.key === 'Enter')) { toggle(d.dataset.c); e.preventDefault(); e.stopPropagation(); }
  });
})();
function esc(s) { return String(s).replace(/[<>&"]/g, m => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[m])); }

/* --------------------------- 코드 검색 ---------------------------
 *  21개를 매번 눈으로 훑는 대신 걸러서 본다.
 *
 *  검색 대상 = 코드명 + 공식 설명(d) + 경계 메모(t).
 *  코드명만 뒤지면 한글로는 아무것도 못 찾는다. 셋을 합쳐 두면
 *  'shadow' 로도 '그림자' 로도 fabricated_shadow_or_reflection 이 걸리고,
 *  '이음새' 로도 background_extension_unnatural 이 걸린다.
 *
 *  공백으로 나눈 낱말은 AND 로 묶는다 — '배경 확장' 은 둘 다 든 코드만.
 *  코드명의 _ 는 공백으로도 한 번 더 펴 둬서 'garbled text' 도 걸린다.
 *
 *  ★ 이미 고른 코드는 검색어와 무관하게 항상 목록에 남긴다.
 *    필터에 가려진 코드가 조용히 저장 payload 에 실려 나가는 상황을
 *    아예 만들지 않기 위한 것 — 화면에 보이는 선택 = 저장되는 선택. */
CODES.forEach(c => {
  c._n = (c.c + ' ' + c.c.replace(/_/g, ' ')).toLowerCase();   // 코드명
  c._d = c._n + ' ' + c.d.toLowerCase();                        // + 공식 설명
  c._h = c._d + ' ' + c.t.toLowerCase();                        // + 경계 메모 (검색 전체 범위)
});
const tokens = () => S.q.toLowerCase().split(/\s+/).filter(Boolean);

/* 어디에서 걸렸는지에 따라 순위를 매긴다.
 * 경계 메모는 다른 코드 이름을 자주 인용한다 — 예를 들어
 * sales_or_info_overlay_not_removed 의 메모에 'fake_or_garbled_text' 가 들어 있어서
 * 코드명을 그대로 쳐도 두 건이 걸린다. 목록 순서는 단축키 배치라 흔들면 안 되므로
 * 순서는 그대로 두고, Enter 가 고를 대상만 순위로 정한다. */
function rankOf(c, toks) {
  if (toks.every(t => c._n.includes(t))) return 0;   // 코드명에서
  if (toks.every(t => c._d.includes(t))) return 1;   // 공식 설명에서
  return 2;                                          // 경계 메모에서만
}

function applyFind() {
  const toks = tokens(), all = !toks.length;
  let hits = 0, kept = 0;
  R.querySelectorAll('.cd').forEach(d => {
    const c = BY_CODE[d.dataset.c];
    const hit = all || toks.every(t => c._h.includes(t));
    const sel = S.sel.has(c.c);
    d.dataset.hit = hit ? '1' : '';
    d.dataset.rank = hit && !all ? String(rankOf(c, toks)) : '';
    d.classList.toggle('hid', !hit && !sel);
    if (hit) hits++; else if (sel) kept++;
  });
  el.codes.classList.toggle('finding', !all);
  // 남은 코드가 하나도 없는 그룹은 머리글도 같이 숨긴다
  R.querySelectorAll('.ghead2').forEach(h => {
    const any = [...R.querySelectorAll('.cd[data-g="' + h.dataset.g + '"]')]
      .some(d => !d.classList.contains('hid'));
    h.classList.toggle('hid', !any);
  });
  el.fc.textContent = all ? '' : `${hits}/${CODES.length}` + (kept ? ` +선택 ${kept}` : '');
  el.fc.classList.toggle('kept', !!kept);
  el.fc.title = kept ? '검색어에 안 걸리지만 이미 고른 코드라 남겨 둔 항목이 있습니다' : '';
  el.bQx.style.display = all ? 'none' : '';
  el.fnone.style.display = (!all && !hits) ? 'block' : 'none';
  el.fnone.textContent = kept
    ? '검색 결과가 없습니다. 아래는 이미 고른 코드입니다.'
    : '검색 결과가 없습니다. Esc 를 누르면 21개 전체로 돌아갑니다.';
}
function setFind(v) {
  S.q = v.trim() === '' ? '' : v;
  if (el.q.value !== v) el.q.value = v;
  applyFind();
}
function clearFind(keepFocus) { setFind(''); if (keepFocus) el.q.focus(); }
function focusFind() { el.q.focus(); el.q.select(); }

// 검색어에 실제로 걸린 것 중 가장 잘 맞는 하나.
// 선택 때문에 남아 있을 뿐인 항목(hit 아님)은 후보에서 빠진다 — 그걸 Enter 로
// 껐다가는 방금 고른 코드가 조용히 사라진다.
function bestHit() {
  if (!S.q) return null;          // 빈 검색창에서 Enter 는 아무것도 고르지 않는다
  let best = null, br = 9;
  R.querySelectorAll('.cd').forEach(d => {
    if (d.dataset.hit !== '1' || d.classList.contains('hid')) return;
    const r = +d.dataset.rank;
    if (r < br) { br = r; best = d; }     // 동점이면 목록 순서가 먼저인 쪽
  });
  return best;
}
el.q.addEventListener('input', () => setFind(el.q.value));
el.q.addEventListener('keydown', e => {
  if (e.isComposing || e.keyCode === 229) return;    // 한글 조합 중의 Enter 는 확정용이다
  if (e.key !== 'Enter') return;
  const first = bestHit();
  if (first) toggle(first.dataset.c);
  else if (S.q) toast('검색 결과가 없습니다', true);
  e.preventDefault(); e.stopPropagation();
});
el.bQx.onclick = () => clearFind(true);

/* --------------------------- 보기 설정 --------------------------- */
function setPref(k, v) { S.pref[k] = v; savePref(); applyPref(); }
function setFx(k, v) {
  const f = S.pref.fx;
  f[k] = k === 'bright' || k === 'contrast' ? Math.min(220, Math.max(40, v)) : v;
  savePref(); applyPref();
}
function applyPref() {
  const p = S.pref;
  wrap.classList.remove('dark', 'light', 'mono');
  wrap.classList.add(p.theme);
  el.bTheme.textContent = '테마: ' + ({dark:'어두움', light:'밝음', mono:'흑백 고대비'}[p.theme]);
  R.querySelector('.side').style.zoom = p.ui / 100;
  R.querySelector('.bar').style.zoom = Math.min(1.4, p.ui / 100);
  el.codes.classList.toggle('desc', p.desc);
  const tgd = R.querySelector('#tgd');
  if (tgd) { tgd.setAttribute('aria-pressed', String(p.desc)); tgd.textContent = p.desc ? '설명 숨기기' : '설명 보기'; }
  const f = p.fx;
  const filter = `brightness(${f.bright}%) contrast(${f.contrast}%)` +
                 (f.invert ? ' invert(1)' : '') + (f.gray ? ' grayscale(1)' : '');
  el.iR.style.filter = el.iO.style.filter = filter;
  R.querySelectorAll('.loupe').forEach(n => n.style.filter = filter);
  R.querySelector('#gR').classList.toggle('on', p.guides);
  R.querySelector('#pR').classList.toggle('guided', p.guides);
  R.querySelectorAll('.pane').forEach(n => n.classList.toggle('lp', p.loupe));
  const pr = (n, v) => { el[n].setAttribute('aria-pressed', String(!!v)); };
  pr('bInv', f.invert); pr('bGray', f.gray); pr('bLoupe', p.loupe); pr('bGuide', p.guides); pr('bLink', p.link);
  el.tmr.style.display = p.showTimer ? '' : 'none';
  const dirty = f.contrast !== 100 || f.bright !== 100 || f.invert || f.gray;
  el.bFx.textContent = dirty ? `보정 대비${f.contrast} 밝기${f.bright}${f.invert ? ' 반전' : ''}${f.gray ? ' 흑백' : ''}`
                             : '이미지 보정…';
  el.bFx.setAttribute('aria-pressed', String(!!dirty));
  el.rCt.value = f.contrast; el.oCt.textContent = f.contrast + '%';
  el.rBr.value = f.bright;   el.oBr.textContent = f.bright + '%';
  // 좌우 비율
  R.querySelector('#pR').style.flexGrow = p.split;
  R.querySelector('#pO').style.flexGrow = 100 - p.split;
  el.sp.setAttribute('aria-valuenow', String(p.split));
  el.hint.innerHTML =
    `<kbd>휠</kbd> 확대 · <kbd>드래그</kbd> 이동 · <kbd>0</kbd> 리셋 · <kbd>F</kbd> 코드 검색 · 가운데 <b>경계선</b>으로 좌우 폭 조절 · <kbd>?</kbd> 단축키`;
}
// 버튼 클릭 후에는 포커스를 풀어 단축키가 계속 먹게 한다 (키보드 Tab 이동은 그대로 유지)
R.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.cb'); if (b) b.blur(); });
el.bTheme.onclick = () => setPref('theme', {dark:'light', light:'mono', mono:'dark'}[S.pref.theme]);
el.bUiU.onclick  = () => setPref('ui', Math.min(200, S.pref.ui + 15));
el.bUiD.onclick  = () => setPref('ui', Math.max(85,  S.pref.ui - 15));
el.bInv.onclick  = () => setFx('invert', S.pref.fx.invert ? 0 : 1);
el.bGray.onclick = () => setFx('gray',   S.pref.fx.gray ? 0 : 1);
el.bLoupe.onclick= () => setPref('loupe', !S.pref.loupe);
el.bGuide.onclick= () => setPref('guides', !S.pref.guides);
el.bLink.onclick = () => setPref('link', !S.pref.link);
el.bFxR.onclick  = () => { S.pref.fx = Object.assign({}, DEF_PREF.fx); savePref(); applyPref(); };
el.bClose.onclick= () => WB.close();
el.rCt.oninput   = () => setFx('contrast', +el.rCt.value);
el.rBr.oninput   = () => setFx('bright',   +el.rBr.value);

/* --------------------------- 모달 --------------------------- */
function modal(node, show) {
  R.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
  if (show && node) { node.classList.add('show'); const f = node.querySelector('button,input'); if (f) setTimeout(() => f.focus(), 40); }
}
const anyModal = () => !!R.querySelector('.modal.show');
el.bFx.onclick       = () => modal(el.mFx, true);
el.bFxClose.onclick  = () => modal(null, false);
el.bKeys.onclick     = () => modal(el.mKeys, true);
el.bKeysClose.onclick= () => modal(null, false);
el.bArmNo.onclick    = () => modal(null, false);
el.bArmYes.onclick   = () => { modal(null, false); setArm(true); };
el.bArm.onclick      = () => S.armed ? setArm(false) : modal(el.mArm, true);
R.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) modal(null, false); }));

function setArm(on) {
  S.armed = on;
  el.bArm.dataset.on = on ? '1' : '0';
  el.bArm.textContent = on ? '저장 켜짐' : '저장 꺼짐';
  el.bArm.setAttribute('aria-pressed', String(on));
  toast(on ? '저장 켜짐 — 판정이 실제로 기록됩니다' : '저장 꺼짐 — 기록하지 않습니다');
}

/* --------------------------- 좌우 비율 --------------------------- */
(function splitter() {
  let on = false;
  const setFrom = (clientX) => {
    const box = R.querySelector('.imgs').getBoundingClientRect();
    const pct = Math.min(82, Math.max(25, Math.round((clientX - box.left) / box.width * 100)));
    S.pref.split = pct; savePref(); applyPref(); resetView();
  };
  el.sp.addEventListener('mousedown', e => { on = true; el.sp.classList.add('on'); e.preventDefault(); });
  bind(window, 'mousemove', e => { if (on) setFrom(e.clientX); });
  bind(window, 'mouseup', () => { if (on) { on = false; el.sp.classList.remove('on'); savePref(); } });
  el.sp.addEventListener('dblclick', () => { setPref('split', DEF_PREF.split); resetView(); });
  el.sp.addEventListener('keydown', e => {
    const d = e.key === 'ArrowLeft' ? -3 : e.key === 'ArrowRight' ? 3 : 0;
    if (!d) return;
    setPref('split', Math.min(82, Math.max(25, S.pref.split + d))); resetView();
    e.preventDefault(); e.stopPropagation();
  });
})();

/* --------------------------- 확대 / 이동 / 돋보기 --------------------------- */
const V = { R:{z:1,x:0,y:0,fit:1}, O:{z:1,x:0,y:0,fit:1} };
function applyView(w) {
  const v = V[w];
  R.querySelector('#s' + w).style.transform =
    `translate(calc(-50% + ${v.x}px), calc(-50% + ${v.y}px)) scale(${v.z})`;
  R.querySelector('#z' + w).textContent = Math.round(v.z / (v.fit || 1) * 100) + '%';
}
function fitView(w) {
  const img = w === 'R' ? el.iR : el.iO;
  const st = R.querySelector('#s' + w), pane = R.querySelector('#p' + w);
  const nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
  st.style.width = nw + 'px'; st.style.height = nh + 'px';
  const r = pane.getBoundingClientRect();
  const fit = Math.min((r.width - 16) / nw, (r.height - 16) / nh) || 1;
  V[w] = { z:fit, x:0, y:0, fit }; applyView(w);
}
function resetView() { fitView('R'); fitView('O'); }

['R','O'].forEach(w => {
  const pane = R.querySelector('#p' + w), loupe = R.querySelector('#l' + w);
  const img  = w === 'R' ? el.iR : el.iO;
  pane.addEventListener('wheel', e => {
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.18 : 1 / 1.18;
    for (const t of (S.pref.link ? ['R','O'] : [w])) {
      const v = V[t]; v.z = Math.min(20, Math.max(v.fit * 0.4, v.z * f)); applyView(t);
    }
  }, { passive:false });
  let dg = null;
  pane.addEventListener('mousedown', e => {
    dg = { x:e.clientX, y:e.clientY, vx:V[w].x, vy:V[w].y }; pane.classList.add('drag');
  });
  bind(window, 'mousemove', e => {
    if (dg) { V[w].x = dg.vx + (e.clientX - dg.x); V[w].y = dg.vy + (e.clientY - dg.y); applyView(w); }
    if (S.pref.loupe && wrap.classList.contains('show')) {
      const pr = pane.getBoundingClientRect();
      const inside = e.clientX >= pr.left && e.clientX <= pr.right && e.clientY >= pr.top && e.clientY <= pr.bottom;
      loupe.style.display = inside ? 'block' : 'none';
      if (!inside) return;
      const ir = img.getBoundingClientRect(), Z = 3, D = 260;
      loupe.style.left = (e.clientX - pr.left - D / 2) + 'px';
      loupe.style.top  = (e.clientY - pr.top  - D / 2) + 'px';
      loupe.style.backgroundImage = `url("${img.src}")`;
      loupe.style.backgroundSize = (ir.width * Z) + 'px ' + (ir.height * Z) + 'px';
      loupe.style.backgroundPosition =
        (-( (e.clientX - ir.left) * Z - D / 2)) + 'px ' + (-((e.clientY - ir.top) * Z - D / 2)) + 'px';
    }
  });
  bind(window, 'mouseup', () => { dg = null; pane.classList.remove('drag'); });
  pane.addEventListener('dblclick', resetView);
});

/* --------------------------- 렌더 --------------------------- */
const cur = () => S.queue[S.i] || null;
// 선택 표시를 S.sel 에 맞춰 다시 그린다. 선택이 바뀌면 검색 필터가 남겨 둘
// 항목도 바뀌므로 applyFind 까지 한 묶음으로 돌린다.
function syncCodes() {
  R.querySelectorAll('.cd').forEach(d => {
    const on = S.sel.has(d.dataset.c);
    d.classList.toggle('on', on); d.setAttribute('aria-checked', String(on));
  });
  applyFind();
}
function toggle(code) {
  S.sel.has(code) ? S.sel.delete(code) : S.sel.add(code);
  syncCodes();
  autoDraft();
  // 여백이 넓어지며 21개가 한 화면에 다 안 들어간다. 단축키로 고른 코드가
  // 화면 밖이면 ✓ 가 켜졌는지 확인할 길이 없으므로, 벗어난 경우에만 끌어온다.
  const row = R.querySelector('.cd[data-c="' + code + '"]');
  if (!row || row.classList.contains('hid')) return;
  const rr = row.getBoundingClientRect(), br = el.codes.getBoundingClientRect();
  if (rr.top < br.top + 28 || rr.bottom > br.bottom) {   // +28 = 고정된 검색줄 높이만큼 여유
    if (typeof row.scrollIntoView === 'function') row.scrollIntoView({ block: 'nearest' });
  }
}
function autoDraft() {
  if (S.pref.draft === 'off' || el.msg.dataset.touched) return;
  const f = S.pref.draft === 'official' ? 'd' : 'm';
  el.msg.value = [...S.sel].map(c => BY_CODE[c][f]).join(', ');
}
function setImg(w, url) {
  const img = w === 'R' ? el.iR : el.iO, pane = R.querySelector('#p' + w);
  pane.classList.add('loading');
  img.onload  = () => { pane.classList.remove('loading'); fitView(w); };
  img.onerror = () => pane.classList.remove('loading');
  img.src = url || '';
  if (img.complete && img.naturalWidth) { pane.classList.remove('loading'); fitView(w); }
}
const _pf = new Set();
function prefetch(i) {
  const it = S.queue[i]; if (!it) return;
  for (const u of [it.media.result_url, it.media.selected_input_url])
    if (u && !_pf.has(u)) { _pf.add(u); new Image().src = u; }
}
function render() {
  const it = cur();
  el.rev.style.display = 'none'; delete el.rev.dataset.peek;
  S.sel.clear();
  syncCodes();          // 검색어는 그대로 두고 선택만 비운다
  el.msg.value = ''; delete el.msg.dataset.touched;
  if (!it) {
    el.pn.textContent = '큐가 비었습니다'; el.mt.textContent = '';
    el.iR.src = ''; el.iO.src = ''; el.pos.textContent = '–'; return;
  }
  el.pn.textContent = it.product_name || '(상품명 없음)';
  el.mt.textContent = `row ${it.row_number} · product ${it.product_id} · ${it.media.selected_input_column || ''}`;
  setImg('R', it.media.result_url); setImg('O', it.media.selected_input_url);
  el.pos.textContent = `${S.i + 1} / ${S.queue.length}`;
  S.t0 = Date.now();
  // 이미 저장한 건으로 되돌아온 경우: 빈 폼으로 두면 실수로 빈 PASS를 덮어쓸 수 있다.
  // 저장했던 판정·코드·메시지를 그대로 복원하고, 덮어쓰기임을 알린다.
  const prev = S.done[it.label_row_id];
  if (prev) {
    prev.codes.forEach(c => S.sel.add(c));
    syncCodes();
    el.msg.value = prev.msg || '';
    el.msg.dataset.touched = '1';           // 자동 초안이 저장했던 문구를 덮지 않게
    el.rev.innerHTML = `<div class="h">이미 판정한 건입니다</div>` +
      `저장된 판정: <b>${prev.verdict}</b>` +
      (prev.codes.length ? ` · ${prev.codes.map(esc).join(', ')}` : '') +
      `<div style="margin-top:4px;color:var(--mut)">다시 저장하면 위 내용을 덮어씁니다. 고칠 게 없으면 그냥 넘어가세요.</div>`;
    el.rev.style.display = 'block';
  }
  renderStats(); prefetch(S.i + 1); prefetch(S.i + 2);
}
function renderStats() {
  const s = S.stats;
  el.sst.textContent = `저장 ${s.n}건` + (s.n ? ` · auto 판정일치 ${Math.round(s.agreeVerdict / s.n * 100)}%` : '');
}
const TICK = setInterval(() => {
  if (S.pref.showTimer && wrap.classList.contains('show') && cur())
    el.tmr.textContent = ((Date.now() - S.t0) / 1000).toFixed(0) + '초';
}, 500);
function toast(m, bad) {
  R.querySelectorAll('.toast').forEach(n => n.remove());
  const t = document.createElement('div');
  t.className = 'toast' + (bad ? ' err' : ''); t.textContent = m; t.setAttribute('role', 'alert');
  wrap.appendChild(t); setTimeout(() => t.remove(), bad ? 6000 : 2200);
}

/* --------------------------- 저장 --------------------------- */
async function save(verdict) {
  const it = cur(); if (!it || S.busy) return;
  const codes = [...S.sel], msg = el.msg.value.trim();
  if (verdict === 'reject') {
    if (!codes.length) return toast('이슈 코드를 최소 1개 고르세요', true);
    if (!msg) return toast('REJECT 사유 메시지를 적으세요', true);
  }
  const secs = (Date.now() - S.t0) / 1000;
  const payload = { label_row_id: it.label_row_id, labeler: S.labeler, human_verdict: verdict,
    human_issue_codes: verdict === 'reject' ? codes : [],
    human_message: verdict === 'reject' ? msg : (msg || ''), discard_reason: '' };
  if (!S.armed) {
    console.log('%c[저장 꺼짐] 전송하지 않음', 'color:#b8860b', payload);
    toast('저장 꺼짐 — 전송하지 않았습니다 (WB.arm() 으로 켜기)');
    reveal(it, verdict, codes, true); return;
  }
  S.busy = true;
  try {
    await postSave(payload);
    const resave = !!S.done[it.label_row_id];
    S.done[it.label_row_id] = { verdict, codes: [...codes], msg };
    if (!resave) tally(it, verdict, codes, secs);   // 재저장은 통계에 두 번 세지 않는다
    reveal(it, verdict, codes, false);
    toast('저장됨');
    setTimeout(next, 900);
  } catch (e) { toast(String(e.message || e), true); console.error(e); }
  finally { S.busy = false; }
}
function tally(it, verdict, codes, secs) {
  const s = S.stats, a = it.auto || {};
  s.n++; s[verdict === 'pass' ? 'pass' : 'reject']++;
  s.secs.push(+secs.toFixed(1)); if (s.secs.length > 400) s.secs.shift();
  if (a.verdict === verdict) s.agreeVerdict++;
  const A = new Set(a.issue_codes || []), inter = codes.filter(c => A.has(c)).length;
  if (A.size === codes.length && inter === A.size) s.codeExact++;
  else if (inter > 0) s.codePartial++;
  else if (A.size || codes.length) s.codeMiss++;
  saveStats(); renderStats();
}
function reveal(it, verdict, codes, dry) {
  const a = it.auto || {}, A = new Set(a.issue_codes || []);
  const mine = codes.map(c => (A.has(c) ? '<span class="ok">일치</span> ' : '<span class="no">나만</span> ') + c).join('<br>');
  const only = (a.issue_codes || []).filter(c => !codes.includes(c)).map(c => 'auto만 ' + c).join('<br>');
  el.rev.innerHTML = `<div class="h">AUTO 판정 대조${dry ? ' (저장 꺼짐)' : ''}</div>` +
    `auto <b class="${a.verdict === verdict ? 'ok' : 'no'}">${a.verdict || '—'}</b> · 나 <b>${verdict}</b>` +
    (mine ? `<div style="margin-top:5px">${mine}</div>` : '') +
    (only ? `<div style="margin-top:4px;color:var(--mut)">${only}</div>` : '') +
    (a.message ? `<div style="margin-top:5px;color:var(--mut)">${esc(a.message)}</div>` : '');
  el.rev.style.display = 'block';
}
/* auto 판정 보기 — U 키 토글.
 * auto는 정밀도가 높은 편(잡은 건 대체로 진짜)이라 참고하면서,
 * auto가 못 잡은 것을 추가로 찾는 흐름에 쓴다. */
function peekAuto() {
  const it = cur(); if (!it) return;
  if (el.rev.style.display === 'block' && el.rev.dataset.peek === it.label_row_id) {
    el.rev.style.display = 'none'; delete el.rev.dataset.peek; return;
  }
  const a = it.auto || {};
  el.rev.dataset.peek = it.label_row_id;
  el.rev.innerHTML = `<div class="h">AUTO 판정</div>` +
    `auto: <b>${esc(a.verdict || '—')}</b>` +
    ((a.issue_codes || []).length ? `<div style="margin-top:4px">${a.issue_codes.map(esc).join('<br>')}</div>` : '') +
    (a.message ? `<div style="margin-top:4px;color:var(--mut)">${esc(a.message)}</div>` : '') +
    `<div style="margin-top:6px;color:var(--mut)">다시 <b>U</b>를 누르면 닫힙니다.</div>`;
  el.rev.style.display = 'block';
}

function next() {
  if (S.i < S.queue.length - 1) { S.i++; render(); return; }
  toast('큐 끝 — 다음 묶음을 가져옵니다');
  WB.load().then(n => { if (!n) toast('남은 작업이 없습니다', true); })
           .catch(e => toast(String(e.message || e), true));
}
function prev() { if (S.i > 0) { S.i--; render(); } }

/* --------------------------- 키보드 ---------------------------
 * 글자를 받는 곳에 포커스가 있으면 코드 단축키를 절대 가로채지 않는다.
 * 예전에는 el.msg / el.who / el.q 세 노드와 동일한지만 봤는데, 그러면
 *   · 나중에 입력 칸이 하나 늘어나거나
 *   · 워크벤치가 두 벌 떠서 "내 것이 아닌" 입력창을 만나면
 * 곧바로 글자를 먹어버린다. 노드 신원 대신 "글자를 받는 요소인가"로 판단한다. */
function isTextEntry(n) {
  if (!n || !n.tagName) return false;
  if (n.isContentEditable === true) return true;
  const ce = n.getAttribute && n.getAttribute('contenteditable');
  if (ce === '' || ce === 'true' || ce === 'plaintext-only') return true;
  const t = n.tagName;
  if (t === 'TEXTAREA' || t === 'SELECT') return true;
  if (t !== 'INPUT') return false;
  return !/^(button|checkbox|radio|submit|reset|file|image|range|color)$/i
    .test(n.getAttribute('type') || 'text');
}
bind(window, 'keydown', e => {
  if (e.altKey && (e.key === 'w' || e.key === 'W')) { WB.open(); e.preventDefault(); return; }
  if (!wrap.classList.contains('show')) return;
  const path = e.composedPath ? e.composedPath() : [];
  const focused = R.activeElement;              // 우리 shadow 트리에서 실제로 포커스를 쥔 것
  const on = path[0] || focused || {};
  const inText = isTextEntry(on) || isTextEntry(focused);
  if (e.key === 'Escape') {
    if (anyModal()) modal(null, false);
    else if (el.gate.style.display === 'flex' && S.labeler) gate(false);
    // 검색창 안: 검색어가 있으면 먼저 지우고, 비어 있으면 그때 빠져나온다
    else if (on === el.q) { if (S.q) clearFind(true); else el.q.blur(); }
    else if (inText) on.blur();
    // 목록이 걸러진 채로 남지 않게 — 워크벤치를 닫기 전에 필터부터 푼다
    else if (S.q) clearFind(false);
    else WB.close();
    e.preventDefault(); return;
  }
  if (inText || e.ctrlKey || e.metaKey || e.altKey) return;
  if (anyModal()) return;                       // 모달이 떠 있으면 단축키를 먹지 않는다
  if (on.type === 'range') return;              // 슬라이더 조작 중에는 방향키를 양보
  // Tab 은 가로채지 않는다 — 키보드 사용자의 포커스 이동이 최우선이다.
  if (e.key === 'Tab') return;
  // 버튼·체크박스에 포커스가 있을 때 Space/Enter 는 그 요소의 것이다.
  const focusable = on.tagName === 'BUTTON' || (on.classList && on.classList.contains('cd'));
  if (focusable && (e.key === ' ' || e.key === 'Enter')) return;
  const k = e.key.toLowerCase(), P = S.pref, F = P.fx;
  if (BY_KEY[k]) { toggle(BY_KEY[k].c); e.preventDefault(); return; }
  const act = {
    ' ':      () => save('pass'),
    'enter':  () => save('reject'),
    'n':      next,
    'arrowright': next,
    'arrowleft':  prev,
    '0':      resetView,
    'g':      () => setPref('guides', !P.guides),
    'm':      () => setPref('loupe',  !P.loupe),
    'l':      () => setPref('link',   !P.link),
    '/':      () => setPref('desc',   !P.desc),
    'h':      () => setPref('theme', {dark:'light', light:'mono', mono:'dark'}[P.theme]),
    'i':      () => setFx('invert', F.invert ? 0 : 1),
    'k':      () => setFx('gray',   F.gray ? 0 : 1),
    ',':      () => setFx('contrast', F.contrast - 10),
    '.':      () => setFx('contrast', F.contrast + 10),
    '[':      () => setFx('bright',   F.bright - 10),
    ']':      () => setFx('bright',   F.bright + 10),
    '\\':     () => { S.pref.fx = Object.assign({}, DEF_PREF.fx); savePref(); applyPref(); },
    '-':      () => setPref('ui', Math.max(85,  P.ui - 15)),
    '=':      () => setPref('ui', Math.min(200, P.ui + 15)),
    "'":      () => el.msg.focus(),
    'f':      focusFind,
    'u':      peekAuto,
    '?':      () => modal(el.mKeys, true),
  }[k];
  if (act) { act(); e.preventDefault(); }
}, true);
el.msg.addEventListener('input', () => { el.msg.dataset.touched = '1'; });
el.bp.onclick = () => save('pass');
el.br.onclick = () => save('reject');
el.bs.onclick = next;

/* --------------------------- 이름 게이트 --------------------------- */
function gate(show) {
  el.gate.style.display = show ? 'flex' : 'none';
  el.cancelWho.style.display = S.labeler ? '' : 'none';   // 이름이 이미 있을 때만 취소 가능
  if (show) { el.who.value = S.labeler || ''; setTimeout(() => { el.who.focus(); el.who.select(); }, 50); }
}
function setWho(v) {
  S.labeler = v;
  try { localStorage.setItem('hm_wb_labeler', v); } catch (e) {}
  el.bWho.textContent = '검수자: ' + (v || '–');
}
el.goWho.onclick = async () => {
  const v = el.who.value.trim();
  if (!v) return toast('이름을 입력하세요', true);
  setWho(v); gate(false);
  try {
    const n = await WB.load();
    toast(n ? `${v} 님의 작업 ${n}건을 불러왔습니다` : `${v} 님에게 배정된 미완료 작업이 없습니다`, !n);
  } catch (e) { toast(String(e.message || e), true); }
};
el.cancelWho.onclick = () => gate(false);
el.who.addEventListener('keydown', e => { if (e.key === 'Enter') el.goWho.click(); });
el.bWho.onclick = () => gate(true);
el.bReload.onclick = async () => {
  try {
    const n = await WB.load();
    toast(n ? `${n}건 다시 불러왔습니다` : '남은 작업이 없습니다', !n);
  } catch (e) { toast(String(e.message || e), true); }
};
function guessLabeler() {
  try { const s = localStorage.getItem('hm_wb_labeler'); if (s) return s; } catch (e) {}
  const i = [...document.querySelectorAll('input')]
    .find(x => /labeler|이름|name/i.test(x.name + x.id + x.placeholder) && x.value);
  return (i && i.value.trim()) || '';
}

/* --------------------------- 코드 목록 대조 ---------------------------
 * 서버는 매 응답에 유효한 이슈 코드 목록을 실어 보낸다.
 * 우리 내장 목록과 다르면 = 판정 정책이 바뀐 것 → 크게 경고하고 저장을 끈다.
 * (이 도구가 조용히 낡은 코드로 저장을 계속하는 것을 막는 안전장치) */
let _driftWarned = false;
function checkCodeDrift(serverCodes) {
  if (!Array.isArray(serverCodes) || !serverCodes.length) return;
  const mine = new Set(CODES.map(c => c.c));
  const missing = serverCodes.filter(c => !mine.has(c));   // 서버엔 있는데 나는 모르는 코드
  const stale   = [...mine].filter(c => !serverCodes.includes(c)); // 내겐 있는데 서버가 버린 코드
  if (!missing.length && !stale.length) return;
  if (S.armed) setArm(false);
  if (_driftWarned) return;
  _driftWarned = true;
  const msg = '이슈 코드 정책이 바뀌었습니다. 이 도구는 구버전이니 원래 화면으로 작업하고, 스크립트 업데이트를 요청하세요.';
  toast(msg, true);
  console.warn('[워크벤치] 코드 목록 불일치',
    { 서버에만_있음: missing, 도구에만_있음: stale });
  el.rev.innerHTML = `<div class="h">주의 — 판정 코드 정책 변경 감지</div>${esc(msg)}` +
    (missing.length ? `<div style="margin-top:5px">새 코드: ${missing.map(esc).join(', ')}</div>` : '') +
    (stale.length ? `<div style="margin-top:4px">폐기된 코드: ${stale.map(esc).join(', ')}</div>` : '');
  el.rev.style.display = 'block';
}

/* --------------------------- 공개 API --------------------------- */
const WB = window.WB = {
  VERSION,
  /* 이 인스턴스를 완전히 물러나게 한다 — 새 버전을 덮어 붙여넣을 때 쓴다.
   * 화면만 지우면 전역 키 핸들러가 유령으로 남아 글자를 먹으므로 리스너까지 뗀다. */
  destroy() {
    OFF.forEach(f => f());
    clearInterval(TICK);
    try { host.remove(); } catch (e) {}
    try { launcher.remove(); } catch (e) {}
    if (window.WB === WB) { try { delete window.WB; } catch (e) { window.WB = undefined; } }
  },
  open() {
    wrap.classList.add('show'); applyPref();
    if (!S.labeler) setWho(guessLabeler());
    if (!S.labeler) return gate(true);
    if (!S.queue.length) WB.load().catch(e => toast(String(e.message || e), true));
    else S.t0 = Date.now();
  },
  close() { wrap.classList.remove('show'); },
  async load(who, size) {
    if (who || !S.labeler) setWho(who || S.labeler || guessLabeler());
    if (!S.labeler) { gate(true); return 0; }
    const d = await fetchQueue(S.labeler, size || 40);
    checkCodeDrift(d.issue_codes);
    S.queue = d.items || []; S.i = 0;
    console.log(`큐 ${S.queue.length}건 로드 (미완료 총 ${d.total}건) · labeler=${S.labeler}`);
    render(); return S.queue.length;
  },
  arm()    { setArm(true); },
  disarm() { setArm(false); },
  who(name){ if (name == null) return gate(true); setWho(name); return WB.load(); },
  find(v) { setFind(v == null ? '' : String(v)); return el.fc.textContent || '전체'; },
  timer(on){ setPref('showTimer', !!on); },
  draft(m) { setPref('draft', m || 'short'); console.log('자동 초안 =', S.pref.draft); },
  stats() {
    const s = S.stats, avg = s.secs.length ? s.secs.reduce((a,b)=>a+b,0)/s.secs.length : 0;
    const sorted = [...s.secs].sort((a,b)=>a-b);
    const o = { 저장건수:s.n, PASS:s.pass, REJECT:s.reject,
      '건당 평균(초)':+avg.toFixed(1), '건당 중앙값(초)': sorted.length ? sorted[sorted.length>>1] : 0,
      '500건 환산(시간)':+(avg*500/3600).toFixed(1),
      'auto 판정 일치율(%)': s.n ? Math.round(s.agreeVerdict/s.n*100) : 0,
      '코드 완전일치':s.codeExact, '코드 부분일치':s.codePartial, '코드 불일치':s.codeMiss };
    console.table(o); return o;
  },
  reset()  { S.stats = blank(); saveStats(); renderStats(); },
  raw: S,
};

applyPref();
applyFind();
setWho(guessLabeler());
console.log('%c검수 워크벤치 v' + VERSION, 'font-size:15px;font-weight:700');
console.log([
  '  여는 법 : 오른쪽 아래 [검수 워크벤치] 버튼  또는  Alt+W',
  '  검수자 이름은 처음 열 때 화면에서 물어봅니다.',
  '  나중에 바꾸려면 상단 [검수자] 버튼, 큐를 다시 받으려면 [큐 새로고침].',
  '',
  '  코드 검색 : F → 검색어 → Enter 로 첫 결과 선택, Esc 로 해제.',
  '             코드명·공식 설명·경계 메모를 함께 찾습니다 (shadow / 그림자 둘 다 가능).',
  '',
  '  저장은 처음엔 꺼져 있습니다. 켜려면 →  WB.arm()',
].join('\n'));
})();