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
  try {
    const response = await fetch('https://api.energy-charts.info/price?country=ro');
    if (!response.ok) return 100.0; 
    const data = await response.json();
    
    if (data && data.price && data.price.length > 0) {
      const latestPrice = data.price[data.price.length - 1];
      return latestPrice || 100.0;
    }
    return 100.0;
  } catch (err) {
    return 100.0; 
  }
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
    balanceSubtext.textContent = `Romania is exporting energy (~${percentageOfConsumption}% of consumption). Estimated value: ${formattedRon} RON/h (at 1 EUR = ${euroToRon.toFixed(2)} RON via Exchange API).`;
    
    balanceLeftLabel.textContent = 'Domestic Consumption Coverage';
    balanceRightLabel.textContent = '100% + Surplus';
    
    balanceBar.className = 'progress-bar bar-export';
    balanceBar.style.width = '100%';

  } else if (balanceMw < 0) {
    balanceBadge.textContent = 'IMPORT';
    balanceBadge.className = 'balance-badge badge-import';
    balanceIcon.textContent = 'Import';
    balanceStatusText.textContent = `Import of ${absBalance} MW (~${formattedRon} RON/h)`;
    balanceSubtext.textContent = `The grid imports ${percentageOfConsumption}% of consumption. Estimated cost: ${formattedRon} RON/h (at 1 EUR = ${euroToRon.toFixed(2)} RON via Exchange API).`;

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
    { name: 'Coal', mw: senData.coal_mw, type: 'fossil' },
    { name: 'Gas', mw: senData.gas_mw, type: 'fossil' },
    { name: 'Nuclear', mw: senData.nuclear_mw, type: 'clean' },
    { name: 'Hydro', mw: senData.hydro_mw, type: 'green' },
    { name: 'Wind', mw: senData.wind_mw, type: 'green' },
    { name: 'Solar', mw: senData.solar_mw, type: 'green' },
    { name: 'Biomass', mw: senData.biomass_mw, type: 'green' }
  ];

  const topSource = [...currentSourcesData].sort((a, b) => b.mw - a.mw)[0];
  topSourceText.textContent = `Top Production Source: ${topSource.name} (${topSource.mw.toFixed(2)} MW)`;

  fossilVsGreenText.textContent = `Fossil Generation: ${senData.total_fossil_mw} MW | Green Generation: ${senData.total_green_mw} MW`;

  fossilVsGreenText.innerHTML = `
    Fossil Generation: <strong style="color: #b91c1c;">${senData.total_fossil_mw} MW</strong> | 
    Green Generation: <strong style="color: #15803d;">${senData.total_green_mw} MW</strong>
  `;

  renderFilteredSources();
}

function renderFilteredSources() {
  const threshold = parseFloat(mwThresholdInput.value) || 0;
  filteredSourcesList.innerHTML = '';

  const activeSources = currentSourcesData.filter(source => source.mw >= threshold);

  if (activeSources.length === 0) {
    filteredSourcesList.innerHTML = '<li>No energy sources exceed this threshold.</li>';
    return;
  }

  activeSources.forEach(source => {
    const li = document.createElement('li');
    li.textContent = `${source.name}: ${source.mw.toFixed(2)} MW (${source.type.toUpperCase()})`;
    filteredSourcesList.appendChild(li);
  });
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
      url: targetUrl,
      parse: response => response.text()
    },
    {
      url: `https://proxy.corsfix.com/?${targetUrl}`,
      parse: response => response.text()
    },
    {
      url: `https://api.codetabs.com/v1/proxy?quest=${encodedTargetUrl}`,
      parse: response => response.text()
    },
    {
      url: `https://api.allorigins.win/get?url=${encodedTargetUrl}`,
      parse: async response => {
        const data = await response.json();
        return data && data.contents;
      }
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