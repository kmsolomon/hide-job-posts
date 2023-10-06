# Hide Job Postings

## What is it?

A Firefox browser extension to hide jobs in the LinkedIn job search results from certain companies.
Created mainly for the case where companies post the exact same job for every major city in Canada, so when you're searching for remote jobs in all of Canada you have to scroll past the same posting like 20 times.
In theory instead of using an extension you can try to exclude the company from the search results by doing "NOT (company name)", but I had mixed results with that and it sometimes hid other companies as well.

## How to use

To do. Add detailed instructions/screenshots.

## Work in progress:

- :bug: - it still sometimes keeping the placeholder when adding to a previously empty list
- :bug: - sometimes end up with same company twice in the stored names -- need to find steps to repro
- improve to make sure same entry can't be added twice
- Context menu option to hide instead of typing the name
- show details about amount of postings hidden from each company
- add toggle to show/hide postings without removing company from the filter
- run hide again when more results are loaded
- maybe display total number of hidden posts on the page on top of the icon?
- error handling
- make it prettier
