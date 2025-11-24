import './App.css';
import { Routes, Route, Navigate, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import DataCard from './components/DataCard';
import ChartDashboard from './components/ChartDashboard';

function ChartDashboardRoute() {
  const { view } = useParams();
  const navigate = useNavigate();
  const normalizedView = view === 'deaths' ? 'deaths' : 'cases';

  return (
    <ChartDashboard
      chartPage={normalizedView}
      onChartPageChange={(next) => navigate(`/charts/${next}`)}
    />
  );
}

function App() {
  const location = useLocation();
  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <>
      <div className="container">
        <header className="header">
          <h1>Global COVID-19 Awareness Dashboard 🌍</h1>
          <nav className="sub-nav">
            <Link className={isActive('/charts/cases') ? 'active' : ''} to="/charts/cases">Daily Cases</Link>
            <Link className={isActive('/charts/deaths') ? 'active' : ''} to="/charts/deaths">Daily Deaths</Link>
          </nav>
        </header>

        <section className="data-cards-section">
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

        <section className="dashboard-section">
          <h2>Interactive Global Trends</h2>
          <Routes>
            <Route path="/" element={<Navigate to="/charts/cases" replace />} />
            <Route path="/charts/:view" element={<ChartDashboardRoute />} />
            <Route path="*" element={<Navigate to="/charts/cases" replace />} />
          </Routes>
        </section>
      </div>

      <footer className="footer">
        <p>Data provided for educational purposes. Source: JHU CSSE. Consult official health organizations for guidance.</p>
      </footer>
    </>
  );
}

export default App;