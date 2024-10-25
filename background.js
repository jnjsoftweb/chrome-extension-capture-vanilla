async function executeContentScript(tabId, func, args = []) {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args,
  });
  return result;
}

async function captureFullPage(tab) {
  const { scrollHeight, clientHeight } = await executeContentScript(tab.id, () => window.pageCaptureFunctions.getScrollHeight());
  const totalScrolls = Math.ceil(scrollHeight / clientHeight);

  let fullPageCanvas = new OffscreenCanvas(tab.width, scrollHeight);
  let ctx = fullPageCanvas.getContext("2d");

  for (let i = 0; i < totalScrolls; i++) {
    await executeContentScript(tab.id, (scrollY) => window.pageCaptureFunctions.scrollToPosition(scrollY), [i * clientHeight]);

    // 스크롤 후 잠시 대기
    await new Promise((resolve) => setTimeout(resolve, 500));

    let dataUrl = await new Promise((resolve) => {
      chrome.tabs.captureVisibleTab(null, { format: "png" }, resolve);
    });

    let img = await createImageBitmap(await (await fetch(dataUrl)).blob());
    ctx.drawImage(img, 0, i * clientHeight);

    console.log(`캡처 진행: ${i + 1}/${totalScrolls}`);
  }

  console.log("전체 페이지 캡처 완료");
  return fullPageCanvas.convertToBlob();
}

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url.startsWith("chrome://")) {
    console.log("chrome:// URL에는 접근할 수 없습니다.");
    return;
  }

  console.log("전체 페이지 캡처 시도...");
  try {
    const blob = await captureFullPage(tab);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `full-page-capture-${timestamp}.png`;

    const url = URL.createObjectURL(blob);
    chrome.downloads.download(
      {
        url: url,
        filename: filename,
        saveAs: false,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("다운로드 오류:", chrome.runtime.lastError);
        } else {
          console.log("전체 페이지 캡처 완료. 다운로드 ID:", downloadId);
        }
        URL.revokeObjectURL(url);
      }
    );
  } catch (error) {
    console.error("캡처 중 오류 발생:", error);
  }
});
