This is a SitecoreAI Marketplace Application.
From the Marketplace integration options, it uses "fullscreen-extension"

It is an editor to make it easier for dictionary items edit and creation. It will use the SitecoreAI Marketplace authoring endpoint.

Sitecore information:
The dictionary are always found under the Site Path + "/Dictionary"

Dictionaty Folder template ID: {267D9AC7-5D85-4E9D-AF89-99AB296CC218}
Dictionaty Entry template ID: {6D1CD897-1936-4A3A-A511-289A94C2A7B1}
Dictionaty Entry fields: Keya and Phrase

# Entry List Interface Specs:
## Line 1
### Site Selector
Use the Authoring Sites graphql to return all sites available. The first returned is the default. 
When selected it should save in a cookie to remember site selection in future.
### Publish
Upon click, it will display a dialog recommending that user publish only after making all the changes as pulishing takes long.
Upon confirmation, it will run a SMART publish in the site dictionary root. Publish options mode=SMART, Subitems=true, related items=false
When publishing is confirmed, diosplay a toast syaing that to see publishing status, go to "/settings/publishing-jobs"
### Add Entry
Opens a Diaplog with the fields Name and Key in one line
Bellow the folders available where the item will be placed into.
When user start typing the name, the key is auto filling accordingly to the "Keys Rules".
If there is a with the first letter of the name, for instance entry All, folder A, then auto select in the interface the folder A
If there isnt a folder with the letter, display a "fake" folder with border dashed to suggest the user the folder will be created.
User can always select any other folder available.

## Line 2
### Search
user can type keyword, it tryies to find in the name, key or phrase (based on the current language selection)
When searching, the folders selection is disabled, and All is always selected.

### Missing translation only
When missing translation only is selected, tehre is a need of comparing two languages.
Use Base Language to execute the query and return results, then use the display language to compare if item is reetrived and if it is, phrase is missing.
This two things mean "Missing Translation": Phrase in the selected language is empty, or item is present in base language but not in display language.

### Display Language
Used to get the phrase in the table. The listing is always based on "Base Language" display language is used only to fetch the phrase in the UI.

## Line 3
First row contains all letter/number folders: **All**, **A–Z**, and **0-9**.
- The `0-9` folder is a single folder named exactly `0-9`. It captures all dictionary entries whose name starts with a digit (0–9). There are no individual per-digit folders.
- Always render All, A–Z, and 0-9 buttons. If the folder does not exist in Sitecore, display the button as disabled.

Second row displays any other named folder that is not a letter (A–Z) or `0-9`. All are shown on one line; if there are more than 6, a "See more" expander reveals the rest.
All folder icons are the same (folder icon). Named folders do not have a selected state in the A–Z row.

The table should list all entries on the selected folder.
When a folder is selected, the search keyword should be empty, user will use search or folder selection, enver both.

## Line 3
Table
Name: Item Name
Key: Item Field "Key"
Phrase: Item Field "Phrase"
Status:
- Ok
- Missing Translation (missing translation is when a phrase is missing in the selected display language)
Edit: Takes user to Entry Editor
Delete: Show confirmation before deleting item.


## Settings

### General 
#### Base Languange
This is the base language fo everything which is added, it will be used to determine if other languages are missing. Default "en" 
#### Disable Deletion
Add a checkbox to disable deletion and if selected, the col delete is suppresed in the table.
### Key Rules
Key rules is a rule that the key field will derive out of the name. For instance:
Rules
Name: Welcome Message
RulKey could be derived to:
- WelcomeMessage
- welcomeMessage
- welcome.message
- WELCOME.MESSAGE
- welcome_message
- WELCOME_MESSAGE
- welcome-message
- WELCOME-MESSAGE
- Welcome Message
*add otehr options that you see fit.
Key rule siwll be used when adding a new entry only, as user type name, key should be automatically field.
Add a option to dispaable auto format of key.

IMPORTANT: READ settings-persistence.md to understand how to save settings.