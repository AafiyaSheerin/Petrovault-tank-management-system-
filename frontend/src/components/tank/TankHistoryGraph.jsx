import React from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from 'recharts';
import { format } from 'date-fns';

const TankHistoryGraph = ({ history = [] }) => {
    // History comes newest-first from backend — reverse for chronological chart
    const chartData = [...history]
        .reverse()
        .map((h) => ({
            time: format(new Date(h.created_at), 'dd MMM, HH:mm'),
            fill: h.fill_percentage_after,
            volume: h.volume_after,
        }));

    if (chartData.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
                No history data available yet
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval="preserveStartEnd"
                />
                <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    label={{ value: 'Fill %', angle: -90, position: 'insideLeft', fontSize: 12, fill: '#64748b' }}
                    domain={[0, 100]}
                />
                <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                    formatter={(value, name) => {
                        if (name === 'fill') return [`${value}%`, 'Fill Level'];
                        return [`${value?.toLocaleString()} L`, 'Volume'];
                    }}
                />
                <Legend
                    formatter={(value) => (value === 'fill' ? 'Fill Level (%)' : 'Volume (L)')}
                    wrapperStyle={{ fontSize: 12 }}
                />
                <Line
                    type="monotone"
                    dataKey="fill"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default TankHistoryGraph;