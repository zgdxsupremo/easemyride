/**
 * MargDrive — Google Apps Script Backend API (Code.gs)
 * 
 * Functions as the serverless API and database engine connected to Google Sheets.
 * 
 * Sheets Schema:
 * 1. SEARCHES: Logs every customer search automatically.
 * 2. BOOKINGS: Stores verified bookings with visual row highlighting.
 * 3. CONFIG: Manages live business rates, helpline, adjustments.
 */

// Global Sheet Names
var SHEET_SEARCHES = "SEARCHES";
var SHEET_BOOKINGS = "BOOKINGS";
var SHEET_CONFIG = "CONFIG";

/**
 * Handles all incoming POST requests from the MargDrive web client.
 */
function doPost(e) {
  try {
    var rawContent = e.postData.contents;
    var data = JSON.parse(rawContent);
    var action = data.action || "create_booking";

    if (action === "log_search") {
      return handleLogSearch(data);
    } else if (action === "create_booking") {
      return handleCreateBooking(data);
    } else if (action === "update_booking_status") {
      return handleUpdateBookingStatus(data);
    } else {
      return createJsonResponse({ success: false, message: "Invalid API action" }, 400);
    }
  } catch (err) {
    return createJsonResponse({ success: false, message: "Server error: " + err.toString() }, 500);
  }
}

/**
 * Handles all incoming GET requests (Admin analytics, config query, CSV export).
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || "get_admin_data";

    if (action === "get_admin_data") {
      return handleGetAdminData();
    } else if (action === "get_config") {
      return handleGetConfig();
    } else {
      return createJsonResponse({ success: true, message: "MargDrive Apps Script API is operational." });
    }
  } catch (err) {
    return createJsonResponse({ success: false, message: "GET error: " + err.toString() }, 500);
  }
}

/**
 * Appends a search log record to the SEARCHES sheet.
 */
function handleLogSearch(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateSheet(ss, SHEET_SEARCHES, getSearchesHeaders());

  var searchId = data.searchId || ("SRC-" + Date.now().toString(36).toUpperCase());
  var timestamp = data.timestamp || new Date().toISOString();

  var row = [
    searchId,
    timestamp,
    data.serviceType || "oneway",
    data.pickupLocation || data.fromCity || "",
    data.dropLocation || data.toCity || "",
    data.pickupDate || "",
    data.returnDate || "",
    data.pickupTime || "",
    data.phoneNumber || "",
    Number(data.distanceKm) || 0,
    data.searchStatus || "COMPLETED",
    data.userAgent || "Web Client"
  ];

  sheet.appendRow(row);

  return createJsonResponse({
    success: true,
    searchId: searchId,
    message: "Search recorded successfully."
  });
}

/**
 * Validates, recomputes fares server-side, generates unique Booking ID,
 * appends to BOOKINGS sheet, and applies visual highlight formatting.
 */
function handleCreateBooking(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateSheet(ss, SHEET_BOOKINGS, getBookingsHeaders());
  var config = readBusinessConfig(ss);

  // 1. Generate Verified Unique Booking ID: MD-YYYYMMDD-XXXX
  var now = new Date();
  var yyyy = now.getFullYear();
  var mm = ("0" + (now.getMonth() + 1)).slice(-2);
  var dd = ("0" + now.getDate()).slice(-2);
  var count = sheet.getLastRow(); // Row count gives simple monotonic sequence base
  var seq = ("000" + count).slice(-4);
  var bookingId = "MD-" + yyyy + mm + dd + "-" + seq;

  // 2. Server-side Untrusted Input Protection: Recalculate Fare
  var distKm = Math.max(1, Number(data.distanceKm) || 1);
  var carType = (data.carType || "sedan").toLowerCase();
  
  // Recalculate Base Sedan Fare: (dist * 11) + 400
  var sedanPerKm = Number(config.sedanRate) || 11;
  var baseFee = Number(config.baseFare) || 400;
  var calcSedanFare = Math.round((distKm * sedanPerKm) + baseFee);
  
  // Apply vehicle adjustments
  var adjustment = 0;
  if (carType === "hatchback") adjustment = Number(config.hatchbackAdjustment) || -100;
  else if (carType === "suv") adjustment = Number(config.suvAdjustment) || 3000;
  else if (carType === "innova") adjustment = Number(config.innovaAdjustment) || 3000;
  else if (carType === "crysta") adjustment = Number(config.crystaAdjustment) || 4000;
  
  var verifiedFinalFare = Math.max(Number(config.minimumFare) || 800, calcSedanFare + adjustment);

  // If client provided a round trip, local or specific formula, respect bounded recalculation
  if (data.finalFare && Number(data.finalFare) > 0) {
    // Prevent client price tampering by ensuring not drastically lower than server base
    if (Number(data.finalFare) >= (calcSedanFare + adjustment - 100)) {
      verifiedFinalFare = Number(data.finalFare);
    }
  }

  // 3. Generate Customer SMS Text
  var helpline = config.helplineNumber || "+91 79737 85807";
  var route = (data.fromCity && data.toCity) ? (data.fromCity + " → " + data.toCity) : (data.fromCity || "Local");
  var generatedSms = "MargDrive: Your cab booking request has been received successfully.\n" +
    "Booking ID: " + bookingId + "\n" +
    "Route: " + route + "\n" +
    "Vehicle: " + (data.carName || carType).toUpperCase() + "\n" +
    "Fare: ₹" + verifiedFinalFare.toLocaleString("en-IN") + "\n" +
    "Pickup: " + (data.startingDate || "Scheduled Date") + ", " + (data.startingTime || "Time") + "\n" +
    "For assistance call: " + helpline + "\n" +
    "Thank you for choosing MargDrive.";

  var bookingTimestamp = now.toISOString();

  // 4. Construct Row Array
  var row = [
    bookingId,
    bookingTimestamp,
    "NEW",
    data.fullName || "",
    data.email || "",
    data.countryCode || "+91",
    data.phoneNumber || "",
    data.fromCity || "",
    data.toCity || "",
    data.pickupAddress || "",
    data.dropoffAddress || "",
    data.startingDate || "",
    data.startingTime || "",
    data.returningDate || "",
    data.returningTime || "",
    data.journeyType || "One Way",
    carType,
    distKm,
    calcSedanFare,
    adjustment,
    Number(data.regionalAdjustment) || 0,
    Number(data.specialRouteAdjustment) || 0,
    data.appliedRules ? (Array.isArray(data.appliedRules) ? data.appliedRules.join(", ") : String(data.appliedRules)) : "STANDARD",
    verifiedFinalFare,
    data.allocatedDriverVendor || data.allocated_vendor_name || "",
    data.driverVendorId || data.allocated_vendor_id || "",
    data.assignedAt || "",
    data.remarks || "",
    generatedSms,
    "READY"
  ];

  // Append Row to Google Sheet
  sheet.appendRow(row);
  var newRowIndex = sheet.getLastRow();

  // 5. Visual Formatting: Highlight New Booking Row in Soft Emerald Green
  try {
    var range = sheet.getRange(newRowIndex, 1, 1, row.length);
    range.setBackground("#ECFDF5"); // Light emerald highlight
    range.setFontColor("#065F46");
    sheet.getRange(newRowIndex, 3).setFontWeight("bold"); // Bold the "NEW" status cell
  } catch (fmtErr) {
    Logger.log("Formatting notice: " + fmtErr.toString());
  }

  // 6. Automatic Admin Email Notification (Sends instant alert to sheet owner's inbox)
  try {
    var adminEmail = Session.getEffectiveUser().getEmail() || (config && config.adminEmail);
    if (adminEmail) {
      var emailSubject = "🚗 New Marg Drive Booking Alert [" + bookingId + "] — " + route;
      var emailBody = "Hello Admin,\n\nA new cab booking request has been submitted on Marg Drive!\n\n" +
        "• Booking ID: " + bookingId + "\n" +
        "• Customer Name: " + (data.fullName || "N/A") + "\n" +
        "• Phone Number: +91 " + (data.phoneNumber || "N/A") + "\n" +
        "• Email: " + (data.email || "N/A") + "\n" +
        "• Route: " + route + " (" + (data.journeyType || "One Way") + ")\n" +
        "• Vehicle: " + (data.carName || carType).toUpperCase() + "\n" +
        "• Estimated Fare: ₹" + verifiedFinalFare.toLocaleString("en-IN") + "\n" +
        "• Pickup Schedule: " + (data.startingDate || "Date") + " at " + (data.startingTime || "Time") + "\n" +
        "• Pickup Address: " + (data.pickupAddress || "N/A") + "\n" +
        "• Remarks: " + (data.remarks || "None") + "\n\n" +
        "👉 Open your Google Sheet or Marg Drive Admin Portal to assign a driver and update status.\n";
      
      MailApp.sendEmail(adminEmail, emailSubject, emailBody);
    }
  } catch (mailErr) {
    Logger.log("Email notification notice: " + mailErr.toString());
  }

  return createJsonResponse({
    success: true,
    bookingId: bookingId,
    finalFare: verifiedFinalFare,
    generatedSms: generatedSms,
    message: "Booking stored and highlighted successfully in Google Sheets."
  });
}

/**
 * Updates status of an existing booking in BOOKINGS sheet.
 */
function handleUpdateBookingStatus(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_BOOKINGS);
  if (!sheet) return createJsonResponse({ success: false, message: "Bookings sheet not found" }, 404);

  var targetId = data.bookingId;
  var newStatus = (data.status || "CONTACTED").toUpperCase();
  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();

  var foundRow = -1;
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] == targetId) {
      foundRow = i + 1;
      break;
    }
  }

  if (foundRow !== -1) {
    sheet.getRange(foundRow, 3).setValue(newStatus);

    // Update row highlight according to status
    var rowRange = sheet.getRange(foundRow, 1, 1, values[0].length);
    if (newStatus === "NEW") {
      rowRange.setBackground("#ECFDF5");
    } else if (newStatus === "CONFIRMED") {
      rowRange.setBackground("#FEF3C7"); // Warm yellow
    } else if (newStatus === "CANCELLED") {
      rowRange.setBackground("#FEE2E2"); // Soft red
    } else {
      rowRange.setBackground("#FFFFFF");
    }

    return createJsonResponse({ success: true, bookingId: targetId, status: newStatus });
  }

  return createJsonResponse({ success: false, message: "Booking ID not found: " + targetId }, 404);
}

/**
 * Returns complete admin analytics payload (Bookings, Searches, Config).
 */
function handleGetAdminData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var bSheet = ss.getSheetByName(SHEET_BOOKINGS);
  var sSheet = ss.getSheetByName(SHEET_SEARCHES);

  var bookings = [];
  if (bSheet && bSheet.getLastRow() > 1) {
    var bValues = bSheet.getDataRange().getValues();
    for (var i = 1; i < bValues.length; i++) {
      var obj = {};
      obj.bookingId = bValues[i][0];
      obj.bookingTimestamp = bValues[i][1];
      obj.bookingStatus = bValues[i][2];
      obj.fullName = bValues[i][3];
      obj.email = bValues[i][4];
      obj.countryCode = bValues[i][5];
      obj.phoneNumber = bValues[i][6];
      obj.fromCity = bValues[i][7];
      obj.toCity = bValues[i][8];
      obj.pickupAddress = bValues[i][9];
      obj.dropoffAddress = bValues[i][10];
      obj.startingDate = bValues[i][11];
      obj.startingTime = bValues[i][12];
      obj.returningDate = bValues[i][13];
      obj.returningTime = bValues[i][14];
      obj.journeyType = bValues[i][15];
      obj.carType = bValues[i][16];
      obj.distanceKm = bValues[i][17];
      obj.baseFare = bValues[i][18];
      obj.vehicleAdjustment = bValues[i][19];
      obj.regionalAdjustment = bValues[i][20];
      obj.specialRouteAdjustment = bValues[i][21];
      obj.appliedRules = bValues[i][22];
      obj.finalFare = bValues[i][23];
      obj.allocatedDriverVendor = bValues[i][24];
      obj.driverVendorId = bValues[i][25];
      obj.assignedAt = bValues[i][26];
      obj.remarks = bValues[i][27];
      obj.generatedSms = bValues[i][28];
      obj.smsStatus = bValues[i][29];
      bookings.unshift(obj);
    }
  }

  var searches = [];
  if (sSheet && sSheet.getLastRow() > 1) {
    var sValues = sSheet.getDataRange().getValues();
    for (var j = 1; j < sValues.length; j++) {
      searches.unshift({
        searchId: sValues[j][0],
        timestamp: sValues[j][1],
        serviceType: sValues[j][2],
        pickupLocation: sValues[j][3],
        dropLocation: sValues[j][4],
        pickupDate: sValues[j][5],
        returnDate: sValues[j][6],
        pickupTime: sValues[j][7],
        phoneNumber: sValues[j][8],
        distanceKm: sValues[j][9],
        searchStatus: sValues[j][10],
        userAgent: sValues[j][11]
      });
    }
  }

  return createJsonResponse({
    success: true,
    bookings: bookings,
    searches: searches
  });
}

/**
 * Reads business pricing and helpline values from the CONFIG sheet.
 */
function readBusinessConfig(ss) {
  var sheet = getOrCreateSheet(ss, SHEET_CONFIG, ["Key", "Value", "Description"]);
  var config = {
    helplineNumber: "+91 79737 85807",
    sedanRate: 11,
    baseFare: 400,
    suvAdjustment: 3000,
    innovaAdjustment: 3000,
    crystaAdjustment: 4000,
    hatchbackAdjustment: -100,
    minimumFare: 800,
    companyName: "MargDrive"
  };

  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    // Seed default CONFIG values
    var seed = [
      ["Helpline Number", "+91 79737 85807", "Customer support phone number"],
      ["Sedan Rate", "11", "Rate per KM for Sedan category"],
      ["Base Fare", "400", "Base flagdown fare added to distance rate"],
      ["SUV Adjustment", "3000", "Price added over Sedan for 6-seater SUV"],
      ["Innova Adjustment", "3000", "Configurable adjustment for Standard Innova"],
      ["Crysta Adjustment", "4000", "Price added over Sedan for Innova Crysta"],
      ["Hatchback Adjustment", "-100", "Discount compared to Sedan"],
      ["Minimum Fare", "800", "Floor minimum charge for any intercity booking"],
      ["Company Name", "MargDrive", "Brand identifier"]
    ];
    sheet.getRange(2, 1, seed.length, 3).setValues(seed);
    return config;
  }

  for (var i = 1; i < values.length; i++) {
    var key = String(values[i][0]).toLowerCase().replace(/[\s_]/g, "");
    var val = values[i][1];
    if (key.indexOf("helpline") !== -1) config.helplineNumber = val;
    else if (key.indexOf("sedanrate") !== -1) config.sedanRate = Number(val);
    else if (key.indexOf("basefare") !== -1) config.baseFare = Number(val);
    else if (key.indexOf("suvadjustment") !== -1) config.suvAdjustment = Number(val);
    else if (key.indexOf("innovaadjustment") !== -1) config.innovaAdjustment = Number(val);
    else if (key.indexOf("crystaadjustment") !== -1) config.crystaAdjustment = Number(val);
    else if (key.indexOf("hatchbackadjustment") !== -1) config.hatchbackAdjustment = Number(val);
    else if (key.indexOf("minimumfare") !== -1) config.minimumFare = Number(val);
    else if (key.indexOf("companyname") !== -1) config.companyName = val;
  }

  return config;
}

/**
 * Returns CONFIG sheet data as JSON.
 */
function handleGetConfig() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var config = readBusinessConfig(ss);
  return createJsonResponse({ success: true, config: config });
}

/**
 * Setup Utility: Run this once inside Apps Script Editor to format all sheets!
 */
function initializeDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Searches Sheet
  var sSheet = getOrCreateSheet(ss, SHEET_SEARCHES, getSearchesHeaders());
  formatHeaders(sSheet, "#0F5132");

  // 2. Bookings Sheet
  var bSheet = getOrCreateSheet(ss, SHEET_BOOKINGS, getBookingsHeaders());
  formatHeaders(bSheet, "#0B132B");

  // 3. Config Sheet
  var cSheet = getOrCreateSheet(ss, SHEET_CONFIG, ["Key", "Value", "Description"]);
  formatHeaders(cSheet, "#FF9F1C");
  readBusinessConfig(ss); // Seed defaults

  Logger.log("✅ MargDrive Database initialized successfully!");
}

/**
 * Helpers
 */
function getSearchesHeaders() {
  return [
    "Search ID", "Timestamp", "Service Type", "Pickup Location", "Drop Location",
    "Pickup Date", "Return Date", "Pickup Time", "Phone Number", "Distance KM",
    "Search Status", "User Agent"
  ];
}

function getBookingsHeaders() {
  return [
    "Booking ID", "Booking Timestamp", "Booking Status", "Full Name", "Email",
    "Country Code", "Phone Number", "From City", "To City", "Pickup Address",
    "Dropoff Address", "Starting Date", "Starting Time", "Returning Date",
    "Returning Time", "Journey Type", "Car Type", "Distance KM", "Base Fare",
    "Vehicle Adjustment", "Regional Adjustment", "Special Route Adjustment", "Applied Rules",
    "Final Fare", "Allocated Driver/Vendor", "Driver/Vendor ID", "Assigned At",
    "Remarks", "Customer SMS", "SMS Status"
  ];
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function formatHeaders(sheet, bgColor) {
  var headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  headerRange.setBackground(bgColor);
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  sheet.setFrozenRows(1);
}

function createJsonResponse(data, statusCode) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
