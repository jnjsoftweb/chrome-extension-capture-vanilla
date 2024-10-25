console.log("컨텐츠 스크립트가 로드되었습니다!");

function getScrollHeight() {
  return {
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
  };
}

function scrollToPosition(scrollY) {
  console.log(`스크롤 위치: ${scrollY}`);
  window.scrollTo(0, scrollY);
  return { scrolled: true };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("메시지 수신:", request);
  if (request.action === "getScrollHeight") {
    sendResponse(getScrollHeight());
  } else if (request.action === "scrollToPosition") {
    sendResponse(scrollToPosition(request.scrollY));
  }
  return true;
});
