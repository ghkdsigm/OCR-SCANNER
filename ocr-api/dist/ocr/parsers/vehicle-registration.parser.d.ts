import type { VehicleRegistrationOcrResult } from '../providers/ocr-provider.interface';
export declare class VehicleRegistrationParser {
    static parse(text: string): VehicleRegistrationOcrResult;
    static empty(): VehicleRegistrationOcrResult;
    private static normalizeOcrText;
    private static field;
    private static extractCarNumber;
    private static extractCarType;
    private static normalizeCarTypeValue;
    private static extractPurpose;
    private static normalizePurposeValue;
    private static extractCarName;
    private static extractModelInfo;
    private static extractEngineType;
    private static extractVin;
    private static extractDisplacement;
    private static extractPassengerCapacity;
    private static extractMaxLoad;
    private static extractFuelType;
    private static extractLocation;
    private static extractOwnerName;
    private static extractFirstDate;
    private static extractInspectionValidity;
    private static normalizeDateString;
}
