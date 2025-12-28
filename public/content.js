function searchEmailSenders(emails) {
  // Concatenate emails
  const email = emails.join(" OR ");

  // Get the search input element
  const searchInput = document.querySelector("input[name='q']");

  // Set the search input value to the email address
  searchInput.value = `from:(${email})`;

  // Submit the search form
  document.querySelector("button[aria-label='Search mail']").click();
}

function getEmailAccount() {
  // Get the email account from the page
  const title = document.querySelector("title").textContent;
  return title.split(" - ")[1].trim();
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SEARCH_EMAIL_SENDERS") {
    console.log("Received message to search email senders:", message.emails);
    searchEmailSenders(message.emails);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "GET_EMAIL_ACCOUNT") {
    const value = getEmailAccount();
    sendResponse({ result: value });
  }
});
