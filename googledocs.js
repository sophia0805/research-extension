function getGoogleDocsSelectedText() {
    const editorContainer = document.querySelector('.kix-appview-editor');
    
    if (!editorContainer) return '';
    const selectedElements = document.querySelectorAll('.kix-selection-overlay');
    if (selectedElements.length === 0) return '';
    chrome.runtime.sendMessage({ action: 'getGoogleDocsSelection' });
    return '';
}

let observer;

function setupGoogleDocsObserver() {
    if (window.location.href.includes('docs.google.com')) {
        const editorContainer = document.querySelector('.kix-appview-editor');
        
        if (editorContainer) {
        observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' || mutation.type === 'subtree') {
                getGoogleDocsSelectedText();
            }
            });
        });
        
        observer.observe(editorContainer, { 
            childList: true, 
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
        }
    }
}

window.addEventListener('load', setupGoogleDocsObserver);

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'getSelectedTextFromDocs') {
    if (request.selectedText) {
      chrome.storage.local.set({ 'selectedText': request.selectedText });
    }
  }
});