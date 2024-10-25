chrome.action.onClicked.addListener((tab) => {
  if (tab.url.startsWith("chrome://")) {
    console.log("chrome:// URL에는 접근할 수 없습니다.");
    return;
  }

  console.log("캡처 시도...");
  chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `capture-${timestamp}.png`;

    chrome.downloads.download(
      {
        url: dataUrl,
        filename: filename,
        saveAs: false,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("다운로드 오류:", chrome.runtime.lastError);
        } else {
          console.log("캡처 완료. 다운로드 ID:", downloadId);
        }
      }
    );
  });
});
