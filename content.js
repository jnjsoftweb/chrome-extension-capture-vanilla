console.log("컨텐츠 스크립트가 로드되었습니다!");

function getPageDimensions() {
  const body = document.body;
  const html = document.documentElement;

  const scrollWidth = Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth);
  const scrollHeight = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);

  return {
    scrollWidth,
    scrollHeight,
    clientHeight: window.innerHeight,
    clientWidth: window.innerWidth,
  };
}

function scrollToPosition(scrollY) {
  console.log(`스크롤 위치: ${scrollY}`);
  window.scrollTo(0, scrollY);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ scrolled: true });
    }, 1000);
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("메시지 수신:", request);
  if (request.action === "getPageDimensions") {
    sendResponse(getPageDimensions());
  } else if (request.action === "scrollToPosition") {
    scrollToPosition(request.scrollY).then(sendResponse);
    return true; // 비동기 응답을 위해 true 반환
  }
  return true;
});
