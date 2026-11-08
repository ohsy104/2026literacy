# 2026literacy# 논문 정리 보드

논문 목록을 한곳에 모아 검색하고, 원문·출처로 바로 이동하는 개인 웹페이지입니다. 서버 없이 GitHub Pages로 무료 배포됩니다.

## 파일 설명
- `index.html` 화면 / `style.css` 디자인 / `app.js` 동작
- `data/papers.json` **논문 데이터 (이 파일만 고치면 화면이 바뀝니다)**

## 논문 추가하는 법
1. `data/papers.json`을 엽니다.
2. `papers` 안의 예시 하나를 복사해 붙여 넣고 내용을 바꿉니다. 쉼표(,) 빠뜨리지 않게 주의하세요.
3. 예시를 지울 때는 `"isExample": true` 줄도 함께 지웁니다.
4. 저장 후 화면을 새로고침합니다.

| 필드 | 설명 |
|---|---|
| `similarity` | `very`(매우 유사) / `moderate`(적당히 유사) / `indirect`(간접 관련) |
| `language` | `en` 또는 `ko` (`ko`는 DBpia·RISS 검색 링크가 자동으로 붙습니다) |
| `pdfUrl` | 무료 원문 링크. 비워 두면 구글 스칼라·DBpia 검색 링크가 대신 나옵니다 |
| `sourceUrl`, `doi` | 출처 페이지, DOI. 카드 아래 출처 배너에 쓰입니다 |
| `citations` | 인용 수(숫자). 모르면 `null` |

**규칙:** 링크·DOI·저자·연도·인용 수는 직접 확인한 것만 적고, 모르면 비워 두세요(화면에 "확인 필요"로 표시됩니다). 논문 PDF 파일은 저장소에 올리지 말고 링크로만 연결하세요(저작권).

`comparison`(비교표)은 `paperId`에 논문의 `id`를 적어 연결합니다. `differentiation`은 제목과 내용을 적으면 카드로 나옵니다.

## 내 컴퓨터에서 미리보기
`index.html`을 더블클릭하면 JSON을 못 읽을 수 있습니다. VS Code에서 **Live Server** 확장을 설치하고 `index.html`에서 우클릭 → *Open with Live Server*를 사용하세요.

## GitHub Pages 배포
1. GitHub에서 새 저장소를 만들고(Public) 이 폴더의 파일을 모두 올립니다.
2. 저장소 **Settings → Pages**로 이동합니다.
3. *Build and deployment*에서 Source를 **Deploy from a branch**, Branch를 `main`, 폴더를 `/ (root)`로 선택하고 Save를 누릅니다.
4. 1~3분 뒤 `https://내아이디.github.io/저장소이름/` 주소로 접속됩니다.

## 알아두기
- 읽음 상태와 메모는 **사용 중인 브라우저에만** 저장됩니다. 다른 기기와는 공유되지 않고, 공개 저장소에도 올라가지 않습니다.
- 공개 저장소의 `papers.json`은 누구나 볼 수 있으니 미발표 연구 아이디어는 `differentiation`에 적기 전에 한 번 더 생각하세요.
