function getSelectedText() {
  const selection = window.getSelection();
  if (selection && selection.toString().trim() !== '') {
    chrome.storage.local.set({ 'selectedText': selection.toString().trim() });
    return selection.toString().trim();
  }
  return '';
}

document.addEventListener('mouseup', function() {
    getSelectedText();
});

document.addEventListener('keyup', function(e) {
  if (e.shiftKey && (e.key.includes('Arrow') || e.key === 'End' || e.key === 'Home')) {
    getSelectedText();
  }
});