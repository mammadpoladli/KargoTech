require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcryptjs');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

function calculateRoadDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 50;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const airDistance = R * c;
    return parseFloat((airDistance * 1.3).toFixed(2));
}

const initAdmin = async () => {
    try {
        const check = await db.query("SELECT * FROM users WHERE role = 'admin'");
        if (check.rows.length === 0) {
            const hash = await bcrypt.hash("12345", 10);
            await db.query("INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'admin')", ['admin', hash]);
            console.log("✅ Admin hesabı oluşturuldu.");
        }
    } catch (err) { console.error("Admin hatası:", err.message); }
};

const defaultStations = ['Başiskele', 'Çayırova', 'Darıca', 'Derince', 'Dilovası', 'Gebze', 'Gölcük', 'Kandıra', 'Karamürsel', 'Kartepe', 'Körfez', 'İzmit', 'KOÜ Merkez'];
const distanceMatrix = [
    [0, 45, 50, 15, 35, 40, 12, 50, 32, 15, 20, 10, 15],
    [45, 0, 10, 35, 12, 8, 50, 85, 40, 55, 25, 45, 55],
    [50, 10, 0, 40, 18, 12, 55, 90, 45, 60, 30, 50, 60],
    [15, 35, 40, 0, 25, 30, 20, 60, 40, 25, 10, 12, 20],
    [35, 12, 18, 25, 0, 10, 40, 75, 25, 45, 15, 35, 45],
    [40, 8, 12, 30, 10, 0, 45, 80, 30, 50, 20, 40, 50],
    [12, 50, 55, 20, 40, 45, 0, 60, 20, 20, 25, 15, 20],
    [50, 85, 90, 60, 75, 80, 60, 0, 80, 45, 65, 40, 45],
    [32, 40, 45, 40, 25, 30, 20, 80, 0, 45, 30, 35, 40],
    [15, 55, 60, 25, 45, 50, 20, 45, 45, 0, 30, 12, 10],
    [20, 25, 30, 10, 15, 20, 25, 65, 30, 30, 0, 20, 30],
    [10, 45, 50, 12, 35, 40, 15, 40, 35, 12, 20, 0, 10],
    [15, 55, 60, 20, 45, 50, 20, 45, 40, 10, 30, 10, 0]
];

const getDistance = (startName, endName, startLat, startLng, endLat, endLng) => {
    const idx1 = defaultStations.indexOf(startName);
    const idx2 = defaultStations.indexOf(endName);
    if (idx1 !== -1 && idx2 !== -1) return distanceMatrix[idx1][idx2];
    return calculateRoadDistance(startLat, startLng, endLat, endLng);
};


app.get('/api/all-cargos', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT cr.id, u.username as customer_name, s.name as station_name, cr.quantity, cr.weight_kg, cr.status, cr.request_date,
                    r.route_path, r.total_distance_km, r.total_cost, r.trip_date,
                    CASE WHEN v.name IS NOT NULL THEN v.name WHEN r.vehicle_id = 4 THEN 'Kiralık Araç' ELSE '-' END as vehicle_name
             FROM cargo_requests cr 
             JOIN stations s ON cr.station_id = s.id 
             JOIN users u ON cr.user_id = u.id
             LEFT JOIN route_cargos rc ON cr.id = rc.cargo_request_id
             LEFT JOIN routes r ON rc.route_id = r.id
             LEFT JOIN vehicles v ON r.vehicle_id = v.id
             ORDER BY CASE WHEN cr.status = 'pending' THEN 1 ELSE 2 END, cr.id DESC`
        );
        res.json(result.rows);
    } catch (err) { console.error("GET /all-cargos:", err.message); res.status(500).send('DB Error'); }
});

app.post('/api/register', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const userExist = await db.query("SELECT * FROM users WHERE username = $1", [username]);
        if (userExist.rows.length > 0) return res.status(400).json({ error: "Kullanıcı adı dolu." });
        const hash = await bcrypt.hash(password, 10);
        const newUser = await db.query("INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role", [username, hash, role]);
        res.json({ message: "Başarılı", user: newUser.rows[0] });
    } catch (err) { console.error(err.message); res.status(500).send("Hata"); }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const userResult = await db.query("SELECT * FROM users WHERE username = $1", [username]);
        if (userResult.rows.length === 0) return res.status(400).json({ error: "Kullanıcı yok." });
        const valid = await bcrypt.compare(password, userResult.rows[0].password_hash);
        if (!valid) return res.status(401).json({ error: "Şifre hatalı." });
        res.json({ id: userResult.rows[0].id, username: userResult.rows[0].username, role: userResult.rows[0].role });
    } catch (err) { console.error(err.message); res.status(500).send("Hata"); }
});

app.get('/api/stations', async (req, res) => {
    try { const result = await db.query('SELECT id, name, latitude, longitude FROM stations ORDER BY name ASC'); res.json(result.rows); }
    catch (err) { console.error(err.message); res.status(500).send('Hata'); }
});
app.post('/api/stations', async (req, res) => {
    try { const result = await db.query("INSERT INTO stations (name, latitude, longitude) VALUES ($1, $2, $3) RETURNING *", [req.body.name, req.body.latitude, req.body.longitude]); res.json({ message: "Eklendi", station: result.rows[0] }); }
    catch (err) { console.error(err.message); res.status(500).send('Hata'); }
});
app.delete('/api/stations/:id', async (req, res) => {
    try {
        await db.query("DELETE FROM stations WHERE id = $1", [req.params.id]);
        res.json({ message: "İstasyon Silindi" });
    } catch (err) {
        res.status(500).json({ error: "Bu istasyon kullanımda olduğu için silinemiyor." });
    }
});

app.get('/api/vehicles', async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM vehicles WHERE type='fixed' ORDER BY id ASC");
        res.json(result.rows);
    }
    catch (err) { res.status(500).send('Hata'); }
});

app.post('/api/vehicles', async (req, res) => {
    const { name, capacity } = req.body;
    try {
        const result = await db.query("INSERT INTO vehicles (name, capacity_kg, type, rental_cost) VALUES ($1, $2, 'fixed', 0) RETURNING *", [name, capacity]);
        res.json({ message: "Araç Eklendi", vehicle: result.rows[0] });
    } catch (err) { res.status(500).send('Hata'); }
});
app.delete('/api/vehicles/:id', async (req, res) => {
    try {
        await db.query("DELETE FROM vehicles WHERE id = $1", [req.params.id]);
        res.json({ message: "Araç Silindi" });
    } catch (err) { res.status(500).json({ error: "Araç silinemedi." }); }
});

app.post('/api/cargo', async (req, res) => {
    try {
        const { user_id, station_id, quantity, weight_kg, request_date } = req.body;
        const result = await db.query(
            "INSERT INTO cargo_requests (user_id, station_id, quantity, weight_kg, request_date, status) VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *",
            [user_id, station_id, quantity, weight_kg, request_date]
        );
        res.json(result.rows[0]);
    }
    catch (err) { console.error(err.message); res.status(500).send('Hata'); }
});

app.get('/api/user-cargos/:userId', async (req, res) => {
    try {
        const result = await db.query(
            `SELECT cr.id, s.name as station_name, cr.quantity, cr.weight_kg, cr.status, cr.request_date,
                CASE WHEN v.name IS NOT NULL THEN v.name WHEN r.vehicle_id = 4 THEN 'Kiralık Araç' ELSE '-' END as vehicle_name,
                r.route_path, r.total_distance_km, r.total_cost 
             FROM cargo_requests cr JOIN stations s ON cr.station_id = s.id
             LEFT JOIN route_cargos rc ON cr.id = rc.cargo_request_id
             LEFT JOIN routes r ON rc.route_id = r.id
             LEFT JOIN vehicles v ON r.vehicle_id = v.id
             WHERE cr.user_id = $1 ORDER BY cr.id DESC`, [req.params.userId]
        );
        res.json(result.rows);
    } catch (err) { console.error(err.message); res.status(500).send('Hata'); }
});

app.post('/api/plan-routes', async (req, res) => {
    try {
        const { mode, settings, selectedIds, trip_date, strategy = 'max_weight' } = req.body;
        const RENTAL_COST = settings?.rentalCost || 200;
        const RENTAL_CAPACITY = 500;
        const DISTANCE_COST = settings?.distanceCost || 1;
        const SELECTED_DATE = trip_date || new Date().toISOString().split('T')[0];

        if (!selectedIds || selectedIds.length === 0) {
            return res.json({ message: "Lütfen listeye eklemek için en az bir kargo seçiniz.", routes: [] });
        }

        const cargoResult = await db.query(
            `SELECT cr.id, cr.quantity, cr.weight_kg, s.id as station_id, s.name as station_name, s.latitude, s.longitude, u.username
             FROM cargo_requests cr 
             JOIN stations s ON cr.station_id = s.id 
             JOIN users u ON cr.user_id = u.id 
             WHERE cr.id = ANY($1::int[]) AND cr.status = 'pending'`,
            [selectedIds]
        );

        let requests = cargoResult.rows;
        if (requests.length === 0) return res.json({ message: "Seçilen kargolar uygun değil.", routes: [] });

        const vehicleResult = await db.query("SELECT * FROM vehicles WHERE type = 'fixed' ORDER BY capacity_kg DESC");
        let dbVehicles = vehicleResult.rows;

        if (dbVehicles.length === 0) {
            dbVehicles = [
                { id: 3, name: 'Tır (1000kg)', capacity_kg: 1000 },
                { id: 2, name: 'Kamyon (750kg)', capacity_kg: 750 },
                { id: 1, name: 'Kamyonet (500kg)', capacity_kg: 500 }
            ];
        }

        let uniqueStationsMap = {};
        requests.forEach(req => {
            if (!uniqueStationsMap[req.station_id]) {
                uniqueStationsMap[req.station_id] = {
                    station_id: req.station_id,
                    name: req.station_name,
                    lat: parseFloat(req.latitude),
                    lng: parseFloat(req.longitude),
                    total_weight: 0,
                    original_cargos: []
                };
            }
            uniqueStationsMap[req.station_id].total_weight += req.weight_kg;
            uniqueStationsMap[req.station_id].original_cargos.push(req);
        });

        let packages = Object.values(uniqueStationsMap).sort((a, b) => b.total_weight - a.total_weight);

        let fleet = dbVehicles.map(v => ({
            id: v.id,
            name: v.name,
            capacity: v.capacity_kg,
            type: 'fixed',
            cost_base: 0,
            loads: [],
            current_load: 0
        }));


        for (let vehicle of fleet) {
            if (vehicle.current_load >= vehicle.capacity) continue;

            for (let pkg of packages) {
                if (pkg.total_weight <= 0) continue;

                let space = vehicle.capacity - vehicle.current_load;
                if (space <= 0) break;

                let takeAmount = Math.min(space, pkg.total_weight);

                vehicle.loads.push({
                    name: pkg.name,
                    lat: pkg.lat,
                    lng: pkg.lng,
                    weight: takeAmount,
                    cargoIds: pkg.original_cargos.map(c => c.id)
                });

                vehicle.current_load += takeAmount;
                pkg.total_weight -= takeAmount;
            }
        }

        let remainingWeightTotal = packages.reduce((acc, p) => acc + p.total_weight, 0);

        if (mode === 'unlimited' && remainingWeightTotal > 0) {

            while (remainingWeightTotal > 0) {
                let rentalVehicle = {
                    id: 9000 + fleet.length,
                    name: `Kiralık Araç ${fleet.length - dbVehicles.length + 1}`,
                    capacity: RENTAL_CAPACITY,
                    type: 'rented',
                    cost_base: parseInt(RENTAL_COST),
                    loads: [],
                    current_load: 0
                };

                for (let pkg of packages) {
                    if (pkg.total_weight <= 0) continue;

                    let space = rentalVehicle.capacity - rentalVehicle.current_load;
                    if (space <= 0) break;

                    let takeAmount = Math.min(space, pkg.total_weight);

                    rentalVehicle.loads.push({
                        name: pkg.name,
                        lat: pkg.lat,
                        lng: pkg.lng,
                        weight: takeAmount,
                        cargoIds: pkg.original_cargos.map(c => c.id)
                    });

                    rentalVehicle.current_load += takeAmount;
                    pkg.total_weight -= takeAmount;
                    remainingWeightTotal -= takeAmount;
                }

                fleet.push(rentalVehicle);
            }
        }


        let finalRoutes = [];
        const centerLat = 40.8220; const centerLng = 29.9200;

        for (let vehicle of fleet) {
            if (vehicle.loads.length === 0) continue;


            let uniqueStopsMap = {};
            vehicle.loads.forEach(l => {
                uniqueStopsMap[l.name] = { name: l.name, lat: l.lat, lng: l.lng };
            });
            let stops = Object.values(uniqueStopsMap);

            let routePath = [{ name: 'KOÜ Merkez', lat: centerLat, lng: centerLng }];
            let estimatedDistance = 0;
            let currentLat = centerLat; let currentLng = centerLng; let currentName = 'KOÜ Merkez';
            let remainingStops = [...stops];

            while (remainingStops.length > 0) {
                let nearestIdx = -1;
                let minKm = Infinity;

                remainingStops.forEach((stop, idx) => {
                    let dist = getDistance(currentName, stop.name, currentLat, currentLng, stop.lat, stop.lng);
                    if (dist < minKm) {
                        minKm = dist;
                        nearestIdx = idx;
                    }
                });

                let nextStop = remainingStops[nearestIdx];
                estimatedDistance += minKm;
                currentLat = nextStop.lat; currentLng = nextStop.lng; currentName = nextStop.name;
                routePath.push({ name: currentName, lat: currentLat, lng: currentLng });
                remainingStops.splice(nearestIdx, 1);
            }

            estimatedDistance += getDistance(currentName, 'KOÜ Merkez', currentLat, currentLng, centerLat, centerLng);
            routePath.push({ name: 'KOÜ Merkez', lat: centerLat, lng: centerLng });

            let realDistanceKm = estimatedDistance;
            try {
                const waypoints = routePath.map(p => `${p.lng},${p.lat}`).join(';');
                const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${waypoints}?overview=false`;
                const osrmRes = await axios.get(osrmUrl, { timeout: 5000 });
                if (osrmRes.data.routes && osrmRes.data.routes.length > 0) {
                    realDistanceKm = parseFloat((osrmRes.data.routes[0].distance / 1000).toFixed(2));
                }
            } catch (err) {
                console.log("OSRM ulaşılamadı, tahmini mesafe kullanılıyor.");
            }

            const finalCost = parseFloat((realDistanceKm * parseFloat(DISTANCE_COST) + vehicle.cost_base).toFixed(2));

            let allCargosInVehicle = [];
            let allCargoIds = [];

            vehicle.loads.forEach(load => {
                allCargosInVehicle.push({
                    station: load.name,
                    weight: load.weight,
                    username: 'Yük Parçası'
                });
                load.cargoIds.forEach(id => {
                    if(!allCargoIds.includes(id)) allCargoIds.push(id);
                });
            });

            finalRoutes.push({
                vehicle_id: vehicle.id,
                vehicle_name: vehicle.name,
                vehicle_type: vehicle.type,
                capacity_usage: `${vehicle.current_load} / ${vehicle.capacity} kg`,
                route_path: routePath,
                total_distance_km: realDistanceKm,
                total_cost: finalCost,
                cargos_detail: allCargosInVehicle,
                cargos: allCargoIds
            });
        }

        for (const route of finalRoutes) {
            const dbVehicleId = route.vehicle_type === 'rented' ? 4 : route.vehicle_id;

            const routeInsert = await db.query(
                "INSERT INTO routes (vehicle_id, total_distance_km, total_cost, route_path, trip_date) VALUES ($1, $2, $3, $4, $5) RETURNING id",
                [dbVehicleId, route.total_distance_km, route.total_cost, JSON.stringify(route.route_path), SELECTED_DATE]
            );

            for (const cargoId of route.cargos) {
                await db.query(`
                    INSERT INTO route_cargos (route_id, cargo_request_id) 
                    VALUES ($1, $2) 
                    ON CONFLICT DO NOTHING`,
                    [routeInsert.rows[0].id, cargoId]
                );
                await db.query(`UPDATE cargo_requests SET status = 'planned' WHERE id = $1`, [cargoId]);
            }
        }


        let unassignedCount = 0;
        if(mode !== 'unlimited' && remainingWeightTotal > 0) {
            unassignedCount = packages.filter(p => p.total_weight > 0).length;
        }

        res.json({ status: "success", message: "Rota planlandı.", routes: finalRoutes, unassigned: unassignedCount });

    } catch (err) {
        console.error("ROTA PLANLAMA HATASI:", err.message);
        res.status(500).send('Hata: ' + err.message);
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => { await initAdmin(); console.log(`Sunucu ${PORT} portunda çalışıyor.`); });