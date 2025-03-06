chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    id: "findResearchPapers",
    title: "Find Research Papers",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "findResearchPapers") {
    const selectedText = info.selectionText;

    chrome.storage.local.set({ 'selectedText': selectedText });
    chrome.action.openPopup();
  }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getGoogleDocsSelection') {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      function: function() {
        const activeElement = document.activeElement;
        const selection = window.getSelection();
        const selectedRanges = [];
        for (let i = 0; i < selection.rangeCount; i++) {
          selectedRanges.push(selection.getRangeAt(i));
        }
        document.execCommand('copy');
        const textarea = document.createElement('textarea');
        textarea.style.position = 'fixed';
        textarea.style.top = 0;
        textarea.style.left = 0;
        textarea.style.width = '2em';
        textarea.style.height = '2em';
        textarea.style.opacity = 0;
        document.body.appendChild(textarea);
        textarea.focus();
        
        document.execCommand('paste');
        const selectedText = textarea.value;
        
        document.body.removeChild(textarea);
        
        selection.removeAllRanges();
        selectedRanges.forEach(range => selection.addRange(range));
        if (activeElement) activeElement.focus();
        
        return selectedText;
      }
    }, function(results) {
      if (results && results[0] && results[0].result) {
        chrome.tabs.sendMessage(sender.tab.id, {
          action: 'getSelectedTextFromDocs',
          selectedText: results[0].result
        });
      }
    });
  }
});