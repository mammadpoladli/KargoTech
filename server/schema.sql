CREATE TABLE IF NOT EXISTS users (
                                     id SERIAL PRIMARY KEY,
                                     username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(10) CHECK (role IN ('admin', 'user')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS stations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
                                        id SERIAL PRIMARY KEY,
                                        name VARCHAR(50),
    capacity_kg INTEGER NOT NULL,
    type VARCHAR(10) CHECK (type IN ('fixed', 'rented')),
    rental_cost INTEGER DEFAULT 0
    );

CREATE TABLE IF NOT EXISTS cargo_requests (
                                              id SERIAL PRIMARY KEY,
                                              user_id INTEGER REFERENCES users(id),
    station_id INTEGER REFERENCES stations(id),
    quantity INTEGER NOT NULL,
    weight_kg INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'planned', 'delivered')),
    request_date DATE DEFAULT CURRENT_DATE
    );

CREATE TABLE IF NOT EXISTS routes (
                                      id SERIAL PRIMARY KEY,
                                      vehicle_id INTEGER REFERENCES vehicles(id),
    trip_date DATE DEFAULT CURRENT_DATE,
    total_distance_km DECIMAL(10, 2),
    total_cost DECIMAL(10, 2),
    route_path JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

CREATE TABLE IF NOT EXISTS route_cargos (
                                            route_id INTEGER REFERENCES routes(id),
    cargo_request_id INTEGER REFERENCES cargo_requests(id),
    PRIMARY KEY (route_id, cargo_request_id)
    );


INSERT INTO vehicles (id, name, capacity_kg, type, rental_cost) VALUES
                                                                    (1, 'Araç 1 (Sabit)', 500, 'fixed', 0),
                                                                    (2, 'Araç 2 (Sabit)', 750, 'fixed', 0),
                                                                    (3, 'Araç 3 (Sabit)', 1000, 'fixed', 0),
                                                                    (4, 'Kiralık Araç (Genel)', 500, 'rented', 200)
    ON CONFLICT (id) DO NOTHING;

INSERT INTO stations (name, latitude, longitude) VALUES
                                                     ('Başiskele', 40.7150, 29.9280),
                                                     ('Çayırova', 40.8160, 29.3700),
                                                     ('Darıca', 40.7740, 29.4000),
                                                     ('Derince', 40.7560, 29.8300),
                                                     ('Dilovası', 40.7870, 29.5400),
                                                     ('Gebze', 40.8020, 29.4300),
                                                     ('Gölcük', 40.7160, 29.8200),
                                                     ('Kandıra', 41.0700, 30.1500),
                                                     ('Karamürsel', 40.6920, 29.6100),
                                                     ('Kartepe', 40.7530, 30.0200),
                                                     ('Körfez', 40.7730, 29.7300),
                                                     ('İzmit', 40.7650, 29.9400),
                                                     ('KOÜ Merkez', 40.8220, 29.9200)
    ON CONFLICT (name) DO NOTHING;

-- Varsayılan şifreler: 12345 (bcrypt hash)
INSERT INTO users (username, password_hash, role) VALUES 
    ('admin', '$2b$10$PTFz/Aofhnb5IrQgCOtkVuBceTWT72xXz.lJhP.gockg6abhHJlvG', 'admin'), 
    ('user1', '$2b$10$PTFz/Aofhnb5IrQgCOtkVuBceTWT72xXz.lJhP.gockg6abhHJlvG', 'user') 
ON CONFLICT (username) DO NOTHING;