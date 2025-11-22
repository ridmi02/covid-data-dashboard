import './App.css'; 
import DataCard from './components/DataCard';

function App() {
  // ⚠️ PASTE YOUR ACTUAL POWER BI URL HERE!
  const POWER_BI_EMBED_URL = "https://app.powerbi.com/reportEmbed?reportId=1adb37c9-ae29-4db0-a879-f4ba314c97e6&autoAuth=true&ctid=44e3cf94-19c9-4e32-96c3-14f5bf01391a"; 

  return (
    <div className="container">
      
      {/* 1. Awareness Header and Key Metrics */}
      <header className="header">
        <h1>Global COVID-19 Awareness Dashboard 🌍</h1>
        <p>Analyzing cases, mortality, and fatality ratios based on JHU data.</p>
        <p className="highlight">
          This dashboard provides data-driven insights into the current spread (New Cases) and mortality impact (Case Fatality Ratio, New Deaths) of COVID-19.
        </p>
      </header>

      {/* NEW: Structured Cards Section */}
      <section className="data-cards-section">
        {/* Mock data based on your Power BI card visuals for better appeal */}
        <DataCard
          title="Total Confirmed Deaths"
          value="6.98M"
          description="Global cumulative mortality reported to date."
          color="#A81921"
        />
        <DataCard
          title="Avg Case Fatality Ratio"
          value="1.2%"
          description="Average ratio of deaths to confirmed cases globally."
          color="#3498DB"
        />
        <DataCard
          title="Daily New Cases (7-Day Avg)"
          value="45,200"
          description="Current 7-day rolling average of new cases."
          color="#27AE60"
        />
      </section>

      {/* 2. Power BI Visualization Embed */}
      <section className="dashboard-section">
        <h2>Interactive Global Trends</h2>
        {/* We use an iframe to embed the live Power BI report */}
        <div className="iframe-wrapper">
          <iframe
            title="COVID-19 Dashboard Final"
            width="100%"
            height="80vh" // Using CSS height unit
            src={POWER_BI_EMBED_URL}
            frameBorder="0"
            allowFullScreen={true} 
          ></iframe>
        </div>
      </section>

      {/* 3. Awareness Footer */}
      <footer className="footer">
        <p>Data provided for educational purposes. Always consult official health organizations for guidance.</p>
      </footer>
    </div>
  );
}

export default App;
