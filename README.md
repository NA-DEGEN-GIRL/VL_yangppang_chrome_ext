# Lighter & Variational 헤지 거래 보조 확장 프로그램

Lighter와 Variational 거래소에서 동시에 반대 포지션(헤지) 주문을 실행하여 수동 거래의 번거로움을 줄이고 빠른 실행을 돕는 Chrome 확장 프로그램입니다.

## 🎯 목표 (Goal)

두 거래소 간의 가격 차이를 이용하는 차익 거래 또는 페어 트레이딩 전략을 구사할 때, 클릭 한 번으로 Lighter에서는 Long(매수), Variational에서는 Short(매도)와 같이 반대 주문을 동시에 실행하는 것을 목표로 합니다.

## ✨ 주요 기능 (Key Features)

-   **단일 수량 입력**: 한 번의 입력으로 두 거래소에 동일한 주문 수량을 설정합니다.
-   **원클릭 포지션 설정**: `L-Buy, V-Sell` / `L-Sell, V-Buy` 버튼으로 매수/매도 방향을 동시에 지정합니다.
-   **동시 주문 실행**: `Submit Order` 버튼으로 두 거래소에 주문을 동시에 제출합니다.
-   **거래 페어 변경**: 코인 심볼(e.g., ETH, SOL)을 입력하고 `Set` 버튼을 누르면, 열려 있는 두 거래소의 거래 페이지를 해당 코인 페어로 동시에 변경(새로고침)합니다.

## 📂 프로젝트 구조 (Project Structure)

```
/
├── manifest.json
├── popup.html
├── popup.js
├── background.js
├── lighter.js
├── variational.js
└── images/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

-   `manifest.json`: 확장 프로그램의 설정 파일 (권한, 스크립트 등 정의)
-   `popup.html`: 확장 프로그램 아이콘 클릭 시 나타나는 UI
-   `popup.js`: `popup.html`의 사용자 인터페이스 로직 처리
-   `background.js`: 탭 검색, 스크립트 주입 등 백그라운드 작업 수행
-   `lighter.js`: Lighter 거래소 페이지에 주입되어 DOM을 조작하는 스크립트
-   `variational.js`: Variational 거래소 페이지에 주입되어 DOM을 조작하는 스크립트

## 🚀 설치 및 사용 방법 (Installation & Usage)

1.  이 프로젝트의 모든 파일들을 로컬 컴퓨터의 한 폴더 (예: `hedge-trader`)에 저장합니다.
2.  Chrome 브라우저에서 주소창에 `chrome://extensions` 를 입력하여 확장 프로그램 관리 페이지로 이동합니다.
3.  페이지 우측 상단의 **'개발자 모드(Developer mode)'**를 활성화합니다.
4.  좌측 상단의 **'압축해제된 확장 프로그램을 로드합니다(Load unpacked)'** 버튼을 클릭합니다.
5.  1번 단계에서 저장한 `hedge-trader` 폴더를 선택합니다.
6.  설치가 완료되면 브라우저 툴바에 확장 프로그램 아이콘이 나타납니다. (필요시 고정)
7.  Lighter와 Variational 거래소 탭을 각각 **하나씩만** 열어둡니다.
8.  확장 프로그램 아이콘을 클릭하고 원하는 수량과 포지션을 설정한 후 주문을 실행합니다.

## ⚠️ 매우 중요한 주의사항: 선택자(Selector) 업데이트

이 확장 프로그램은 **웹사이트의 HTML 구조**에 의존하여 동작합니다. 즉, Lighter 또는 Variational 거래소 웹사이트가 업데이트되어 HTML 구조(id, class 등)가 변경되면 확장 프로그램이 **정상적으로 동작하지 않을 수 있습니다.**

문제가 발생할 경우, `lighter.js`와 `variational.js` 파일 내의 `document.querySelector(...)` 부분을 수정해야 합니다.

**수정 방법:**
1.  해당 거래소 페이지에서 `F12` 키를 눌러 개발자 도구를 엽니다.
2.  개발자 도구 좌상단의 요소 선택 아이콘(화살표 모양)을 클릭하여 수량 입력창, 매수/매도 버튼 등을 선택합니다.
3.  해당 요소의 고유한 속성(예: `data-testid`, `id`, `class`)을 찾아 `.js` 파일의 선택자를 업데이트합니다.

## 📜 라이선스 (License)

이 프로젝트는 MIT 라이선스를 따릅니다.