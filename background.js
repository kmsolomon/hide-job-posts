"use strict";

let popupParameters;

// **** Context menu related section start **** //
browser.contextMenus.create({
  id: "hide-posts",
  documentUrlPatterns: ["*://*.linkedin.com/jobs/*"],
  title: "Hide jobs from this company",
  contexts: ["link"],
});

browser.menus.onClicked.addListener(async (info, tab) => {
  popupParameters = {
    tabId: tab.id,
    frameId: info.frameId,
    targetElementId: info.targetElementId,
  };

  browser.tabs.sendMessage(tab.id, {
    command: "getCompanyNameToHide",
    id: info.targetElementId,
  });
});

// **** Context menu related section end **** //

async function getTabId() {
  let id =
    popupParameters && popupParameters.tabId ? popupParameters.tabId : null;
  const gettingActiveTab = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (Array.isArray(gettingActiveTab)) {
    id = gettingActiveTab[0].id;
  }

  return id;
}

async function addCompanyToStorage(companyName) {
  const storedCompanies = await browser.storage.local.get("companyNames"); // TODO -- should verify it's not a dupe before we add
  const updatedCompanies = { companyNames: [] };
  const tabId = await getTabId();

  if (Array.isArray(storedCompanies.companyNames)) {
    updatedCompanies.companyNames = [...storedCompanies.companyNames];
  }

  updatedCompanies.companyNames.push({
    name: companyName,
    visible: false,
    numPosts: 0,
  });
  browser.storage.local.set(updatedCompanies);

  // Tell content script to hide the posts on the page
  browser.tabs.sendMessage(tabId, {
    command: "hideCompany",
    companyName: companyName,
  });
}

async function removeCompanyFromStorage(companyName) {
  const storedCompanies = await browser.storage.local.get("companyNames");
  const currentCompanies = storedCompanies.companyNames;

  if (Array.isArray(currentCompanies) && currentCompanies.length > 0) {
    const filteredNames = currentCompanies.filter(
      (company) => company.name.toLowerCase() !== companyName.toLowerCase()
    );

    if (filteredNames.length < currentCompanies.length) {
      await browser.storage.local.set({ companyNames: filteredNames });
      const tabId = await getTabId();

      browser.tabs.sendMessage(tabId, {
        command: "showCompany",
        companyName: companyName,
      });
    }
  }
}

async function clearCompanyStorage() {
  const tabId = await getTabId();
  browser.storage.local.set({ companyNames: [] });
  browser.tabs.sendMessage(tabId, {
    command: "showAll",
  });
}

async function toggleCompanyVisibility(companyName) {
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
    const tabId = await getTabId();
    const command = visible ? "showCompany" : "hideCompany";

    browser.tabs.sendMessage(tabId, {
      command: command,
      companyName: companyName,
    });
  }
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

    const gettingActiveTab = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (Array.isArray(gettingActiveTab) && names) {
      browser.tabs.sendMessage(gettingActiveTab[0].id, {
        command: "hideMultiple",
        names: names,
      });
    }
  }
}

async function updateHiddenCount(companyName, updatedCount) {
  const storedCompanies = await browser.storage.local.get("companyNames");
  if (Array.isArray(storedCompanies.companyNames)) {
    // if company already exists
    const nameExists = storedCompanies.companyNames.some(
      (company) => company.name === companyName
    );
    if (nameExists) {
      const updatedCompanies = storedCompanies.companyNames.map((company) => {
        if (company.name === companyName) {
          return {
            ...company,
            numPosts: updatedCount,
          };
        } else return company;
      });

      await browser.storage.local.set({ companyNames: updatedCompanies });
      //updateUICount(companyName, updatedCount); // TODO, need to figure out how to trigger a rerender if the popup is open
    } else {
      const updatedCompanies = storedCompanies.companyNames.concat({
        name: companyName,
        visible: false,
        numPosts: updatedCount,
      });
      await browser.storage.local.set({ companyNames: updatedCompanies });
      // addToList(companyName, updatedCount); // TODO, need to figure out how to add when pop up is open
    }
  }
}

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

    //updateUICountMultiple(updateMap); //todo -- technically only need to do this if the pop up is open at the time, but not sure if we are able to detect that easily?
  }
}

browser.runtime.onMessage.addListener(async (message) => {
  switch (message.command) {
    case "getPopupParameters":
      return popupParameters;
    case "initHide":
      initHidePostings();
      break;
    case "updateCount":
      updateHiddenCount(message.companyName, message.count);
      break;
    case "updateMultipleCount":
      updateMultipleCount(message.updates);
      break;
    case "addCompany":
      addCompanyToStorage(message.companyName);
      break;
    case "removeCompany":
      removeCompanyFromStorage(message.companyName);
      break;
    case "toggleCompanyVisibility":
      toggleCompanyVisibility(message.companyName);
      break;
    case "emptyStorage":
      clearCompanyStorage();
      break;
    default:
      console.error(`Extension received unknown command: ${message.command}`);
      break;
  }
});
