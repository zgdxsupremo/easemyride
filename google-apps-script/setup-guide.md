# Google Apps Script & Google Sheets Setup Guide

Follow this 5-minute setup guide to connect **EaseMyRide** to your own live Google Sheets database.

---

## Step 1: Create a Google Sheet
1. Open [Google Sheets](https://sheets.new) in your browser.
2. Name the sheet: **EaseMyRide Database (Production/MVP)**.

---

## Step 2: Open Google Apps Script Editor
1. In your new Google Sheet, click **Extensions** > **Apps Script** in the top navigation bar.
2. Delete any existing template code in `Code.gs`.
3. Open [`google-apps-script/Code.gs`](file:///C:/Users/om/.gemini/antigravity/scratch/easemyride/google-apps-script/Code.gs) and copy all code into the Apps Script editor.
4. Click the **Save Project** icon (💾).

---

## Step 3: Run Database Initialization (One Click)
1. In the Apps Script toolbar, locate the function dropdown (where it says `myFunction` or `doPost`).
2. Select **`initializeDatabase`** from the dropdown.
3. Click **Run**.
4. Grant the standard Google permissions when prompted (*Review permissions* > *Choose account* > *Advanced* > *Go to Untitled project (unsafe)* > *Allow*).
5. Switch back to your Google Sheet: You will now see 3 beautifully styled sheets:
   - **`SEARCHES`**: Auto-logs every search query from the website.
   - **`BOOKINGS`**: Stores customer bookings with automatic emerald-green row highlights.
   - **`CONFIG`**: Stores helpline numbers and pricing adjustments you can edit anytime!

---

## Step 4: Deploy Web App
1. In the Apps Script editor, click the blue **Deploy** button (top-right) > **New deployment**.
2. Click the gear icon ⚙️ next to *Select type* and select **Web app**.
3. Configure the settings:
   - **Description**: `EaseMyRide Backend API v1`
   - **Execute as**: `Me (your_email@gmail.com)`
   - **Who has access**: **`Anyone`** *(Essential so customer browsers can submit bookings)*
4. Click **Deploy**.
5. Copy the generated **Web App URL** (it looks like: `https://script.google.com/macros/s/AKfycb.../exec`).

---

## Step 5: Connect to Frontend
1. Open [`assets/js/config.js`](file:///C:/Users/om/.gemini/antigravity/scratch/easemyride/assets/js/config.js) in your project.
2. Replace `"YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE"` with your copied Web App URL:
   ```javascript
   appsScriptUrl: "https://script.google.com/macros/s/AKfycb.../exec",
   ```
3. Save the file.

Your live Google Sheet backend is now fully operational!
All searches and bookings will stream directly into your Google Sheets in real-time.
