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
function addToList(companyName, postsVisible) {
  const companyList = document.getElementById("companyList");
  const newCompanyLi = document.createElement("li");
  const newCompanyText = document.createElement("span");
  const newCompanyRemove = document.createElement("button", {
    type: "button",
    ariaLabel: `Remove ${companyName} from list`,
  });
  const newCompanyToggle = document.createElement("button", {
    type: "button",
  });

  // Style & content for list item
  newCompanyText.className = "li-company-name";
  newCompanyText.textContent = companyName;

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

  newCompanyLi.appendChild(newCompanyText);
  newCompanyLi.appendChild(newCompanyToggle);
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

// changing companyNames to an array of company

// companyNames: [{
//   name: string,
//   total: number,
//   show: boolean
// }]

// Remove the given company name from the local extension storage
async function removeFromStorage(companyName) {
  const storedCompanies = await browser.storage.local.get("companyNames");
  const currentCompanies = storedCompanies.companyNames;

  if (Array.isArray(currentCompanies) && currentCompanies.length > 0) {
    const filteredNames = currentCompanies.filter(
      (company) => company.name.toLowerCase() !== companyName.toLowerCase()
    );

    if (filteredNames.length < currentCompanies.length) {
      await browser.storage.local.set({ companyNames: filteredNames });
    }
  }
}

// Event handler -- For the button to remove a company name from the hide list
async function handleRemoveListItem(e) {
  const parentElement = this.parentElement;
  const companyName = parentElement.querySelector(".li-company-name").innerText;
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

function handleToggleVisibility(e) {
  const parentElement = this.parentElement;
  const companyName = parentElement.querySelector(".li-company-name").innerText;
  toggleStorageVisibility(companyName);

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

function isValidCompanyName(nameInput, currentCompaniesArray) {
  let isValid = true;
  const lowercaseNames = currentCompaniesArray.map((element) =>
    element.name.toLowerCase()
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

async function toggleStorageVisibility(companyName) {
  const storedCompanies = await browser.storage.local.get("companyNames");
  let visible = false;

  if (storedCompanies.companyNames) {
    const updatedCompanies = storedCompanies.companyNames.map((company) => {
      if (company.name === companyName) {
        visible = !company.visible;
        return {
          ...company,
          visible,
        };
      } else {
        return company;
      }
    });
    await browser.storage.local.set({ companyNames: updatedCompanies });

    // we get active tab in a few places, possibility for refactoring
    const gettingActiveTab = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (visible) {
      //fire show message
      if (Array.isArray(gettingActiveTab)) {
        // todo -- will need to figure out how to get number of hidden posts after hiding
        browser.tabs.sendMessage(gettingActiveTab[0].id, {
          command: "showCompany",
          companyName: companyName,
        });
      }
    } else {
      //fire hide message
      if (Array.isArray(gettingActiveTab)) {
        // todo -- will need to figure out how to get number of hidden posts after hiding
        browser.tabs.sendMessage(gettingActiveTab[0].id, {
          command: "hideCompany",
          companyName: companyName,
        });
      }
    }
  }
}

async function addCompanyHandler(event) {
  const storedCompanies = await browser.storage.local.get("companyNames");
  const companyNameInput = document.getElementById("companyName");
  const updatedCompanies = { companyNames: [] };

  console.log(storedCompanies);

  // todo, maybe add separate validation method for storenames.companyname since it happens in a few places
  if (isValidCompanyName(companyNameInput, storedCompanies.companyNames)) {
    const newName = companyNameInput.value;
    updatedCompanies.companyNames = [...storedCompanies.companyNames];

    if (storedCompanies.companyNames.length === 0) {
      // clearing the placeholder text
      clearList();
    }

    updatedCompanies.companyNames.push({
      name: newName,
      visible: false,
      numPosts: 0,
    });
    browser.storage.local.set(updatedCompanies);

    // we get active tab in a few places, possibility for refactoring
    const gettingActiveTab = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (Array.isArray(gettingActiveTab)) {
      // todo -- will need to figure out how to get number of hidden posts after hiding
      browser.tabs.sendMessage(gettingActiveTab[0].id, {
        command: "hideCompany",
        companyName: newName,
      });
    }

    addToList(newName, false);
    companyNameInput.value = "";
  }
}

async function initializePopup() {
  let storedNames = await browser.storage.local.get("companyNames"); //think something is wrong with initialization for the new structure
  const addButton = document.getElementById("addCompany");
  const resetButton = document.getElementById("resetList");
  const companyNameInput = document.getElementById("companyName");
  console.log("initialize popup stored names", storedNames);
  if (
    typeof storedNames === "object" &&
    !storedNames.hasOwnProperty("companyNames")
  ) {
    console.log("need to update stored names");
    storedNames = { companyNames: [] };
    await browser.storage.local.set({ companyNames: [] });
  } else if (typeof storedNames !== "object") {
    console.log("Something went wrong");
    // TODO error
  }

  if (storedNames.companyNames && storedNames.companyNames.length > 0) {
    storedNames.companyNames.forEach((element) => {
      addToList(element.name, element.visible);
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
    const hiddenCompanies = storedNames.companyNames.filter(
      (company) => !company.visible
    );
    const names = hiddenCompanies.map((company) => company.name);
    hideStoredResults(names); // todo, error handling
  }
}

browser.runtime.onMessage.addListener((message) => {
  if (message.command === "initHide") {
    initHidePostings();
  }
});

initializePopup();
