const localHost = typeof window !== "undefined"
  && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
const configuredApi = process.env.NEXT_PUBLIC_API_URL?.trim();
const deployedApi = "https://terrarotate-api.onrender.com/api";

export const API = configuredApi && !configuredApi.includes("your-render-service.onrender.com")
  ? configuredApi
  : (localHost ? "http://localhost:5000/api" : deployedApi);
