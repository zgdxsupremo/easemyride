const fs = require('fs');
const path = require('path');
const ROUTES_CONFIG = require('./assets/js/routes-config.js');
const CitySearch = require('./assets/js/city-search.js');
global.CitySearch = CitySearch;
const PricingEngine = require('./assets/js/pricing.js');

function generatePageHtml(route) {
  const quoteSedan = PricingEngine.calculateOneWayFare({
    origin: route.from,
    destination: route.to,
    distanceKm: route.distanceKm,
    carType: 'sedan'
  });
  const quoteSuv = PricingEngine.calculateOneWayFare({
    origin: route.from,
    destination: route.to,
    distanceKm: route.distanceKm,
    carType: 'suv'
  });
  const quoteCrysta = PricingEngine.calculateOneWayFare({
    origin: route.from,
    destination: route.to,
    distanceKm: route.distanceKm,
    carType: 'crysta'
  });

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": route.faqs.map(f => ({
      "@type": "Question",
      "name": f.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": f.a
      }
    }))
  };

  const taxiSchema = {
    "@context": "https://schema.org",
    "@type": "TaxiService",
    "name": `Marg Drive — ${route.from} to ${route.to} Cab Service`,
    "provider": {
      "@type": "LocalBusiness",
      "name": "Marg Drive",
      "telephone": "+91-9041710472"
    },
    "areaServed": "India",
    "description": route.metaDescription
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${route.title}</title>
  <meta name="description" content="${route.metaDescription}">
  <link rel="canonical" href="https://margdrive.in/${route.slug}.html">

  <!-- Open Graph / Meta -->
  <meta property="og:title" content="${route.title}">
  <meta property="og:description" content="${route.metaDescription}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://margdrive.in/${route.slug}.html">
  <meta name="twitter:card" content="summary_large_image">

  <!-- Fonts & Styles -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/main.css">
  <link rel="stylesheet" href="assets/css/responsive.css">

  <!-- JSON-LD Structured Data -->
  <script type="application/ld+json">
  ${JSON.stringify(taxiSchema, null, 2)}
  </script>
  <script type="application/ld+json">
  ${JSON.stringify(faqSchema, null, 2)}
  </script>
</head>
<body>

  <!-- Dynamic Header -->
  <header class="site-header" id="site-header"></header>

  <!-- Route Hero Section -->
  <section class="hero-section" style="padding: 4rem 0 3rem;">
    <div class="container">
      <div class="hero-content text-center" style="max-width:860px; margin:0 auto 2.5rem;">
        <div class="hero-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>Outstation Cab Route</span>
        </div>
        <h1 class="hero-title" style="font-size:2.4rem;">${route.heading}</h1>
        <p class="hero-subtitle">
          ${route.subheading}
        </p>
      </div>

      <!-- Quick Route Highlights Bar -->
      <div style="background:#FFF; border-radius:var(--radius-lg); border:1px solid var(--gray-200); box-shadow:var(--shadow-sm); padding:1.5rem; display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:1.5rem; margin-bottom:2.5rem; text-align:center;">
        <div>
          <div style="font-size:0.8rem; color:var(--gray-500); text-transform:uppercase; font-weight:700;">Approx. Distance</div>
          <div style="font-size:1.4rem; font-weight:800; color:var(--secondary);">${route.distanceKm} KM</div>
        </div>
        <div>
          <div style="font-size:0.8rem; color:var(--gray-500); text-transform:uppercase; font-weight:700;">Estimated Travel Time</div>
          <div style="font-size:1.4rem; font-weight:800; color:var(--secondary);">${route.duration}</div>
        </div>
        <div>
          <div style="font-size:0.8rem; color:var(--gray-500); text-transform:uppercase; font-weight:700;">Primary Highway</div>
          <div style="font-size:1.15rem; font-weight:700; color:var(--primary);">${route.highway}</div>
        </div>
        <div>
          <div style="font-size:0.8rem; color:var(--gray-500); text-transform:uppercase; font-weight:700;">Sedan Fare Starts</div>
          <div style="font-size:1.4rem; font-weight:800; color:#16A34A;">₹${quoteSedan.finalFare.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <!-- Main Search & Booking Form for this Route -->
      <div class="search-widget-wrapper" style="max-width:960px; margin:0 auto;">
        <div class="widget-content">
          <form id="hero-search-form" class="search-form" novalidate>
            <div class="form-grid">
              <div class="form-group" id="group-pickup-city">
                <label for="pickup-city">Pickup Location</label>
                <div class="input-with-icon">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>
                  <input type="text" id="pickup-city" class="form-control" value="${route.from}" required>
                </div>
              </div>

              <div class="form-group" id="group-drop-city">
                <label for="drop-city">Destination</label>
                <div class="input-with-icon">
                  <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/></svg>
                  <input type="text" id="drop-city" class="form-control" value="${route.to}" required>
                </div>
              </div>

              <div class="form-group">
                <label for="pickup-date">Pickup Date</label>
                <input type="date" id="pickup-date" class="form-control" required>
              </div>

              <div class="form-group">
                <label for="pickup-time">Pickup Time</label>
                <input type="time" id="pickup-time" class="form-control" value="08:00" required>
              </div>

              <div class="form-group" style="display:none;" id="group-return-date">
                <label for="return-date">Return Date</label>
                <input type="date" id="return-date" class="form-control">
              </div>

              <div class="form-group" style="display:none;" id="group-return-time">
                <label for="return-time">Return Time</label>
                <input type="time" id="return-time" class="form-control" value="18:00">
              </div>
            </div>

            <div style="margin-top:1.25rem;">
              <button type="submit" class="btn btn-primary btn-block btn-lg">
                <span>View Available Cabs & Book</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </section>

  <!-- Route Overview & Content -->
  <section class="section section-alt">
    <div class="container" style="max-width:960px;">
      <div class="section-header text-left" style="margin-bottom:1.5rem;">
        <h2 class="section-title">Route Overview & Journey Details</h2>
      </div>
      <div style="background:#FFF; border:1px solid var(--gray-200); border-radius:var(--radius-xl); padding:2rem; line-height:1.8; color:var(--gray-700); margin-bottom:2.5rem; box-shadow:var(--shadow-sm);">
        <p style="font-size:1.05rem; margin-bottom:1.25rem;">
          ${route.overview}
        </p>
        <p>
          Traveling from <strong>${route.from}</strong> to <strong>${route.to}</strong> covers approximately <strong>${route.distanceKm} KM</strong> of well-maintained highways. MargDrive coordinates punctual, door-to-door cab dispatch with independent commercial partners with zero hidden platform markups.
        </p>
      </div>

      <!-- Vehicle Options & Pricing Breakdown -->
      <div class="section-header text-left" style="margin-bottom:1.5rem;">
        <h2 class="section-title">Available Vehicle Options & Estimated Fares</h2>
        <p class="section-subtitle">Transparent rates based on deterministic road distance formulas.</p>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:1.5rem; margin-bottom:2.5rem;">
        <!-- Sedan Card -->
        <div style="background:#FFF; border:2px solid var(--primary); border-radius:var(--radius-lg); padding:1.5rem; box-shadow:var(--shadow-sm);">
          <div style="display:inline-block; background:var(--primary-subtle); color:var(--primary); font-size:0.75rem; font-weight:700; padding:3px 8px; border-radius:12px; margin-bottom:0.5rem;">Most Popular</div>
          <h3 style="font-size:1.25rem; color:var(--secondary); margin-bottom:0.25rem;">Sedan (Dzire / Etios)</h3>
          <div style="font-size:0.85rem; color:var(--gray-500); margin-bottom:1rem;">4 Passengers • 2 Large Bags • AC</div>
          <div style="font-size:2rem; font-weight:800; color:var(--primary); margin-bottom:0.5rem;">₹${quoteSedan.finalFare.toLocaleString('en-IN')}</div>
          <div style="font-size:0.78rem; color:var(--gray-500); margin-bottom:1rem;">Base Fare • Toll taxes payable per receipt</div>
          <a href="search.html?service=oneway&from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}&dist=${route.distanceKm}" class="btn btn-primary btn-block btn-sm">Select Sedan</a>
        </div>

        <!-- SUV Card -->
        <div style="background:#FFF; border:1px solid var(--gray-200); border-radius:var(--radius-lg); padding:1.5rem; box-shadow:var(--shadow-sm);">
          <div style="display:inline-block; background:#FEF3C7; color:#B45309; font-size:0.75rem; font-weight:700; padding:3px 8px; border-radius:12px; margin-bottom:0.5rem;">Family Pick</div>
          <h3 style="font-size:1.25rem; color:var(--secondary); margin-bottom:0.25rem;">SUV (Ertiga / Carens)</h3>
          <div style="font-size:0.85rem; color:var(--gray-500); margin-bottom:1rem;">6 Passengers • 3 Large Bags • AC</div>
          <div style="font-size:2rem; font-weight:800; color:var(--secondary); margin-bottom:0.5rem;">₹${quoteSuv.finalFare.toLocaleString('en-IN')}</div>
          <div style="font-size:0.78rem; color:var(--gray-500); margin-bottom:1rem;">Base Fare • Extra luggage space</div>
          <a href="search.html?service=oneway&from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}&dist=${route.distanceKm}" class="btn btn-outline btn-block btn-sm">Select SUV</a>
        </div>

        <!-- Crysta Card -->
        <div style="background:#FFF; border:1px solid var(--gray-200); border-radius:var(--radius-lg); padding:1.5rem; box-shadow:var(--shadow-sm);">
          <div style="display:inline-block; background:#F1F5F9; color:#475569; font-size:0.75rem; font-weight:700; padding:3px 8px; border-radius:12px; margin-bottom:0.5rem;">Executive Luxury</div>
          <h3 style="font-size:1.25rem; color:var(--secondary); margin-bottom:0.25rem;">Innova Crysta</h3>
          <div style="font-size:0.85rem; color:var(--gray-500); margin-bottom:1rem;">7 Passengers • 4 Bags • Luxury Recliner</div>
          <div style="font-size:2rem; font-weight:800; color:var(--secondary); margin-bottom:0.5rem;">₹${quoteCrysta.finalFare.toLocaleString('en-IN')}</div>
          <div style="font-size:0.78rem; color:var(--gray-500); margin-bottom:1rem;">Premium Highway Comfort</div>
          <a href="search.html?service=oneway&from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}&dist=${route.distanceKm}" class="btn btn-outline btn-block btn-sm">Select Crysta</a>
        </div>
      </div>

      <!-- Why Travel with Marg Drive -->
      <div class="features-grid" style="margin-bottom:3rem;">
        <div class="feature-box">
          <div class="feature-icon">🛡️</div>
          <div class="feature-content">
            <h4>Commercial Cab Partners</h4>
            <p>Trips are arranged through independent commercial cab operators with commercial licensed vehicles and partner drivers.</p>
          </div>
        </div>
        <div class="feature-box">
          <div class="feature-icon">💰</div>
          <div class="feature-content">
            <h4>Radical Fare Transparency</h4>
            <p>Know your exact base fare in advance. No arbitrary peak-time surges or opaque commission markups.</p>
          </div>
        </div>
        <div class="feature-box">
          <div class="feature-icon">📞</div>
          <div class="feature-content">
            <h4>24/7 Helpline Support</h4>
            <p>Real dispatch coordinators available 24 hours a day at <strong>9041710472</strong> for immediate assistance.</p>
          </div>
        </div>
      </div>

      <!-- Route FAQ Accordion -->
      <div class="section-header text-left" style="margin-bottom:1.5rem;">
        <h2 class="section-title">Frequently Asked Questions — ${route.from} to ${route.to}</h2>
      </div>

      <div class="faq-container">
        ${route.faqs.map((f, i) => `
          <div class="faq-item ${i === 0 ? 'active' : ''}">
            <button class="faq-question" type="button">
              <span>${f.q}</span>
              <svg class="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div class="faq-answer">
              ${f.a}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </section>

  <!-- Dynamic Footer -->
  <footer class="site-footer" id="site-footer"></footer>

  <!-- Scripts -->
  <script src="assets/js/config.js"></script>
  <script src="assets/js/validation.js"></script>
  <script src="assets/js/distance.js"></script>
  <script src="assets/js/pricing.js"></script>
  <script src="assets/js/city-search.js"></script>
  <script src="assets/js/api.js"></script>
  <script src="assets/js/ui.js"></script>
  <script src="assets/js/app.js"></script>
</body>
</html>`;
}

ROUTES_CONFIG.forEach(route => {
  const html = generatePageHtml(route);
  const filePath = path.join(__dirname, `${route.slug}.html`);
  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`Generated route page: ${route.slug}.html`);
});

console.log(`Successfully generated all ${ROUTES_CONFIG.length} route pages.`);