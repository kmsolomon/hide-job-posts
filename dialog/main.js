// Clear the hide list in the popup
function clearList(includePlaceholder = false) {
  const companyList = document.getElementById("companyList");
  companyList.replaceChildren();

  if (includePlaceholder) {
    const placeholderLi = document.createElement("li");
    const placeholderText = document.createTextNode(
      "Currently no hidden companies."
    );

    placeholderLi.appendChild(placeholderText);
    companyList.appendChild(placeholderLi);
  }
}

// TODO -- sometimes not clearing placeholder when we add item to list
// Add a company to the hide list in the popup
function addToList(companyName) {
  const companyList = document.getElementById("companyList");
  const newCompanyLi = document.createElement("li");
  const newCompanyText = document.createElement("span");
  const newCompanyRemove = document.createElement("button", {
    type: "button",
    ariaLabel: `Remove ${companyName} from list`,
  });

  // Style & content for list item
  newCompanyText.className = "li-company-name";
  newCompanyText.textContent = companyName;

  // Style & content for the list item remove button
  newCompanyRemove.className = "btn";
  newCompanyRemove.appendChild(document.createTextNode("Remove"));
  newCompanyRemove.addEventListener("click", handleRemoveListItem);

  newCompanyLi.appendChild(newCompanyText);
  newCompanyLi.appendChild(newCompanyRemove);
  companyList.appendChild(newCompanyLi);
}

// Remove the given node from the hide list
function removeFromList(node) {
  const companyList = document.getElementById("companyList");
  companyList.removeChild(node);

  if (companyList.children.length === 0) {
    const placeholderLi = document.createElement("li");
    const placeholderText = document.createTextNode(
      "Currently no hidden companies."
    );

    placeholderLi.appendChild(placeholderText);
    companyList.appendChild(placeholderLi);
  }
}

// Remove the given company name from the local extension storage
async function removeFromStorage(companyName) {
  const storedNames = await browser.storage.local.get("companyNames");
  const currentNames = storedNames.companyNames;

  if (Array.isArray(currentNames) && currentNames.length > 0) {
    const filteredNames = currentNames.filter(
      (name) => name.toLowerCase() !== companyName.toLowerCase()
    );

    if (filteredNames.length < currentNames.length) {
      await browser.storage.local.set({ companyNames: filteredNames });
    }
  }
}

// Event handler -- For the button to remove a company name from the hide list
async function handleRemoveListItem(e) {
  const parentElement = this.parentElement;
  const companyName = parentElement.querySelector(".li-company-name").innerText; // should we switch this to innerText?
  removeFromList(parentElement);
  await removeFromStorage(companyName);
  const gettingActiveTab = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  if (Array.isArray(gettingActiveTab)) {
    browser.tabs.sendMessage(gettingActiveTab[0].id, {
      command: "showCompany",
      companyName: companyName,
    });
  }
}

async function hideStoredResults(storedNames) {
  const gettingActiveTab = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (Array.isArray(gettingActiveTab) && storedNames) {
    browser.tabs.sendMessage(gettingActiveTab[0].id, {
      command: "hideMultiple",
      names: storedNames,
    });
  }
}

function resetNameFieldError() {
  const companyNameInput = document.getElementById("companyName");
  const companyNameError = document.getElementById("companyNameError");
  companyNameError.replaceChildren();
  companyNameError.classList.push("hide");
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

function isValidCompanyName(nameInput, currentNamesArray) {
  let isValid = true;
  const lowercaseNames = currentNamesArray.map((element) =>
    element.toLowerCase()
  );

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
  const storedNames = await browser.storage.local.get("companyNames");
  const companyNameInput = document.getElementById("companyName");

  // todo, maybe add separate validation method for storenames.companyname since it happens in a few places
  if (isValidCompanyName(companyNameInput, storedNames.companyNames)) {
    const newName = companyNameInput.value;

    if (storedNames.companyNames.length === 0) {
      clearList();
    }

    const gettingActiveTab = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (Array.isArray(gettingActiveTab)) {
      browser.tabs.sendMessage(gettingActiveTab[0].id, {
        command: "hideCompany",
        companyName: newName,
      });
    }

    storedNames.companyNames.push(newName);
    browser.storage.local.set(storedNames);
    addToList(newName);
    companyNameInput.value = "";
  }
}

async function initializePopup() {
  const storedNames = await browser.storage.local.get("companyNames");
  const addButton = document.getElementById("addCompany");
  const resetButton = document.getElementById("resetList");
  const companyNameInput = document.getElementById("companyName");

  if (
    typeof storedNames === "object" &&
    !storedNames.hasOwnProperty("companyNames")
  ) {
    storedNames = { companyNames: [] };
  } else if (typeof storedNames !== "object") {
    console.log("Something went wrong");
    // TODO error
  }

  if (storedNames.companyNames && storedNames.companyNames.length > 0) {
    storedNames.companyNames.forEach((element) => {
      addToList(element);
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
    browser.storage.local.set({ companyNames: [] });
    clearList(true);

    const gettingActiveTab = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (Array.isArray(gettingActiveTab)) {
      console.log(gettingActiveTab[0].id);
      browser.tabs.sendMessage(gettingActiveTab[0].id, {
        command: "showAll",
      });
    }
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
    hideStoredResults(storedNames.companyNames); // todo, error handling
  }
}

browser.runtime.onMessage.addListener((message) => {
  if (message.command === "initHide") {
    initHidePostings();
  }
});

initializePopup();
