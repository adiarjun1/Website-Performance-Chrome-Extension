chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'performanceData') {
      console.log(message.data);
      chrome.storage.local.set({ [sender.tab.id]: message.data }, () => {
          sendResponse({ status: 'success' });
      });
      return true; // Keeps the sendResponse callback valid for asynchronous use
  } else if (message.type === 'updateSettings') {
      chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
              chrome.tabs.sendMessage(tab.id, { type: 'updateSettings' });
          });
      });
  }
});
