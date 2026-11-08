import React from 'react';

const RouteTable = ({ routes, onRouteSelect, focusedRouteIndex }) => {
    if (!routes || routes.length === 0) return null;

    return (
        <div className="card" style={{ marginTop: "20px", overflowX: "auto" }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "15px" }}>
                <h3 style={{ margin: 0, color: "#3b82f6" }}>📋 Sefer Detayları ve Yolcu Listesi</h3>

                {focusedRouteIndex !== null && (
                    <button
                        onClick={() => onRouteSelect(null)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8rem', padding: '5px 10px' }}
                    >
                        🔄 Tüm Rotaları Göster
                    </button>
                )}
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", color: "#ddd" }}>
                <thead>
                <tr style={{ borderBottom: "2px solid #444", textAlign: "left" }}>
                    <th style={{ padding: "12px", textAlign:'center' }}>Seç</th>
                    <th style={{ padding: "12px" }}>Araç Adı</th>
                    <th style={{ padding: "12px" }}>Doluluk</th>
                    <th style={{ padding: "12px" }}>Güzergah</th>
                    <th style={{ padding: "12px" }}>Mesafe</th>
                    <th style={{ padding: "12px" }}>Toplam Maliyet</th>
                    <th style={{ padding: "12px" }}>Kargo ID'leri</th>
                </tr>
                </thead>
                <tbody>
                {routes.map((route, index) => {
                    const isSelected = focusedRouteIndex === index;
                    const isDimmed = focusedRouteIndex !== null && !isSelected;

                    return (
                        <tr
                            key={index}
                            onClick={() => onRouteSelect(index)}
                            style={{
                                borderBottom: "1px solid #333",
                                backgroundColor: isSelected ? "rgba(59, 130, 246, 0.2)" : (index % 2 === 0 ? "transparent" : "#252525"),
                                opacity: isDimmed ? 0.4 : 1,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <td style={{ padding: "12px", textAlign:'center' }}>
                                {isSelected ? '👁️' : '○'}
                            </td>
                            <td style={{ padding: "12px", color: "#fff", fontWeight: "bold" }}>{route.vehicle_name}</td>
                            <td style={{ padding: "12px" }}>
                                    <span style={{
                                        padding: "4px 8px",
                                        borderRadius: "4px",
                                        backgroundColor: route.vehicle_type === 'rented' ? '#b91c1c' : '#047857',
                                        fontSize: "0.85rem"
                                    }}>
                                        {route.capacity_usage}
                                    </span>
                            </td>
                            <td style={{ padding: "12px", fontSize: "0.9rem", color: "#aaa" }}>
                                {route.route_path.map(p => p.name).join(" ➝ ")}
                            </td>
                            <td style={{ padding: "12px" }}>{route.total_distance_km.toFixed(1)} km</td>
                            <td style={{ padding: "12px", color: "#10b981", fontWeight: "bold" }}>{route.total_cost.toFixed(2)} ₺</td>
                            <td style={{ padding: "12px", fontSize: "0.85rem", color: "#aaa" }}>
                                {route.cargos && route.cargos.length > 0
                                    ? route.cargos.join(", ")
                                    : "-"}
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
            <div style={{marginTop: '10px', fontSize:'0.8rem', color:'#666', textAlign:'center'}}>
                * Haritada sadece o aracı görmek için satıra tıklayınız.
            </div>
        </div>
    );
};

export default RouteTable;