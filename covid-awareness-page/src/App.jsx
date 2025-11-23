import './App.css'; 
import DataCard from './components/DataCard'; 
import ChartDashboard from './components/ChartDashboard'; // <-- NEW IMPORT

function App() {
  
  // The POWER_BI_EMBED_URL is no longer needed since we are using native charts
  
  return (
    <div className="container">
      
      <header className="header">
        <h1>Global COVID-19 Awareness Dashboard 🌍</h1>
      </header>
      
      {/* Structured Cards Section for Key Metrics */}
      <section className="data-cards-section">
        {/* Mock data cards remain for a clean look */}
        <DataCard
          title="Total Confirmed Deaths"
          value="6.98M"
          description="Global cumulative mortality reported to date."
          color="#A81921" // Deep Red
        />
        <DataCard
          title="Avg Case Fatality Ratio"
          value="1.2%"
          description="Average ratio of deaths to confirmed cases globally."
          color="#3498DB" // Strong Blue
        />
        <DataCard
          title="Daily New Cases (7-Day Avg)"
          value="45,200"
          description="Current 7-day rolling average of new cases."
          color="#27AE60" // Green
        />
      </section>

      {/* 2. NATIVE CHARTS AND MAPS (Replacing Power BI Embed) */}
      <section className="dashboard-section">
        <h2>Interactive Global Trends</h2>
        {/* Render the new chart component */}
        <ChartDashboard /> 
      </section>
      
      {/* 3. Awareness Footer */}
      <footer className="footer">
        <p>Data provided for educational purposes. Source: JHU CSSE. Consult official health organizations for guidance.</p>
      </footer>
    </div>
  );
}

export default App;