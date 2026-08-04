// ==UserScript==
// @name         HM 빅카드 검수 워크벤치
// @namespace    hailmary-qa
// @version      0.9.11
// @description  빅카드 생성 검수 보조 — 확대·단축키·코드 검색·건 정보 복사·사례 조회·내 완료 재검토·저시력 지원 (토스 톤)
// @match        https://hailmary-commerce.dev.onkakao.net/admin/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
/* =============================================================
 *  저장은 처음엔 꺼져 있음. 상단 [저장 꺼짐] 버튼으로 켠다.
 *
 *  이 파일은 build.js 가 만든 산출물이다. 고칠 곳은 src/ 다.
 *   · 단축키를 바꾸려면  src/25-keys.js  한 곳만 고친다 (동작·도움말이 함께 따라온다)
 *   · 이슈 코드를 바꾸려면 src/20-codes.js
 *   · 붙여넣기 전에는  node check.js  — 문법·키 충돌·빌드 최신 여부를 한 번에 본다
 *   · 크게 손댔으면  node smoke.js  — 진짜 DOM 에 한 번 올려 본다 (npm i jsdom)
 *
 *  변경 이력
 *   0.9.11 하단 안내를 진짜 한 줄로 — B·F·Y·O·? 다섯 개만 남겼다. 검수 화면의 세로 공간은
 *         이미지 몫인데 안내가 세 줄을 먹고 있었다. 빠진 것들은 전부 ? 안에 있고,
 *         J(고치기)는 잠긴 건을 열면 배너에 버튼으로 나오므로 안내에 없어도 찾게 된다.
 *         · 안내가 아직 "미완료 ▸ 완료 ▸ 전체" 라고 말하고 있었다 — 전체 범위는 0.9.9 에서
 *           없앴는데 키 표의 설명(desc)이 낡은 채였다. 표가 한 곳이라 고치는 곳도 한 곳.
 *         · 상단 "저장 N건" 에 마우스를 올리면 설명이 나온다 — 서버의 완료 총수와 다른
 *           숫자를 세는 칸이라(이 브라우저·워크벤치·새 판정만), 나란히 보이면 반드시
 *           "왜 다르지?" 가 나오는 자리다. 물음이 생기는 자리에 답을 붙였다.
 *
 *   0.9.10 폐기(discarded)된 건을 잠근다. 두 번째 probe 에서 서버에 discarded 가 50건 있고
 *         판정(human)은 비어 있다는 것이 드러났다 — 그러면 워크벤치 눈에는 "아직 판정이 없는 건"
 *         으로 보여서 잠기지 않은 채 열리고, Space 한 번에 폐기가 PASS 로 덮인다.
 *         지금 쓰는 두 큐(mine · mine_done)로는 폐기 건이 오지 않지만, 오는 날 조용히 깨질
 *         자리라 미리 막았다. 워크벤치는 폐기를 만들 수도 되돌릴 수도 없으므로
 *         (저장 payload 의 discard_reason 을 늘 빈 값으로 보낸다) J 로도 열리지 않는다.
 *         · 완료 건의 human 모양 확인 — {verdict, issue_codes[], message} 로 코드·메시지까지
 *           전부 실려 온다(detail:true). 그래서 완료 범위에서 J 로 고치는 길이 정상적으로 열린다.
 *         · WB.probe() 는 이제 확인된 값만 훑는다 — 400 이 콘솔에 빨갛게 쌓이지 않는다.
 *           안 받는 값까지 다시 보려면 WB.probe(true).
 *         · label_status 질의값 표를 최신으로 (unlabeled·mine_discarded 도 400 이다).
 *
 *   0.9.9 "내 완료"가 실제로 동작한다. 0.9.8 은 label_status=mine 한 벌을 받아 판정 유무로
 *         갈랐는데, mine 은 애초에 미완료 큐(373건 · 전부 unlabeled)라 완료가 항상 0건이었다.
 *         있지도 않은 것을 거르고 있었던 셈이다.
 *         WB.probe() 로 확인한 결과 서버에 제대로 된 값이 있었다 —
 *           mine       내 미완료   373건 · unlabeled · 판정 0/5
 *           mine_done  내 완료     127건 · labeled   · 판정 5/5   ← 이걸 쓴다
 *           labeled(8795) · all(44489) 은 남의 것까지 섞여 오므로 큐로 쓰지 않는다
 *           done · completed · complete · todo → 400 unknown label_status
 *         373 + 127 = 500 = 내게 배정된 전체.
 *         · 범위마다 서버의 다른 큐를 받는다. 총건수·쪽 번호가 이제 진짜 값이다.
 *           위치 표시도 "127건 중 34번째" 로 — 쪽 안의 몇 번째는 알고 싶은 게 아니다.
 *         · '전체' 범위는 없앴다. 서버에 "내 것 전부" 를 주는 값이 없어서 두 번 불러
 *           이어 붙여야 하는데, 그러면 쪽 번호와 총건수가 둘 다 거짓말이 된다.
 *         · 완료 범위 끝에서 N/→ 를 누르면 다음 쪽으로 넘어간다.
 *         · 코드·메시지가 목록에 안 실려 온 건은 잠금을 못 푼다. 되살릴 것이 판정 하나뿐인데
 *           그대로 저장하면 원래 코드·메시지가 빈 값으로 덮이기 때문이다 (WB.fix(true) 로 강제).
 *         · check.js 에 큐 범위 검사 추가 — SCOPES 의 status 가 "내 것만" 주는 값인지,
 *           fetchQueue 에 문자열을 직접 박지 않았는지 본다. 남의 건이 큐로 들어오면
 *           S.mine 자물쇠가 그대로 열리므로 눈으로 지킬 규칙이 아니다.
 *
 *   0.9.8 한 장짜리 스크립트를 src/ 11개 모듈로 쪼개고 build.js 로 다시 한 장을 만든다.
 *         배포·붙여넣기 방식은 그대로다 — 산출물은 여전히 파일 하나다.
 *         · 단축키가 한 곳(25-keys.js)에서만 정의된다. 실제 동작 · 단축키 창 ·
 *           하단 한 줄 안내 · 조회 창에서 통과시킬 키 목록이 전부 그 표에서 생성된다.
 *           전에는 다섯 군데에 흩어져 있어서 도움말과 실제가 어긋날 수 있었다.
 *         · 뷰어를 makeViewer() 팩토리로. 'i'+id / 'p'+id 규약이 한 함수 안으로 들어갔다.
 *         · node check.js — 문법 · 키 충돌 · 코드 표 완결성 · dist 최신 여부를 한 번에.
 *           빌드를 잊고 옛 dist 를 붙여넣는 사고가 여기서 걸린다.
 *         · "내 완료" — 큐 범위를 미완료 ▸ 완료 ▸ 전체로 돌려가며 본다 (B 키).
 *           이미 판정한 건은 저장된 판정 · 코드 · 메시지를 그대로 되살려 열고,
 *           잠근 채로 연다. 고치려면 J(고치기)를 먼저 눌러야 한다 —
 *           손버릇으로 Space 를 눌러 공들인 REJECT 를 빈 PASS 로 덮는 사고를 막는다.
 *           재저장은 통계에 두 번 세지 않는다.
 *         · 완료 목록이 비어 나오면 서버의 label_status=mine 이 완료 건을 빼고 주는 것이다.
 *           WB.probe() 로 어떤 label_status 값이 무엇을 돌려주는지 읽기 전용으로 확인한다.
 *
 *   0.9.7 조회 창에서 남의 판정(사람)을 기본으로 숨김. 참고하라는 지침은 그대로지만,
 *         판정을 먼저 읽으면 눈이 그쪽으로 끌린다 — 스스로 보고 나서 대조하고 싶으면
 *         숨긴 채 쓰고, 필요할 때만 [사람 판정] 버튼으로 켠다(설정은 기억됨).
 *         auto 판정은 지금처럼 목록에 그대로 둔다.
 *         · q·w·e·z 가 입력창에 안 찍히는 문제 재발 — 0.9.3 의 evictGhosts 는
 *           '내 앞에 이미 있던' 유령만 치울 수 있었다. 이번에 막은 두 갈래:
 *           (1) 내 뒤에 로드되는 구버전(Tampermonkey 에 옛 항목이 같이 켜진 경우).
 *               0.5초마다 순찰하며 낯선 워크벤치 DOM 을 걷어내고 window.WB 를 되찾는다.
 *               더 새 버전이 보이면 싸우지 않고 내가 비킨다.
 *           (2) 관리자 화면이 body 를 갈아끼우면 host 가 문서에서 떨어지는데 wrap 은
 *               show 인 채다 — 보이지 않는 창이 글자를 먹는다. 떨어져 있으면 단축키를
 *               통째로 양보하고, 순찰이 host 를 도로 붙인다.
 *           어느 쪽이었는지 확인용 WB.doctor() 추가 — 또 재발하면 이 출력부터 보자.
 *
 *   0.9.6 Y = label 만 복사. 질문할 때 필요한 건 그것 하나라, 나머지(상품명·주소·
 *         고른 코드)는 Shift+Y 로 뺐다. 정보 상자에도 [label] · [전체] 두 버튼.
 *         · 조회 창에서도 휠 확대 · 드래그 이동 · 대비/밝기 · 돋보기가 다 된다.
 *           확대·이동 기계를 패널 4개(R·O·LR·LO)가 함께 쓰도록 일반화했다.
 *           모달이 떠 있으면 단축키를 통째로 막던 것도, 조회 창에 한해
 *           보기·보정 키만 통과시킨다 (판정·코드 키는 그대로 잠긴 채).
 *         · 창을 크게(최대 1560px) 하고 목록을 왼쪽, 뷰어를 오른쪽으로 돌렸다.
 *         · 남의 판정을 눌러야 보이게 했던 것을 되돌렸다 — 참고하라는 게 지침이고,
 *           그러면 목록에서 바로 보이는 편이 맞다. (0.9.7 에서 다시 뒤집힘)
 *
 *   0.9.5 O 키 — 사례 조회. 상품명·상품 ID 로 다른 건을 찾아본다. 팀 토의 중에
 *         Esc 로 빠져나가 원래 화면에서 다시 찾아갈 필요가 없다.
 *         읽기 전용이다. 그리고 그건 약속이 아니라 구조다 —
 *           · 조회 결과는 LK.items 에만 담기고 S.queue 에 들어가지 않는다.
 *             save() 는 cur() = S.queue[S.i] 만 보므로 저장될 경로가 없다.
 *           · 조회 창은 모달이라 열려 있는 동안 판정 단축키가 통째로 잠긴다.
 *             "내 큐인 줄 알고 Space 를 눌렀다" 가 이 기능의 진짜 위험인데 거기서 막힌다.
 *
 *   0.9.4 Y 키 — 지금 보고 있는 건을 "질문용 한 덩어리"로 클립보드에 복사한다.
 *         상품명 · row · product · label_row_id · 두 이미지 주소 · 내가 고른 코드.
 *         · 코드 행 Alt+클릭 = 그 코드명만 복사(토글되지 않음).
 *         · 저장 직전 "이 건이 내 큐에서 온 것인가"를 확인하는 자물쇠를 채웠다.
 *
 *   0.9.3 두 벌이 겹쳐 뜨면 뒤쪽 인스턴스가 코드 단축키 글자(q·w·e·z…)를 가로채
 *         입력창에 안 찍히던 문제 — 다시 붙여넣으면 구버전을 내리고 교체한다.
 *         단축키를 양보하는 기준도 "그 노드인가" 에서 "글자를 받는 요소인가" 로 바꿈
 *         · 검수자 이름 창에서 [취소] 버튼이 카드 밖으로 삐져나가던 것 수정
 *
 *   0.9.2 UI 를 이슈 기록부와 같은 토스(TDS) 톤으로 — Pretendard · 그레이 스케일
 *         · 큰 라운드 · 컨트롤 높이 통일. 색값은 토스 색조를 유지하되 명도를 내려
 *         3개 테마 57개 조합 전부 AAA(7:1) 이상 (palette.py 로 검증)
 *         · 검수 이미지 둘레는 테마와 무관하게 중립 회색 고정
 *
 *   0.9.1 F 키 — 이슈 코드 검색. 코드명·공식 설명·경계 메모를 함께 훑는다.
 *
 *   0.9   U 키 — auto 판정을 그 건에 한해 열어보기 (기본은 계속 숨김)
 *   0.8   이미 저장한 건으로 되돌아가면 판정·코드·메시지를 복원하고 덮어쓰기임을 안내
 *   0.7   코드 정책 변경 감지 — 서버 코드 목록과 내장 목록이 다르면 저장을 자동으로 끔
 *   0.6   단축키 안내 축약 · 저장 모드를 버튼으로 · 좌우 폭 조절 · 이미지 보정 창
 *   0.5   상단 [검수자] · [큐 새로고침] 버튼
 *   0.4   저시력 지원 — 고대비 3테마 · 글자 크기 · 이미지 보정 · 돋보기 · ARIA
 *   0.3   코드 표시를 영어 코드명 + 공식 설명 토글로 교체
 *   0.2   초시계 제거 · 65% 눈금선 · 이미지 화면맞춤 초기화
 *   0.1   최초 — 동기 확대 · 코드 단축키 · 메시지 자동 초안 · auto 판정 대조
 * ============================================================= */
(() => {
'use strict';
const VERSION = "0.9.11";

/* ══════ src/10-boot.js ══════════════════════════════════════════════ */
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

/* ══════ src/20-codes.js ═════════════════════════════════════════════ */
/* ---------------------------------------------------------------
 *  21개 이슈 코드 — 이 파일은 코드가 아니라 데이터다.
 *
 *  판정 정책이 바뀌면 여기만 고친다. 그러면 diff 가 "정책이 이렇게 바뀌었다" 로
 *  읽히고, 리뷰할 사람이 자바스크립트를 읽지 않아도 된다.
 *  단축키·검색 색인·자동 초안·안내가 전부 여기서 파생된다.
 *
 *    c = 서버에 보내는 코드명. 서버 목록과 다르면 checkCodeDrift 가 저장을 끈다.
 *    k = 단축키. 키보드 위치가 그대로 코드 그룹(g) 순서다.
 *    g = 화면에서 묶어 보여줄 그룹 (A~F)
 *    d = 툴에 붙어 있는 공식 설명 (원문 그대로, 손대지 않음)
 *    t = 경계 판단 메모 (가이드 2-1절·예시집에서 정리). 검색이 여기까지 훑는다.
 *    m = REJECT 메시지 자동 초안
 *    z = 확대해야 잡히는 코드 / r = 방향이 반대인 코드 (화면에 [확대]·[반대] 로 표시)
 *
 *  ★ 고친 뒤에는 node check.js — 필드 누락·중복·단축키 충돌을 여기서 잡는다.
 *    JSON 이 아니라 JS 로 두는 이유는 이 주석과 경계 메모를 함께 두기 위해서다.
 * --------------------------------------------------------------- */
/* @check:begin CODES */
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
/* @check:end */
const BY_KEY  = Object.fromEntries(CODES.map(c => [c.k, c]));
const BY_CODE = Object.fromEntries(CODES.map(c => [c.c, c]));

/* ══════ src/25-keys.js ══════════════════════════════════════════════ */
/* --------------------------- 단축키 (단일 진실 원천) ---------------------------
 *  키가 여기 한 곳에만 적힌다.
 *
 *  전에는 같은 사실이 다섯 군데에 흩어져 있었다 — BY_KEY(코드 토글) · act 맵(동작) ·
 *  LOOK_KEYS(조회 창에서 통과시킬 키) · 단축키 창의 HTML · 콘솔 도움말.
 *  키 하나를 옮기면 다섯 곳을 다 고쳐야 했고, 실제로는 안내만 옛 키를 가리킨 채
 *  남기 쉬웠다. 안내가 틀리면 안내가 없느니만 못하다.
 *
 *  이제 아래 표에서 넷이 전부 생성된다:
 *    · 실제 동작        KEYMAP        (80-keyboard.js)
 *    · 조회 창 통과 목록 LOOK_KEYS     (scope === 'view' 인 것만)
 *    · 단축키 창        renderKeyHelp()
 *    · 하단 한 줄 안내   hintHtml()    (hint:1 인 것만)
 *
 *  scope — 사례 조회 창(모달)이 떠 있을 때 통과시킬지를 가른다.
 *    'review'  검수 화면 전용. 모달이 떠 있으면 잠긴다. 판정·이슈 코드가 여기.
 *              "남의 건을 띄워놓고 내 큐인 줄 알고 Space 를 눌렀다" 를 막는 자리다.
 *    'view'    보기·보정. 조회 창에서도 통과한다 — 확대·대비를 못 만지면
 *              결국 창을 닫고 나가게 되어 조회 기능의 의미가 없어진다.
 *
 *  virtual:1  키 핸들러가 다루지 않고 안내에만 나오는 것 (휠·드래그·Esc·Tab).
 *  expand     그 자리에 목록을 펼친다. 지금은 'codes' 하나뿐.
 *  hint:1     하단 한 줄 안내에 넣는다. 안내는 진짜 한 줄이어야 한다 — 검수 화면의
 *             세로 공간은 이미지 몫이다. 4~5개를 넘기면 접혀서 두 줄이 되니 아껴 쓴다.
 *             (hintDesc 가 있으면 안내에는 그 짧은 쪽을 쓴다)
 *
 *  ★ 키를 더할 때: 이미 쓰는 글자인지 눈으로 세지 말고 node check.js 를 돌려라.
 *    이슈 코드 21개(q w e r t a s d z x c v 1~9)와의 충돌까지 같이 본다.
 * --------------------------------------------------------------- */
/* @check:begin KEY_ROWS */
const KEY_ROWS = [
  /* ── 판정 ── */
  { k:' ',          show:'Space', group:'판정', desc:'PASS',   scope:'review', act:() => save('pass') },
  { k:'enter',      show:'Enter', group:'판정', desc:'REJECT', scope:'review', act:() => save('reject') },
  { k:'n',          show:'N',     group:'판정', desc:'건너뛰기', scope:'review', act:() => next() },
  { k:'arrowright', show:'→',     group:'판정', desc:'다음 건', scope:'review', act:() => next() },
  { k:'arrowleft',  show:'←',     group:'판정', desc:'이전 건', scope:'review', act:() => prev() },
  { k:"'",          show:"'",     group:'판정', desc:'메시지 입력', scope:'review', act:() => el.msg.focus() },
  { k:'u',          show:'U',     group:'판정', desc:'auto 판정 보기', scope:'review', act:() => peekAuto() },
  { k:'j',          show:'J',     group:'판정', desc:'고치기 — 잠긴 건을 푼다', scope:'review', act:() => unlock() },

  /* ── 큐 ── */
  { k:'b',          show:'B',     group:'큐', desc:'범위 — 미완료 ⇄ 완료', scope:'review', hint:1, act:() => cycleScope() },

  /* ── 이슈 코드 21개는 20-codes.js 에서 펼친다 ── */
  { expand:'codes', group:'이슈 코드' },

  /* ── 코드 검색 ── */
  { k:'f',          show:'F',     group:'코드 검색', desc:'검색창으로', hintDesc:'코드 검색', scope:'review', hint:1, act:() => focusFind() },

  /* ── 복사 ── */
  { k:'y',          show:'Y',     group:'복사', desc:'label 복사', hintDesc:'label 복사 (⇧Y 전체)', scope:'view', hint:1,
    act:(e) => {
      // 조회 창이 떠 있으면 대상은 거기서 고른 사례다
      const inLook = el.mLook.classList.contains('show');
      const it = inLook ? LK.items[LK.sel] : cur();
      if (e && e.shiftKey) copyRefOf(it, inLook); else copyLabel(it);
    } },

  /* ── 사례 조회 ── */
  { k:'o',          show:'O',     group:'사례 조회', desc:'다른 사례 찾아보기 (읽기 전용)', hintDesc:'사례 조회', scope:'review', hint:1, act:() => openLook() },

  /* ── 이미지 ── */
  { show:'휠',      group:'이미지', desc:'확대', virtual:1 },
  { show:'드래그',   group:'이미지', desc:'이동', virtual:1 },
  { k:'0',          show:'0',     group:'이미지', desc:'화면맞춤', scope:'view', act:() => resetView() },
  { k:'m',          show:'M',     group:'이미지', desc:'돋보기', scope:'view', act:() => setPref('loupe',  !S.pref.loupe) },
  { k:'g',          show:'G',     group:'이미지', desc:'눈금',   scope:'review', act:() => setPref('guides', !S.pref.guides) },
  { k:'l',          show:'L',     group:'이미지', desc:'확대연동', scope:'view', act:() => setPref('link',   !S.pref.link) },

  /* ── 보정 ── */
  { k:',',  show:',',  group:'보정', desc:'대비 −', scope:'view', act:() => setFx('contrast', S.pref.fx.contrast - 10) },
  { k:'.',  show:'.',  group:'보정', desc:'대비 +', scope:'view', act:() => setFx('contrast', S.pref.fx.contrast + 10) },
  { k:'[',  show:'[',  group:'보정', desc:'밝기 −', scope:'view', act:() => setFx('bright',   S.pref.fx.bright - 10) },
  { k:']',  show:']',  group:'보정', desc:'밝기 +', scope:'view', act:() => setFx('bright',   S.pref.fx.bright + 10) },
  { k:'i',  show:'I',  group:'보정', desc:'색반전', scope:'view', act:() => setFx('invert', S.pref.fx.invert ? 0 : 1) },
  { k:'k',  show:'K',  group:'보정', desc:'흑백',   scope:'view', act:() => setFx('gray',   S.pref.fx.gray ? 0 : 1) },
  { k:'\\', show:'\\', group:'보정', desc:'초기화', scope:'view', act:() => resetFx() },

  /* ── 화면 ── */
  { k:'h',  show:'H',  group:'화면', desc:'테마',      scope:'view',   act:() => setPref('theme', {dark:'light', light:'mono', mono:'dark'}[S.pref.theme]) },
  { k:'-',  show:'-',  group:'화면', desc:'글자 작게', scope:'view',   act:() => setPref('ui', Math.max(85,  S.pref.ui - 15)) },
  { k:'=',  show:'=',  group:'화면', desc:'글자 크게', scope:'view',   act:() => setPref('ui', Math.min(200, S.pref.ui + 15)) },
  { k:'/',  show:'/',  group:'화면', desc:'코드 설명', scope:'review', act:() => setPref('desc', !S.pref.desc) },
  { k:'?',  show:'?',  group:'화면', desc:'단축키 창', hintDesc:'단축키', scope:'review', hint:1, act:() => modal(el.mKeys, true) },
  { show:'Tab',   group:'화면', desc:'요소 이동',   virtual:1 },
  { show:'Esc',   group:'화면', desc:'닫기 · 되돌리기', virtual:1 },
  { show:'Alt+W', group:'화면', desc:'워크벤치 열기', virtual:1 },
];
/* @check:end */

/* 표에 담기 어려운 설명은 여기 붙인다. 키 목록 아래에 한 덩어리로 따라 나온다.
 * 키 자체는 위 표에서 생성되므로, 이 글이 낡아도 키 안내가 틀리지는 않는다. */
/* @check:begin KEY_NOTES */
const KEY_NOTES = {
  '판정': '<b>J(고치기)</b> — 이미 판정이 있는 건은 <b>잠긴 채로</b> 열립니다. ' +
          '손버릇으로 Space 를 눌러 공들인 REJECT 를 빈 PASS 로 덮는 일을 막기 위해서입니다. ' +
          '고칠 때만 J 를 누르세요.',
  '큐': '<b>B(범위)</b> — <b>미완료</b>(기본)와 <b>완료</b>를 오갑니다. ' +
        '완료 범위에서는 내가 이미 판정한 건을 저장된 코드·메시지까지 되살려 다시 봅니다. ' +
        '쪽 넘기기는 상단 ◀ ▶ 입니다.',
  '이슈 코드': '키보드 위치가 그대로 코드 그룹 순서입니다.',
  '코드 검색': '<kbd>Enter</kbd> 첫 결과 선택 · <kbd>Esc</kbd> 검색어 지우기<br>' +
    '코드명뿐 아니라 <b>공식 설명·경계 메모</b>까지 훑습니다 — <b>shadow</b> 로도 <b>그림자</b> 로도 걸립니다.<br>' +
    '띄어쓴 낱말은 모두 든 코드만 나옵니다(<b>배경 확장</b>). ' +
    '<b>이미 고른 코드는 검색어와 상관없이 항상 남습니다</b> — 안 보이는 코드가 저장되는 일이 없도록.',
  '복사': '<kbd>Shift</kbd>+<kbd>Y</kbd> 는 상품명 · row · product · label · 두 이미지 주소 · 고른 코드까지 한 덩어리.<br>' +
    '코드 행 <kbd>Alt</kbd>+클릭 — 그 <b>코드명만</b> 복사합니다(고르기는 되지 않습니다).<br>' +
    '조회 창이 떠 있으면 <kbd>Y</kbd>는 거기서 고른 사례의 label 을 복사합니다.',
  '사례 조회': '열면 지금 건의 상품명이 미리 들어갑니다. 왼쪽에서 고르면 오른쪽 뷰어에 걸리고, ' +
    '검수 화면과 똑같이 <b>휠 확대 · 드래그 이동 · 대비/밝기 · 돋보기</b>가 다 됩니다.<br>' +
    '판정·코드 단축키만 잠깁니다 — 조회 중에 Space 를 눌러도 아무 일도 일어나지 않습니다.<br>' +
    '<b>다른 검수자의 판정은 기본으로 숨깁니다</b> — 먼저 읽으면 판단이 끌려가서요. ' +
    '필요하면 [사람 판정] 버튼으로 켭니다 (auto 판정은 항상 보임).',
  '이미지': '두 이미지 사이 <b>경계선</b>을 끌면 좌우 폭이 바뀝니다. 더블클릭하면 기본값.',
  '보정': '<b>대비를 올리면</b> 배경 확장의 이음새나 질감 차이가 잘 드러납니다 — ' +
    'background_extension_unnatural 을 볼 때 먼저 쓰세요. 두 이미지에 함께 적용됩니다.',
  '화면': '보기 설정은 이 브라우저에 기억됩니다. <b>테마 3종은 모두 AAA(7:1) 대비</b>로 맞춰져 있고, ' +
    '검수 이미지 둘레만은 테마와 무관하게 중립 회색으로 고정입니다 — ' +
    '주변이 밝으면 같은 이미지도 그림자·반사 판단이 달라지기 때문입니다.',
};
/* @check:end */

/* 표를 펼쳐서 실제로 쓰는 줄 목록을 만든다. expand 자리는 여기서 채워진다. */
function keyRows() {
  const out = [];
  for (const r of KEY_ROWS) {
    if (r.expand !== 'codes') { out.push(r); continue; }
    for (const c of CODES) {
      out.push({ k:c.k, show:c.k.toUpperCase(), group:r.group, desc:c.c,
                 scope:'review', code:c, act:() => toggle(c.c) });
    }
  }
  return out;
}

/* ══════ src/30-state.js ═════════════════════════════════════════════ */
/* ------------------------------- 상태 ------------------------------- */
const DEF_PREF = { theme:'dark', ui:100, desc:false, link:false, guides:false,
                   draft:'short', showTimer:false, loupe:false, split:62,
                   peers:false,   // 조회 창의 남의 판정(사람 …) 표시 — 기본은 숨김
                   fx:{ bright:100, contrast:100, invert:0, gray:0 } };
const S = {
  labeler:'', queue:[], i:0, sel:new Set(), armed:false, t0:0, busy:false,
  mine:new Set(), // 내 큐로 불러온 label_row_id. 저장 직전 자물쇠로만 쓴다.
  q:'',           // 코드 검색어. 화면 필터일 뿐이라 저장하지 않는다 —
                  // 새로고침했는데 목록이 걸러진 채로 뜨면 코드가 사라진 줄 안다.
  done:{},        // 이 세션에서 저장한 건: label_row_id → {verdict, codes, msg}
  /* ── 큐 범위 ("내 완료") ── */
  scope:'todo',   // todo | done. 저장하지 않는다 — 새 세션은 항상 미완료부터 연다.
  page:1,
  size:40,        // 이번에 받아온 쪽 크기. 전체에서 몇 번째인지 셀 때 쓴다.
  total:0,        // 서버가 말한 이 범위의 총건수
  wasDone:new Set(), // 불러온 시점에 이미 판정이 있던 건. 재저장을 통계에 두 번 세지 않으려고.
  open:new Set(),    // 이번에 잠금을 푼 건. 판정이 있는 건은 잠긴 채로 열린다.
  pref: loadPref(), stats: loadStats(),
};

/* ---------------------------------------------------------------
 *  큐 범위 — 미완료 ▸ 완료
 *
 *  서버가 받는 label_status 값. 2026-08-04 에 WB.probe() 로 실제로 확인했다:
 *
 *    mine        내게 배정된 미완료      372건 · 항목 label_status='unlabeled'  · 판정 0/5
 *    mine_done   내가 판정을 끝낸 것     128건 · 항목 label_status='labeled'    · 판정 5/5
 *    labeled     남의 것까지 판정된 전부 8801건   ← 쓰지 않는다 (남의 건)
 *    all         전부                  44489건   ← 쓰지 않는다 (남의 건)
 *    discarded   폐기된 건                50건 · 항목 label_status='discarded' · 판정 0/5
 *    unlabeled · mine_discarded · done · completed · complete · todo
 *                → 400 {"detail":"unknown label_status"}
 *                ('unlabeled' 는 항목 상태로는 쓰이지만 질의 값으로는 안 받는다)
 *
 *  372 + 128 = 500 = 내게 배정된 전체.
 *  (두 번 잰 사이에 한 건이 미완료→완료로 넘어갔다. 살아 있는 숫자라 조금씩 움직인다.
 *   여기 적힌 값은 그날의 스냅숏이고, 다시 재려면 WB.probe().)
 *
 *  ★ labeled·all 을 안 쓰는 이유는 양이 많아서가 아니라 안전 때문이다.
 *    거기서 온 건은 남의 것인데, 큐로 불러오는 순간 S.mine 에 들어가
 *    저장 자물쇠의 열쇠를 받는다. 그 문을 열지 않는다.
 *    (check.js 가 여기 status 값을 allowlist 로 검사한다 — 나중에 무심코
 *     'all' 을 넣으면 빌드가 아니라 점검에서 멈춘다.)
 *
 *  '전체' 범위는 두지 않았다. 서버에 "내 것 전부" 를 주는 값이 없어서
 *  mine + mine_done 두 번을 불러 이어 붙여야 하는데, 그러면 쪽 번호와 총건수가
 *  둘 다 거짓말이 된다. 없는 편이 낫다 — 상품으로 찾는 건 O(사례 조회)가 한다.
 * --------------------------------------------------------------- */
/* @check:begin SCOPES */
const SCOPES = {
  todo: { label:'미완료', status:'mine',      size:40 },
  done: { label:'완료',   status:'mine_done', size:40 },
};
/* @check:end */
const SCOPE_ORDER = ['todo', 'done'];
const curScope = () => SCOPES[S.scope] || SCOPES.todo;

/* 서버가 주는 human 의 모양을 확정하지 못했다 — 문자열일 수도, 객체일 수도,
 * 항목에 납작하게 붙어 있을 수도 있다. 아는 모양을 다 받아주되, 판정(verdict)이
 * 없으면 null 이다. "판정이 있다" 의 정의가 이 함수 하나로 모인다.
 *
 * detail = 코드·메시지 칸이 실제로 실려 왔는가. 이게 false 면 화면에 되살릴 것이
 * 판정 하나뿐이라, 그 상태로 덮어쓰면 원래 코드·메시지가 지워진다.
 * 없는 것과 빈 것을 구분해야 하는 자리라서 값이 아니라 키의 존재로 본다. */
function humanOf(it) {
  if (!it) return null;
  const h = it.human != null && it.human !== '' ? it.human : null;
  if (h == null) {
    const v = it.human_verdict || '';
    if (!v) return null;
    return { verdict:v, codes: it.human_issue_codes || [], msg: it.human_message || '',
             detail: ('human_issue_codes' in it) || ('human_message' in it) };
  }
  if (typeof h !== 'object') return { verdict:String(h), codes:[], msg:'', detail:false };
  const v = h.verdict || h.human_verdict || '';
  if (!v) return null;
  return { verdict:v, codes: h.issue_codes || h.human_issue_codes || [], msg: h.message || h.human_message || '',
           detail: ('issue_codes' in h) || ('human_issue_codes' in h) ||
                   ('message' in h) || ('human_message' in h) };
}
/* 이 세션에서 저장한 것이 서버가 준 것보다 새롭다 — 되살릴 때는 이쪽이 먼저다 */
function judgedOf(it) {
  if (!it) return null;
  const d = S.done[it.label_row_id];
  return d ? { verdict:d.verdict, codes:d.codes, msg:d.msg, detail:true, mine:1 } : humanOf(it);
}
/* 폐기(discarded)는 판정이 아니라 상태다 — human 이 비어 있어서 humanOf 로는 안 잡힌다.
 * 서버에 50건 있고, 저장 payload 에도 discard_reason 칸이 있다(워크벤치는 늘 빈 값으로 보낸다).
 *
 * 지금 쓰는 두 큐(mine · mine_done)로는 폐기 건이 오지 않는다. 그래도 막아두는 이유는,
 * 만약 오면 "판정이 없는 건" 으로 보여서 잠기지 않은 채 열리고, Space 한 번에 폐기가
 * PASS 로 덮이기 때문이다. 워크벤치는 폐기를 만들 수도 되돌릴 수도 없으므로
 * (discard_reason 을 넣을 자리가 없다) 오면 잠가 두고 원래 화면으로 보낸다. */
const isDiscarded = it => !!it && it.label_status === 'discarded';
const isLocked = it => (!!judgedOf(it) || isDiscarded(it)) && !S.open.has(it && it.label_row_id);
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
/* status 는 SCOPES 가 정한 값만 들어온다 (mine | mine_done). 문자열을 직접 넘기지 말 것 —
 * 남의 건을 큐로 끌어오면 S.mine 자물쇠가 그대로 열린다. */
const fetchQueue = (who, size, page, status) => api(
  `api/labeling/items?batch_id=all&label_status=${encodeURIComponent(status || 'mine')}` +
  `&auto_verdict=all&human_verdict=all` +
  `&issue_code=all&labeler_filter=&q=&page=${page || 1}&page_size=${size}&labeler=${encodeURIComponent(who)}`);
const postSave = (p) => api('api/labeling/save',
  { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(p) });

/* ══════ src/40-view.js ══════════════════════════════════════════════ */
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
host.dataset.v = VERSION;               // 순찰(patrol)이 낯선 host 의 버전을 읽는 곳
host.dataset.born = String(Date.now()); // 같은 버전이 둘 뜨면 먼저 태어난 쪽이 남는다
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
.cb:disabled{opacity:.4;cursor:default}
.cb:disabled:hover{background:var(--panel);border-color:var(--edge)}
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
.rev .cb{margin-top:8px}
.ok{color:var(--ok);font-weight:700}.no{color:var(--no);font-weight:700}

/* 잠긴 건 — 이미 판정이 있어서 [고치기](J) 를 눌러야 저장되는 상태.
   버튼을 아예 지우지는 않는다. 누르면 왜 안 되는지 말해 주는 편이,
   버튼이 사라져서 "고장났나" 하는 것보다 낫다. */
.wrap.locked .rev{border-left-color:var(--warn)}
.wrap.locked .rev .h{color:var(--warn)}
.wrap.locked .acts .bp,.wrap.locked .acts .br{opacity:.42;filter:grayscale(.7)}
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

/* ─── 사례 조회 (읽기 전용) ─── */
.modal .card.wide{max-width:1560px;width:96%;max-height:94%}
.lkwarn{border:2px solid var(--warn);color:var(--warn);border-radius:var(--r-ctl);
 padding:9px 12px;font-size:12.5px;font-weight:600;line-height:1.6;margin:0 0 12px}
.lkbar{display:flex;gap:6px;align-items:center;margin-bottom:10px;flex-wrap:wrap}
.lkbar input{flex:1 1 220px;min-width:0;height:var(--h-ctl);padding:0 11px;
 background:var(--bg);color:var(--fg);border:1px solid var(--edge);border-radius:var(--r-ctl);
 font:inherit;font-size:13px;letter-spacing:-.01em}
.lkbar input:hover{border-color:var(--fg)}
.lkpos{font-size:12px;color:var(--mut);font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap}
.lkbody{display:flex;gap:10px;height:64vh;min-height:340px}
.lklist{flex:0 0 300px;overflow:auto;margin:0 -4px 0 0;padding-right:4px}
.lkright{flex:1;display:flex;flex-direction:column;gap:6px;min-width:0}
.lkhead{display:flex;align-items:center;gap:8px;font-size:12.5px;min-height:var(--h-ctl)}
.lkhead .t{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lkhead .t b{font-size:13.5px;letter-spacing:-.02em}
.lkview{flex:1;display:flex;gap:6px;min-width:0;min-height:0;
 background:var(--imgbg);border-radius:var(--r-card);padding:6px}
.lkview .pane{flex:1 1 0}
.lkfx{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px;font-size:12.5px}
.lkfx input[type=range]{width:120px;accent-color:var(--acc)}
.lkfx output{font-variant-numeric:tabular-nums;color:var(--mut);width:40px}
.lkro{display:flex;gap:10px;align-items:flex-start;padding:8px;border-radius:var(--r-ctl);
 cursor:pointer;border-left:3px solid transparent}
.lkro:hover{background:var(--hover)}
.lkro.on{background:var(--selbg);border-left-color:var(--selbar)}
.lkro.on .lkm b{color:var(--selfg)}
.lkro>img{flex:0 0 46px;width:46px;height:46px;object-fit:contain;border-radius:8px;
 background:var(--imgpane);border:1px solid var(--imgline)}
.lkro>.ph{flex:0 0 46px;height:46px;border-radius:8px;background:var(--imgpane);border:1px solid var(--imgline)}
.lkm{flex:1;min-width:0;font-size:12.5px;line-height:1.55}
.lkm b{display:block;font-size:13.5px;font-weight:700;letter-spacing:-.02em;
 overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lkj{margin-top:3px}
/* 남의 판정(사람 …)은 기본으로 접는다 — 판정을 먼저 읽으면 눈이 그쪽으로 끌린다.
   DOM 에는 그대로 두고 CSS 로만 접는다: [사람 판정] 토글이 목록을 다시 그리지
   않으므로 스크롤 위치가 튀지 않는다. auto 줄은 그대로 보인다. */
.lkj .hum{display:none}
.wrap.peers .lkj .hum{display:inline}

</style>
<div class="wrap" role="application" aria-label="빅카드 검수 워크벤치">
 <div class="bar">
  <b>검수 워크벤치</b>
  <button class="cb arm" id="bArm" data-on="0" aria-pressed="false">저장 꺼짐</button>
  <button class="cb" id="bWho" aria-label="검수자 이름 변경">검수자: –</button>
  <button class="cb" id="bReload" aria-label="작업 큐 다시 불러오기">큐 새로고침</button>
  <button class="cb" id="bScope" aria-label="큐 범위 — 미완료 · 완료 · 전체"
          title="이미 판정한 건을 다시 보려면 [완료] 로 돌리세요">범위: 미완료<i>B</i></button>
  <button class="cb" id="bPgP" aria-label="이전 쪽">◀</button>
  <button class="cb" id="bPgN" aria-label="다음 쪽">▶</button>
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
  <button class="cb" id="bLook" aria-label="다른 사례 조회 (읽기 전용)">사례 조회<i>O</i></button>
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
   <div class="box" style="display:flex;align-items:flex-start;gap:8px">
    <div style="flex:1;min-width:0"><div class="pname" id="pn">–</div><div class="meta" id="mt">–</div></div>
    <button class="cb" id="bCopyL" aria-label="label 복사"
            title="label_row_id 만 복사합니다">label<i>Y</i></button>
    <button class="cb" id="bCopy" aria-label="이 건의 정보 전체 복사"
            title="상품명 · ID · 두 이미지 주소 · 고른 코드까지 한 덩어리로">전체<i>⇧Y</i></button>
   </div>
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
   <!-- 안이 비어 있는 게 맞다. renderKeyHelp() 가 src/25-keys.js 의 표에서 그린다 —
        손으로 적어 두면 표와 어긋나고, 어긋난 안내는 없느니만 못하다. -->
   <div class="ks" id="ks"></div>
   <div class="acts" style="margin-top:16px"><button class="btn bp" id="bKeysClose">닫기</button></div>
 </div></div>

 <div class="modal" id="mLook" role="dialog" aria-label="사례 조회 (읽기 전용)"><div class="card wide">
   <h2>사례 조회 <span class="mut" style="font-size:13px;font-weight:500">읽기 전용</span></h2>
   <div class="lkwarn">이 창에서는 저장·수정이 되지 않습니다. 판정 단축키도 여기서는 잠깁니다.</div>
   <div class="lkbar">
     <input id="lq" type="search" autocomplete="off" spellcheck="false"
            placeholder="상품명 일부 · 상품 ID — Enter 로 검색" aria-label="사례 검색어">
     <button class="cb" id="lkGo">찾기</button>
     <button class="cb" id="lkHum" aria-pressed="false"
             title="다른 검수자의 판정 표시 — 먼저 읽으면 판단이 끌려가서 기본은 숨김">사람 판정</button>
     <span class="lkpos" id="lkPos"></span>
     <button class="cb" id="lkPrev" aria-label="이전 쪽">◀</button>
     <button class="cb" id="lkNext" aria-label="다음 쪽">▶</button>
   </div>
   <div class="lkbody">
     <div class="lklist" id="lkList"></div>
     <div class="lkright">
       <div class="lkhead">
         <span class="t" id="lkHead">왼쪽에서 사례를 고르세요</span>
         <button class="cb" id="lkLbl" aria-label="이 건의 label 복사">label 복사</button>
       </div>
       <div class="lkview">
         <div class="pane" id="pLR"><span class="tag">생성된 빅카드</span><span class="zl" id="zLR">100%</span>
          <span class="ld">불러오는 중…</span><div class="loupe" id="lLR"></div>
          <div class="stage" id="sLR"><img id="iLR" alt="생성된 빅카드"></div></div>
         <div class="pane" id="pLO"><span class="tag">원본</span><span class="zl" id="zLO">100%</span>
          <span class="ld">불러오는 중…</span><div class="loupe" id="lLO"></div>
          <div class="stage" id="sLO"><img id="iLO" alt="원본 상품 이미지"></div></div>
       </div>
     </div>
   </div>
   <div class="lkfx">
     <label for="rCt2">대비</label><input type="range" id="rCt2" min="40" max="220" step="5"><output id="oCt2"></output>
     <label for="rBr2">밝기</label><input type="range" id="rBr2" min="40" max="220" step="5"><output id="oBr2"></output>
     <button class="cb" id="bInv2" aria-pressed="false">색반전<i>I</i></button>
     <button class="cb" id="bGray2" aria-pressed="false">흑백<i>K</i></button>
     <button class="cb" id="bFxR2">보정 초기화<i>\\</i></button>
     <button class="cb" id="lkFit">화면맞춤<i>0</i></button>
     <span class="mut">휠 확대 · 드래그 이동 · 더블클릭 화면맞춤</span>
   </div>
   <div class="acts" style="margin-top:12px"><button class="btn bp" id="lkClose">닫기 (Esc)</button></div>
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
 'bArm','bWho','bReload','bCopy','gate','who','goWho','cancelWho','sp',
 'mFx','mKeys','mArm','rCt','rBr','oCt','oBr','bFxClose','bKeysClose','bArmYes','bArmNo',
 'bScope','bPgP','bPgN','ks',
 'bLook','mLook','lq','lkGo','lkPos','lkPrev','lkNext','lkList','lkHead','lkLbl','lkClose',
 'rCt2','rBr2','oCt2','oBr2','bInv2','bGray2','bFxR2','lkFit','bCopyL','lkHum']
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
  R.querySelectorAll('.stage img').forEach(n => n.style.filter = filter);
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
  el.rCt.value = el.rCt2.value = f.contrast; el.oCt.textContent = el.oCt2.textContent = f.contrast + '%';
  el.rBr.value = el.rBr2.value = f.bright;   el.oBr.textContent = el.oBr2.textContent = f.bright + '%';
  pr('bInv2', f.invert); pr('bGray2', f.gray);
  wrap.classList.toggle('peers', !!p.peers);   // 조회 목록의 '사람 …' 줄 표시 여부 (CSS 로만 접는다)
  pr('lkHum', p.peers);
  // 좌우 비율
  R.querySelector('#pR').style.flexGrow = p.split;
  R.querySelector('#pO').style.flexGrow = 100 - p.split;
  el.sp.setAttribute('aria-valuenow', String(p.split));
  // 하단 한 줄 안내도 단축키 표에서 나온다 (80-keyboard.js)
  el.hint.innerHTML = hintHtml();
  paintQueueBar();
}
/* 큐 범위·쪽 — 지금 무엇을 보고 있는지가 상단에 항상 적혀 있어야 한다.
 * applyPref 와 떼어 둔 이유는 건을 넘길 때마다 부르기 때문이다.
 * applyPref 는 패널 넷을 훑으며 필터를 다시 거는 무거운 일이라 매 건 부를 것이 아니다. */
function paintQueueBar() {
  // textContent 로 쓰면 <i>B</i> 배지가 날아가고, appendChild 로 쓰면 부를 때마다 쌓인다
  el.bScope.innerHTML = '범위: ' + esc(curScope().label) + '<i>B</i>';
  el.bScope.setAttribute('aria-pressed', String(S.scope !== 'todo'));
  el.bPgP.disabled = S.page <= 1;
  el.bPgN.disabled = !hasNextPage();
  el.bPgP.title = S.page <= 1 ? '첫 쪽입니다' : `${S.page - 1}쪽으로`;
  el.bPgN.title = hasNextPage() ? `${S.page + 1}쪽으로` : '마지막 쪽입니다';
}
function resetFx() { S.pref.fx = Object.assign({}, DEF_PREF.fx); savePref(); applyPref(); }
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
el.bFxR.onclick  = () => resetFx();
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


function toast(m, bad) {
  R.querySelectorAll('.toast').forEach(n => n.remove());
  const t = document.createElement('div');
  t.className = 'toast' + (bad ? ' err' : ''); t.textContent = m; t.setAttribute('role', 'alert');
  wrap.appendChild(t); setTimeout(() => t.remove(), bad ? 6000 : 2200);
}

/* ══════ src/50-viewer.js ════════════════════════════════════════════ */
/* --------------------------- 뷰어 ---------------------------
 *  확대 · 이동 · 돋보기 · 화면맞춤을 한 덩어리로 묶은 것.
 *
 *  0.9.6 에서 패널 4개(검수 R·O, 조회 LR·LO)가 같은 기계를 쓰도록 일반화했지만,
 *  'i'+id / 'p'+id / 's'+id / 'z'+id / 'l'+id 라는 id 접미사 규약이 여기저기
 *  흩어져 있었다. 규약을 아는 곳이 많을수록 다섯 번째 패널을 붙일 때 빠뜨리기 쉽다.
 *  이제 그 규약은 makeViewer() 안에만 있다. 뷰어를 하나 더 붙이는 일은
 *  PANES 에 한 줄 쓰고 HTML 에 같은 접미사로 노드를 두는 것으로 끝난다.
 *
 *  묶음(group)은 [확대연동]이 함께 움직일 범위다. 검수 화면 둘이 한 묶음,
 *  조회 창 둘이 다른 묶음 — 조회 창을 확대했다고 검수 화면이 따라 움직이면 곤란하다.
 * --------------------------------------------------------------- */
const PANES = { R:'main', O:'main', LR:'look', LO:'look' };
const VIEWERS = {};
const VIEW_GROUPS = {};   // 묶음 이름 → [id, …]. 아래에서 PANES 로부터 자동으로 만든다.

function makeViewer(id, group) {
  const pane  = R.querySelector('#p' + id);
  const stage = R.querySelector('#s' + id);
  const img   = R.querySelector('#i' + id);
  const loupe = R.querySelector('#l' + id);
  const zl    = R.querySelector('#z' + id);
  if (!pane || !stage || !img) { console.warn('[워크벤치] 뷰어 노드를 못 찾음:', id); return null; }

  const v = { z:1, x:0, y:0, fit:1 };
  const vw = {
    id, group, pane, stage, img, loupe, v,

    apply() {
      stage.style.transform =
        `translate(calc(-50% + ${v.x}px), calc(-50% + ${v.y}px)) scale(${v.z})`;
      if (zl) zl.textContent = Math.round(v.z / (v.fit || 1) * 100) + '%';
    },

    fit() {
      const r = pane.getBoundingClientRect();
      // 닫혀 있는 조회 창의 패널은 폭이 0 이다. 그대로 계산하면 배율이 음수가 되어
      // 이미지가 뒤집힌 채 남는다. 화면에 없는 패널은 손대지 않는다.
      if (!r.width || !r.height) return;
      const nw = img.naturalWidth || 1, nh = img.naturalHeight || 1;
      stage.style.width = nw + 'px'; stage.style.height = nh + 'px';
      v.fit = Math.min((r.width - 16) / nw, (r.height - 16) / nh) || 1;
      v.z = v.fit; v.x = 0; v.y = 0;
      vw.apply();
    },

    zoom(f) { v.z = Math.min(20, Math.max(v.fit * 0.4, v.z * f)); vw.apply(); },

    src(url) {
      pane.classList.add('loading');
      img.onload  = () => { pane.classList.remove('loading'); vw.fit(); };
      img.onerror = () => pane.classList.remove('loading');
      img.src = url || '';
      if (img.complete && img.naturalWidth) { pane.classList.remove('loading'); vw.fit(); }
    },
  };

  /* 확대 — [확대연동]이 켜져 있으면 같은 묶음이 함께 움직인다 */
  pane.addEventListener('wheel', e => {
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.18 : 1 / 1.18;
    for (const t of (S.pref.link ? VIEW_GROUPS[group] : [id]))
      if (VIEWERS[t]) VIEWERS[t].zoom(f);
  }, { passive:false });

  /* 이동 · 돋보기 — 끌기는 창 밖에서 손을 놓아도 끝나야 하므로 window 에 건다 */
  let dg = null;
  pane.addEventListener('mousedown', e => {
    dg = { x:e.clientX, y:e.clientY, vx:v.x, vy:v.y }; pane.classList.add('drag');
  });
  bind(window, 'mousemove', e => {
    if (dg) { v.x = dg.vx + (e.clientX - dg.x); v.y = dg.vy + (e.clientY - dg.y); vw.apply(); }
    if (!loupe || !S.pref.loupe || !wrap.classList.contains('show')) return;
    const pr = pane.getBoundingClientRect();
    const inside = e.clientX >= pr.left && e.clientX <= pr.right &&
                   e.clientY >= pr.top  && e.clientY <= pr.bottom;
    loupe.style.display = inside ? 'block' : 'none';
    if (!inside) return;
    const ir = img.getBoundingClientRect(), Z = 3, D = 260;
    loupe.style.left = (e.clientX - pr.left - D / 2) + 'px';
    loupe.style.top  = (e.clientY - pr.top  - D / 2) + 'px';
    loupe.style.backgroundImage = `url("${img.src}")`;
    loupe.style.backgroundSize = (ir.width * Z) + 'px ' + (ir.height * Z) + 'px';
    loupe.style.backgroundPosition =
      (-((e.clientX - ir.left) * Z - D / 2)) + 'px ' + (-((e.clientY - ir.top) * Z - D / 2)) + 'px';
  });
  bind(window, 'mouseup', () => { dg = null; pane.classList.remove('drag'); });

  pane.addEventListener('dblclick', () => fitGroup(group));
  return vw;
}

for (const [id, g] of Object.entries(PANES)) {
  (VIEW_GROUPS[g] || (VIEW_GROUPS[g] = [])).push(id);
  VIEWERS[id] = makeViewer(id, g);
}

/* 바깥에서 쓰는 이름은 그대로 둔다 — 부르는 쪽이 뷰어의 속을 알 필요는 없다 */
function fitView(id)     { const w = VIEWERS[id]; if (w) w.fit(); }
function fitGroup(g)     { (VIEW_GROUPS[g] || []).forEach(fitView); }
function resetView()     { Object.keys(VIEWERS).forEach(fitView); }
function setImg(id, url) { const w = VIEWERS[id]; if (w) w.src(url); }

/* ══════ src/60-review.js ════════════════════════════════════════════ */
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
    const d = e.target.closest('.cd'); if (!d) return;
    // 코드 행은 클릭이 곧 토글이라 코드명을 드래그로 집을 수가 없다.
    // Alt+클릭 은 토글하지 않고 코드명만 복사한다 — 질문할 때 붙여넣기용.
    if (e.altKey) { e.preventDefault(); copyText(d.dataset.c, '코드명을'); return; }
    toggle(d.dataset.c);
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
const _pf = new Set();
function prefetch(i) {
  const it = S.queue[i]; if (!it) return;
  for (const u of [it.media.result_url, it.media.selected_input_url])
    if (u && !_pf.has(u)) { _pf.add(u); new Image().src = u; }
}
function render() {
  const it = cur();
  el.rev.style.display = 'none'; delete el.rev.dataset.peek;
  wrap.classList.remove('locked');
  S.sel.clear();
  syncCodes();          // 검색어는 그대로 두고 선택만 비운다
  el.msg.value = ''; delete el.msg.dataset.touched;
  if (!it) {
    el.pn.textContent = emptyText(); el.mt.textContent = '';
    setImg('R', ''); setImg('O', ''); el.pos.textContent = '–';
    paintQueueBar(); return;   // 범위·쪽 표시는 큐가 비어도 맞아야 한다
  }
  el.pn.textContent = it.product_name || '(상품명 없음)';
  el.mt.textContent = `row ${it.row_number} · product ${it.product_id} · ${it.media.selected_input_column || ''}`;
  setImg('R', it.media.result_url); setImg('O', it.media.selected_input_url);
  // 쪽 안의 몇 번째가 아니라 이 범위 전체에서 몇 번째인지를 보여준다 —
  // 127건 중 어디쯤인지가 알고 싶은 것이지 3쪽의 5번째가 궁금한 게 아니다
  el.pos.textContent = `${(S.page - 1) * S.size + S.i + 1} / ${S.total || S.queue.length}` +
                       ` · ${curScope().label}` + (S.page > 1 ? ` · ${S.page}쪽` : '');
  S.t0 = Date.now();
  // 판정이 이미 있는 건이면 그 판정·코드·메시지를 그대로 되살려 연다.
  // 빈 폼으로 두면 Space 한 번에 공들인 REJECT 가 빈 PASS 로 덮인다.
  const j = judgedOf(it);
  if (j) {
    (j.codes || []).forEach(c => { if (BY_CODE[c]) S.sel.add(c); });
    syncCodes();
    el.msg.value = j.msg || '';
    el.msg.dataset.touched = '1';           // 자동 초안이 저장했던 문구를 덮지 않게
  }
  paintLock();
  paintQueueBar();
  renderStats(); prefetch(S.i + 1); prefetch(S.i + 2);
}

/* 큐가 비었을 때 무엇 때문에 비었는지 — 범위를 바꿔 봤는데 아무 말이 없으면
 * 도구가 고장난 줄 안다. */
function emptyText() {
  if (S.scope === 'done') return '완료된 건이 없습니다';
  return '미완료가 없습니다 — 범위를 [완료] 로 바꿔 보세요 (B)';
}

/* --------------------------- 잠금 ---------------------------
 *  판정이 있는 건은 잠긴 채로 연다. 고치려면 J(고치기)를 먼저 눌러야 한다.
 *
 *  이게 필요한 이유는 검수가 손버릇으로 돌아가기 때문이다. 500건을 Space·Enter 로
 *  넘기다 보면 화면을 다 읽기 전에 손이 먼저 움직인다. 미완료 큐에서는 그게 속도지만,
 *  완료 큐에서는 이미 내려둔 판정을 지우는 동작이 된다.
 *  잠금은 그 한 번의 관성을 끊는 장치다 — 되돌릴 수 없는 쪽에만 건다.
 * --------------------------------------------------------------- */
function paintLock() {
  const it = cur(); if (!it) return;
  const j = judgedOf(it);
  const locked = isLocked(it);
  wrap.classList.toggle('locked', locked);
  if (isDiscarded(it)) {
    el.rev.innerHTML = `<div class="h">잠김 — 폐기된 건입니다</div>` +
      `이 건은 판정이 아니라 <b>폐기</b>로 처리돼 있습니다. 워크벤치는 폐기를 만들 수도 되돌릴 수도 없어서
       (폐기 사유를 넣을 자리가 없습니다) 여기서는 열지 않습니다.
       <div style="margin-top:4px;color:var(--mut)">그냥 넘어가세요(<b>N</b>). 손댈 일이 있으면 원래 라벨링 화면에서 하세요.</div>`;
    el.rev.style.display = 'block';
    return;
  }
  if (!j) return;
  const src = j.mine ? '이 세션에서 판정한 건입니다' : '이미 판정이 저장된 건입니다';
  el.rev.innerHTML = `<div class="h">${locked ? '잠김 — ' : ''}${src}</div>` +
    `저장된 판정: <b>${esc(j.verdict)}</b>` +
    ((j.codes || []).length ? ` · ${j.codes.map(esc).join(', ')}` : '') +
    (j.msg ? `<div style="margin-top:4px;color:var(--mut)">${esc(j.msg)}</div>` : '') +
    (!j.detail ? `<div style="margin-top:4px;color:var(--warn)">이 목록에는 <b>코드·메시지가 실려 있지 않습니다</b> —
           위 판정만 서버가 알려준 것입니다. 덮어쓰면 원래 코드·메시지가 지워집니다.</div>` : '') +
    (locked
      ? `<div style="margin-top:4px;color:var(--mut)">고칠 게 없으면 그냥 넘어가세요(<b>N</b>).
           고치려면 아래를 누릅니다 — 그때부터 PASS/REJECT 가 이 판정을 덮어씁니다.</div>
         <button class="cb" data-act="unlock">고치기<i>J</i></button>`
      : `<div style="margin-top:4px;color:var(--mut)">잠금이 풀렸습니다. 지금 저장하면 위 내용을 덮어씁니다.</div>`);
  el.rev.style.display = 'block';
}
function unlock(force) {
  const it = cur(); if (!it) return;
  /* 폐기 건은 강제로도 열지 않는다. 열어봐야 이 도구가 보낼 수 있는 건 pass/reject 뿐이라
   * 폐기 상태를 사유도 없이 지우게 된다 — 표현할 수 없는 상태를 덮어쓰는 것은 막는다. */
  if (isDiscarded(it)) {
    return toast('폐기된 건은 워크벤치에서 못 고칩니다 — 원래 라벨링 화면에서 하세요', true);
  }
  const j = judgedOf(it);
  if (!j) return toast('아직 판정이 없는 건이라 잠겨 있지 않습니다');
  if (S.open.has(it.label_row_id)) return toast('이미 고칠 수 있는 상태입니다');
  /* 코드·메시지가 목록에 안 실려 온 건은 열지 않는다.
   * 화면에 되살릴 것이 판정 하나뿐인데 그대로 저장하면 원래 코드·메시지가
   * 빈 값으로 덮인다 — 보이지도 않는 것을 지우는 셈이라 잠금의 취지에 정면으로 어긋난다.
   * 코드를 통째로 새로 매길 작정이면 WB.fix(true). */
  if (!j.detail && !force) {
    console.warn('[워크벤치] 이 목록에 코드·메시지가 실려 있지 않습니다 —', it.label_row_id,
      '\n  지금 저장하면 서버의 코드·메시지가 빈 값으로 덮입니다.',
      '\n  원래 라벨링 화면에서 확인하고 고치거나, 통째로 새로 매길 거면 WB.fix(true).');
    return toast('코드·메시지를 서버가 안 줘서 잠금을 못 풉니다 — 덮어쓰면 지워집니다 (콘솔 참고)', true);
  }
  S.open.add(it.label_row_id);
  paintLock();
  toast(force && !j.detail ? '잠금 해제 (강제) — 코드·메시지를 새로 매기세요'
                           : '잠금 해제 — 이제 저장하면 기존 판정을 덮어씁니다');
}
el.rev.addEventListener('click', e => {
  if (e.target.closest('[data-act="unlock"]')) unlock();
});

/* 범위 전환 — 미완료 ▸ 완료. 각각 서버의 다른 큐(mine / mine_done)라 새로 받아온다.
 * 0.9.8 에서는 mine 한 벌을 받아 판정 유무로 갈랐는데, mine 은 애초에 미완료 큐라
 * 완료가 항상 0건이었다. 있지도 않은 것을 거르고 있었던 셈이다. */
function setScope(name) {
  if (!SCOPES[name]) return toast('모르는 범위입니다: ' + name, true);
  if (S.scope === name) return;
  WB.load({ scope:name, page:1 })
    .then(n => toast(`범위: ${curScope().label} · ${S.total}건 중 ${n}건`))
    .catch(loadErr);
}
function cycleScope() {
  setScope(SCOPE_ORDER[(SCOPE_ORDER.indexOf(S.scope) + 1) % SCOPE_ORDER.length]);
}
el.bScope.onclick = () => cycleScope();
el.bPgP.onclick = () => { if (S.page > 1) WB.load({ page: S.page - 1 }).catch(loadErr); };
el.bPgN.onclick = () => WB.load({ page: S.page + 1 }).catch(loadErr);
function loadErr(e) { toast(String(e.message || e), true); }
function renderStats() {
  const s = S.stats;
  el.sst.textContent = `저장 ${s.n}건` + (s.n ? ` · auto 판정일치 ${Math.round(s.agreeVerdict / s.n * 100)}%` : '');
  /* 이 숫자는 서버의 완료 총수와 다른 것을 센다 — 옆에 나란히 보이면 반드시
   * "왜 다르지?" 가 나오므로, 물음이 생기는 자리에 답을 붙여 둔다. */
  el.sst.title = '이 브라우저에서 워크벤치로 보낸 새 판정의 수입니다 (내 작업 속도·auto 대조용 개인 통계).\n' +
    '상단 [범위: 완료] 의 총건수는 서버가 센 내 완료 전체라서 보통 이 숫자보다 큽니다 —\n' +
    '원래 라벨링 화면에서 판정한 것, 다른 브라우저에서 한 것, WB.reset() 이전 것은 여기 안 들어가고,\n' +
    '같은 건을 다시 저장한 것도 두 번 세지 않습니다.';
}

/* --------------------------- 복사 ---------------------------
 *  팀에 물어볼 때 필요한 건 "이게 어느 건인지" 한 덩어리다. 지금까지는 Esc 로
 *  워크벤치를 빠져나가 원래 화면에서 다시 찾아 적어야 했다. Y 한 번으로 끝낸다.
 *
 *  navigator.clipboard 는 https + 문서에 포커스가 있어야 동작한다. 관리자 페이지는
 *  https 지만 포커스가 빠진 순간에는 거부되므로 execCommand 로 한 번 더 받는다.
 *  임시 textarea 는 shadow DOM 이 아니라 document.body 에 붙인다 — shadow 안의
 *  노드는 execCommand('copy') 의 선택 영역으로 잡히지 않는 경우가 있다.
 *  둘 다 실패하면 조용히 넘어가지 않고 콘솔에 원문을 뱉는다. */
async function copyText(s, what) {
  const label = (what || '') + ' 복사됨';
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(s);
      toast(label); return true;
    }
  } catch (e) {}
  // clipboard 가 거부된 뒤에도 여기까지는 보통 수십 ms 다. 크롬의 사용자 제스처
  // 유효 시간(수 초)이 아직 남아 있어 execCommand 가 받아준다.
  try {
    const ta = document.createElement('textarea');
    ta.value = s;
    ta.style.cssText = 'position:fixed;top:-2000px;left:-2000px;opacity:0';
    document.body.appendChild(ta);
    ta.select(); ta.setSelectionRange(0, s.length);
    const ok = document.execCommand('copy');
    ta.remove();
    if (ok) { toast(label); return true; }
  } catch (e) {}
  toast('복사에 실패했습니다 — 콘솔에 원문을 띄웠습니다', true);
  console.log(s);
  return false;
}

/* 질문에 붙여넣을 한 덩어리(Shift+Y). 보통은 label 하나면 되므로 Y 가 그쪽이다.
 * auto 판정은 넣지 않는다 — 물어보는 쪽이 필요하면 U 로 열어 직접 덧붙이면 된다. */
function refBlockOf(it, codes, ref) {
  if (!it) return '';
  const m = it.media || {};
  const L = [
    `[빅카드 검수${ref ? ' · 참고' : ''}] ${it.product_name || '(상품명 없음)'}`,
    `row ${it.row_number} · product ${it.product_id}` +
      (m.selected_input_column ? ` · ${m.selected_input_column}` : ''),
    `label_row_id ${it.label_row_id}`,
  ];
  if (m.result_url)         L.push(`결과 ${m.result_url}`);
  if (m.selected_input_url) L.push(`원본 ${m.selected_input_url}`);
  if (codes && codes.length) L.push(`내가 고른 코드 ${codes.join(', ')}`);
  return L.join('\n');
}
function refBlock() { return refBlockOf(cur(), [...S.sel], false); }
function copyRefOf(it, ref) {
  const t = refBlockOf(it, ref ? [] : [...S.sel], ref);
  if (!t) return toast('복사할 건이 없습니다', true);
  return copyText(t, ref ? '참고 건의 정보를' : '이 건의 정보를');
}
function copyRef() { return copyRefOf(cur(), false); }
/* 질문할 때 실제로 필요한 건 이것 하나다. 나머지는 전체 복사(⇧Y)로 뺐다. */
function copyLabel(it) {
  if (!it || !it.label_row_id) return toast('복사할 label 이 없습니다', true);
  return copyText(String(it.label_row_id), 'label 을');
}
el.bCopy.onclick  = () => copyRef();
el.bCopyL.onclick = () => copyLabel(cur());


/* --------------------------- 저장 --------------------------- */
async function save(verdict) {
  const it = cur(); if (!it || S.busy) return;
  /* 내 큐로 불러온 건만 저장한다.
   * 지금은 큐가 곧 내 것이라 이 조건이 깨질 일이 없다. 그래도 미리 채워 두는 이유는,
   * 나중에 남의 건을 열람하는 기능이 붙었을 때 "저장 버튼을 안 누르면 된다"가 아니라
   * "저장 경로 자체가 닫혀 있다"로 만들어 두기 위해서다. 조용히 넘어가지 않고 멈춘다. */
  if (!S.mine.has(it.label_row_id)) {
    console.warn('[워크벤치] 내 큐에 없는 건이라 저장을 막았습니다', it.label_row_id);
    return toast('내 큐에서 불러온 건이 아니라 저장하지 않았습니다', true);
  }
  /* 판정이 이미 있는 건은 J(고치기)를 눌러 잠금을 푼 뒤에만 덮어쓸 수 있다.
   * 손버릇으로 누른 Space 가 여기서 멈춘다. */
  if (isLocked(it)) {
    return toast(isDiscarded(it)
      ? '폐기된 건이라 저장하지 않았습니다 — 원래 라벨링 화면에서 하세요'
      : '이미 판정이 있는 건입니다 — [고치기](J) 를 누른 뒤에 저장하세요', true);
  }
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
    // 재저장은 통계에 두 번 세지 않는다. 완료 범위에서 고친 건도 마찬가지 —
    // 불러온 시점에 이미 판정이 있었다면 그건 오늘 새로 한 일이 아니다.
    const resave = !!S.done[it.label_row_id] || S.wasDone.has(it.label_row_id);
    S.done[it.label_row_id] = { verdict, codes: [...codes], msg };
    if (!resave) tally(it, verdict, codes, secs);
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
  // 미완료 범위에서만 다음 묶음을 자동으로 당겨온다. 저장할수록 미완료가 줄어드는
  // 범위라 그게 자연스럽다. 완료·전체에서 같은 짓을 하면 같은 쪽을 다시 받아
  // 처음으로 튕겨 나가므로, 거기서는 쪽을 직접 넘기게 둔다(상단 ▶).
  if (S.scope === 'todo') {
    toast('큐 끝 — 다음 묶음을 가져옵니다');
    WB.load().then(n => { if (!n) toast('남은 작업이 없습니다', true); }).catch(loadErr);
    return;
  }
  if (hasNextPage()) { toast('다음 쪽을 가져옵니다'); WB.load({ page: S.page + 1 }).catch(loadErr); return; }
  toast(`${curScope().label} 마지막입니다 (${S.total}건)`);
}
const hasNextPage = () => S.page * S.size < S.total;
function prev() { if (S.i > 0) { S.i--; render(); } }

/* 조회 창이 떠 있을 때만 통과시키는 키 — 확대·보정·화면 관련만이다.
 * 판정(Space·Enter·N)과 이슈 코드 키는 일부러 빼 두었다. */

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

/* ══════ src/70-lookup.js ════════════════════════════════════════════ */
/* --------------------------- 사례 조회 (읽기 전용) ---------------------------
 *  "이거 저번에 비슷한 게 있지 않았나" 를 Esc 로 빠져나가지 않고 여기서 본다.
 *
 *  안전은 약속이 아니라 구조로 잡는다.
 *   1. 조회 결과는 LK.items 에만 담긴다. S.queue 에는 들어가지 않는다.
 *      save() 가 보는 것은 cur() = S.queue[S.i] 뿐이므로, 조회한 건이 저장 payload 에
 *      실릴 경로가 아예 없다. 그 위에 S.mine 자물쇠가 한 겹 더 있다.
 *   2. 이 창은 .modal 이다. 전역 키 핸들러가 모달이 떠 있으면 판정 단축키를 통째로
 *      무시하므로, 남의 건을 띄워놓고 Space 를 눌러도 아무 일도 일어나지 않는다.
 *      "내 큐인 줄 알고 눌렀다" 가 이 기능의 진짜 위험인데, 그게 여기서 막힌다.
 *
 *  질의는 관리자 화면이 이미 쓰는 GET 그대로다. label_status=all · q=검색어.
 *  labeler_filter 는 쓰지 않는다 — 확인되지 않은 파라미터를 넣지 않는다.
 * --------------------------------------------------------------- */
const LK = { q:'', page:1, size:20, total:0, items:[], sel:-1, busy:false };
const fetchLook = (q, page, size) => api(
  `api/labeling/items?batch_id=all&label_status=all&auto_verdict=all&human_verdict=all` +
  `&issue_code=all&labeler_filter=&q=${encodeURIComponent(q)}` +
  `&page=${page}&page_size=${size}&labeler=${encodeURIComponent(S.labeler)}`);

/* 서버가 주는 human / auto 의 정확한 모양을 확인하지 못했다.
 * 객체면 아는 필드로 풀고, 아니면 있는 그대로 보여준다. 추측해서 감추지 않는다. */
function vtxt(o) {
  if (o == null || o === '') return '—';
  if (typeof o !== 'object') return String(o);
  if ('verdict' in o || 'issue_codes' in o || 'message' in o) {
    return (o.verdict || '—')
      + ((o.issue_codes || []).length ? ' · ' + o.issue_codes.join(', ') : '')
      + (o.message ? ' · ' + o.message : '');
  }
  try { return JSON.stringify(o); } catch (e) { return String(o); }
}
const lkWho = it => String(it.labeled_by || it.assigned_to || '');
function lkNote(s) { el.lkList.innerHTML = `<div class="fnone" style="display:block">${esc(s)}</div>`; }

function drawLook() {
  if (!LK.items.length) { lkNote('결과가 없습니다. 상품명을 더 짧게 잘라서 넣어보세요.'); drawPv(); return; }
  el.lkList.innerHTML = LK.items.map((it, i) => {
    const m = it.media || {};
    return `<div class="lkro${i === LK.sel ? ' on' : ''}" data-i="${i}">` +
      (m.result_url ? `<img loading="lazy" src="${esc(m.result_url)}" alt="">` : `<div class="ph"></div>`) +
      `<div class="lkm"><b>${esc(it.product_name || '(상품명 없음)')}</b>` +
      `<span class="mut">row ${esc(it.row_number)} · product ${esc(it.product_id)}` +
      (it.label_status ? ` · ${esc(it.label_status)}` : '') +
      (lkWho(it) ? ` · ${esc(lkWho(it))}` : '') + `</span>` +
      `<div class="lkj mut"><span class="hum">사람 ${esc(vtxt(it.human))}<br></span>auto ${esc(vtxt(it.auto))}</div>` +
      `</div></div>`;
  }).join('');
  const from = (LK.page - 1) * LK.size + 1;
  el.lkPos.textContent = `${from}–${from + LK.items.length - 1} / ${LK.total}건`;
  drawPv();
}
/* 고른 사례를 오른쪽 뷰어에 건다. 확대·이동·보정은 검수 화면과 같은 기계를 쓴다. */
function drawPv() {
  const it = LK.items[LK.sel];
  if (!it) {
    el.lkHead.textContent = '왼쪽에서 사례를 고르세요';
    setImg('LR', ''); setImg('LO', ''); return;
  }
  const m = it.media || {};
  el.lkHead.innerHTML = `<b>${esc(it.product_name || '(상품명 없음)')}</b> ` +
    `<span class="mut">row ${esc(it.row_number)} · product ${esc(it.product_id)}` +
    (lkWho(it) ? ` · ${esc(lkWho(it))}` : '') + `</span>`;
  setImg('LR', m.result_url); setImg('LO', m.selected_input_url);
}
async function runLook(page) {
  const q = el.lq.value.trim();
  if (!q) return lkNote('검색어를 넣으세요 — 상품명 일부면 됩니다.');
  if (LK.busy) return;
  LK.busy = true; lkNote('찾는 중…');
  try {
    const d = await fetchLook(q, page, LK.size);
    LK.q = q; LK.page = page;
    LK.total = d.total || 0; LK.items = d.items || [];
    LK.sel = LK.items.length ? 0 : -1;      // 첫 건을 바로 걸어준다
    drawLook();
  } catch (e) {
    lkNote(String(e.message || e));
    console.error('[워크벤치] 조회 실패', e);
  } finally { LK.busy = false; }
}
function openLook() {
  const it = cur();
  if (!el.lq.value.trim()) el.lq.value = LK.q || (it && it.product_name) || '';
  modal(el.mLook, true);
  if (!LK.items.length) { if (el.lq.value.trim()) runLook(1); else lkNote('상품명 일부를 넣고 Enter 를 누르세요.'); }
  else { drawLook(); setTimeout(() => { fitView('LR'); fitView('LO'); }, 60); }
}
/* 전체를 다시 그리면 스크롤이 맨 위로 튄다. 바뀐 자리만 손댄다. */
el.lkList.addEventListener('click', e => {
  const row = e.target.closest('.lkro');
  if (!row) return;
  LK.sel = +row.dataset.i;
  el.lkList.querySelectorAll('.lkro').forEach(n => n.classList.toggle('on', +n.dataset.i === LK.sel));
  drawPv();
});
el.lkLbl.onclick   = () => copyLabel(LK.items[LK.sel]);   // 고른 게 없으면 안내만 나온다
el.lkHum.onclick   = () => setPref('peers', !S.pref.peers);   // CSS 만 접었다 펴서 스크롤이 안 튄다
el.lkFit.onclick   = () => { fitView('LR'); fitView('LO'); };
el.lkGo.onclick    = () => runLook(1);
el.lkPrev.onclick  = () => { if (LK.page > 1) runLook(LK.page - 1); };
el.lkNext.onclick  = () => { if (LK.page * LK.size < LK.total) runLook(LK.page + 1); };
el.lkClose.onclick = () => modal(null, false);
el.rCt2.oninput    = () => setFx('contrast', +el.rCt2.value);
el.rBr2.oninput    = () => setFx('bright',   +el.rBr2.value);
el.bInv2.onclick   = () => setFx('invert', S.pref.fx.invert ? 0 : 1);
el.bGray2.onclick  = () => setFx('gray',   S.pref.fx.gray ? 0 : 1);
el.bFxR2.onclick   = () => resetFx();
el.bLook.onclick   = () => openLook();
el.lq.addEventListener('keydown', e => {
  if (e.isComposing || e.keyCode === 229) return;   // 한글 조합 중의 Enter 는 확정용
  if (e.key !== 'Enter') return;
  runLook(1); e.preventDefault(); e.stopPropagation();
});

/* ══════ src/80-keyboard.js ══════════════════════════════════════════ */
/* --------------------------- 키보드 ---------------------------
 *  실제 동작 · 조회 창 통과 목록 · 단축키 창 · 하단 안내가 전부 25-keys.js 의 표에서
 *  나온다. 이 파일은 그 표를 소비할 뿐, 여기에 키를 직접 적지 않는다.
 *
 *  예외는 Alt+W 와 Esc 다. 여는 키와, 맥락에 따라 다섯 갈래로 갈리는 되돌리기는
 *  표로 적으면 오히려 읽기 어려워진다. 대신 안내에는 virtual 줄로 실려 있다.
 * --------------------------------------------------------------- */
const KEYMAP = new Map();
for (const r of keyRows()) if (r.k && r.act) {
  // 같은 키가 둘이면 먼저 온 쪽이 이긴다. check.js 가 애초에 그런 표를 막는다.
  if (!KEYMAP.has(r.k)) KEYMAP.set(r.k, r);
  else console.warn('[워크벤치] 단축키 중복:', r.k, '—', KEYMAP.get(r.k).desc, 'vs', r.desc);
}
/* 조회 창이 떠 있을 때 통과시킬 키 — 손으로 적던 목록을 표에서 뽑아 쓴다 */
const LOOK_KEYS = new Set([...KEYMAP.values()].filter(r => r.scope === 'view').map(r => r.k));

/* 하단 한 줄 안내 — 진짜 한 줄. 나머지는 전부 ? 안에 있다. */
function hintHtml() {
  return keyRows().filter(r => r.hint)
    .map(r => `<kbd>${esc(r.show)}</kbd> ${r.hintDesc || r.desc}`).join(' · ');
}

/* 단축키 창 — 표를 group 순서대로 묶어 그린다.
 * 이슈 코드 21개를 낱개로 늘어놓으면 창이 넘치므로 코드 그룹(A~F)으로 접어 보여준다. */
function renderKeyHelp() {
  const order = [], byGroup = new Map();
  for (const r of keyRows()) {
    if (!byGroup.has(r.group)) { byGroup.set(r.group, []); order.push(r.group); }
    byGroup.get(r.group).push(r);
  }
  let html = '';
  for (const g of order) {
    const list = byGroup.get(g);
    let body;
    if (list[0] && list[0].code) {
      const seen = [], per = new Map();
      for (const r of list) {
        if (!per.has(r.code.g)) { per.set(r.code.g, []); seen.push(r.code.g); }
        per.get(r.code.g).push(`<kbd>${esc(r.show)}</kbd>`);
      }
      body = seen.map(k => `${k}그룹 ${per.get(k).join('')}`).join(' · ');
    } else {
      body = list.map(r => `<kbd>${esc(r.show)}</kbd> ${r.desc}`).join(' · ');
    }
    if (KEY_NOTES[g]) body += '<br>' + KEY_NOTES[g];
    html += `<b>${esc(g)}</b><span>${body}</span>`;
  }
  el.ks.innerHTML = html;
}

/* 콘솔 도움말도 같은 표에서. 화면을 안 보고 물어보는 사람에게는 이 줄이 답이 된다. */
function keyHelpText() {
  const order = [], byGroup = new Map();
  for (const r of keyRows()) {
    if (r.code) continue;                       // 코드 키는 아래에서 한 줄로 따로
    if (!byGroup.has(r.group)) { byGroup.set(r.group, []); order.push(r.group); }
    byGroup.get(r.group).push(`${r.show} ${r.desc}`);
  }
  const pad = s => (s + '          ').slice(0, 9);
  const lines = order.map(g => '  ' + pad(g) + '· ' + byGroup.get(g).join(' · '));
  lines.push('  ' + pad('이슈 코드') + '· ' + CODES.map(c => c.k.toUpperCase()).join(' ') +
             '   (키보드 위치가 그대로 코드 그룹 순서)');
  return lines.join('\n');
}

/* 글자를 받는 곳에 포커스가 있으면 코드 단축키를 절대 가로채지 않는다.
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
  // show 로 표시돼 있어도 host 가 문서에서 떨어져 있으면 화면에는 아무것도 없다.
  // (관리자 화면이 body 를 갈아끼우면 이렇게 된다.) 보이지 않는 창이 q·w·e·z 를
  // 먹는 것이 0.9.3 증상의 재발 경로라, 떨어져 있는 동안은 통째로 양보한다.
  // 순찰(patrol)이 0.5초 안에 host 를 도로 붙인다.
  if (!host.isConnected) return;
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
  if (on.type === 'range') return;              // 슬라이더 조작 중에는 방향키를 양보
  // Tab 은 가로채지 않는다 — 키보드 사용자의 포커스 이동이 최우선이다.
  if (e.key === 'Tab') return;
  // 버튼·체크박스에 포커스가 있을 때 Space/Enter 는 그 요소의 것이다.
  const focusable = on.tagName === 'BUTTON' || (on.classList && on.classList.contains('cd'));
  if (focusable && (e.key === ' ' || e.key === 'Enter')) return;

  const row = KEYMAP.get(e.key.toLowerCase());
  if (!row) return;
  // 모달이 떠 있으면 단축키를 먹지 않는다. 조회 창만 예외로 scope:'view' 를 통과시킨다 —
  // 확대·대비를 못 만지면 결국 창을 닫고 나가게 되니 기능의 의미가 없어진다.
  // 판정·코드 키(scope:'review')는 여기서 계속 잠긴 채다.
  if (anyModal() && !(el.mLook.classList.contains('show') && LOOK_KEYS.has(row.k))) return;
  row.act(e); e.preventDefault();
}, true);

el.msg.addEventListener('input', () => { el.msg.dataset.touched = '1'; });
el.bp.onclick = () => save('pass');
el.br.onclick = () => save('reject');
el.bs.onclick = next;

/* ══════ src/90-patrol.js ════════════════════════════════════════════ */
/* --------------------------- 순찰 ---------------------------
 * evictGhosts 는 이 스크립트보다 '먼저' 있던 유령만 치울 수 있다. Tampermonkey 에
 * 옛 버전 항목이 같이 켜져 있으면 그쪽이 우리 '뒤에' 로드되면서 전역 키 핸들러를
 * 새로 깔고, q·w·e·z 를 도로 먹기 시작한다 — 0.9.3 증상의 재발 경로다.
 * 그래서 0.5초마다 확인한다: 낯선 워크벤치 DOM 은 걷어내고, 빼앗긴 window.WB 는
 * 되찾고, 관리자 화면이 body 를 갈아끼워 떨어져 나간 내 host 는 도로 붙인다.
 * 더 새 버전이 보이면 싸우지 않는다 — 내가 비킨다. */
function verNum(v) {
  const p = String(v || '0').split('.');
  return (+p[0] || 0) * 1e6 + (+p[1] || 0) * 1e3 + (+p[2] || 0);
}
function quietHost(h) {   // evictGhosts 와 같은 처치 — 화면을 접고, 다시 켜지지 않게 잠근다
  const w = h.shadowRoot && h.shadowRoot.querySelector('.wrap');
  if (w) {
    w.classList.remove('show');
    try { new MutationObserver(() => { if (w.classList.contains('show')) w.classList.remove('show'); })
            .observe(w, { attributes:true, attributeFilter:['class'] }); } catch (e) {}
  }
  h.remove();
}
function patrol() {
  // 1) window.WB 를 남이 쥐고 있다: 더 새 버전이면 내가 비키고, 구버전이면 내리고 되찾는다.
  //    (제대로 된 새 버전은 설치할 때 우리 destroy() 를 불러 TICK 을 끄므로,
  //     내가 아직 돌고 있는데 자리를 빼앗겼다면 그쪽은 guard 없는 구버전이다.)
  const alien = window.WB;
  if (alien && alien !== WB) {
    if (verNum(alien.VERSION) > verNum(VERSION)) { WB.destroy(); return; }
    console.warn('[워크벤치] v' + (alien.VERSION || '?') + ' 이 내 뒤에 로드됨 — 내리고 자리를 되찾습니다');
    try { alien.destroy && alien.destroy(); } catch (e) {}
    window.WB = WB;
  }
  // 2) 낯선 워크벤치 DOM — destroy() 가 없는 구버전이 내 뒤에 만든 것
  for (const h of document.querySelectorAll('#hm-wb-host')) {
    if (h === host) continue;
    const c = verNum(h.dataset.v) - verNum(VERSION);
    // 같은 버전이 둘이면(샌드박스 분리 등) 먼저 태어난 쪽이 남는다 — 둘 다 비키면 아무도 없다
    if (c > 0 || (c === 0 && +(h.dataset.born || 0) < +host.dataset.born)) { WB.destroy(); return; }
    console.warn('[워크벤치] 낯선 워크벤치 DOM 을 걷어냅니다 (v' + (h.dataset.v || '0.9.6 이하') + ')');
    quietHost(h);
  }
  for (const n of [...(document.body ? document.body.children : [])]) {
    if (n !== launcher && n.tagName === 'BUTTON' &&
        (n.dataset.hmWbLauncher || n.textContent === '검수 워크벤치')) n.remove();
  }
  // 3) 관리자 화면이 body 를 갈아끼워 내 host·실행 버튼이 떨어졌으면 도로 붙인다
  if (!host.isConnected && document.body) document.body.appendChild(host);
  if (!launcher.isConnected && document.body) document.body.appendChild(launcher);
}

const TICK = setInterval(() => {
  patrol();
  if (S.pref.showTimer && wrap.classList.contains('show') && cur())
    el.tmr.textContent = ((Date.now() - S.t0) / 1000).toFixed(0) + '초';
}, 500);

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
    // 관리자 화면이 body 를 다시 그렸으면 host·실행 버튼이 떨어져 있다 — 붙이고 연다
    if (!host.isConnected) document.body.appendChild(host);
    if (!launcher.isConnected) document.body.appendChild(launcher);
    wrap.classList.add('show'); applyPref();
    if (!S.labeler) setWho(guessLabeler());
    if (!S.labeler) return gate(true);
    if (!S.queue.length) WB.load().catch(e => toast(String(e.message || e), true));
    else S.t0 = Date.now();
  },
  close() { wrap.classList.remove('show'); },
  /* WB.load()              지금 범위·쪽 그대로 다시
   * WB.load('joel')        검수자를 바꿔서
   * WB.load({scope:'done', page:2, size:200})
   * (옛 호출 WB.load(who, size) 도 그대로 받는다) */
  async load(a, b, c, d) {
    const o = (a && typeof a === 'object') ? a : { who:a, size:b, scope:c, page:d };
    if (o.scope && !SCOPES[o.scope]) { toast('모르는 범위입니다: ' + o.scope, true); return 0; }
    if (o.who || !S.labeler) setWho(o.who || S.labeler || guessLabeler());
    if (!S.labeler) { gate(true); return 0; }
    if (o.scope) S.scope = o.scope;
    S.page = Math.max(1, o.page || 1);
    const sc = curScope();
    S.size = o.size || sc.size;
    const res = await fetchQueue(S.labeler, S.size, S.page, sc.status);
    checkCodeDrift(res.issue_codes);
    S.queue = res.items || [];
    S.total = res.total || 0;
    S.i = 0;
    S.open.clear();                       // 잠금은 큐를 새로 받을 때마다 다시 건다
    for (const x of S.queue) {
      S.mine.add(x.label_row_id);         // 저장 자물쇠의 열쇠는 여기서만 만들어진다
      if (humanOf(x)) S.wasDone.add(x.label_row_id);
    }
    render();
    // 완료 범위인데 판정이 하나도 안 실려 오면 서버가 목록에 판정을 안 싣는 것이다.
    // 조용히 빈 화면을 보여주지 않고 왜인지 말한다.
    if (S.scope === 'done' && S.queue.length && !S.queue.some(humanOf))
      console.warn('[워크벤치] label_status=mine_done 이 판정 없이 옵니다 — WB.probe() 로 다시 확인하세요.');
    console.log(`큐 ${S.queue.length}건 (${sc.status} · 서버 총 ${S.total}건) · ` +
                `범위=${sc.label} · ${S.page}쪽 · labeler=${S.labeler}`);
    return S.queue.length;
  },
  scope(name) { if (name == null) { cycleScope(); return S.scope; } setScope(name); return S.scope; },
  page(n) { return WB.load({ page: n }); },
  /* 잠긴 건의 잠금을 푼다 (J). 코드·메시지가 목록에 안 실려 온 건은 거부하는데,
   * 통째로 새로 매길 작정이면 WB.fix(true) 로 밀고 갈 수 있다. */
  fix(force) { unlock(force); },
  /* label_status 가 어떤 값을 받는지 확인하는 읽기 전용 진단.
   * 2026-08-04 확인: mine(미완료) · mine_done(내 완료) 둘이 우리가 쓰는 값이고,
   * labeled·all 은 남의 것까지 섞여 오므로 큐로는 쓰지 않는다.
   * 서버가 바뀌어 완료 범위가 이상해지면 다시 돌려 보면 된다.
   * page_size=5 짜리 GET 이라 아무것도 바꾸지 않는다. */
  async probe(rediscover) {
    // 기본은 서버가 받는 것으로 확인된 값만 — 400 이 콘솔에 빨갛게 쌓이지 않는다.
    // WB.probe(true) 는 안 받는 값까지 다시 훑는다 (서버가 늘었는지 볼 때).
    const cands = ['mine', 'mine_done', 'all', 'labeled', 'discarded'].concat(
      rediscover ? ['unlabeled', 'mine_discarded', 'done', 'completed', 'complete', 'todo'] : []);
    const rows = [];
    for (const st of cands) {
      try {
        const d = await api(`api/labeling/items?batch_id=all&label_status=${encodeURIComponent(st)}` +
          `&auto_verdict=all&human_verdict=all&issue_code=all&labeler_filter=&q=` +
          `&page=1&page_size=5&labeler=${encodeURIComponent(S.labeler)}`);
        const items = d.items || [];
        rows.push({ label_status: st, 서버_총건수: d.total, 받은건수: items.length,
          '판정 있는 건': items.filter(humanOf).length,
          '항목의 label_status': [...new Set(items.map(i => i.label_status).filter(Boolean))].join(',') || '—' });
      } catch (e) { rows.push({ label_status: st, 오류: String(e.message || e).slice(0, 70) }); }
    }
    console.table(rows);
    console.log('지금 쓰는 값: 미완료=mine · 완료=mine_done (src/30-state.js 의 SCOPES).\n' +
                '이 둘의 "판정 있는 건" 이 각각 0 · 5 가 아니면 서버가 바뀐 것이니 알려주세요.');
    /* 판정이 어떤 모양으로 실려 오는지 한 건을 통째로 보여준다.
     * humanOf() 가 이 모양을 읽어 코드·메시지를 되살리는데, 코드·메시지 칸이 아예
     * 없으면 잠금을 못 풀게 막는다(덮어쓰면 지워지므로). 그 판단의 근거가 이것이다. */
    try {
      const d = await fetchQueue(S.labeler, 1, 1, SCOPES.done.status);
      const it = (d.items || [])[0];
      if (!it) console.log('완료 건이 없어 판정 모양은 확인하지 못했습니다.');
      else {
        const j = humanOf(it);
        console.log('완료 건의 human 원본:', it.human);
        console.log('워크벤치가 읽은 값:', j,
          j && !j.detail ? '← 코드·메시지 칸이 없습니다. 이 상태로는 J(고치기)가 막힙니다.' : '');
      }
    } catch (e) { console.log('판정 모양 확인 실패:', String(e.message || e)); }
    return rows;
  },
  arm()    { setArm(true); },
  disarm() { setArm(false); },
  who(name){ if (name == null) return gate(true); setWho(name); return WB.load(); },
  find(v) { setFind(v == null ? '' : String(v)); return el.fc.textContent || '전체'; },
  copy()  { copyRef(); return refBlock(); },
  look(v) { if (v != null) el.lq.value = String(v); openLook(); },
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
  /* q·w·e·z 가 또 먹히면 제일 먼저 이걸 돌려서 결과를 공유해 달라.
   * 워크벤치 DOM 이 2개 이상 = 유령이 있다(보통 Tampermonkey 에 옛 항목이 같이 켜짐).
   * host 부착이 false = 관리자 화면이 body 를 갈아끼운 경우다. */
  doctor() {
    const hosts = [...document.querySelectorAll('#hm-wb-host')];
    const o = { 버전: VERSION,
      'window.WB 가 나인가': window.WB === WB,
      'window.WB 버전': (window.WB && window.WB.VERSION) || '(없음)',
      '워크벤치 DOM 개수': hosts.length,
      'host 부착': host.isConnected,
      '창 열림': wrap.classList.contains('show'),
      '실행 버튼 부착': launcher.isConnected };
    console.table(o);
    if (hosts.length > 1) console.warn('[워크벤치] 워크벤치 DOM 이 ' + hosts.length +
      '개입니다 — 다음 순찰(0.5초)이 걷어냅니다. Tampermonkey 에 옛 버전 항목이 같이 켜져 있지 않은지 확인하세요.');
    return o;
  },
  raw: S,
};

/* ══════ src/99-start.js ═════════════════════════════════════════════ */
renderKeyHelp();      // 단축키 창을 25-keys.js 의 표에서 그린다
applyPref();
applyFind();
setWho(guessLabeler());
console.log('%c검수 워크벤치 v' + VERSION, 'font-size:15px;font-weight:700');
console.log([
  '  여는 법 : 오른쪽 아래 [검수 워크벤치] 버튼  또는  Alt+W',
  '  검수자 이름은 처음 열 때 화면에서 물어봅니다.',
  '  나중에 바꾸려면 상단 [검수자] 버튼, 큐를 다시 받으려면 [큐 새로고침].',
  '',
  '단축키 (src/25-keys.js 의 표에서 자동 생성 — 안내와 실제가 어긋날 수 없습니다)',
  keyHelpText(),
  '',
  '  내 완료  : B — 미완료 ⇄ 완료 를 오갑니다. 완료 범위에서는',
  '             내가 이미 판정한 건을 저장된 코드·메시지까지 되살려 다시 봅니다.',
  '             판정이 있는 건은 잠긴 채로 열립니다 — 고치려면 J 를 먼저.',
  '             쪽 넘기기는 상단 ◀ ▶ · 콘솔에서는 WB.page(2)',
  '             완료가 0건으로 나오면 →  WB.probe()  (읽기 전용 진단)',
  '',
  '  단축키가 이상하면 (q·w·e·z 가 안 찍히는 등) →  WB.doctor()',
  '',
  '  저장은 처음엔 꺼져 있습니다. 켜려면 →  WB.arm()',
].join('\n'));

})();