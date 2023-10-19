(() => {
  const resultsListSelector = "ul.jobs-search__results-list";
  const companyNameSelector = "base-search-card__subtitle";
  const postHideClassName = "ext-hide";
  const resultsList = document.querySelector(resultsListSelector);

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

    for (const element of resultsCompanies) {
      const compareName = element.innerText.toLowerCase().trim();

      if (names.includes(compareName.toLowerCase())) {
        const parentLi = element.closest("li");
        parentLi.classList.add(postHideClassName);
      }
    }
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
