const localHost = typeof window !== "undefined"
  && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

export const API = process.env.NEXT_PUBLIC_API_URL
  || (localHost ? "http://localhost:5000/api" : "https://terrarotate-api.onrender.com/api");
