"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IpRateLimiterService = void 0;
const common_1 = require("@nestjs/common");
let IpRateLimiterService = class IpRateLimiterService {
    constructor() {
        this.store = new Map();
    }
    today() {
        return new Date().toISOString().slice(0, 10);
    }
    getEntry(ip) {
        const today = this.today();
        const existing = this.store.get(ip);
        if (!existing || existing.date !== today) {
            const entry = { date: today, requeryCount: 0 };
            this.store.set(ip, entry);
            return entry;
        }
        return existing;
    }
    registerRequeryAttempt(ip) {
        const entry = this.getEntry(ip);
        entry.requeryCount += 1;
        return {
            requeryAttemptNumber: entry.requeryCount,
            useGoogleVision: entry.requeryCount >= 1 && entry.requeryCount <= 13,
        };
    }
    getRequeryCount(ip) {
        return this.getEntry(ip).requeryCount;
    }
};
exports.IpRateLimiterService = IpRateLimiterService;
exports.IpRateLimiterService = IpRateLimiterService = __decorate([
    (0, common_1.Injectable)()
], IpRateLimiterService);
//# sourceMappingURL=ip-rate-limiter.service.js.map