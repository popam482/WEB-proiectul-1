# National Power Grid & Carbon Monitor

A lightweight dashboard for monitoring real-time energy production, consumption, financial metrics, and carbon emissions for Romania's National Power Grid (SEN).

## Key Features

- **Live Data Scraping**: Parses real-time power grid generation and consumption data from public grid endpoints.
- **Resilient Fallback System**: Handles Cross-Origin Resource Sharing (CORS) restrictions using multiple proxy layers to guarantee high availability.
- **Carbon Emissions Calculation**: Computes grid carbon intensity (g CO2 / kWh) and hourly mass emissions (t CO2 / h) based on IPCC WG III AR5 emission factors.
- **Financial Estimations**: Integrates real-time exchange rates (EUR/RON) and European spot market prices to estimate import/export financial flow.
- **Smart Consumption Advisor**: Evaluates current carbon intensity and renewable energy share to provide automated consumption recommendations.
- **Interactive Filtering & Sorting**: Allows users to filter energy sources by minimal production thresholds, generation types (Green, Fossil, Clean), and sort by total capacity or carbon footprint.
- **Theme Support**: Includes Light and Dark theme modes with user preference saved in LocalStorage.

## Tech Stack

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Data Source**: sistemulenergetic.ro (Public SEN Data)
- **External APIs**: ExchangeRate-API (Currency Rates), Energy-Charts / OPCOM proxy (Spot Energy Prices)
- **Calculation Standards**: IPCC WG III AR5 Emission Coefficients

## Installation & Running

No build tools or node dependencies are required.

1. Clone or download the repository:
   ```bash
   git clone [https://github.com/your-username/power-grid-monitor.git](https://github.com/your-username/power-grid-monitor.git)
