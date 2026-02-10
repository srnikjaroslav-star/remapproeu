-- REMAPPRO Management Portal Database Schema
-- Run this in your Supabase SQL Editor

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS work_logs CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS clients CASCADE;

-- Create clients table
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create services table
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create work_logs table with new schema
CREATE TABLE work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  car_info TEXT NOT NULL,
  service_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_price DECIMAL(10, 2) NOT NULL,
  month_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_work_logs_client_id ON work_logs(client_id);
CREATE INDEX idx_work_logs_month_key ON work_logs(month_key);
CREATE INDEX idx_work_logs_created_at ON work_logs(created_at DESC);
CREATE INDEX idx_clients_slug ON clients(slug);
CREATE INDEX idx_services_category ON services(category);

-- Function to auto-generate month_key
CREATE OR REPLACE FUNCTION generate_month_key()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.month_key IS NULL OR NEW.month_key = '' THEN
    NEW.month_key := TO_CHAR(NOW(), 'YYYY-MM');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate month_key
CREATE TRIGGER set_month_key_before_insert
BEFORE INSERT ON work_logs
FOR EACH ROW
EXECUTE FUNCTION generate_month_key();

-- Insert initial clients
INSERT INTO clients (name, slug) VALUES
  ('JAN CERY', 'jan-cery'),
  ('Jindrich Cerman', 'jindrich-cerman');

-- Insert services data
INSERT INTO services (name, price, category) VALUES
  -- Performance
  ('Diesel STG1', 35.00, 'Performance'),
  ('Petrol STG1', 35.00, 'Performance'),
  ('TCU GearBox', 30.00, 'Performance'),
  ('Burbles', 35.00, 'Performance'),
  ('Launch Control', 25.00, 'Performance'),
  
  -- Emission Control
  ('Readiness Calibration', 15.00, 'Emission Control'),
  ('ADBlue SCR Removal', 25.00, 'Emission Control'),
  ('AGS Removal', 25.00, 'Emission Control'),
  ('DPF Removal', 25.00, 'Emission Control'),
  ('OPF/GPF Removal', 25.00, 'Emission Control'),
  ('EGR Removal', 25.00, 'Emission Control'),
  ('Emisná (Ek/STK)', 25.00, 'Emission Control'),
  ('CVN Calibration', 15.00, 'Emission Control'),
  ('Lambda Removal', 15.00, 'Emission Control'),
  ('Eolys OFF', 25.00, 'Emission Control'),
  ('MAF Removal', 15.00, 'Emission Control'),
  
  -- Engine Functions
  ('Boost Sensor Calib 3Bar', 15.00, 'Engine Functions'),
  ('Boost Sensor Calib 3.5Bar', 15.00, 'Engine Functions'),
  ('Boost Sensor Calib 4Bar', 15.00, 'Engine Functions'),
  ('TVA Removal', 15.00, 'Engine Functions'),
  ('Soft Rev Limiter', 15.00, 'Engine Functions'),
  ('Kickdown Deactivation', 15.00, 'Engine Functions'),
  ('SWIRL Flaps', 15.00, 'Engine Functions'),
  ('Speed Limiter VMax', 15.00, 'Engine Functions'),
  ('Hot Štart', 15.00, 'Engine Functions'),
  ('Cold Start', 15.00, 'Engine Functions'),
  ('Idle Speed RPM', 15.00, 'Engine Functions'),
  ('Torque (Errors) OFF Limiter', 15.00, 'Engine Functions'),
  ('Torque Monitoring', 15.00, 'Engine Functions'),
  ('DTC OFF', 15.00, 'Engine Functions'),
  ('Start Stop', 15.00, 'Engine Functions'),
  ('Cylinder Shutdown', 25.00, 'Engine Functions'),
  ('Oil Pressure', 25.00, 'Engine Functions'),
  ('Glow Plugs Time', 25.00, 'Engine Functions'),
  
  -- Security
  ('Immo Removal', 25.00, 'Security');
