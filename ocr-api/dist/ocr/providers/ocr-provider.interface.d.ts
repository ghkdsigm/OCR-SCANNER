export interface VehicleRegistrationOcrResult {
    carNumber: string;
    carType: string;
    purpose: string;
    carName: string;
    modelInfo: string;
    vin: string;
    engineType: string;
    displacement: string;
    passengerCapacity: string;
    maxLoadCapacity: string;
    fuelType: string;
    location: string;
    ownerName: string;
    firstRegistrationDate: string;
    inspectionValidity: string;
}
export interface OcrProvider {
    analyzeVehicleRegistration(file: Express.Multer.File): Promise<VehicleRegistrationOcrResult>;
}
export declare const OCR_PROVIDER: unique symbol;
