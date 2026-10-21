// IPCC WG III AR5 (2014) Emission Factors (g CO2 / kWh)
const EMISSION_FACTORS = {
  coal: 820.0,
  gas: 490.0,
  nuclear: 12.0,
  hydro: 24.0,
  wind: 11.0,
  solar: 48.0,
  biomass: 230.0
};

// DOM Element Selectors
const form = document.getElementById('fetch-form');
const resultsContainer = document.getElementById('results');
const loadingSpinner = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');

const resCarbon = document.getElementById('res-carbon');
const resProduction = document.getElementById('res-production');
const resConsumption = document.getElementById('res-consumption');
const resGreenShare = document.getElementById('res-green-share');
const resTimestamp = document.getElementById('res-timestamp');

const resCoal = document.getElementById('res-coal');
const resGas = document.getElementById('res-gas');
const resNuclear = document.getElementById('res-nuclear');
const resHydro = document.getElementById('res-hydro');
const resWind = document.getElementById('res-wind');
const resSolar = document.getElementById('res-solar');
const resBiomass = document.getElementById('res-biomass');
const resBalance = document.getElementById('res-balance');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  hideError();
  hideResults();
  showLoading();

  try {
    const rawHtml = await fetchGridHtml();
    const senData = parseSenHtml(rawHtml);
    const carbonIntensity = calculateGridCarbonIntensity(senData);

    renderDashboard(senData, carbonIntensity);
  } catch (err) {
    showError(err.message || 'An unexpected error occurred while processing grid data.');
  } finally {
    hideLoading();
  }
});

async function fetchGridHtml() {
  const targetUrl = 'https://www.sistemulenergetic.ro/';
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;

  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(`Proxy error (HTTP ${response.status}).`);
  }

  const data = await response.json();
  if (!data || !data.contents) {
    throw new Error('Received empty payload from grid proxy.');
  }

  return data.contents; 
}

function parseNumber(value) {
  if (!value) return 0.0;
  
  // Clean whitespace and special characters
  let cleaned = value.replace(/\u202f/g, '').replace(/\xa0/g, '').replace(/\s+/g, '');
  cleaned = cleaned.replace(/[^0-9,.-]/g, '');

  if (!cleaned) return 0.0;

  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }

  return parseFloat(cleaned) || 0.0;
}

function parseSenHtml(htmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  const rows = doc.querySelectorAll('tr');

  for (const row of rows) {
    const cells = Array.from(row.querySelectorAll('th, td')).map(cell => cell.textContent.trim());
    
    if (cells.length < 12) continue;

    const timestampRaw = cells[0];
    
    // Validate ISO timestamp row
    if (timestampRaw.includes('T') || timestampRaw.match(/^\d{4}-\d{2}-\d{2}/)) {
      const values = cells.slice(1, 12).map(parseNumber);

      if (values[0] > 0 || values[1] > 0) {
        const consumption = values[0];
        const production = values[1];
        const nuclear = values[2];
        const wind = values[3];
        const hydro = values[4];
        const gas = values[5];
        const coal = values[6];
        const solar = values[7];
        const biomass = values[8];
        const balance = -values[10];

        const totalGreen = hydro + wind + solar + biomass;
        const totalFossil = gas + coal;
        const greenShare = production > 0 ? (totalGreen / production) * 100 : 0.0;

        return {
          timestamp: timestampRaw.replace('T', ' '),
          consumption_mw: Number(consumption.toFixed(2)),
          production_mw: Number(production.toFixed(2)),
          balance_mw: Number(balance.toFixed(2)),
          total_green_mw: Number(totalGreen.toFixed(2)),
          total_fossil_mw: Number(totalFossil.toFixed(2)),
          nuclear_mw: Number(nuclear.toFixed(2)),
          green_share_percent: Number(greenShare.toFixed(2)),

          coal_mw: coal,
          gas_mw: gas,
          hydro_mw: hydro,
          wind_mw: wind,
          solar_mw: solar,
          biomass_mw: biomass
        };
      }
    }
  }

  throw new Error('No valid hourly data row found in the grid table.');
}

function calculateGridCarbonIntensity(senData) {
  const totalProd = senData.production_mw;
  if (totalProd <= 0) return 300.0;

  const totalEmissions =
    (senData.coal_mw * EMISSION_FACTORS.coal) +
    (senData.gas_mw * EMISSION_FACTORS.gas) +
    (senData.nuclear_mw * EMISSION_FACTORS.nuclear) +
    (senData.hydro_mw * EMISSION_FACTORS.hydro) +
    (senData.wind_mw * EMISSION_FACTORS.wind) +
    (senData.solar_mw * EMISSION_FACTORS.solar) +
    (senData.biomass_mw * EMISSION_FACTORS.biomass);

  const intensity = totalEmissions / totalProd;
  return Number(intensity.toFixed(2));
}

function renderDashboard(data, intensity) {
  resCarbon.textContent = intensity;
  resProduction.textContent = data.production_mw;
  resConsumption.textContent = data.consumption_mw;
  resGreenShare.textContent = `${data.green_share_percent}%`;
  resTimestamp.textContent = data.timestamp;

  resCoal.textContent = `${data.coal_mw.toFixed(2)} MW`;
  resGas.textContent = `${data.gas_mw.toFixed(2)} MW`;
  resNuclear.textContent = `${data.nuclear_mw.toFixed(2)} MW`;
  resHydro.textContent = `${data.hydro_mw.toFixed(2)} MW`;
  resWind.textContent = `${data.wind_mw.toFixed(2)} MW`;
  resSolar.textContent = `${data.solar_mw.toFixed(2)} MW`;
  resBiomass.textContent = `${data.biomass_mw.toFixed(2)} MW`;
  resBalance.textContent = `${data.balance_mw.toFixed(2)} MW`;

  showResults();
}

function showError(msg) {
  errorMessage.textContent = msg;
  errorMessage.classList.remove('hidden');
}

function hideError() {
  errorMessage.classList.add('hidden');
}

function showLoading() {
  loadingSpinner.classList.remove('hidden');
}

function hideLoading() {
  loadingSpinner.classList.add('hidden');
}

function showResults() {
  resultsContainer.classList.remove('hidden');
}

function hideResults() {
  resultsContainer.classList.add('hidden');
}