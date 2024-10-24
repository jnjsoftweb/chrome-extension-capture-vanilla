document.getElementById("changeColor").addEventListener("click", async () => {
  console.log("버튼이 클릭되었습니다.");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log("현재 탭:", tab);

    if (!tab?.id) {
      console.log("유효한 탭 ID를 찾을 수 없습니다.");
      return;
    }

    if (tab.url.startsWith("chrome://")) {
      console.log("chrome:// URL에는 접근할 수 없습니다.");
      alert("이 페이지에서는 배경색을 변경할 수 없습니다. 일반 웹 페이지에서 시도해 주세요.");
      return;
    }

    console.log("스크립트 실행 시도...");
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: changeBackgroundColor,
    });
    console.log("스크립트 실행 결과:", result);
  } catch (err) {
    console.error("오류 발생:", err);
    console.error("오류 스택:", err.stack);
  }
});

function changeBackgroundColor() {
  console.log("페이지에서 스크립트가 실행되었습니다.");
  const newColor = "#" + Math.floor(Math.random() * 16777215).toString(16);
  document.body.style.backgroundColor = newColor;
  document.documentElement.style.backgroundColor = newColor;

  // 모든 직계 자식 요소의 배경색도 변경
  const children = document.body.children;
  for (let i = 0; i < children.length; i++) {
    children[i].style.backgroundColor = newColor;
  }

  console.log("배경색이 변경되었습니다:", newColor);
  return "배경색 변경 완료: " + newColor;
}

document.getElementById("captureButton").addEventListener("click", async () => {
  console.log("캡처 버튼이 클릭되었습니다.");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log("현재 탭:", tab);

    if (!tab?.id) {
      console.log("유효한 탭 ID를 찾을 수 없습니다.");
      return;
    }

    if (tab.url.startsWith("chrome://")) {
      console.log("chrome:// URL에는 접근할 수 없습니다.");
      alert("이 페이지는 캡처할 수 없습니다. 일반 웹 페이지에서 시도해 주세요.");
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
          saveAs: true,
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
  } catch (err) {
    console.error("오류 발생:", err);
    console.error("오류 스택:", err.stack);
  }
});
