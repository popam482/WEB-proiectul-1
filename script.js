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

const topSourceText = document.getElementById('top-source-text');
const fossilVsGreenText = document.getElementById('fossil-vs-green-text');
const mwThresholdInput = document.getElementById('mw-threshold');
const filteredSourcesList = document.getElementById('filtered-sources-list');

let currentSourcesData = [];

const balanceBadge = document.getElementById('balance-badge');
const balanceIcon = document.getElementById('balance-icon');
const balanceStatusText = document.getElementById('balance-status-text');
const balanceSubtext = document.getElementById('balance-subtext');
const balanceLeftLabel = document.getElementById('balance-left-label');
const balanceRightLabel = document.getElementById('balance-right-label');
const balanceBar = document.getElementById('balance-bar');

//advisor elements
const advisorBadge = document.getElementById('advisor-badge');
const advisorTitle = document.getElementById('advisor-title');
const advisorDescription = document.getElementById('advisor-description');

// filter and sort 
const categoryFilterSelect = document.getElementById('category-filter');
const sortOrderSelect = document.getElementById('sort-order');

//Theme toggle
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const themeText = document.getElementById('theme-text');

const savedTheme = localStorage.getItem('theme');
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
  applyTheme('dark');
} else {
  applyTheme('light');
}

if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    const isDark = document.body.classList.contains('dark-mode');
    const newTheme = isDark ? 'light' : 'dark';
    
    applyTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  });
}

function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
    if (themeText) themeText.textContent = 'Light';
  } else {
    document.body.classList.remove('dark-mode');
    if (themeText) themeText.textContent = 'Dark';
  }
}

function updateSourceBar(elementId, valueMw, totalProductionMw) {
  const barElement = document.getElementById(elementId);
  if (!barElement) return;

  const percentage = totalProductionMw > 0 
    ? Math.min(100, Math.max(0, (valueMw / totalProductionMw) * 100)) 
    : 0;

  barElement.style.width = `${percentage.toFixed(1)}%`;
}

async function fetchExchangeRate() {
  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
    if (!response.ok) return 5.3; 
    const data = await response.json();
    return data.rates.RON || 5.3;
  } catch (err) {
    return 5.3; 
  }
}

async function fetchOpcomEnergyPrice() {
  const targetUrl = 'https://api.energy-charts.info/price?country=ro';
  const encodedTargetUrl = encodeURIComponent(targetUrl);
  const requests = [
    {
      url: targetUrl,
      parse: response => response.json()
    },
    {
      url: `https://corsproxy.io/?url=${encodedTargetUrl}`,
      parse: response => response.json()
    },
    {
      url: `https://api.codetabs.com/v1/proxy?quest=${encodedTargetUrl}`,
      parse: response => response.json()
    }
  ];

  for (const request of requests) {
    try {
      const response = await fetch(request.url);
      if (!response.ok) continue;

      const result = await request.parse(response);
      const data = typeof result === 'string' ? JSON.parse(result) : result;
      if (data && Array.isArray(data.price)) {
        const validPrices = data.price.filter(price => price !== null && price !== undefined);
        if (validPrices.length > 0) {
          return validPrices[validPrices.length - 1];
        }
      }
    } catch (error) {
      // Try the next CORS-enabled endpoint.
    }
  }

  return 100.0;
}

function renderBalanceWidget(balanceMw, consumptionMw, euroToRon=5.3, energyPriceEuro=100.0) {
  if (!balanceBadge) return;

  const absBalance = Math.abs(balanceMw).toFixed(2);
  
  const percentageOfConsumption = consumptionMw > 0 
    ? ((Math.abs(balanceMw) / consumptionMw) * 100).toFixed(1) 
    : 0;

  const hourlyFinancialValueEur = absBalance * energyPriceEuro;
  const hourlyFinancialValueRon = hourlyFinancialValueEur * euroToRon;

  const formattedRon = hourlyFinancialValueRon.toLocaleString('ro-RO', { maximumFractionDigits: 0 });

 if (balanceMw > 0) {
    balanceBadge.textContent = 'EXPORT';
    balanceBadge.className = 'balance-badge badge-export';
    balanceIcon.textContent = 'Export';
    balanceStatusText.textContent = `Export of ${absBalance} MW (~${formattedRon} RON/h)`;
    balanceSubtext.textContent = `Romania is exporting energy (~${percentageOfConsumption}% of consumption). Estimated value: ${formattedRon} RON/h (at 1 EUR = ${euroToRon.toFixed(2)} RON).`;
    
    balanceLeftLabel.textContent = 'Domestic Consumption Coverage';
    balanceRightLabel.textContent = '100% + Surplus';
    
    balanceBar.className = 'progress-bar bar-export';
    balanceBar.style.width = '100%';

  } else if (balanceMw < 0) {
    balanceBadge.textContent = 'IMPORT';
    balanceBadge.className = 'balance-badge badge-import';
    balanceIcon.textContent = 'Import';
    balanceStatusText.textContent = `Import of ${absBalance} MW (~${formattedRon} RON/h)`;
    balanceSubtext.textContent = `The grid imports ${percentageOfConsumption}% of consumption. Estimated cost: ${formattedRon} RON/h (at 1 EUR = ${euroToRon.toFixed(2)} RON).`;

    const coveragePercent = Math.max(0, 100 - percentageOfConsumption).toFixed(1);
    balanceLeftLabel.textContent = 'National Production vs. Consumption';
    balanceRightLabel.textContent = `${coveragePercent}% Domestically Covered`;

    balanceBar.className = 'progress-bar bar-import';
    balanceBar.style.width = `${coveragePercent}%`;

  } else {
    balanceBadge.textContent = 'BALANCE';
    balanceBadge.className = 'balance-badge badge-neutral';
    balanceIcon.textContent = 'Balance';
    balanceStatusText.textContent = 'Neutral Balance (0 MW)';
    balanceSubtext.textContent = 'National production exactly covers domestic consumption.';

    balanceLeftLabel.textContent = 'Internal Consumption Coverage';
    balanceRightLabel.textContent = '100%';

    balanceBar.className = 'progress-bar';
    balanceBar.style.width = '100%';
  }
}
function updateGridInsights(senData) {

  currentSourcesData = [
    { name: 'Coal', mw: senData.coal_mw, type: 'fossil', factor: EMISSION_FACTORS.coal },
    { name: 'Gas', mw: senData.gas_mw, type: 'fossil', factor: EMISSION_FACTORS.gas },
    { name: 'Nuclear', mw: senData.nuclear_mw, type: 'clean', factor: EMISSION_FACTORS.nuclear },
    { name: 'Hydro', mw: senData.hydro_mw, type: 'green', factor: EMISSION_FACTORS.hydro },
    { name: 'Wind', mw: senData.wind_mw, type: 'green', factor: EMISSION_FACTORS.wind },
    { name: 'Solar', mw: senData.solar_mw, type: 'green', factor: EMISSION_FACTORS.solar },
    { name: 'Biomass', mw: senData.biomass_mw, type: 'green', factor: EMISSION_FACTORS.biomass }
  ].map(source => ({
    ...source,
    co2TonsPerHour: (source.mw * source.factor) / 1000
  }));

  const topSource = [...currentSourcesData].sort((a, b) => b.mw - a.mw)[0];
  if (topSourceText) {
    topSourceText.textContent = `Top Production Source: ${topSource.name} (${topSource.mw.toFixed(2)} MW)`;
  }

  if (fossilVsGreenText) {
    fossilVsGreenText.innerHTML = `
      Fossil: <strong style="color: #b91c1c;">${senData.total_fossil_mw} MW</strong> | 
      Green: <strong style="color: #15803d;">${senData.total_green_mw} MW</strong>
    `;
  }

  renderFilteredSources();
}

function renderFilteredSources() {
  if (!filteredSourcesList) return;

  const threshold = parseFloat(mwThresholdInput.value) || 0;
  const selectedCategory = categoryFilterSelect ? categoryFilterSelect.value : 'all';
  const selectedSort = sortOrderSelect ? sortOrderSelect.value : 'mw-desc';

  filteredSourcesList.innerHTML = '';

  let filtered = currentSourcesData.filter(source => {
    const passesMw = source.mw >= threshold;
    let passesCategory = true;

    if (selectedCategory === 'green') passesCategory = source.type === 'green';
    else if (selectedCategory === 'fossil') passesCategory = source.type === 'fossil';
    else if (selectedCategory === 'clean') passesCategory = (source.type === 'green' || source.type === 'clean');

    return passesMw && passesCategory;
  });

  if (selectedSort === 'mw-desc') {
    filtered.sort((a, b) => b.mw - a.mw);
  } else if (selectedSort === 'mw-asc') {
    filtered.sort((a, b) => a.mw - b.mw);
  } else if (selectedSort === 'emissions-desc') {
    filtered.sort((a, b) => b.co2TonsPerHour - a.co2TonsPerHour);
  }

  if (filtered.length === 0) {
    filteredSourcesList.innerHTML = '<li style="color: var(--text-muted); font-size: 0.9rem;">No energy sources match the selected criteria.</li>';
    return;
  }

  filtered.forEach(source => {
    const li = document.createElement('li');
    li.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: var(--badge-bg); border-radius: 6px; font-size: 0.88rem;';

    const typeBadgeColor = source.type === 'fossil' ? '#b91c1c' : (source.type === 'green' ? '#15803d' : '#0284c7');

    li.innerHTML = `
      <div>
        <strong>${source.name}</strong> 
        <span style="font-size: 0.75rem; color: ${typeBadgeColor}; font-weight: 700; margin-left: 6px;">[${source.type.toUpperCase()}]</span>
      </div>
      <div>
        <strong>${source.mw.toFixed(2)} MW</strong>
        <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 8px;">(~${source.co2TonsPerHour.toFixed(1)} t CO₂/h)</span>
      </div>
    `;
    filteredSourcesList.appendChild(li);
  });
}


function updateConsumptionAdvisor(senData, carbonIntensity) {
  if (!advisorBadge || !advisorTitle || !advisorDescription) return;

  const isLowCarbon = carbonIntensity < 220;
  const isHighGreen = senData.green_share_percent >= 45;
  const isSurplus = senData.balance_mw >= 0;
  if (isLowCarbon && isHighGreen) {
    advisorBadge.textContent = 'RECOMMENDED';
    advisorBadge.className = 'balance-badge badge-export';
    advisorTitle.textContent = 'Great time to use energy!';
    advisorDescription.textContent = `The national grid currently has a low carbon intensity (${carbonIntensity} g CO₂/kWh) and a high share of renewable energy (${senData.green_share_percent}%). It is an optimal window for running high-energy appliances or charging devices.`;
  } else if (!isLowCarbon && senData.green_share_percent < 30) {
    advisorBadge.textContent = 'NOT RECOMMENDED';
    advisorBadge.className = 'balance-badge badge-import';
    advisorTitle.textContent = 'Avoid heavy energy consumption!';
    advisorDescription.textContent = `Grid emissions are elevated (${carbonIntensity} g CO₂/kWh) and green energy generation is low (${senData.green_share_percent}%). Consider postponing heavy energy usage if possible.`;
  } else {
    advisorBadge.textContent = 'MODERATE';
    advisorBadge.className = 'balance-badge badge-neutral';
    advisorTitle.textContent = 'Moderate grid impact';
    advisorDescription.textContent = `The power grid is operating at average carbon levels (${carbonIntensity} g CO₂/kWh) with a ${senData.green_share_percent}% green share. Consumption impact is neutral.`;
  }
}

mwThresholdInput.addEventListener('input', renderFilteredSources);


document.addEventListener('DOMContentLoaded', () => {
  loadGridData();
});

async function loadGridData() {
  hideError();
  hideResults();
  showLoading();

  try {
    const [rawHtml, euroToRon, energyPriceEuro] = await Promise.all([
      fetchGridHtml(),
      fetchExchangeRate(),
      fetchOpcomEnergyPrice()
    ]);

    const senData = parseSenHtml(rawHtml);
    const carbonIntensity = calculateGridCarbonIntensity(senData);

    renderDashboard(senData, carbonIntensity, euroToRon, energyPriceEuro);
  } catch (err) {
    showError(err.message || 'An unexpected error occurred while processing grid data.');
  } finally {
    hideLoading();
  }
}

async function fetchGridHtml() {
  const targetUrl = 'https://www.sistemulenergetic.ro/';
  const encodedTargetUrl = encodeURIComponent(targetUrl);
  const requests = [
    {
      url: `https://corsproxy.io/?url=${encodedTargetUrl}`,
      parse: response => response.text()
    },
    {
      url: `https://api.codetabs.com/v1/proxy?quest=${encodedTargetUrl}`,
      parse: response => response.text()
    },
    {
      url: `https://proxy.corsfix.com/?${targetUrl}`,
      parse: response => response.text()
    }
  ];

  const errors = [];

  for (const request of requests) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(request.url, {
        signal: controller.signal,
        headers: {
          Accept: 'text/html, application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await request.parse(response);
      if (typeof html === 'string' && html.trim()) {
        return html;
      }

      throw new Error('empty response');
    } catch (error) {
      errors.push(`${new URL(request.url).hostname}: ${error.name === 'AbortError' ? 'timeout' : error.message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(`Unable to load grid data. ${errors.join(' | ')}`);
}

function parseNumber(value) {
  if (!value) return 0.0;
  
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

function renderDashboard(data, intensity, euroToRon=5.3, energyPriceEuro=100.0) {
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

  const totalProd = data.production_mw;
  updateSourceBar('bar-coal', data.coal_mw, totalProd);
  updateSourceBar('bar-gas', data.gas_mw, totalProd);
  updateSourceBar('bar-nuclear', data.nuclear_mw, totalProd);
  updateSourceBar('bar-hydro', data.hydro_mw, totalProd);
  updateSourceBar('bar-wind', data.wind_mw, totalProd);
  updateSourceBar('bar-solar', data.solar_mw, totalProd);
  updateSourceBar('bar-biomass', data.biomass_mw, totalProd);

  showResults();
  updateGridInsights(data);
  renderBalanceWidget(data.balance_mw, data.consumption_mw, euroToRon, energyPriceEuro);
  updateConsumptionAdvisor(data, intensity);
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

if (categoryFilterSelect) categoryFilterSelect.addEventListener('change', renderFilteredSources);
if (sortOrderSelect) sortOrderSelect.addEventListener('change', renderFilteredSources);