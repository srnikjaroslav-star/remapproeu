export interface Service {
  id: string;
  name: string;
  price: number;
  category: 'stage' | 'removal' | 'modification';
  stripePriceId?: string;
}

export const SERVICES: Service[] = [
  // Stage tuning
  { id: 'diesel-stage1', name: 'Diesel STAGE1', price: 50, category: 'stage', stripePriceId: 'price_1SkuaM4DSSkujAMNd7syYxH0' },
  { id: 'petrol-stage1', name: 'Petrol STAGE1', price: 60, category: 'stage', stripePriceId: 'price_1Skuba4DSSkujAMN8M5AWQIJ' },
  { id: 'tcu-gearbox', name: 'TCU Gearbox', price: 60, category: 'stage', stripePriceId: 'price_1SkucA4DSSkujAMNXL13ZP4h' },
  
  // Removal services
  { id: 'adblue', name: 'ADBlue', price: 35, category: 'removal', stripePriceId: 'price_1SkucO4DSSkujAMNFTmefXet' },
  { id: 'dpf', name: 'DPF', price: 25, category: 'removal', stripePriceId: 'price_1Skucn4DSSkujAMNGBvX8rgp' },
  { id: 'opf-gpf', name: 'OPF/GPF', price: 25, category: 'removal', stripePriceId: 'price_1SkudR4DSSkujAMNFx8AE7mD' },
  { id: 'egr', name: 'EGR', price: 25, category: 'removal', stripePriceId: 'price_1Skudo4DSSkujAMNGRQYl11s' },
  { id: 'swirl-flaps', name: 'SWIRL Flaps', price: 15, category: 'removal', stripePriceId: 'price_1SkueA4DSSkujAMNw2pmPUee' },
  { id: 'lambda', name: 'Lambda', price: 15, category: 'removal', stripePriceId: 'price_1SkueO4DSSkujAMNO4xcNhdt' },
  { id: 'immo', name: 'Immo', price: 15, category: 'removal', stripePriceId: 'price_1Skuec4DSSkujAMNt7DnzOoD' },
  
  // Modifications
  { id: 'emisna-ek-stk', name: 'Emisná EK/STK', price: 50, category: 'modification', stripePriceId: 'price_1Skues4DSSkujAMNKzXupkZg' },
  { id: 'vmax-off', name: 'VMAX OFF', price: 15, category: 'modification', stripePriceId: 'price_1Skuf64DSSkujAMNjbbnbBt7' },
  { id: 'hot-start', name: 'Hot Štart', price: 15, category: 'modification', stripePriceId: 'price_1SkufO4DSSkujAMNGuBuDUFe' },
  { id: 'cold-start', name: 'Cold Start', price: 15, category: 'modification', stripePriceId: 'price_1SkufZ4DSSkujAMNwjVQVppB' },
  { id: 'idle-speed-rpm', name: 'Idle Speed RPM', price: 15, category: 'modification', stripePriceId: 'price_1Skufs4DSSkujAMNFCZc2YSb' },
  { id: 'torque-limiter', name: 'Torque Limiter', price: 25, category: 'modification', stripePriceId: 'price_1Skug84DSSkujAMNaisrDVmH' },
  { id: 'dtc', name: 'DTC', price: 15, category: 'modification', stripePriceId: 'price_1SkugM4DSSkujAMN2WCVDTzr' },
  { id: 'start-stop', name: 'Start Stop', price: 15, category: 'modification', stripePriceId: 'price_1SkugZ4DSSkujAMN9ZtJEfWF' },
  { id: 'burbles', name: 'Burbles', price: 35, category: 'modification', stripePriceId: 'price_1Skugm4DSSkujAMNNBF1VgRy' },
  { id: 'cylinder-shutdown', name: 'Cylinder Shutdown', price: 15, category: 'modification', stripePriceId: 'price_1Skugz4DSSkujAMNXhLq01r2' },
  { id: 'glow-plugs-time', name: 'Glow Plugs Time', price: 15, category: 'modification', stripePriceId: 'price_1SkuhK4DSSkujAMN20cGsjEg' },
  { id: 'oil-pressure', name: 'Oil Pressure', price: 15, category: 'modification', stripePriceId: 'price_1SkuiY4DSSkujAMNgBJeq8Ye' },
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
