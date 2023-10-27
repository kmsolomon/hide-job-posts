"use strict";

// Clear the hide list in the popup
function clearList(includePlaceholder = false) {
  const companyList = document.getElementById("companyTableBody");
  companyList.replaceChildren();

  if (includePlaceholder) {
    const placeholderRow = document.createElement("tr");
    const placeholderTextTd = document.createElement("td");
    const placeholderCountTd = document.createElement("td");
    const placeholderText = document.createTextNode("None yet.");

    placeholderTextTd.appendChild(placeholderText);
    placeholderRow.appendChild(placeholderTextTd);
    placeholderRow.appendChild(placeholderCountTd);
    placeholderRow.classList.add("empty-placeholder");

    companyList.appendChild(placeholderRow);
  }
}

// TODO -- sometimes not clearing placeholder when we add item to list
// Add a company to the hide list in the popup
function addToList(companyName, postsVisible, count = 0) {
  const companyList = document.getElementById("companyTableBody");
  const newCompanyRow = document.createElement("tr");
  const newCompanyNameTd = document.createElement("td");
  const newCompanyCountTd = document.createElement("td");
  const newCompanyText = document.createElement("span");
  const newCompanyCount = document.createElement("span");
  const newCompanyRemove = document.createElement("button", {
    type: "button",
    ariaLabel: `Remove ${companyName} from list`,
  });
  const newCompanyToggle = document.createElement("button", {
    type: "button",
  });

  // Style & content for list item
  newCompanyNameTd.className = "table-company-name";
  newCompanyText.textContent = companyName;
  newCompanyCountTd.className = "table-company-count";
  newCompanyCount.textContent = count;

  // Style & content for the list item remove button
  newCompanyRemove.className = "btn";
  newCompanyRemove.appendChild(document.createTextNode("Remove"));
  newCompanyRemove.addEventListener("click", handleRemoveListItem);

  // Style & content for the list item toggle button
  newCompanyToggle.className = "btn";
  if (postsVisible) {
    newCompanyToggle.classList.add("visible");
    newCompanyToggle.appendChild(document.createTextNode("Hide"));
  } else {
    newCompanyToggle.appendChild(document.createTextNode("Show"));
  }

  newCompanyToggle.addEventListener("click", handleToggleVisibility);

  newCompanyNameTd.appendChild(newCompanyText);
  newCompanyNameTd.appendChild(newCompanyToggle);
  newCompanyNameTd.appendChild(newCompanyRemove);
  newCompanyCountTd.appendChild(newCompanyCount);
  newCompanyRow.appendChild(newCompanyNameTd);
  newCompanyRow.appendChild(newCompanyCountTd);
  companyList.appendChild(newCompanyRow);
}

// Remove the given node from the hide list
function removeFromList(node) {
  const companyList = document.getElementById("companyTableBody");
  companyList.removeChild(node);

  if (companyList.children.length === 0) {
    const placeholderRow = document.createElement("tr");
    const placeholderTextTd = document.createElement("td");
    const placeholderCountTd = document.createElement("td");
    const placeholderText = document.createTextNode("None yet.");

    placeholderTextTd.appendChild(placeholderText);
    placeholderRow.appendChild(placeholderTextTd);
    placeholderRow.appendChild(placeholderCountTd);
    placeholderRow.classList.add("empty-placeholder");

    companyList.appendChild(placeholderRow);
  }
}

// -- Potential refactor, switching updateUICount + UpdateUICountMultiple into one function
function updateUICount(companyName, updatedCount) {
  const companyList = document.getElementById("companyTableBody");
  if (companyList) {
    for (const row of companyList.childNodes) {
      const name = row.querySelector(".table-company-name span");
      if (name.innerText === companyName) {
        const countSpan = row.querySelector(".table-company-count span");
        countSpan.innerText = updatedCount;
      }
    }
  }
}

function updateUICountMultiple(updateMap) {
  const companyList = document.getElementById("companyTableBody");
  if (companyList) {
    for (const row of companyList.childNodes) {
      const name = row.querySelector(".table-company-name span");
      if (typeof updateMap.get(name.innerText.toLowerCase()) !== "undefined") {
        const countSpan = row.querySelector(".table-company-count span");
        countSpan.innerText = updateMap.get(name.innerText.toLowerCase());
      }
    }
  }
}

// Event handler -- For the button to remove a company name from the hide list
async function handleRemoveListItem(e) {
  const parentRow = e.target.closest("tr");
  const companyName = parentRow.querySelector(
    ".table-company-name span"
  ).innerText;

  removeFromList(parentRow);
  // Send message to the background script to handle removing from storage
  // & background script will send message to the content script to show items
  browser.runtime.sendMessage({
    command: "removeCompany",
    companyName: companyName,
  });
}

function handleToggleVisibility(e) {
  const parentElement = this.parentElement;
  const companyName = parentElement.querySelector(
    ".table-company-name span"
  ).innerText;
  //toggleStorageVisibility(companyName);

  // todo probably UI stuff here to change aria-label and button icon
  const button = e.target;
  if (button.classList.contains("visible")) {
    button.classList.remove("visible");
    button.innerText = "Show";
    button.ariaLabel = `Show postings from ${companyName}`;
  } else {
    button.classList.add("visible");
    button.innerText = "Hide";
    button.ariaLabel = `Hide postings from ${companyName}`;
  }

  // send message to the background script to update the visibility property in storage
  // background script will also send message script to the content script to toggle the in-page visibility
  browser.runtime.sendMessage({
    command: "toggleCompanyVisibility",
    companyName: companyName,
  });
}

function resetNameFieldError() {
  const companyNameInput = document.getElementById("companyName");
  const companyNameError = document.getElementById("companyNameError");
  companyNameError.replaceChildren();
  companyNameError.classList.add("hide");
  companyNameInput.classList.remove("input-error");
  companyNameInput.removeAttribute("aria-describedby");
}

function setNameFieldError(errorType) {
  const companyNameInput = document.getElementById("companyName");
  const companyNameError = document.getElementById("companyNameError");

  if (errorType === "duplicate") {
    companyNameError.innerText =
      "Error: The value you entered is already in the list.";
  } else if (errorType === "empty") {
    companyNameError.innerText = "Error: The company name cannot be blank";
  } else {
    console.log(
      `Unexpected error type for the company name input field: ${errorType}`
    );
    return;
  }

  companyNameInput.setAttribute("aria-describedby", "companyNameError");
  companyNameInput.classList.add("input-error");
  companyNameError.classList.remove("hide");
}

function isValidCompanyName(nameInput) {
  const companyList = document.getElementById("companyTableBody");
  const lowercaseNames = [];
  let isValid = true;

  for (const row of companyList.childNodes) {
    const name = row.querySelector(".table-company-name span");
    if (name) {
      lowercaseNames.push(name.innerText.toLowerCase());
    }
  }

  if (typeof nameInput === "undefined" || nameInput === null) {
    isValid = false;
  } else if (nameInput.value === "") {
    setNameFieldError("empty");
    isValid = false;
  } else if (lowercaseNames.includes(nameInput.value.toLowerCase())) {
    setNameFieldError("duplicate");
    isValid = false;
  }

  return isValid;
}

async function addCompanyHandler(event) {
  const companyNameInput = document.getElementById("companyName");

  if (isValidCompanyName(companyNameInput)) {
    const newName = companyNameInput.value;
    const placeholder = document.querySelector(".empty-placeholder");

    if (placeholder) {
      // clearing the placeholder text
      clearList();
    }

    addToList(newName, false);
    companyNameInput.value = "";

    // Send message to the background script to add the company to extension storage
    browser.runtime.sendMessage({
      command: "addCompany",
      companyName: newName,
    });
  }
}

// TODO -- need to consider how to handle re-renders when the popup is open and you scroll the results (potentially updating the hidden count)
async function initializePopup() {
  let storedNames = await browser.storage.local.get("companyNames");
  const addButton = document.getElementById("addCompany");
  const resetButton = document.getElementById("resetList");
  const companyNameInput = document.getElementById("companyName");
  if (
    typeof storedNames === "object" &&
    !storedNames.hasOwnProperty("companyNames")
  ) {
    storedNames = { companyNames: [] };
    await browser.storage.local.set({ companyNames: [] });
  } else if (typeof storedNames !== "object") {
    console.log("Something went wrong");
    // TODO error
  }

  if (storedNames.companyNames && storedNames.companyNames.length > 0) {
    storedNames.companyNames.forEach((element) => {
      addToList(element.name, element.visible, element.numPosts);
    });
  } else if (
    storedNames.companyNames &&
    storedNames.companyNames.length === 0
  ) {
    clearList(true);
  }

  addButton.addEventListener("click", addCompanyHandler);

  companyNameInput.addEventListener("keydown", async (e) => {
    if (e.code.toLowerCase() === "enter") {
      await addCompanyHandler(e);
    }
  });

  resetButton.addEventListener("click", async (e) => {
    clearList(true);

    browser.runtime.sendMessage({ command: "emptyStorage" });
  });
}

function reportExecuteScriptError(error) {
  document.querySelector("#popup-content").classList.add("hidden");
  document.querySelector("#error-content").classList.remove("hidden");
  console.error(
    `Failed to execute hide-job-postings content script: ${error.message}`
  );
}

async function initHidePostings() {
  const storedNames = await browser.storage.local.get("companyNames");
  if (
    typeof storedNames.companyNames !== "undefined" &&
    Array.isArray(storedNames.companyNames) &&
    storedNames.companyNames.length > 0
  ) {
    const hiddenCompanies = storedNames.companyNames.filter(
      (company) => !company.visible
    );
    const names = hiddenCompanies.map((company) => company.name);
    hideStoredResults(names); // todo, error handling
  }
}

function onStorageChange(changes, area) {
  if (area === "local" && changes.hasOwnProperty("companyNames")) {
    const oldValues = changes.companyNames.oldValue;
    const newValues = changes.companyNames.newValue;
    const countUpdates = new Map();

    // Looking for when the numPosts have updated
    if (oldValues.length === newValues.length) {
      for (let i = 0; i < oldValues.length; i++) {
        if (
          oldValues[i].name === newValues[i].name &&
          oldValues[i].numPosts !== newValues[i].numPosts
        ) {
          countUpdates.set(newValues[i].name, newValues[i].numPosts);
        }
      }

      if (countUpdates.size > 0) {
        updateUICountMultiple(countUpdates);
      }
    }
  }
}

// Listening to when the browser storage updates so the popup knows to update the UI
browser.storage.onChanged.addListener(onStorageChange);

initializePopup();
