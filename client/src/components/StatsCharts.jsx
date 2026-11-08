import React, { useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const displayLimit = 8;
        const hiddenCount = data.musteriler ? data.musteriler.length - displayLimit : 0;

        return (
            <div style={{ backgroundColor: '#1e293b', border: '1px solid #475569', padding: '12px', borderRadius: '8px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)', minWidth: '220px', zIndex: 1000 }}>
                <p style={{ fontWeight: 'bold', borderBottom: '1px solid #334155', paddingBottom: '8px', marginBottom: '8px', color: '#f8fafc' }}>
                    📅 {label}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.9rem', marginBottom: '10px' }}>
                    <div>
                        <span style={{ color: '#94a3b8', display:'block', fontSize:'0.8rem' }}>Toplam Mesafe</span>
                        <span style={{ color: '#f59e0b', fontWeight:'bold' }}>{data.Mesafe.toFixed(1)} km</span>
                    </div>
                    <div>
                        <span style={{ color: '#94a3b8', display:'block', fontSize:'0.8rem' }}>Toplam Maliyet</span>
                        <span style={{ color: '#10b981', fontWeight:'bold' }}>{data.Maliyet.toFixed(2)} ₺</span>
                    </div>
                </div>

                <div style={{ borderTop: '1px solid #334155', paddingTop: '8px' }}>
                    <span style={{ color: '#cbd5e1', fontSize: '0.85rem', fontWeight: '600' }}>📦 Yük Listesi ({data.musteriler?.length || 0})</span>

                    <ul style={{ margin: '5px 0 0 0', paddingLeft: '15px', color: '#94a3b8', fontSize: '0.8rem', listStyleType: 'disc' }}>
                        {data.musteriler && data.musteriler.length > 0 ? (
                            data.musteriler.slice(0, displayLimit).map((m, i) => (
                                <li key={i} style={{marginBottom:'2px'}}>{m}</li>
                            ))
                        ) : (
                            <li>Detay yok</li>
                        )}

                        {hiddenCount > 0 && (
                            <li style={{ color: '#f59e0b', listStyleType: 'none', marginTop: '5px', fontStyle: 'italic' }}>
                                + {hiddenCount} diğer yük... <br/>
                                <span style={{fontSize:'0.75rem', color:'#aaa'}}>(Tam liste için çubuğa tıklayın)</span>
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        );
    }
    return null;
};

const StatsCharts = ({ allCargos, routes }) => {

    const stationData = useMemo(() => {
        const stats = {};
        const processedIds = new Set();

        allCargos.forEach(c => {
            if (processedIds.has(c.id)) return;
            processedIds.add(c.id);

            if (!stats[c.station_name]) { stats[c.station_name] = { name: c.station_name, Agirlik: 0 }; }
            stats[c.station_name].Agirlik += c.weight_kg;
        });
        return Object.values(stats).sort((a, b) => b.Agirlik - a.Agirlik).slice(0, 10);
    }, [allCargos]);

    const statusData = useMemo(() => {
        let pending = 0, planned = 0;
        const processedIds = new Set();

        allCargos.forEach(c => {
            if (processedIds.has(c.id)) return;
            processedIds.add(c.id);
            c.status === 'pending' ? pending++ : planned++;
        });
        return [{ name: 'Bekleyen', value: pending }, { name: 'Planlanan', value: planned }];
    }, [allCargos]);

    const vehicleCostData = useMemo(() => {
        const uniqueKeys = new Set();
        const cleanRoutes = routes.filter(r => {
            const key = `${r.vehicle_name}-${r.trip_date}-${r.total_cost}`;
            if (uniqueKeys.has(key)) return false;
            uniqueKeys.add(key);
            return true;
        });

        const aggregatedMap = {};

        cleanRoutes.forEach(r => {
            const groupKey = `${r.vehicle_name}::${r.trip_date}`;
            if (!aggregatedMap[groupKey]) {
                aggregatedMap[groupKey] = {
                    keyName: `${r.vehicle_name} (${r.trip_date})`,
                    vehicleBase: r.vehicle_name,
                    date: r.trip_date,
                    Maliyet: 0,
                    Mesafe: 0,
                    musteriler: []
                };
            }
            aggregatedMap[groupKey].Maliyet += r.total_cost;
            aggregatedMap[groupKey].Mesafe += r.total_distance_km;

            if (r.cargos_detail && Array.isArray(r.cargos_detail)) {
                r.cargos_detail.forEach(c => {
                    const cText = typeof c === 'string' ? c : `${c.username || 'Müşteri'} (${c.station || '-'})`;
                    aggregatedMap[groupKey].musteriler.push(cText);
                });
            }
        });

        return Object.values(aggregatedMap).sort((a, b) => {
            return new Date(a.date) - new Date(b.date);
        });
    }, [routes]);

    const handleBarClick = (data) => {
        if (data && data.musteriler && data.musteriler.length > 0) {
            alert(`📋 ${data.keyName} - Tam Yük Listesi:\n\n` + data.musteriler.map(m => `- ${m}`).join('\n'));
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '30px' }}>

            <div className="card" style={{ height: '350px', width: '100%', minWidth: 0 }}>
                <h3 style={{ color: '#aaa', fontSize: '1rem', marginBottom: '10px' }}>📊 İlçe Bazlı Yük Dağılımı (kg)</h3>
                <ResponsiveContainer width="99%" height="100%">
                    <BarChart data={stationData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }} />
                        <Bar dataKey="Agirlik" fill="#3b82f6" name="Ağırlık (kg)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="card" style={{ height: '350px', width: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3 style={{ color: '#aaa', fontSize: '1rem', marginBottom: '10px' }}>📈 Kargo Durum Özeti</h3>
                <ResponsiveContainer width="99%" height="90%">
                    <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label>
                            {statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#f59e0b' : '#10b981'} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                        <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {routes.length > 0 && (
                <div className="card" style={{ height: '350px', gridColumn: '1 / -1', width: '100%', minWidth: 0 }}>
                    <h3 style={{ color: '#aaa', fontSize: '1rem', marginBottom: '10px' }}>🚚 Araç Bazlı Günlük Toplam Performans</h3>
                    <ResponsiveContainer width="99%" height="100%">
                        <BarChart
                            key={JSON.stringify(vehicleCostData)}
                            data={vehicleCostData}
                            margin={{ top: 5, right: 30, left: 20, bottom: 50 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                            <XAxis
                                dataKey="keyName"
                                stroke="#94a3b8"
                                angle={-15}
                                textAnchor="end"
                                height={60}
                                fontSize={12}
                            />
                            <YAxis yAxisId="left" stroke="#10b981" />
                            <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" />

                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                            <Legend verticalAlign="top"/>

                            <Bar
                                yAxisId="left"
                                dataKey="Maliyet"
                                fill="#10b981"
                                name="Toplam Maliyet (TL)"
                                radius={[4, 4, 0, 0]}
                                onClick={handleBarClick}
                                style={{cursor: 'pointer'}}
                            />
                            <Bar
                                yAxisId="right"
                                dataKey="Mesafe"
                                fill="#f59e0b"
                                name="Toplam Mesafe (km)"
                                radius={[4, 4, 0, 0]}
                                onClick={handleBarClick}
                                style={{cursor: 'pointer'}}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

export default StatsCharts;