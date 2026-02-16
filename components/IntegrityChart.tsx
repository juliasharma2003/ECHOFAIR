
import React from 'react';
import { 
  Radar, RadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer 
} from 'recharts';

interface IntegrityChartProps {
  score: number;
}

const IntegrityChart: React.FC<IntegrityChartProps> = ({ score }) => {
  // Generate semi-random sub-metrics based on the main score
  const data = [
    { subject: 'Independence', A: score * 0.9, fullMark: 100 },
    { subject: 'Variety', A: Math.min(100, score * 1.1), fullMark: 100 },
    { subject: 'Organic Growth', A: score * 0.8, fullMark: 100 },
    { subject: 'Curator Trust', A: score, fullMark: 100 },
    { subject: 'Fair Placement', A: Math.min(100, score * 1.2), fullMark: 100 },
  ];

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#222" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#666', fontSize: 10, fontWeight: 700 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Integrity"
            dataKey="A"
            stroke="#00f2ff"
            fill="#00f2ff"
            fillOpacity={0.2}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default IntegrityChart;
