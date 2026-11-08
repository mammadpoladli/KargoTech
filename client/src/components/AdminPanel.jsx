import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import MapComponent from './MapComponent';
import RouteTable from './RouteTable';
import StatsCharts from './StatsCharts';

const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState('dashboard');

    const [routes, setRoutes] = useState([]);
    const [allCargos, setAllCargos] = useState([]);
    const [stations, setStations] = useState([]);
    const [vehicles, setVehicles] = useState([]);

    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ totalCost: 0, totalDist: 0, vehicleCount: 0 });

    const [algoMode, setAlgoMode] = useState('unlimited');
    const [strategy, setStrategy] = useState('max_weight');

    const [selectedCargoIds, setSelectedCargoIds] = useState([]);


    const [focusedRouteIndex, setFocusedRouteIndex] = useState(null);

    const getTodayString = () => new Date().toLocaleDateString('en-CA');
    const [filterDate, setFilterDate] = useState(getTodayString());
    const [historyFilterDate, setHistoryFilterDate] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    const [showStationMapModal, setShowStationMapModal] = useState(false);

    const [newStation, setNewStation] = useState({ name: '', latitude: '', longitude: '' });
    const [newVehicle, setNewVehicle] = useState({ name: '', capacity: '' });

    const [settings, setSettings] = useState({ rentalCost: 200, distanceCost: 1 });

    const navigate = useNavigate();

    useEffect(() => {
        fetchAllCargos();
        fetchStations();
        fetchVehicles();
    }, []);


    useEffect(() => {
        setFocusedRouteIndex(null);
    }, [activeTab]);

    useEffect(() => {
        const timer = setTimeout(() => { setDebouncedSearchTerm(searchTerm); }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const formatDateSafe = (dateVal) => {
        if (!dateVal) return null;
        const d = new Date(dateVal);
        return d.toLocaleDateString('en-CA');
    };

    const filteredCargos = useMemo(() => {
        const filtered = allCargos.filter(c => {
            const matchesText = !debouncedSearchTerm || (
                (c.customer_name && c.customer_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
                (c.station_name && c.station_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
            );

            const reqDate = formatDateSafe(c.request_date);
            const tripDate = c.trip_date ? formatDateSafe(c.trip_date) : null;

            const matchesDate = !historyFilterDate || (reqDate === historyFilterDate) || (tripDate === historyFilterDate);

            return matchesText && matchesDate;
        });

        return filtered.sort((a, b) => {
            const dateA = new Date(a.request_date);
            const dateB = new Date(b.request_date);
            return dateA - dateB;
        });

    }, [allCargos, debouncedSearchTerm, historyFilterDate]);

    const derivedHistoryRoutes = useMemo(() => {
        const routeMap = new Map();

        filteredCargos.forEach(c => {
            if (c.status === 'planned' && c.vehicle_name && c.total_cost && c.route_path) {

                const safeCost = parseFloat(c.total_cost).toFixed(2);
                const safeDate = c.trip_date ? formatDateSafe(c.trip_date) : formatDateSafe(c.request_date);

                const uniqueKey = `${c.vehicle_name}-${safeDate}-${safeCost}`;

                if (!routeMap.has(uniqueKey)) {
                    routeMap.set(uniqueKey, {
                        vehicle_name: c.vehicle_name,
                        vehicle_type: c.vehicle_name.includes('Kiralık') ? 'rented' : 'fixed',
                        trip_date: safeDate,
                        total_cost: parseFloat(c.total_cost),
                        total_distance_km: parseFloat(c.total_distance_km || 0),
                        route_path: c.route_path,
                        cargos_detail: []
                    });
                }

                const routeObj = routeMap.get(uniqueKey);
                const customerInfo = `${c.customer_name} (${c.station_name} - ${c.weight_kg}kg)`;
                if (!routeObj.cargos_detail.includes(customerInfo)) {
                    routeObj.cargos_detail.push(customerInfo);
                }
            }
        });
        return Array.from(routeMap.values());
    }, [filteredCargos]);

    const pendingCargos = allCargos.filter(c => c.status === 'pending');

    const fetchAllCargos = async () => { try { const res = await axios.get('http://localhost:3001/api/all-cargos'); setAllCargos(res.data); } catch (err) {} };
    const fetchStations = async () => { try { const res = await axios.get('http://localhost:3001/api/stations'); setStations(res.data); } catch (err) {} };
    const fetchVehicles = async () => { try { const res = await axios.get('http://localhost:3001/api/vehicles'); setVehicles(res.data); } catch (err) {} };

    const handleLogout = () => { localStorage.removeItem('currentUser'); navigate('/login'); };
    const toggleCargoSelection = (id) => { setSelectedCargoIds(prev => prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]); };

    const handlePlanRoutes = async () => {
        if (selectedCargoIds.length === 0) { toast.error("Lütfen listeden en az bir kargo seçiniz!"); return; }
        setLoading(true);
        try {
            const response = await axios.post('http://localhost:3001/api/plan-routes', {
                mode: algoMode,
                strategy: strategy,
                settings,
                selectedIds: selectedCargoIds,
                trip_date: filterDate
            });

            if (response.data.routes && response.data.routes.length > 0) {
                setRoutes(response.data.routes);
                setFocusedRouteIndex(null);

                const totalCost = response.data.routes.reduce((acc, r) => acc + r.total_cost, 0);
                const totalDist = response.data.routes.reduce((acc, r) => acc + r.total_distance_km, 0);

                if (response.data.unassigned > 0) {
                    toast.error(`${response.data.unassigned} kargo kapasite yetersizliğinden planlanamadı!`, { duration: 5000 });
                } else {
                    toast.success("Tüm kargolar başarıyla planlandı!");
                }

                setStats({ totalCost: totalCost.toFixed(2), totalDist: totalDist.toFixed(2), vehicleCount: response.data.routes.length });
                fetchAllCargos();
                setSelectedCargoIds([]);
            } else {
                toast.error(response.data.message || "Rota bulunamadı.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Algoritma hatası.");
        }
        setLoading(false);
    };

    const handleAddStation = async (e) => { e.preventDefault(); try { await axios.post('http://localhost:3001/api/stations', newStation); toast.success("İstasyon eklendi!"); setNewStation({ name: '', latitude: '', longitude: '' }); fetchStations(); } catch (error) { toast.error("Hata."); } };
    const handleDeleteStation = async (id) => { if(!window.confirm("Bu istasyonu silmek istediğinize emin misiniz?")) return; try { await axios.delete(`http://localhost:3001/api/stations/${id}`); toast.success("İstasyon silindi."); fetchStations(); } catch (error) { toast.error("Silinemedi."); } };
    const handleAddVehicle = async (e) => { e.preventDefault(); try { await axios.post('http://localhost:3001/api/vehicles', newVehicle); toast.success("Araç eklendi!"); setNewVehicle({ name: '', capacity: '' }); fetchVehicles(); } catch (error) { toast.error("Hata."); } };
    const handleDeleteVehicle = async (id) => { if(!window.confirm("Bu aracı silmek istediğinize emin misiniz?")) return; try { await axios.delete(`http://localhost:3001/api/vehicles/${id}`); toast.success("Araç silindi."); fetchVehicles(); } catch (error) { toast.error("Silinemedi."); } };

    const handleMapSelection = (lat, lng) => { setNewStation({ ...newStation, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }); setShowStationMapModal(false); toast.success("Konum seçildi!"); };


    const DashboardView = () => {
        const filteredPendingCargos = pendingCargos.filter(c => formatDateSafe(c.request_date) === filterDate);
        const toggleSelectAll = () => { if (selectedCargoIds.length === filteredPendingCargos.length) setSelectedCargoIds([]); else setSelectedCargoIds(filteredPendingCargos.map(c => c.id)); };

        return (
            <div className="tab-content">
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                    <h2 style={{margin:0}}>🏠️ Rota Planlama Merkezi</h2>
                    <div style={{display:'flex', alignItems:'center', gap:'10px', background:'#1e293b', padding:'10px', borderRadius:'10px', border:'1px solid #334155'}}>
                        <span style={{color:'#94a3b8', fontSize:'0.9rem'}}>📅 Planlanacak Tarih:</span>
                        <input type="date" className="form-input" style={{width:'auto', padding:'5px 10px', margin:0}} value={filterDate} onChange={(e) => { setFilterDate(e.target.value); setSelectedCargoIds([]); }} />
                    </div>
                </div>

                <div className="card" style={{ marginBottom: "20px", border: "1px solid #444" }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                        <h3 style={{margin:0, color: '#f59e0b'}}>📦 {new Date(filterDate).toLocaleDateString('tr-TR')} Tarihli Bekleyen Kargolar</h3>
                        <button onClick={toggleSelectAll} className="btn btn-secondary" style={{fontSize:'0.8rem', padding:'5px 10px'}}>
                            {selectedCargoIds.length > 0 && selectedCargoIds.length === filteredPendingCargos.length ? "Seçimi Kaldır" : "Tümünü Seç"}
                        </button>
                    </div>
                    {filteredPendingCargos.length === 0 ? ( <p style={{color:'#777', textAlign:'center', padding:'30px', background:'rgba(0,0,0,0.1)', borderRadius:'8px'}}>Bu tarih için bekleyen kargo bulunamadı. <br/><small>Farklı bir tarih seçmeyi deneyin.</small></p> ) : (
                        <div style={{maxHeight:'250px', overflowY:'auto'}}>
                            <table style={{width:'100%', color:'#ddd', fontSize:'0.9rem'}}>
                                <thead><tr style={{textAlign:'left', borderBottom:'1px solid #333'}}><th style={{padding:'10px', width:'40px'}}>✓</th><th>Müşteri</th><th>Hedef</th><th>Detay</th></tr></thead>
                                <tbody>
                                {filteredPendingCargos.map(c => (
                                    <tr key={c.id} style={{background: selectedCargoIds.includes(c.id) ? 'rgba(59, 130, 246, 0.1)' : 'transparent', borderBottom:'1px solid #222', cursor:'pointer'}} onClick={() => toggleCargoSelection(c.id)}>
                                        <td style={{padding:'10px'}}><input type="checkbox" checked={selectedCargoIds.includes(c.id)} onChange={() => {}} style={{cursor:'pointer'}} /></td>
                                        <td>{c.customer_name}</td><td style={{fontWeight:'bold', color:'#f59e0b'}}>{c.station_name}</td><td>{c.quantity} ad / <b>{c.weight_kg} kg</b></td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div style={{marginTop:'15px', paddingTop:'10px', borderTop:'1px solid #333', display:'flex', justifyContent:'flex-end', alignItems:'center', gap:'15px'}}>
                        <span style={{color:'#aaa'}}>{selectedCargoIds.length} kargo seçildi</span>

                        <select value={algoMode} onChange={(e) => setAlgoMode(e.target.value)} className="form-select" style={{width:'auto'}}>
                            <option value="unlimited">Sınırsız Araç (Otomatik)</option>
                            <option value="limited">Sınırlı Araç (Filo)</option>
                        </select>

                        <button onClick={handlePlanRoutes} disabled={loading || selectedCargoIds.length === 0} className="btn btn-success">
                            {loading ? "Hesaplanıyor..." : "🚀 Bu Günü Rotala"}
                        </button>
                    </div>
                </div>

                <div className="dashboard-grid">
                    <div className="sidebar" style={{height: '600px', marginBottom: '30px', gridTemplateColumns: '1fr 350px'}}>
                        <div className="stat-card"><div className="stat-label">Aktif Rota</div><div className="stat-value">{stats.vehicleCount}</div></div>
                        <div className="stat-card" style={{borderLeftColor: '#f59e0b'}}><div className="stat-label">Toplam Mesafe</div><div className="stat-value">{stats.totalDist} km</div></div>
                        <div className="stat-card" style={{borderLeftColor: '#10b981'}}><div className="stat-label">Toplam Maliyet</div><div className="stat-value">{stats.totalCost} ₺</div></div>
                    </div>
                    <div className="map-wrapper">
                        <MapComponent routes={routes} focusedRouteIndex={focusedRouteIndex} />
                    </div>
                </div>

                {routes.length > 0 && (
                    <RouteTable
                        routes={routes}
                        focusedRouteIndex={focusedRouteIndex}
                        onRouteSelect={setFocusedRouteIndex}
                    />
                )}
            </div>
        );
    };

    return (
        <div className="admin-layout">
            <div className="sidebar-menu">
                <div className="sidebar-header">📦 KargoTech</div>
                <div className={`menu-item ${activeTab==='dashboard'?'active':''}`} onClick={() => setActiveTab('dashboard')}>🏠️ Genel Bakış</div>
                <div className={`menu-item ${activeTab==='history'?'active':''}`} onClick={() => setActiveTab('history')}>📋 Müşteri Geçmişi</div>
                <div className={`menu-item ${activeTab==='management'?'active':''}`} onClick={() => setActiveTab('management')}>🛠️ Sistem Yönetimi</div>
                <div className={`menu-item ${activeTab==='settings'?'active':''}`} onClick={() => setActiveTab('settings')}>⚙️ Ayarlar</div>
                <div style={{marginTop:'auto', borderTop:'1px solid #333', paddingTop:'20px'}}>
                    <div className="menu-item" onClick={handleLogout} style={{color:'#ef4444'}}>🚪 Çıkış Yap</div>
                </div>
            </div>
            <div className="admin-content">
                {activeTab === 'dashboard' && <DashboardView />}

                {activeTab === 'history' && (
                    <div className="tab-content">
                        <h2 style={{marginTop:0}}>📋 Geçmiş Sefer Analizi</h2>

                        <div style={{display:'flex', gap:'15px', marginBottom:'20px', flexWrap:'wrap', background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155'}}>
                            <div style={{flex: 1}}>
                                <label style={{display:'block', fontSize:'0.8rem', color:'#94a3b8', marginBottom:'5px'}}>Metin Ara</label>
                                <input type="text" placeholder="🔍 Müşteri, İlçe veya Araç..." className="form-input" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                            <div>
                                <label style={{display:'block', fontSize:'0.8rem', color:'#94a3b8', marginBottom:'5px'}}>Tarih Seç</label>
                                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                    <input type="date" className="form-input" style={{width:'auto'}} value={historyFilterDate} onChange={e => setHistoryFilterDate(e.target.value)} />
                                    {historyFilterDate && <button onClick={() => setHistoryFilterDate('')} className="btn btn-secondary" style={{padding:'10px'}}>Temizle</button>}
                                </div>
                            </div>
                        </div>

                        {derivedHistoryRoutes.length > 0 ? (
                            <div className="dashboard-grid" style={{height: '600px', marginBottom: '30px', gridTemplateColumns: '1fr 350px'}}>
                                <div className="map-wrapper" style={{border: '2px solid #334155'}}>
                                    <MapComponent routes={derivedHistoryRoutes} focusedRouteIndex={focusedRouteIndex} />
                                </div>

                                <div className="history-sidebar" style={{overflowY: 'auto', paddingRight: '5px', display:'flex', flexDirection:'column', gap:'15px'}}>
                                    <h3 style={{margin: '0 0 10px 0', fontSize: '1rem', color: '#cbd5e1', position:'sticky', top:0, background:'var(--bg-dark)', zIndex:10, paddingBottom:'10px'}}>
                                        📍 Görüntülenen Seferler ({derivedHistoryRoutes.length})
                                    </h3>

                                    {derivedHistoryRoutes.map((route, idx) => (
                                        <div
                                            key={idx}
                                            className="card"
                                            onClick={() => setFocusedRouteIndex(idx === focusedRouteIndex ? null : idx)}
                                            style={{
                                                padding: '15px',
                                                cursor: 'pointer',
                                                border: focusedRouteIndex === idx ? '1px solid #3b82f6' : '1px solid #334155',
                                                background: focusedRouteIndex === idx ? 'rgba(59, 130, 246, 0.1)' : '#1e293b',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
                                                <span style={{fontWeight:'bold', color: '#fff'}}>{route.vehicle_name}</span>
                                                <span style={{fontSize:'0.8rem', color:'#94a3b8'}}>{route.trip_date}</span>
                                            </div>

                                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px', fontSize:'0.9rem', marginBottom:'10px'}}>
                                                <div style={{color:'#10b981'}}>💰 {route.total_cost.toFixed(2)} TL</div>
                                                <div style={{color:'#f59e0b'}}>🛣️ {route.total_distance_km.toFixed(1)} km</div>
                                            </div>

                                            <div style={{borderTop:'1px solid #334155', paddingTop:'8px'}}>
                                                <div style={{fontSize:'0.75rem', color:'#64748b', marginBottom:'4px'}}>YÜK SAHİPLERİ:</div>
                                                <div style={{fontSize:'0.85rem', color:'#cbd5e1', lineHeight:'1.4'}}>
                                                    {route.cargos_detail.slice(0, 3).map((detail, i) => (
                                                        <div key={i}>• {detail}</div>
                                                    ))}
                                                    {route.cargos_detail.length > 3 && <div style={{color:'#3b82f6'}}>+ {route.cargos_detail.length - 3} diğer</div>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{padding:'40px', textAlign:'center', border:'2px dashed #334155', borderRadius:'12px', color:'#64748b', marginBottom:'30px'}}>
                                Harita üzerinde gösterilecek rota bulunamadı. Lütfen filtreleri kontrol edin.
                            </div>
                        )}

                        {filteredCargos.length > 0 && <StatsCharts allCargos={filteredCargos} routes={derivedHistoryRoutes} />}

                        <div className="card" style={{overflowX:'auto', marginTop:'30px'}}>
                            <h3 style={{margin:'0 0 15px 0', fontSize:'1.1rem', color:'#3b82f6'}}>📋 Tüm Kayıt Listesi</h3>
                            <table style={{width:'100%', color:'#ddd'}}>
                                <thead><tr style={{borderBottom:'2px solid #444', textAlign:'left'}}><th>Müşteri</th><th>Hedef</th><th>Tarih</th><th>Durum</th><th>Araç</th><th>Tutar</th></tr></thead>
                                <tbody>
                                {filteredCargos.length === 0 ? ( <tr><td colSpan="6" style={{padding:'20px', textAlign:'center', color:'#777'}}>Kayıt bulunamadı.</td></tr> ) : (
                                    filteredCargos.map((c, index) => (
                                        <tr key={`${c.id}-${index}`} style={{borderBottom:'1px solid #333'}}>
                                            <td style={{padding:'10px'}}>{c.customer_name}</td>
                                            <td>{c.station_name}</td>
                                            <td style={{color:'#aaa', fontSize:'0.9rem'}}>{formatDateSafe(c.request_date)}</td>
                                            <td><span style={{color: c.status==='planned' ? '#34d399' : '#fcd34d'}}>{c.status==='planned' ? 'Planlandı' : 'Bekliyor'}</span></td>
                                            <td>{c.vehicle_name || '-'}</td>
                                            <td style={{color: '#10b981'}}>{c.total_cost ? `${c.total_cost} ₺` : '-'}</td>
                                        </tr>
                                    ))
                                )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'management' && (
                    <div className="tab-content">
                        <h2 style={{marginTop:0}}>🛠️ Sistem Yönetimi</h2>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'30px'}}>
                            <div>
                                <h3 style={{color: '#f59e0b'}}>📍 İstasyon Yönetimi</h3>
                                <div className="card" style={{marginBottom:'20px'}}>
                                    <h4>Yeni İstasyon</h4>
                                    <form onSubmit={handleAddStation}>
                                        <input type="text" placeholder="İlçe Adı" className="form-input" style={{marginBottom:'10px'}} required value={newStation.name} onChange={e => setNewStation({...newStation, name: e.target.value})} />
                                        <div style={{display:'flex', gap:'10px', marginBottom:'10px', alignItems:'flex-end'}}>
                                            <div style={{flex:1}}><input type="number" placeholder="Lat" className="form-input" required value={newStation.latitude} onChange={e => setNewStation({...newStation, latitude: e.target.value})} /></div>
                                            <div style={{flex:1}}><input type="number" placeholder="Lng" className="form-input" required value={newStation.longitude} onChange={e => setNewStation({...newStation, longitude: e.target.value})} /></div>
                                            <button type="button" onClick={() => setShowStationMapModal(true)} className="btn btn-secondary" style={{height:'42px', padding:'0 15px'}}>🗺️ Seç</button>
                                        </div>
                                        <button type="submit" className="btn btn-primary" style={{width:'100%'}}>+ Ekle</button>
                                    </form>
                                </div>
                                <div className="card">
                                    <h4>Kayıtlı İstasyonlar</h4>
                                    <div style={{maxHeight:'300px', overflowY:'auto'}}>
                                        {stations.map(s => (
                                            <div key={s.id} style={{padding:'10px', borderBottom:'1px solid #333', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                                <span>{s.name}</span>
                                                <button onClick={() => handleDeleteStation(s.id)} style={{background:'#ef4444', color:'white', border:'none', borderRadius:'4px', padding:'5px 10px', cursor:'pointer'}}>Sil</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 style={{color: '#3b82f6'}}>🚚 Araç Filosu Yönetimi</h3>
                                <div className="card" style={{marginBottom:'20px'}}>
                                    <h4>Yeni Araç Tanımla</h4>
                                    <form onSubmit={handleAddVehicle}>
                                        <input type="text" placeholder="Araç Adı (Örn: Kamyon 41)" className="form-input" style={{marginBottom:'10px'}} required value={newVehicle.name} onChange={e => setNewVehicle({...newVehicle, name: e.target.value})} />
                                        <input type="number" placeholder="Kapasite (kg)" className="form-input" style={{marginBottom:'10px'}} required value={newVehicle.capacity} onChange={e => setNewVehicle({...newVehicle, capacity: e.target.value})} />
                                        <button type="submit" className="btn btn-primary" style={{width:'100%'}}>+ Filoya Ekle</button>
                                    </form>
                                </div>
                                <div className="card">
                                    <h4>Mevcut Filo</h4>
                                    <div style={{maxHeight:'300px', overflowY:'auto'}}>
                                        {vehicles.map(v => (
                                            <div key={v.id} style={{padding:'10px', background:'#252525', marginBottom:'5px', borderRadius:'5px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                                <div><span>{v.name}</span><span style={{color:'#10b981', fontWeight:'bold', marginLeft:'10px'}}>{v.capacity_kg} kg</span></div>
                                                <button onClick={() => handleDeleteVehicle(v.id)} style={{background:'#ef4444', color:'white', border:'none', borderRadius:'4px', padding:'5px 10px', cursor:'pointer'}}>Sil</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {showStationMapModal && (
                            <div style={{position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.8)', zIndex:2000, display:'flex', justifyContent:'center', alignItems:'center'}}>
                                <div style={{width:'80%', height:'80%', background:'#222', padding:'20px', display:'flex', flexDirection:'column', borderRadius:'12px'}}>
                                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                                        <h3 style={{margin:0}}>📍 Konum Seçmek İçin Haritaya Tıklayın</h3>
                                        <button onClick={() => setShowStationMapModal(false)} className="btn btn-danger">İptal</button>
                                    </div>
                                    <div style={{flex:1, borderRadius:'12px', overflow:'hidden', border:'2px solid #555'}}>
                                        <MapComponent selectionMode={true} onLocationSelect={handleMapSelection} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                {activeTab === 'settings' && (
                    <div className="tab-content">
                        <h2 style={{marginTop:0}}>⚙️ Parametreler</h2>
                        <div className="card" style={{maxWidth:'500px'}}>
                            <h3>Maliyet Ayarları</h3>
                            <div className="form-group"><label>Kiralama Maliyeti (TL)</label><input type="number" className="form-input" value={settings.rentalCost} onChange={e => setSettings({...settings, rentalCost: e.target.value})} /></div>
                            <div className="form-group"><label>Yol Maliyeti (TL/km)</label><input type="number" className="form-input" value={settings.distanceCost} onChange={e => setSettings({...settings, distanceCost: e.target.value})} /></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminPanel;