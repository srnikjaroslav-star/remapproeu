export interface Service {
  id: string;
  name: string;
  price: number;
  category: 'stage' | 'removal' | 'modification';
}

export const SERVICES: Service[] = [
  // Stage tuning
  { id: 'diesel-stage1', name: 'Diesel STAGE1', price: 50, category: 'stage' },
  { id: 'petrol-stage1', name: 'Petrol STAGE1', price: 60, category: 'stage' },
  { id: 'tcu-gearbox', name: 'TCU Gearbox', price: 60, category: 'stage' },
  
  // Removal services
  { id: 'adblue', name: 'ADBlue', price: 35, category: 'removal' },
  { id: 'dpf', name: 'DPF', price: 25, category: 'removal' },
  { id: 'opf-gpf', name: 'OPF/GPF', price: 25, category: 'removal' },
  { id: 'egr', name: 'EGR', price: 25, category: 'removal' },
  { id: 'swirl-flaps', name: 'SWIRL Flaps', price: 15, category: 'removal' },
  { id: 'lambda', name: 'Lambda', price: 15, category: 'removal' },
  { id: 'immo', name: 'Immo', price: 15, category: 'removal' },
  
  // Modifications
  { id: 'emisna-ek-stk', name: 'Emisná EK/STK', price: 50, category: 'modification' },
  { id: 'vmax-off', name: 'VMAX OFF', price: 15, category: 'modification' },
  { id: 'hot-start', name: 'Hot Štart', price: 15, category: 'modification' },
  { id: 'cold-start', name: 'Cold Start', price: 15, category: 'modification' },
  { id: 'idle-speed-rpm', name: 'Idle Speed RPM', price: 15, category: 'modification' },
  { id: 'torque-limiter', name: 'Torque Limiter', price: 25, category: 'modification' },
  { id: 'dtc', name: 'DTC', price: 15, category: 'modification' },
  { id: 'start-stop', name: 'Start Stop', price: 15, category: 'modification' },
  { id: 'burbles', name: 'Burbles', price: 35, category: 'modification' },
];

export const CAR_BRANDS = [
  'Audi', 'BMW', 'Mercedes-Benz', 'Volkswagen', 'Porsche', 'Ford', 'Opel',
  'Skoda', 'Seat', 'Peugeot', 'Renault', 'Citroen', 'Fiat', 'Alfa Romeo',
  'Toyota', 'Honda', 'Mazda', 'Nissan', 'Hyundai', 'Kia', 'Volvo', 'Jaguar',
  'Land Rover', 'Mini', 'Jeep', 'Chevrolet', 'Dodge', 'Chrysler', 'Tesla',
  'Lamborghini', 'Ferrari', 'Maserati', 'Bentley', 'Rolls-Royce', 'Other'
];

export const ECU_TYPES = [
  'Bosch EDC17C60', 'Bosch EDC17C46', 'Bosch EDC17C50', 'Bosch EDC17CP20',
  'Bosch MED17.5', 'Bosch MED17.1', 'Bosch MG1CS001', 'Bosch MG1CS002',
  'Siemens SID807', 'Siemens SID803A', 'Siemens PCR2.1',
  'Delphi DCM3.5', 'Delphi DCM6.2A',
  'Continental SID206', 'Continental SID310',
  'Denso SH7058', 'Denso SH7059',
  'Magneti Marelli MJD6F3', 'Magneti Marelli MJD8F2',
  'Other'
];

export const FUEL_TYPES = ['Diesel', 'Petrol'];

export const currentYear = new Date().getFullYear();
export const YEARS = Array.from({ length: 35 }, (_, i) => currentYear - i);
