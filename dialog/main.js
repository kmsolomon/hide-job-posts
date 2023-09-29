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

  console.log("remove -- current names", currentNames);

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
    console.log("here");
    console.log(gettingActiveTab[0].id);
    browser.tabs.sendMessage(gettingActiveTab[0].id, {
      command: "showCompany",
      companyName: companyName,
    });
  }
}

async function hideStoredResults(names) {
  console.log("should hide stored results");
  const gettingActiveTab = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  console.log("hide these names", names);
  if (Array.isArray(gettingActiveTab)) {
    console.log("here");
    console.log(gettingActiveTab[0].id);
    browser.tabs.sendMessage(gettingActiveTab[0].id, {
      command: "hideMultiple",
      names: names,
    });
  }
}

async function initializePopup() {
  let storedNames = await browser.storage.local.get("companyNames");
  const addButton = document.getElementById("addCompany");
  const resetButton = document.getElementById("resetList");
  const companyName = document.getElementById("companyName");
  const companyList = document.getElementById("companyList");

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

  hideStoredResults(storedNames.companyNames);

  addButton.addEventListener("click", async (e) => {
    if (companyName && companyName.value) {
      if (storedNames.companyNames.length === 0) {
        clearList();
      }

      const gettingActiveTab = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (Array.isArray(gettingActiveTab)) {
        console.log("here");
        console.log(gettingActiveTab[0].id);
        browser.tabs.sendMessage(gettingActiveTab[0].id, {
          command: "hideCompany",
          companyName: companyName.value,
        });
      }

      storedNames.companyNames.push(companyName.value);
      browser.storage.local.set(storedNames);
      addToList(companyName.value);
      companyName.value = "";
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

  function onError(error) {
    console.log(`Error: ${error}`);
  }

  const gettingActiveTab = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  const insertingCSS = browser.tabs.insertCSS(gettingActiveTab[0].id, {
    file: "/content_scripts/hide-style.css",
  });
  insertingCSS.then(null, onError);
}

function reportExecuteScriptError(error) {
  document.querySelector("#popup-content").classList.add("hidden");
  document.querySelector("#error-content").classList.remove("hidden");
  console.error(
    `Failed to execute hide-job-postings content script: ${error.message}`
  );
}

browser.tabs
  .executeScript({ file: "/content_scripts/hide.js" })
  .then(initializePopup)
  .catch(reportExecuteScriptError);
