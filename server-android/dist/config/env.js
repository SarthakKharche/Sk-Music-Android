"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
// Attempt to load .env from multiple likely locations
const candidates = [
    path_1.default.resolve(process.cwd(), '.env'), // workspace cwd (may be server/)
    path_1.default.resolve(__dirname, '../../../.env'), // repo root from src/config
    path_1.default.resolve(__dirname, '../../.env'), // from src -> server/.env
    path_1.default.resolve(__dirname, '../.env'), // from config -> src/.env
];
let loadedFrom = null;
for (const p of candidates) {
    try {
        if (fs_1.default.existsSync(p)) {
            const result = dotenv_1.default.config({ path: p });
            if (!result.error) {
                loadedFrom = p;
                break;
            }
        }
    }
    catch {
        // ignore
    }
}
if (!loadedFrom) {
    const fallback = path_1.default.resolve(process.cwd(), '.env');
    const result = dotenv_1.default.config({ path: fallback });
    if (!result.error) {
        loadedFrom = fallback;
        console.log(`ENV: loaded from ${loadedFrom}`);
    }
    else {
        console.warn('ENV: .env not found in known locations; loaded default process env');
    }
}
else {
    console.log(`ENV: loaded from ${loadedFrom}`);
}
//# sourceMappingURL=env.js.map