-- Crear tablas para Turnos Almacén Auteide

CREATE TABLE IF NOT EXISTS sucursales (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS zonas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    sucursal_id INTEGER REFERENCES sucursales(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    numero_empleado INTEGER UNIQUE NOT NULL CHECK (numero_empleado >= 1 AND numero_empleado <= 99999),
    nombre VARCHAR(100) NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'empleado'
);

-- Secuencia para numero_empleado si se desea autogenerar aparte del ID, 
-- pero si el usuario quiere "autoincremental", podemos hacerlo DEFAULT nextval('seq_empleado')
CREATE SEQUENCE IF NOT EXISTS seq_numero_empleado MINVALUE 1 MAXVALUE 99999 START 1;
ALTER TABLE usuarios ALTER COLUMN numero_empleado SET DEFAULT nextval('seq_numero_empleado');

CREATE TABLE IF NOT EXISTS turnos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    zona_id INTEGER REFERENCES zonas(id) ON DELETE CASCADE,
    fecha_inicio TIMESTAMP NOT NULL,
    fecha_fin TIMESTAMP NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Datos de ejemplo (opcional, para pruebas)
INSERT INTO sucursales (nombre) VALUES ('Central');
INSERT INTO zonas (nombre, sucursal_id) VALUES ('Recepción', 1), ('Despacho', 1);
