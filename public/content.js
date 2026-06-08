function searchEmailSenders(emails) {
  const email = emails.join(" OR ");

  const searchInput = document.querySelector("input[name='q']");
  const searchButton = document.querySelector("button[aria-label='Search mail']");

  if (!searchInput || !searchButton) {
    console.warn("Mailzap: Gmail search UI not found; skipping search.");
    return;
  }

  searchInput.value = `from:(${email})`;
  searchButton.click();
}

function getEmailAccount() {
  // Gmail's <title> looks like "Inbox (12) - user@gmail.com - Gmail".
  // Pick out the token that actually looks like an email address rather than
  // relying on a fixed split position, which breaks with localized titles.
  const title = document.querySelector("title")?.textContent ?? "";
  const match = title.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return match ? match[0] : null;
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SEARCH_EMAIL_SENDERS") {
    console.log("Received message to search email senders:", message.emails);
    searchEmailSenders(message.emails);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "GET_EMAIL_ACCOUNT") {
    sendResponse({ result: getEmailAccount() });
  }
});
