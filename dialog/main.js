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
  const parentRow = e.target.closest("tr");
  const companyName = parentRow.querySelector(
    ".table-company-name span"
  ).innerText;

  removeFromList(parentRow);
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
  const companyName = parentElement.querySelector(
    ".table-company-name span"
  ).innerText;
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

    // todo -- future spot for potential cleanup
    if (visible) {
      //fire show message
      if (Array.isArray(gettingActiveTab)) {
        browser.tabs.sendMessage(gettingActiveTab[0].id, {
          command: "showCompany",
          companyName: companyName,
        });
      }
    } else {
      //fire hide message
      if (Array.isArray(gettingActiveTab)) {
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
      browser.tabs.sendMessage(gettingActiveTab[0].id, {
        command: "hideCompany",
        companyName: newName,
      });
    }

    addToList(newName, false);
    companyNameInput.value = "";
  }
}

async function updateHiddenCount(companyName, updatedCount) {
  const storedCompanies = await browser.storage.local.get("companyNames");
  if (
    Array.isArray(storedCompanies.companyNames) &&
    storedCompanies.companyNames.length > 0
  ) {
    const updatedCompanies = storedCompanies.companyNames.map((company) => {
      if (company.name === companyName) {
        return {
          ...company,
          numPosts: updatedCount,
        };
      } else return company;
    });

    await browser.storage.local.set({ companyNames: updatedCompanies });
    updateUICount(companyName, updatedCount);
  }
}

// really what we're going to do is update all the counts/replace the thing in storage I think
// potential refactor -- could just send an updateMap for single count update as well then it's the same function? except maybe the UI update part
async function updateMultipleCount(updateMap) {
  const storedCompanies = await browser.storage.local.get("companyNames");
  if (
    Array.isArray(storedCompanies.companyNames) &&
    storedCompanies.companyNames.length > 0
  ) {
    const updatedCompanies = storedCompanies.companyNames.map((company) => {
      if (typeof updateMap.get(company.name.toLowerCase()) !== "undefined") {
        return {
          ...company,
          numPosts: updateMap.get(company.name.toLowerCase()),
        };
      } else return company;
    });

    await browser.storage.local.set({ companyNames: updatedCompanies });

    updateUICountMultiple(updateMap); //todo -- technically only need to do this if the pop up is open at the time, but not sure if we are able to detect that easily?
  }
}

async function initializePopup() {
  let storedNames = await browser.storage.local.get("companyNames"); //think something is wrong with initialization for the new structure
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
    browser.storage.local.set({ companyNames: [] });
    clearList(true);

    const gettingActiveTab = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (Array.isArray(gettingActiveTab)) {
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
  } else if (message.command === "updateCount") {
    updateHiddenCount(message.companyName, message.count);
  } else if (message.command === "updateMultipleCount") {
    updateMultipleCount(message.updates);
  }
});

initializePopup();
