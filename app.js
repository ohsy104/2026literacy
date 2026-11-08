"use strict";
const $ = (s) => document.querySelector(s);
const SIM = { very: "매우 유사", moderate: "적당히 유사", indirect: "간접 관련" };
const SIM_RANK = { very: 0, moderate: 1, indirect: 2 };
const STATUS = { none: "안 읽음", reading: "읽는 중", done: "읽음" };
const CHECK = "확인 필요";
let DATA = { meta: {}, papers: [], comparison: [], differentiation: [] };

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : "");
const enc = encodeURIComponent;

/* 브라우저 저장소 (읽음 상태·메모) */
const store = {
  get() { try { return JSON.parse(localStorage.getItem("paperBoard") || "{}"); } catch { return {}; } },
  set(id, patch) {
    try { const all = this.get(); all[id] = { ...all[id], ...patch }; localStorage.setItem("paperBoard", JSON.stringify(all)); }
    catch { toast("이 브라우저에서는 저장이 막혀 있습니다."); }
  },
};

function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 1800);
}

/* APA 7판 인용문 */
function apaAuthors(list) {
  const names = (list || []).filter((a) => a && a !== CHECK).map((a) => {
    const p = a.trim().split(/\s+/);
    if (p.length < 2 || /[가-힣]/.test(a)) return a.trim();
    return p[p.length - 1] + ", " + p.slice(0, -1).map((x) => x[0].toUpperCase() + ".").join(" ");
  });
  if (!names.length) return CHECK;
  if (names.length === 1) return names[0];
  if (names.length <= 20) return names.slice(0, -1).join(", ") + ", & " + names[names.length - 1];
  return names.slice(0, 19).join(", ") + ", ... " + names[names.length - 1];
}
function apa(p) {
  const doi = p.doi ? (p.doi.startsWith("http") ? p.doi : "https://doi.org/" + p.doi) : (p.sourceUrl || "");
  return `${apaAuthors(p.authors)} (${p.year || "n.d."}). ${p.titleOriginal}. ${p.venue && p.venue !== CHECK ? p.venue + "." : ""} ${doi}`.replace(/\s+/g, " ").trim();
}

/* 카드 */
function searchLinks(p) {
  const q = enc(p.titleOriginal.replace(/^\(예시\)\s*/, ""));
  const links = [];
  if (p.language !== "ko") links.push(["구글 스칼라", `https://scholar.google.com/scholar?q=${q}`]);
  links.push(["DBpia", `https://www.dbpia.co.kr/search/topSearch?searchOption=all&query=${q}`]);
  if (p.language === "ko") links.push(["RISS", `https://www.riss.kr/search/Search.do?query=${q}`], ["구글 스칼라", `https://scholar.google.com/scholar?q=${q}`]);
  return links;
}
function sourceBanner(p) {
  const doiUrl = p.doi ? (p.doi.startsWith("http") ? p.doi : "https://doi.org/" + p.doi) : "";
  const parts = [esc(p.venue || CHECK), esc(p.year || CHECK)];
  if (safeUrl(doiUrl)) parts.push(`<a href="${esc(doiUrl)}" target="_blank" rel="noopener noreferrer">DOI 링크</a>`);
  else if (safeUrl(p.sourceUrl)) parts.push(`<a href="${esc(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">출처 페이지</a>`);
  else parts.push("링크 " + CHECK);
  return "출처: " + parts.join(" / ");
}
function card(p) {
  const my = store.get()[p.id] || {};
  const pdf = safeUrl(p.pdfUrl), src = safeUrl(p.sourceUrl) || safeUrl(p.doi ? (p.doi.startsWith("http") ? p.doi : "https://doi.org/" + p.doi) : "");
  const s = p.summary || {};
  const fb = !pdf || p.language === "ko"
    ? `<div class="fallback">원문 검색:${searchLinks(p).map(([n, u]) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${n}</a>`).join("")}</div>` : "";
  return `<article class="card" data-id="${esc(p.id)}">
    <span class="tag ${esc(p.similarity)}">${SIM[p.similarity] || CHECK}</span>${p.isExample ? '<span class="tag ex">예시</span>' : ""}
    <h2>${esc(p.titleOriginal)}</h2>
    ${p.titleKo ? `<p class="ko">${esc(p.titleKo)}</p>` : ""}
    <div class="meta"><span>${esc(p.year || CHECK)}</span><span>${esc((p.authors || []).join("; ") || CHECK)}</span><span>인용 ${p.citations == null ? CHECK : esc(p.citations) + "회"}</span></div>
    <div class="actions">
      ${pdf ? `<a class="btn primary" href="${esc(pdf)}" target="_blank" rel="noopener noreferrer">PDF 읽기 ↗</a>` : `<span class="btn off" aria-disabled="true">PDF 없음</span>`}
      ${src ? `<a class="btn" href="${esc(src)}" target="_blank" rel="noopener noreferrer">출처 확인 ↗</a>` : `<span class="btn off" aria-disabled="true">출처 ${CHECK}</span>`}
      <button class="btn" data-act="apa">APA 인용 복사</button>
      <button class="btn more" data-act="more" aria-expanded="false">연구 내용 자세히 보기 +</button>
    </div>
    ${fb}
    <dl class="detail" hidden>
      <div><dt>연구 대상</dt><dd>${esc(s.subject || CHECK)}</dd></div>
      <div><dt>연구 방법</dt><dd>${esc(s.method || CHECK)}</dd></div>
      <div><dt>핵심 결과</dt><dd>${esc(s.result || CHECK)}</dd></div>
      <div><dt>내 연구와의 관련성</dt><dd>${esc(s.relevance || CHECK)}</dd></div>
    </dl>
    <div class="mine">
      <select data-act="status" aria-label="읽음 상태">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${(my.status || "none") === k ? " selected" : ""}>${v}</option>`).join("")}</select>
      <textarea data-act="memo" placeholder="개인 메모 (이 브라우저에만 저장됩니다)" aria-label="메모">${esc(my.memo || "")}</textarea>
    </div>
    <div class="source">${sourceBanner(p)}</div>
  </article>`;
}

/* 목록: 검색·필터·정렬 */
function renderList() {
  const q = $("#q").value.trim().toLowerCase(), sim = $("#sim").value, sort = $("#sort").value;
  let list = DATA.papers.filter((p) => {
    if (sim !== "all" && p.similarity !== sim) return false;
    if (!q) return true;
    const s = p.summary || {};
    return [p.titleOriginal, p.titleKo, (p.authors || []).join(" "), s.subject, s.method, s.result, s.relevance].join(" ").toLowerCase().includes(q);
  });
  list.sort((a, b) =>
    sort === "year" ? (b.year || 0) - (a.year || 0)
    : sort === "cite" ? (b.citations || 0) - (a.citations || 0)
    : (SIM_RANK[a.similarity] ?? 9) - (SIM_RANK[b.similarity] ?? 9) || (b.year || 0) - (a.year || 0));
  $("#count").textContent = `전체 ${DATA.papers.length}편 중 ${list.length}편`;
  $("#cards").innerHTML = list.length ? list.map(card).join("") : '<div class="empty">조건에 맞는 논문이 없습니다. 검색어나 필터를 바꿔 보세요.</div>';
}

function renderCompare() {
  const rows = DATA.comparison.map((c) => {
    const p = DATA.papers.find((x) => x.id === c.paperId);
    return `<tr><td>${esc(p ? p.titleOriginal : c.paperId)}</td><td>${esc(c.grade || CHECK)}</td><td>${esc(c.tool || CHECK)}</td><td>${esc(c.method || CHECK)}</td><td>${esc(c.ctMeasure || CHECK)}</td><td>${esc(c.limitation || CHECK)}</td></tr>`;
  }).join("");
  $("#panel-compare").innerHTML = rows
    ? `<div class="tablewrap"><table><thead><tr><th>논문</th><th>대상 학년</th><th>사용 도구</th><th>연구 방법</th><th>비판적 사고 측정</th><th>한계</th></tr></thead><tbody>${rows}</tbody></table></div>`
    : '<div class="empty">papers.json의 comparison에 논문을 추가하면 비교표가 만들어집니다.</div>';
}
function renderDiff() {
  $("#panel-diff").innerHTML = DATA.differentiation.length
    ? DATA.differentiation.map((d) => `<article class="card"><h2>${esc(d.title)}</h2><p>${esc(d.content)}</p></article>`).join("")
    : '<div class="empty">papers.json의 differentiation에 내용을 추가해 주세요.</div>';
}

/* 이벤트 */
document.addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (tab) {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t === tab));
    for (const k of ["list", "compare", "diff"]) $("#panel-" + k).hidden = k !== tab.dataset.tab;
    return;
  }
  const btn = e.target.closest("[data-act]"); if (!btn) return;
  const el = btn.closest(".card"), p = DATA.papers.find((x) => x.id === el?.dataset.id);
  if (btn.dataset.act === "more") {
    const d = el.querySelector(".detail"), open = d.hidden;
    d.hidden = !open; btn.setAttribute("aria-expanded", open);
    btn.textContent = open ? "접기 −" : "연구 내용 자세히 보기 +";
  } else if (btn.dataset.act === "apa" && p) {
    const text = apa(p);
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .then(() => toast("APA 인용문을 복사했습니다."))
      .catch(() => window.prompt("복사해서 사용하세요 (Ctrl+C)", text));
  }
});
document.addEventListener("change", (e) => {
  if (e.target.dataset.act === "status") store.set(e.target.closest(".card").dataset.id, { status: e.target.value });
});
document.addEventListener("input", (e) => {
  if (e.target.dataset.act === "memo") store.set(e.target.closest(".card").dataset.id, { memo: e.target.value });
});
["#q", "#sim", "#sort"].forEach((s) => $(s).addEventListener("input", renderList));

/* 시작 */
fetch("data/papers.json")
  .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then((d) => {
    DATA = { meta: d.meta || {}, papers: d.papers || [], comparison: d.comparison || [], differentiation: d.differentiation || [] };
    $("#title").textContent = DATA.meta.title || "논문 정리 보드";
    document.title = DATA.meta.title || "논문 정리 보드";
    $("#desc").textContent = DATA.meta.description || "";
    $("#b-list").textContent = DATA.papers.length + "편";
    $("#b-compare").textContent = DATA.comparison.length + "편";
    $("#b-diff").textContent = DATA.differentiation.length + "개";
    renderList(); renderCompare(); renderDiff();
  })
  .catch(() => {
    $("#cards").innerHTML = '<div class="empty">data/papers.json을 불러오지 못했습니다.<br>파일을 더블클릭해서 연 경우 브라우저가 막을 수 있습니다. VS Code의 Live Server로 열거나 GitHub Pages 주소로 확인하세요.</div>';
  });
