# Connect the ZYANIX registration form to Google Sheets

1. Create a new, blank Google Sheet named `ZYANIX Registrations`.
2. In that Sheet, choose **Extensions → Apps Script**.
3. Replace the default `Code.gs` file with the contents of `Code.gs` in this folder.
4. Save the project, choose the `setup` function, and click **Run** once. Approve Google’s requested permissions. This creates and formats the `Registrations` tab.
5. Click **Deploy → New deployment → Web app**.
6. Set **Execute as** to **Me** and **Who has access** to **Anyone**. Click **Deploy**, authorize it, then copy the Web app URL ending in `/exec`.
7. In `index.html`, replace `PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE` with that URL.

The `Registrations` tab contains these columns:

`Timestamp | Registration ID | Event | Team Name | Team Leader / Name | Team Member 1 | Team Member 2 | Department | Section | Year | Phone Number | Email`

The backend uses a script lock and a unified, case-insensitive batch check for both email and team name, so duplicate emails and duplicate team names are rejected in a single fast read operation.
