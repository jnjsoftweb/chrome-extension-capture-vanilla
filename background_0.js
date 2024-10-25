async function sendMessageToContentScript(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

async function injectContentScript(tabId) {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId: tabId },
        files: ["content.js"],
      },
      (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result);
        }
      }
    );
  });
}

async function captureFullPage(tab) {
  console.log("캡처 시작");

  try {
    await injectContentScript(tab.id);
    console.log("콘텐츠 스크립트 주입 완료");
  } catch (error) {
    console.error("콘텐츠 스크립트 주입 실패:", error);
    throw error;
  }

  const { scrollHeight, clientHeight } = await sendMessageToContentScript(tab.id, { action: "getScrollHeight" });
  const totalScrolls = Math.ceil(scrollHeight / clientHeight);

  console.log(`총 스크롤 횟수: ${totalScrolls}, 전체 높이: ${scrollHeight}, 클라이언트 높이: ${clientHeight}`);

  let fullPageCanvas = new OffscreenCanvas(tab.width, scrollHeight);
  let ctx = fullPageCanvas.getContext("2d");

  for (let i = 0; i < totalScrolls; i++) {
    await sendMessageToContentScript(tab.id, { action: "scrollToPosition", scrollY: i * clientHeight });

    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log(`캡처 중: ${i + 1}/${totalScrolls}`);
    let dataUrl = await new Promise((resolve) => {
      chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
        console.log("캡처된 이미지 URL 길이:", dataUrl.length);
        resolve(dataUrl);
      });
    });

    console.log("이미지 생성 중...");
    let img = await createImageBitmap(await (await fetch(dataUrl)).blob());
    console.log("이미지 생성 완료, 크기:", img.width, "x", img.height);

    ctx.drawImage(img, 0, i * clientHeight);
    console.log(`이미지 그리기 완료: ${i + 1}/${totalScrolls}`);
  }

  console.log("캔버스에 모든 이미지 그리기 완료");
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
    console.log("Blob 생성 완료, 크기:", blob.size);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `full-page-capture-${timestamp}.png`;

    // Blob을 ArrayBuffer로 변환
    const arrayBuffer = await blob.arrayBuffer();

    // ArrayBuffer를 base64 문자열로 변환
    const base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(arrayBuffer)));

    // data URL 생성
    const dataUrl = `data:image/png;base64,${base64}`;

    chrome.downloads.download(
      {
        url: dataUrl,
        filename: filename,
        saveAs: true,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("다운로드 오류:", chrome.runtime.lastError);
        } else {
          console.log("전체 페이지 캡처 완료. 다운로드 ID:", downloadId);
        }
      }
    );
  } catch (error) {
    console.error("캡처 중 오류 발생:", error);
    console.error("오류 스택:", error.stack);
  }
});
