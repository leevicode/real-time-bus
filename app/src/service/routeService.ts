export const getApiBaseUrl = (): string => {
  if (import.meta.env.DEV) {
    return 'http://localhost:5000';
  }
  return `${window.location.protocol}//${window.location.host}`;
};

export const API_BASE_URL = getApiBaseUrl();