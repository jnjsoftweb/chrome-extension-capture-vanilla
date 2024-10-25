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

  const { scrollWidth, scrollHeight, clientHeight, clientWidth } = await sendMessageToContentScript(tab.id, { action: "getPageDimensions" });
  const totalScrolls = Math.ceil(scrollHeight / clientHeight);

  console.log(
    `총 스크롤 횟수: ${totalScrolls}, 전체 높이: ${scrollHeight}, 전체 너비: ${scrollWidth}, 클라이언트 높이: ${clientHeight}, 클라이언트 너비: ${clientWidth}`
  );

  let captures = [];
  const overlap = 100; // 오버랩 픽셀 수 증가

  for (let i = 0; i < totalScrolls; i++) {
    const scrollY = i * (clientHeight - overlap);
    await sendMessageToContentScript(tab.id, { action: "scrollToPosition", scrollY });

    // 스크롤 후 페이지가 렌더링될 때까지 기다립니다.
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log(`캡처 중: ${i + 1}/${totalScrolls}, 스크롤 위치: ${scrollY}`);
    let dataUrl = await new Promise((resolve) => {
      chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" }, (dataUrl) => {
        console.log("캡처된 이미지 URL 길이:", dataUrl ? dataUrl.length : "undefined");
        resolve(dataUrl);
      });
    });

    captures.push({ dataUrl, scrollY });
  }

  // 스크롤을 원래 위치로 되돌립니다.
  await sendMessageToContentScript(tab.id, { action: "scrollToPosition", scrollY: 0 });

  console.log("모든 캡처 완료");
  return captures;
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function createFullPageImage(captures) {
  // 전체 높이 계산
  let totalHeight = 0;
  let maxWidth = 0;
  const images = await Promise.all(
    captures.map(async (capture) => {
      const img = await createImageBitmap(await (await fetch(capture.dataUrl)).blob());
      totalHeight += img.height;
      maxWidth = Math.max(maxWidth, img.width);
      return img;
    })
  );

  let fullPageCanvas = new OffscreenCanvas(maxWidth, totalHeight);
  let ctx = fullPageCanvas.getContext("2d");

  let currentY = 0;
  for (let img of images) {
    ctx.drawImage(img, 0, currentY);
    currentY += img.height;
  }

  console.log(`최종 이미지 크기: ${maxWidth}x${totalHeight}`);
  return fullPageCanvas.convertToBlob();
}

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url.startsWith("chrome://")) {
    console.log("chrome:// URL에는 접근할 수 없습니다.");
    return;
  }

  console.log("전체 페이지 캡처 시도...");
  try {
    const captures = await captureFullPage(tab);
    console.log("캡처 완료, 총 이미지 수:", captures.length);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    // 개별 이미지 저장
    for (let i = 0; i < captures.length; i++) {
      const filename = `full-page-capture-${timestamp}-part${i + 1}.png`;

      chrome.downloads.download(
        {
          url: captures[i].dataUrl,
          filename: filename,
          saveAs: false,
        },
        (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error(`다운로드 오류 (part ${i + 1}):`, chrome.runtime.lastError);
          } else {
            console.log(`캡처 이미지 저장 완료 (part ${i + 1}). 다운로드 ID:`, downloadId);
          }
        }
      );
    }

    // 전체 이미지 생성 및 저장
    console.log("전체 이미지 생성 시작...");
    const fullPageBlob = await createFullPageImage(captures);
    console.log("전체 이미지 생성 완료, 크기:", fullPageBlob.size);

    const fullPageFilename = `full-page-capture-${timestamp}-full.png`;

    // Blob을 ArrayBuffer로 변환
    const arrayBuffer = await fullPageBlob.arrayBuffer();

    // ArrayBuffer를 base64 문자열로 변환
    const base64 = arrayBufferToBase64(arrayBuffer);

    // data URL 생성
    const dataUrl = `data:image/png;base64,${base64}`;

    chrome.downloads.download(
      {
        url: dataUrl,
        filename: fullPageFilename,
        saveAs: false,
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error("전체 이미지 다운로드 오류:", chrome.runtime.lastError);
        } else {
          console.log("전체 이미지 저장 완료. 다운로드 ID:", downloadId);
        }
      }
    );

    console.log("모든 캡처 이미지 및 전체 이미지 저장 요청 완료");
  } catch (error) {
    console.error("캡처 중 오류 발생:", error);
    console.error("오류 스택:", error.stack);
  }
});
