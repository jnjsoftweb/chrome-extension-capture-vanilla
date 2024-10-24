console.log("컨텐츠 스크립트가 로드되었습니다!");
// 여기에 웹 페이지에서 실행될 코드를 작성합니다

// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log("익스텐션이 설치되었습니다!");
});
