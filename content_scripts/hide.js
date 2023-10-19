(() => {
  const resultsListSelector = "ul.jobs-search__results-list";
  const companyNameSelector = "base-search-card__subtitle";
  const postHideClassName = "ext-hide";
  const resultsList = document.querySelector(resultsListSelector);
  let lastHiddenNames = [];

  // Options for the observer
  const config = { childList: true };

  // Callback function to execute when mutations are observed
  const callback = (mutationList, observer) => {
    for (const mutation of mutationList) {
      if (mutation.type === "childList") {
        hideMultiple(lastHiddenNames);
      }
    }
  };

  const observer = new MutationObserver(callback);

  // Observing the results list for when you scroll down the results and new ones load in
  observer.observe(resultsList, config);

  function initialHide(e) {
    if (resultsList === null || resultsList.children.length === 0) {
      return;
    }
    browser.runtime.sendMessage({ command: "initHide" });
  }

  function hideCompany(companyName) {
    let count = 0;
    const resultsCompanies =
      resultsList.getElementsByClassName(companyNameSelector);

    for (const element of resultsCompanies) {
      const compareName = element.innerText.toLowerCase().trim();
      if (companyName.toLowerCase() === compareName) {
        const parentLi = element.closest("li");
        parentLi.classList.add(postHideClassName);
        count++;
      }
    }

    if (!lastHiddenNames.includes(companyName.toLowerCase())) {
      lastHiddenNames.push(companyName.toLowerCase());
    }

    browser.runtime.sendMessage({
      command: "updateCount",
      companyName: companyName,
      count: count,
    });
  }

  function showCompany(companyName) {
    const resultsCompanies =
      resultsList.getElementsByClassName(companyNameSelector);

    for (const element of resultsCompanies) {
      const compareName = element.innerText.toLowerCase().trim();
      if (companyName.toLowerCase() === compareName) {
        const parentLi = element.closest("li");
        parentLi.classList.remove(postHideClassName);
      }
    }
  }

  function showAll() {
    for (const li of resultsList.querySelectorAll(`li.${postHideClassName}`)) {
      li.classList.remove(postHideClassName);
    }
  }

  function hideMultiple(names) {
    const resultsCompanies =
      resultsList.getElementsByClassName(companyNameSelector);
    lastHiddenNames = [...names];
    const counts = new Map();
    names.forEach((name) => counts.set(name, 0));

    for (const element of resultsCompanies) {
      const compareName = element.innerText.toLowerCase().trim();

      if (names.includes(compareName)) {
        const parentLi = element.closest("li");
        parentLi.classList.add(postHideClassName);
        counts.set(compareName, counts.get(compareName) + 1);
      }
    }

    //then after the hiding need to fire a command back to the extension to update the counts in storage
    browser.runtime.sendMessage({
      command: "updateMultipleCount",
      updates: counts,
    });
  }

  browser.runtime.onMessage.addListener((message) => {
    if (resultsList === null || resultsList.children.length === 0) {
      return;
    }

    if (message.command === "hideCompany") {
      hideCompany(message.companyName);
    } else if (message.command === "showCompany") {
      showCompany(message.companyName);
    } else if (message.command === "hideMultiple") {
      const lowercaseNames = message.names.map((element) => {
        return element.toLowerCase();
      });
      hideMultiple(lowercaseNames);
    } else if (message.command === "showAll") {
      showAll();
    }
  });

  initialHide();
})();
