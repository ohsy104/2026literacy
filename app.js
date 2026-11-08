"use strict";
/* ▼ 주제 칩: 여기만 고치면 됩니다 */
const CATEGORIES = [
  { name: "RAG", en: "retrieval-augmented generation education", ko: "RAG 검색증강생성 교육" },
  { name: "LLM", en: "large language model education", ko: "거대언어모델 LLM 교육" },
  { name: "생성형 AI", en: "generative AI elementary education", ko: "생성형 AI 초등교육" },
  { name: "프롬프트", en: "prompt engineering education students", ko: "프롬프트 엔지니어링 교육" },
  { name: "AI 교육", en: "AI literacy K-12", ko: "초등 인공지능 교육" },
  { name: "컴퓨팅 사고력", en: "computational thinking K-12", ko: "컴퓨팅 사고력" },
  { name: "티처블 머신", en: "Teachable Machine students", ko: "티처블 머신" },
  { name: "AI 윤리", en: "AI ethics education children", ko: "인공지능 윤리 교육" },
];

const $ = (s) => document.querySelector(s);
const STATUS = { none: "안 읽음", reading: "읽는 중", done: "읽음" };
const SAVED = "pb_saved", NOTES = "pb_notes";
const SELECT = "id,display_name,publication_year,authorships,cited_by_count,doi,primary_location,best_oa_location,open_access,abstract_inverted_index";
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : "");
const enc = encodeURIComponent;
let results = [], koQuery = "";

const ls = {
  get(k) { try { return JSON.parse(localStorage.getItem(k) || "{}"); } catch { return {}; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { toast("이 브라우저에서는 저장이 막혀 있습니다."); } },
};
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 1800);
}

/* OpenAlex 결과를 화면용 형태로 변환 */
function norm(w) {
  const abs = w.abstract_inverted_index
    ? Object.entries(w.abstract_inverted_index).flatMap(([t, ps]) => ps.map((p) => [p, t])).sort((a, b) => a[0] - b[0]).map((x) => x[1]).join(" ") : "";
  const loc = w.primary_location || {};
  return {
    id: (w.id || "").split("/").pop(),
    title: w.display_name || "(제목 없음)",
    year: w.publication_year,
    authors: (w.authorships || []).map((a) => a.author && a.author.display_name).filter(Boolean),
    cites: w.cited_by_count,
    doi: w.doi || "",
    venue: (loc.source && loc.source.display_name) || "",
    sourceUrl: loc.landing_page_url || "",
    pdfUrl: (w.best_oa_location && w.best_oa_location.pdf_url) || "",
    oaUrl: (w.open_access && w.open_access.oa_url) || "",
    abstract: abs,
  };
}

/* APA 7판 */
function apaAuthors(list) {
  const names = (list || []).map((a) => {
    const p = a.trim().split(/\s+/);
    if (p.length < 2 || /[가-힣]/.test(a)) return a.trim();
    return p[p.length - 1] + ", " + p.slice(0, -1).map((x) => x[0].toUpperCase() + ".").join(" ");
  });
  if (!names.length) return "확인 필요";
  if (names.length === 1) return names[0];
  if (names.length <= 20) return names.slice(0, -1).join(", ") + ", & " + names[names.length - 1];
  return names.slice(0, 19).join(", ") + ", ... " + names[names.length - 1];
}
const apa = (p) => `${apaAuthors(p.authors)} (${p.year || "n.d."}). ${p.title}. ${p.venue ? p.venue + "." : ""} ${p.doi || p.sourceUrl || ""}`.replace(/\s+/g, " ").trim();

/* 외부 검색 바로가기 (현재 검색어 기준) */
function renderExt(q) {
  const k = koQuery || q;
  const L = [
    ["구글 스칼라", "https://scholar.google.com/scholar?q=" + enc(q)],
    ["DBpia", "https://www.dbpia.co.kr/search/topSearch?searchOption=all&query=" + enc(k)],
    ["RISS", "https://www.riss.kr/search/Search.do?query=" + enc(k)],
    ["arXiv", "https://arxiv.org/search/?searchtype=all&query=" + enc(q)],
  ];
  $("#ext").innerHTML = "다른 사이트에서도 검색: " + L.map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${n} ↗</a>`).join("");
}

/* 카드 */
function card(p) {
  const my = ls.get(NOTES)[p.id] || {}, saved = !!ls.get(SAVED)[p.id];
  const pdf = safeUrl(p.pdfUrl), oa = safeUrl(p.oaUrl), src = safeUrl(p.sourceUrl) || safeUrl(p.doi);
  const free = pdf || oa;
  const au = p.authors.slice(0, 3).join(", ") + (p.authors.length > 3 ? ` 외 ${p.authors.length - 3}명` : "");
  const q = enc(p.title);
  const fb = free ? "" : `<div class="fallback">원문 찾기:<a href="https://scholar.google.com/scholar?q=${q}" target="_blank" rel="noopener noreferrer">구글 스칼라</a><a href="https://www.dbpia.co.kr/search/topSearch?searchOption=all&query=${q}" target="_blank" rel="noopener noreferrer">DBpia</a></div>`;
  const doiLink = safeUrl(p.doi) ? `<a href="${esc(p.doi)}" target="_blank" rel="noopener noreferrer">DOI 링크</a>` : (src ? `<a href="${esc(src)}" target="_blank" rel="noopener noreferrer">출처 페이지</a>` : "링크 확인 필요");
  return `<article class="card" data-id="${esc(p.id)}">
    <span class="tag ${free ? "" : "paid"}">${free ? "무료 원문 있음" : "무료 원문 확인 필요"}</span>
    <h2>${esc(p.title)}</h2>
    <div class="meta"><span>${esc(p.year || "연도 확인 필요")}</span><span>${esc(au || "저자 확인 필요")}</span><span>인용 ${p.cites == null ? "확인 필요" : esc(p.cites) + "회"}</span></div>
    <div class="actions">
      ${pdf ? `<a class="btn primary" href="${esc(pdf)}" target="_blank" rel="noopener noreferrer">PDF 읽기 ↗</a>`
        : oa ? `<a class="btn primary" href="${esc(oa)}" target="_blank" rel="noopener noreferrer">무료 원문 보기 ↗</a>`
        : `<span class="btn off" aria-disabled="true">무료 PDF 없음</span>`}
      ${src ? `<a class="btn" href="${esc(src)}" target="_blank" rel="noopener noreferrer">출처 확인 ↗</a>` : `<span class="btn off" aria-disabled="true">출처 확인 필요</span>`}
      <button class="btn" data-act="save">${saved ? "저장됨 ✓" : "저장"}</button>
      <button class="btn" data-act="apa">APA 복사</button>
      ${p.abstract ? `<button class="btn more" data-act="more" aria-expanded="false">초록 보기 +</button>` : ""}
    </div>
    ${fb}
    ${p.abstract ? `<p class="abs" hidden>${esc(p.abstract)}</p>` : ""}
    <div class="mine">
      <select data-act="status" aria-label="읽음 상태">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${(my.status || "none") === k ? " selected" : ""}>${v}</option>`).join("")}</select>
      <textarea data-act="memo" placeholder="개인 메모 (이 브라우저에만 저장됩니다)" aria-label="메모">${esc(my.memo || "")}</textarea>
    </div>
    <div class="source">출처: ${esc(p.venue || "확인 필요")} / ${esc(p.year || "확인 필요")} / ${doiLink}</div>
  </article>`;
}
const find = (id) => results.find((p) => p.id === id) || ls.get(SAVED)[id];

/* 검색 */
async function search() {
  const q = $("#q").value.trim();
  if (!q) return toast("검색어를 입력하세요.");
  renderExt(q);
  const f = [];
  if ($("#oa").checked) f.push("open_access.is_oa:true");
  const y = $("#year").value;
  if (y !== "all") f.push("from_publication_date:" + (new Date().getFullYear() - Number(y)) + "-01-01");
  const s = $("#sort").value;
  const url = "https://api.openalex.org/works?search=" + enc(q) + "&per-page=25&select=" + SELECT + (f.length ? "&filter=" + f.join(",") : "") + (s ? "&sort=" + s : "");
  $("#status").textContent = "검색 중...";
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    results = (d.results || []).map(norm);
    const total = d.meta && d.meta.count != null ? d.meta.count.toLocaleString() : results.length;
    $("#status").textContent = `검색 결과 ${total}건 중 ${results.length}건 표시`;
    $("#cards").innerHTML = results.length ? results.map(card).join("") : '<div class="empty">검색 결과가 없습니다. 영어 검색어로 바꾸거나 "무료 원문만" 체크를 풀어 보세요.</div>';
  } catch {
    results = [];
    $("#status").textContent = "";
    $("#cards").innerHTML = '<div class="empty">검색 서버에 연결하지 못했습니다. 잠시 후 다시 시도하거나 위의 "다른 사이트에서도 검색" 버튼을 사용하세요.</div>';
  }
}

function renderSaved() {
  const all = Object.values(ls.get(SAVED));
  $("#b-saved").textContent = all.length + "편";
  $("#saved").innerHTML = all.length ? all.map(card).join("") : '<div class="empty">저장한 논문이 없습니다. 검색 결과에서 "저장"을 눌러 보세요.</div>';
}

/* 이벤트 */
document.addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (tab) {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    $("#panel-search").hidden = tab.dataset.tab !== "search";
    $("#panel-saved").hidden = tab.dataset.tab !== "saved";
    return;
  }
  const chip = e.target.closest(".chip");
  if (chip) {
    const c = CATEGORIES[chip.dataset.i];
    document.querySelectorAll(".chip").forEach((x) => x.classList.toggle("on", x === chip));
    $("#q").value = c.en; koQuery = c.ko; search();
    return;
  }
  const btn = e.target.closest("[data-act]"); if (!btn) return;
  const el = btn.closest(".card"), p = el && find(el.dataset.id);
  if (!p) return;
  if (btn.dataset.act === "more") {
    const a = el.querySelector(".abs"), open = a.hidden;
    a.hidden = !open; btn.setAttribute("aria-expanded", open);
    btn.textContent = open ? "초록 접기 −" : "초록 보기 +";
  } else if (btn.dataset.act === "save") {
    const all = ls.get(SAVED);
    if (all[p.id]) { delete all[p.id]; toast("저장함에서 뺐습니다."); } else { all[p.id] = p; toast("저장했습니다."); }
    ls.set(SAVED, all); renderSaved();
    if (!el.closest("#saved")) btn.textContent = all[p.id] ? "저장됨 ✓" : "저장";
  } else if (btn.dataset.act === "apa") {
    const text = apa(p);
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .then(() => toast("APA 인용문을 복사했습니다."))
      .catch(() => window.prompt("복사해서 사용하세요 (Ctrl+C)", text));
  }
});
document.addEventListener("change", (e) => {
  if (e.target.dataset.act !== "status") return;
  const id = e.target.closest(".card").dataset.id, n = ls.get(NOTES);
  n[id] = { ...n[id], status: e.target.value }; ls.set(NOTES, n);
});
document.addEventListener("input", (e) => {
  if (e.target.dataset.act === "memo") {
    const id = e.target.closest(".card").dataset.id, n = ls.get(NOTES);
    n[id] = { ...n[id], memo: e.target.value }; ls.set(NOTES, n);
  } else if (e.target.id === "q") {
    koQuery = ""; document.querySelectorAll(".chip").forEach((x) => x.classList.remove("on"));
  }
});
$("#form").addEventListener("submit", (e) => { e.preventDefault(); search(); });

/* 시작 */
$("#chips").innerHTML = CATEGORIES.map((c, i) => `<button type="button" class="chip" data-i="${i}">${esc(c.name)}</button>`).join("");
renderSaved();
