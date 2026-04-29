export interface RequeryUsageDecision {
    requeryAttemptNumber: number;
    useGoogleVision: boolean;
}
export declare class IpRateLimiterService {
    private readonly store;
    private today;
    private getEntry;
    registerRequeryAttempt(ip: string): RequeryUsageDecision;
    getRequeryCount(ip: string): number;
}
