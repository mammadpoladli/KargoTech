import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import axios from 'axios';
import L from 'leaflet';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

const depotIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
    iconSize: [30, 30],
    iconAnchor: [15, 30]
});

const newLocationIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/1275/1275502.png',
    iconSize: [35, 35],
    iconAnchor: [17, 35]
});

const routeColors = ["#FF3D00", "#2979FF", "#00E676", "#FFC400", "#D500F9", "#FF1744"];

const LocationSelector = ({ onSelect }) => {
    useMapEvents({
        click(e) { onSelect(e.latlng); },
    });
    return null;
};

const chunkArray = (array, size) => {
    const result = [];
    for (let i = 0; i < array.length; i += size) {
        result.push(array.slice(i, i + size));
    }
    return result;
};

const MapComponent = ({ routes, onLocationSelect, selectionMode = false, focusedRouteIndex = null }) => {
    const [stations, setStations] = useState([]);
    const [decodedRoutes, setDecodedRoutes] = useState([]);
    const [tempMarker, setTempMarker] = useState(null);
    const [hoveredRouteIndex, setHoveredRouteIndex] = useState(null);

    const isFetching = useRef(false);

    useEffect(() => {
        const fetchStations = async () => {
            try {
                const response = await axios.get('http://localhost:3001/api/stations');
                setStations(response.data);
            } catch (error) { console.error(error); }
        };
        fetchStations();
    }, []);

    useEffect(() => {
        const fetchRouteGeometries = async () => {
            if (!routes || routes.length === 0) {
                setDecodedRoutes([]);
                return;
            }

            if (isFetching.current) return;
            isFetching.current = true;

            const OFFSET_STEP = 0.00004;

            try {
                const processedRoutes = [];

                for (let i = 0; i < routes.length; i++) {
                    const route = routes[i];
                    const pathPoints = route.route_path;
                    let fullCoordinates = [];

                    const centerIndex = (routes.length - 1) / 2;
                    const offsetMultiplier = (i - centerIndex);
                    const latOffset = offsetMultiplier * OFFSET_STEP;
                    const lngOffset = offsetMultiplier * OFFSET_STEP;

                    const segmentTasks = [];
                    for (let j = 0; j < pathPoints.length - 1; j++) {
                        const start = pathPoints[j];
                        const end = pathPoints[j + 1];

                        segmentTasks.push(async () => {
                            try {
                                const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
                                const response = await axios.get(url, { timeout: 4000 });
                                if (response.data.routes && response.data.routes.length > 0) {
                                    return response.data.routes[0].geometry.coordinates.map(c => [
                                        c[1] + latOffset,
                                        c[0] + lngOffset
                                    ]);
                                }
                            } catch (err) {
                                return [
                                    [start.lat + latOffset, start.lng + lngOffset],
                                    [end.lat + latOffset, end.lng + lngOffset]
                                ];
                            }
                            return [];
                        });
                    }

                    const batches = chunkArray(segmentTasks, 4);

                    for (const batch of batches) {
                        const results = await Promise.all(batch.map(task => task()));
                        results.forEach(coords => {
                            fullCoordinates = [...fullCoordinates, ...coords];
                        });
                        await new Promise(r => setTimeout(r, 100));
                    }

                    processedRoutes.push({ ...route, geometry: fullCoordinates });
                }

                setDecodedRoutes(processedRoutes);
            } catch (error) {
                console.error("Rota çizim hatası:", error);
            } finally {
                isFetching.current = false;
            }
        };

        fetchRouteGeometries();
    }, [routes]);

    const handleMapClick = (latlng) => {
        setTempMarker(latlng);
        if(onLocationSelect) {
            onLocationSelect(latlng.lat, latlng.lng);
        }
    };

    const centerPosition = [40.765, 29.940];

    return (
        <MapContainer center={centerPosition} zoom={10} style={{ height: "100%", width: "100%", borderRadius: "12px" }}>
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            />

            {selectionMode && <LocationSelector onSelect={handleMapClick} />}

            {stations.map((station) => (
                <Marker key={station.id} position={[station.latitude, station.longitude]} icon={depotIcon}>
                    <Popup>
                        <div style={{textAlign: 'center', color:'black'}}>
                            <h3>🏢 {station.name}</h3>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {tempMarker && (
                <Marker position={tempMarker} icon={newLocationIcon}>
                    <Popup>Yeni Konum</Popup>
                </Marker>
            )}

            {!selectionMode && decodedRoutes.map((route, index) => {
                const isVisible = focusedRouteIndex === null || focusedRouteIndex === index;
                if (!isVisible) return null;

                const color = routeColors[index % routeColors.length];
                const isHovered = hoveredRouteIndex === index;
                const isSelected = focusedRouteIndex === index;

                const opacity = isHovered ? 1 : (isSelected ? 1 : 0.8);
                const weight = isHovered ? 6 : (isSelected ? 5 : 4);
                const zIndexOffset = isHovered || isSelected ? 1000 : 0;

                return (
                    <Polyline
                        key={index}
                        positions={route.geometry}
                        pathOptions={{
                            color: color, weight: weight, opacity: opacity,
                            lineCap: 'round', lineJoin: 'round', zIndexOffset: zIndexOffset
                        }}
                        eventHandlers={{
                            mouseover: (e) => { e.target.bringToFront(); setHoveredRouteIndex(index); },
                            mouseout: (e) => { setHoveredRouteIndex(null); }
                        }}
                    >
                        <Popup>
                            <div style={{textAlign:'center'}}>
                                <strong style={{color: color, fontSize:'1.1rem'}}>{route.vehicle_name}</strong>
                                <hr style={{margin:'5px 0', borderColor:'#eee'}}/>
                                <div>Maliyet: <b>{route.total_cost} TL</b></div>
                                <div>Mesafe: <b>{route.total_distance_km} km</b></div>
                            </div>
                        </Popup>
                    </Polyline>
                );
            })}
        </MapContainer>
    );
};

export default MapComponent;