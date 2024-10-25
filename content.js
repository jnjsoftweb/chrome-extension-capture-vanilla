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

// 전역 스코프에 함수들을 노출
window.pageCaptureFunctions = {
  getScrollHeight,
  scrollToPosition,
};
