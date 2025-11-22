import React from 'react';
import './DataCard.css'; // We'll create this CSS file next

function DataCard({ title, value, description, color }) {
  return (
    <div className="data-card" style={{ borderColor: color }}>
      <div className="card-title" style={{ color: color }}>
        {title}
      </div>
      <div className="card-value">
        {value}
      </div>
      <div className="card-description">
        {description}
      </div>
    </div>
  );
}

export default DataCard;