const isProd = import.meta.env.PROD;

export const API_BASE = isProd ? "/api" : "http://localhost:3001/api";
