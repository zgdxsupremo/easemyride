# 🚗 RideOnDemand — Cab Booking Platform MVP

**RideOnDemand** is a production-quality, high-converting Indian cab-booking platform MVP built with **Vanilla HTML5, CSS3, and modern Vanilla JavaScript (ES6)** on the frontend and **Google Apps Script + Google Sheets** as the lightweight backend and live database.

---

## 🌟 Key Highlights & Features

- **No Heavy Frameworks**: Handcrafted Vanilla JS with modular architecture (`pricing.js`, `distance.js`, `validation.js`, `api.js`, `ui.js`). Zero dependencies on React, Vue, Angular, Bootstrap, Tailwind, or jQuery.
- **4 Specialized Travel Services**:
  1. **One Way**: Intercity drops without return-fare penalties.
  2. **Round Trip**: Multi-day outstation touring with dedicated chauffeurs.
  3. **Local Sightseeing**: Flexible 4hr, 8hr, and 12hr city packages.
  4. **Airport Transfer**: Flight-tracked airport pickups and terminal drops.
- **5 Vehicle Categories**: Hatchback, Sedan, SUV (6-seater), Innova (7-seater), and Innova Crysta (Executive Luxury).
- **Deterministic Pricing Engine**:
  - **Sedan**: `(distanceKm × 11) + ₹400`
  - **SUV**: Sedan + ₹3,000
  - **Innova**: Sedan + ₹3,000 (Configurable)
  - **Innova Crysta**: Sedan + ₹4,000
  - **Hatchback**: Sedan - ₹100
  - Transparent pricing disclaimer: *"Estimated fare. Toll, parking and applicable taxes may be extra."*
- **Distance Calculation Abstraction**: Real Google Routes API pluggable connector + built-in 50+ Indian intercity road matrix and geodesic fallback.
- **Google Sheets Live Database**:
  - `SEARCHES` sheet auto-logs all searches.
  - `BOOKINGS` sheet records bookings and automatically highlights new rows in emerald green.
  - `CONFIG` sheet allows dynamic price adjustments and helpline updates without touching frontend code.
- **Customer SMS & Receipt Tools**: Automatic formatted SMS generation, 1-click clipboard copy, `.txt` file download, and native device `sms:` link.
- **Admin Dashboard**: Passcode-protected analytics portal with real-time KPI counters, booking status tracking, search filters, and 1-click CSV exports for Bookings, Searches, and Customer SMS.

---

## 📂 Project Structure

```
RideOnDemand/
├── index.html                  # High-converting Homepage with 4-tab booking search widget
├── search.html                 # Vehicle selection & transparent fare breakdown page
├── booking.html                # Booking checkout & passenger information form
├── success.html                # Booking confirmation, receipt, and SMS tools
├── admin.html                  # Admin analytics portal with live table & CSV exports
├── oneway.html                 # Dedicated SEO landing for One Way Cabs
├── roundtrip.html              # Dedicated SEO landing for Round Trip Cabs
├── local.html                  # Dedicated SEO landing for Local Sightseeing
├── airport.html                # Dedicated SEO landing for Airport Transfers
├── about.html                  # Company story, trust, and safety principles
├── contact.html                # 24/7 Helpline, WhatsApp, and support messaging
├── privacy-policy.html         # Data privacy policy
├── terms.html                  # Terms & conditions of service
├── cancellation-policy.html    # Transparent cancellation & refund rules
├── robots.txt                  # SEO crawler rules
├── sitemap.xml                 # XML Sitemap for search engines
├── assets/
│   ├── css/
│   │   ├── main.css            # Core design system, variables, cards, animations
│   │   ├── responsive.css      # Tested mobile-first breakpoints (320px -> 1440px)
│   │   └── admin.css           # Admin dashboard styling
│   └── js/
│       ├── config.js           # Public client configuration & vehicle specs
│       ├── validation.js       # Indian mobile, date, and inline form validator
│       ├── distance.js         # Distance abstraction (Google Routes API + offline matrix)
│       ├── pricing.js          # Pure pricing engine for all services & vehicles
│       ├── api.js              # Google Apps Script API connector & offline resilience
│       ├── ui.js               # Toasts, modals, drawer, formatters, copy helpers
│       ├── app.js              # Homepage controller & search widget logic
│       ├── search.js           # Search results controller & vehicle card rendering
│       ├── booking.js          # Booking checkout controller & payload dispatcher
│       ├── success.js          # Success screen controller & SMS generator
│       └── admin.js            # Admin portal controller & CSV export generator
├── google-apps-script/
│   ├── Code.gs                 # Full Apps Script Web App API backend
│   └── setup-guide.md          # Step-by-step Google Sheets setup guide
└── README.md                   # Complete documentation
```

---

## 🚀 How to Run Locally

Because RideOnDemand is built with pure Vanilla web technologies, no build step or package installation (`npm install`) is required.

### Method 1: Using Python's Built-in Web Server
Open PowerShell in the project directory:
```powershell
cd C:\Users\om\.gemini\antigravity\scratch\RideOnDemand
python -m http.server 8000
```
Open your browser at `http://localhost:8000`.

### Method 2: Using Node.js `npx serve` or `http-server`
```powershell
cd C:\Users\om\.gemini\antigravity\scratch\RideOnDemand
npx serve .
```

### Method 3: Direct File Opening
You can also open `index.html` directly in any modern browser (Chrome, Edge, Firefox, Safari).

---

## ☁️ How to Deploy the Frontend

Deploy to any static hosting provider within seconds:

### Deploy to Cloudflare Pages / Vercel / Netlify / GitHub Pages:
1. Push the `/RideOnDemand` repository to GitHub or upload the folder directly.
2. Set the publish directory to the root `/` (no build command needed).
3. Connect your custom domain (e.g. `https://rideondemand.com`).

---

## 🗄️ Google Sheets & Backend Setup

Read the detailed guide in [`google-apps-script/setup-guide.md`](file:///C:/Users/om/.gemini/antigravity/scratch/RideOnDemand/google-apps-script/setup-guide.md).

### Quick Summary:
1. Create a new Google Sheet at [sheets.new](https://sheets.new).
2. Go to **Extensions** > **Apps Script**.
3. Copy and paste all code from [`google-apps-script/Code.gs`](file:///C:/Users/om/.gemini/antigravity/scratch/RideOnDemand/google-apps-script/Code.gs).
4. Run the **`initializeDatabase`** function once to automatically create and style the `SEARCHES`, `BOOKINGS`, and `CONFIG` sheets.
5. Click **Deploy** > **New Deployment** > Select **Web app** (`Execute as: Me`, `Who has access: Anyone`).
6. Copy the Web App URL and paste it into `assets/js/config.js` under `appsScriptUrl`.

---

## 📍 Distance & Routing API Configuration

The distance calculation layer is decoupled via `assets/js/distance.js`:

### 1. Built-in Matrix & Fallback (Default):
The app includes a comprehensive curated road matrix for 50+ popular Indian intercity routes (Delhi, Chandigarh, Jaipur, Amritsar, Agra, Mumbai, Pune, Bengaluru, etc.) and intelligent coordinate estimation for arbitrary locations.

### 2. Enabling Live Google Routes / Distance Matrix API:
To use live Google Maps driving distance calculations:
1. Obtain an API key with **Distance Matrix API** enabled from the Google Cloud Console.
2. In `assets/js/config.js`, set:
   ```javascript
   googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY",
   ```
3. Load the Google Maps script in your HTML pages:
   ```html
   <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_KEY&libraries=places"></script>
   ```

---

## 💰 How Pricing & Business Rules Work

### Pricing Engine (`assets/js/pricing.js`):
1. **Sedan Base Rate**:
   $$\text{Fare} = (\text{Distance KM} \times 11) + 400$$
2. **Vehicle Adjustments**:
   - **SUV (6-Seater)**: $\text{Sedan} + ₹3,000$
   - **Innova (7-Seater)**: $\text{Sedan} + ₹3,000$ *(Configurable in `CONFIG` sheet)*
   - **Innova Crysta**: $\text{Sedan} + ₹4,000$
   - **Hatchback**: $\text{Sedan} - ₹100$

### Changing Pricing Live:
Open the `CONFIG` sheet in your Google Sheet and edit the value next to `Sedan Rate`, `Base Fare`, or `SUV Adjustment`. The backend and pricing formulas will dynamically reflect your changes.

---

## 🆔 Booking ID Generation & Security

- **Client Preview**: Generates structured reference IDs (`ROD-YYYYMMDD-XXXX`).
- **Server Confirmation**: The Google Apps Script backend verifies and stamps the unique sequence ID.
- **Server-Side Price Validation**: The backend recalculates the fare from raw distance and vehicle type parameters before storing to prevent client-side inspection tampering.

---

## 📊 CSV Data Export

In `/admin.html`, click any of the export buttons:
1. **Export Bookings CSV**: Full RFC 4180 compliant CSV of all customer bookings, addresses, dates, vehicles, and fares.
2. **Export Searches CSV**: Audit trail of customer search queries and service types.
3. **Export Customer SMS CSV**: Clean spreadsheet of generated customer SMS texts for bulk SMS gateway processing.

---

## 📱 Future SMS Provider Integration

To connect a transactional SMS gateway (such as Twilio, Gupshup, Textlocal, or MSG91):

Add an adapter in `assets/js/api.js` or directly inside `google-apps-script/Code.gs`:
```javascript
// Google Apps Script SMS Gateway Webhook Hook
function sendSMS(phoneNumber, message) {
  var apiUrl = "https://api.sms-provider.com/v1/send";
  var payload = {
    apiKey: "YOUR_SMS_GATEWAY_KEY",
    to: phoneNumber,
    message: message,
    senderId: "EMRIDE"
  };
  UrlFetchApp.fetch(apiUrl, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  });
}
```

---

## 🔒 Security & Privacy Considerations

1. **Zero Hardcoded Secrets**: No Google service account keys or private secrets are bundled into client-side JS files.
2. **Input Sanitization**: Phone numbers are sanitized to 10 digits; input fields are validated and escaped against XSS before DOM insertion.
3. **Untrusted Pricing**: Backend never blindly trusts client-passed price totals; fares are re-verified on the server.

---

## 📋 Production Deployment Checklist

- [x] Test all 4 search tabs (One Way, Round Trip, Local, Airport) with valid and invalid inputs.
- [x] Verify inline non-blocking validation errors.
- [x] Confirm responsive design at 320px, 375px, 768px, 1024px, and 1440px.
- [x] Verify unique Booking ID generation.
- [x] Test SMS text generation, clipboard copy, `.txt` download, and native device `sms:` URI.
- [x] Test Admin Dashboard status updates and all 3 CSV exports.
- [x] Review SEO meta tags, `robots.txt`, `sitemap.xml`, and JSON-LD structured data.
- [ ] Connect live Google Apps Script Web App URL in `assets/js/config.js`.

---

© 2026 **RideOnDemand**. All rights reserved. Built for seamless travel across India.
