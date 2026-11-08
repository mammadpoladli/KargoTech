import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import MapComponent from './MapComponent';
import toast from 'react-hot-toast';

const UserPanel = () => {
    const [stations, setStations] = useState([]);
    const [myCargos, setMyCargos] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    const [selectedRoute, setSelectedRoute] = useState(null);
    const [showMapModal, setShowMapModal] = useState(false);
    const [selectedCargoIds, setSelectedCargoIds] = useState([]);

    const formatDateSafe = (dateVal) => {
        if (!dateVal) return '';
        const d = new Date(dateVal);
        return d.toLocaleDateString('en-CA');
    };

    const [formData, setFormData] = useState({
        station_id: '', quantity: '', weight_kg: '',
        request_date: formatDateSafe(new Date())
    });

    const [filterDate, setFilterDate] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        if (!user) { navigate('/login'); }
        else {
            setCurrentUser(user);
            fetchStations();
            fetchMyCargos(user.id);
        }
    }, []);

    const fetchStations = async () => { try { const res = await axios.get('http://localhost:3001/api/stations'); setStations(res.data); } catch (err) {} };
    const fetchMyCargos = async (userId) => { try { const res = await axios.get(`http://localhost:3001/api/user-cargos/${userId}`); setMyCargos(res.data); } catch (err) {} };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:3001/api/cargo', {
                user_id: currentUser.id,
                station_id: parseInt(formData.station_id),
                quantity: parseInt(formData.quantity),
                weight_kg: parseInt(formData.weight_kg),
                request_date: formData.request_date
            });
            toast.success('Kargo talebiniz alındı!');
            setFormData({ ...formData, quantity: '', weight_kg: '' });
            fetchMyCargos(currentUser.id);
        } catch (error) { toast.error('Hata oluştu.'); }
    };

    const handleLogout = () => { localStorage.removeItem('currentUser'); navigate('/login'); }


    const openSingleMap = (cargo) => {
        if (cargo.route_path) {
            setSelectedRoute([{
                vehicle_name: cargo.vehicle_name,
                total_cost: parseFloat(cargo.total_cost || 0),
                total_distance_km: parseFloat(cargo.total_distance_km || 0),
                route_path: cargo.route_path
            }]);
            setShowMapModal(true);
        } else {
            toast.error("Bu kargo henüz yola çıkmadı.");
        }
    };

    const toggleSelection = (id) => {
        setSelectedCargoIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const openMultiMap = () => {
        const selectedPlanedCargos = myCargos.filter(c => selectedCargoIds.includes(c.id) && c.status === 'planned');

        if (selectedPlanedCargos.length === 0) {
            toast.error("Lütfen haritada görmek için 'Yolda' olan en az bir kargo seçin.");
            return;
        }

        const routesToShow = selectedPlanedCargos.map(c => ({
            vehicle_name: c.vehicle_name,
            total_cost: parseFloat(c.total_cost || 0),
            total_distance_km: parseFloat(c.total_distance_km || 0),
            route_path: c.route_path
        }));

        setSelectedRoute(routesToShow);
        setShowMapModal(true);
    };

    const toggleSelectAll = () => {
        const visiblePlannedIds = filteredMyCargos
            .filter(c => c.status === 'planned')
            .map(c => c.id);

        if (visiblePlannedIds.every(id => selectedCargoIds.includes(id))) {
            setSelectedCargoIds([]);
        } else {
            setSelectedCargoIds(visiblePlannedIds);
        }
    };

    const filteredMyCargos = myCargos.filter(cargo => {
        if (!filterDate) return true;
        return formatDateSafe(cargo.request_date) === filterDate;
    });

    if (!currentUser) return null;

    const modalSummary = selectedRoute ? {
        count: selectedRoute.length,
        totalDist: selectedRoute.reduce((acc, r) => acc + (r.total_distance_km || 0), 0).toFixed(1),
        totalCost: selectedRoute.reduce((acc, r) => acc + (r.total_cost || 0), 0).toFixed(2)
    } : { count: 0, totalDist: 0, totalCost: 0 };

    return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <nav className="navbar">
                <div className="logo">📦 KargoTech User</div>
                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    <span style={{color: '#aaa'}}>Merhaba, {currentUser.username}</span>
                    <button onClick={handleLogout} className="btn btn-secondary">Çıkış Yap</button>
                </div>
            </nav>

            <div className="container" style={{ display: 'flex', gap: '2rem', marginTop: '30px', flexWrap: 'wrap', justifyContent: 'center' }}>

                <div className="card" style={{ flex: '1', minWidth: '300px', maxWidth: '400px', height: 'fit-content' }}>
                    <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>Yeni Kargo Gönder</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group"><label className="form-label">Teslim İstasyonu</label><select name="station_id" className="form-select" onChange={handleChange} required><option value="">Seçiniz...</option>{stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                        <div className="form-group"><label className="form-label">Adet</label><input type="number" name="quantity" className="form-input" value={formData.quantity} onChange={handleChange} required /></div>
                        <div className="form-group"><label className="form-label">Ağırlık (kg)</label><input type="number" name="weight_kg" className="form-input" value={formData.weight_kg} onChange={handleChange} required /></div>
                        <div className="form-group"><label className="form-label">Talep Tarihi</label><input type="date" name="request_date" className="form-input" value={formData.request_date} onChange={handleChange} required /></div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Talep Oluştur</button>
                    </form>
                </div>

                <div className="card" style={{ flex: '2', minWidth: '300px' }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'10px'}}>
                        <h2 style={{margin:0}}>📦 Kargolarım</h2>

                        <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                            {selectedCargoIds.length > 0 && (
                                <button onClick={openMultiMap} className="btn btn-primary" style={{fontSize:'0.85rem', padding:'8px 15px'}}>
                                    🗺️ ({selectedCargoIds.length}) Seçileni Göster
                                </button>
                            )}

                            <div style={{display:'flex', alignItems:'center', gap:'5px', background:'#0f172a', padding:'5px 10px', borderRadius:'8px', border:'1px solid #334155'}}>
                                <span style={{fontSize:'0.85rem', color:'#aaa'}}>Tarih:</span>
                                <input type="date" className="form-input" style={{width:'auto', padding:'5px', fontSize:'0.85rem', height:'30px'}} value={filterDate} onChange={(e) => setFilterDate(e.target.value)}/>
                                {filterDate && (<button onClick={() => setFilterDate('')} style={{background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:'1.2rem'}}>×</button>)}
                            </div>
                        </div>
                    </div>

                    {filteredMyCargos.length === 0 ? ( <p style={{ color: '#888', textAlign:'center', marginTop:'20px' }}>{filterDate ? 'Seçilen tarihte kargo bulunamadı.' : 'Henüz bir kargo talebiniz yok.'}</p> ) : (
                        <div style={{overflowX:'auto'}}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#ddd' }}>
                                <thead>
                                <tr style={{ borderBottom: '2px solid #444', textAlign: 'left' }}>
                                    <th style={{ padding: '10px', width:'40px', textAlign:'center'}}>
                                        <button onClick={toggleSelectAll} style={{background:'none', border:'none', color:'#3b82f6', cursor:'pointer', fontWeight:'bold'}}>✓</button>
                                    </th>
                                    <th style={{ padding: '10px' }}>Hedef</th>
                                    <th style={{ padding: '10px' }}>Tarih</th>
                                    <th style={{ padding: '10px' }}>Durum</th>
                                    <th style={{ padding: '10px' }}>Mesafe & Tutar</th>
                                    <th style={{ padding: '10px' }}>Araç</th>
                                </tr>
                                </thead>
                                <tbody>
                                {filteredMyCargos.map((cargo, index) => (
                                    <tr key={`${cargo.id}-${index}`} style={{ borderBottom: '1px solid #333', background: selectedCargoIds.includes(cargo.id) ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}>
                                        <td style={{ padding: '10px', textAlign:'center' }}>
                                            {cargo.status === 'planned' && (
                                                <input
                                                    type="checkbox"
                                                    checked={selectedCargoIds.includes(cargo.id)}
                                                    onChange={() => toggleSelection(cargo.id)}
                                                    style={{cursor:'pointer', width:'16px', height:'16px'}}
                                                />
                                            )}
                                        </td>
                                        <td style={{ padding: '10px' }}>{cargo.station_name}</td>
                                        <td style={{ padding: '10px', color:'#aaa', fontSize:'0.9rem' }}>{formatDateSafe(cargo.request_date)}</td>
                                        <td style={{ padding: '10px' }}>
                                            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', backgroundColor: cargo.status === 'planned' ? '#065f46' : '#92400e', color: cargo.status === 'planned' ? '#34d399' : '#fbbf24' }}>
                                                {cargo.status === 'planned' ? 'Yolda' : 'Bekliyor'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px', fontSize:'0.9rem' }}>
                                            {cargo.status === 'planned' ? (
                                                <div>
                                                    <div style={{color:'#f59e0b'}}>{parseFloat(cargo.total_distance_km).toFixed(1)} km</div>
                                                    <div style={{color:'#10b981', fontSize:'0.8rem'}}>{parseFloat(cargo.total_cost).toFixed(2)} ₺</div>
                                                </div>
                                            ) : ( <span style={{color:'#666'}}>-</span> )}
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            {cargo.status === 'planned' ? (
                                                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                                    <span style={{color: '#3b82f6', fontWeight: 'bold', fontSize:'0.9rem'}}>{cargo.vehicle_name}</span>
                                                    <button onClick={() => openSingleMap(cargo)} title="Sadece bu rotayı gör" style={{ background: 'transparent', border: '1px solid #555', color: '#aaa', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', fontSize:'0.8rem' }}>📍</button>
                                                </div>
                                            ) : ( <span style={{color: '#666', fontSize: '0.9rem'}}>Planlanıyor...</span> )}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {showMapModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter:'blur(5px)' }}>
                    <div style={{ width: '85%', height: '85%', background: '#1e293b', borderRadius: '16px', padding: '20px', position: 'relative', display: 'flex', flexDirection: 'column', border:'1px solid #334155', boxShadow:'0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>

                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px', borderBottom:'1px solid #334155', paddingBottom:'15px'}}>
                            <div>
                                <h3 style={{margin:0, display:'flex', alignItems:'center', gap:'10px'}}>
                                    🚚 Kargo Rotası
                                    <span style={{fontSize:'0.9rem', background:'#3b82f6', padding:'2px 8px', borderRadius:'10px', color:'white'}}>{modalSummary.count} Rota</span>
                                </h3>
                                <div style={{display:'flex', gap:'15px', marginTop:'5px', fontSize:'0.9rem', color:'#94a3b8'}}>
                                    <span>🛣️ Toplam Mesafe: <b style={{color:'#f59e0b'}}>{modalSummary.totalDist} km</b></span>
                                    <span>💰 Toplam Maliyet: <b style={{color:'#10b981'}}>{modalSummary.totalCost} ₺</b></span>
                                </div>
                            </div>
                            <button onClick={() => setShowMapModal(false)} className="btn btn-danger" style={{padding:'8px 16px'}}>Kapat</button>
                        </div>

                        <div style={{flex: 1, borderRadius: '12px', overflow: 'hidden', border: '2px solid #334155', position:'relative'}}>
                            <MapComponent routes={selectedRoute} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserPanel;