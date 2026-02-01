import type { ServiceConfig } from '../types';

export async function fetchServiceConfig(backendApiUrl: string): Promise<ServiceConfig | null> {
  try {
    const response = await fetch(`${backendApiUrl}/api/config`);
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch (error) {
    console.error('Failed to fetch backend config', error);
    return null;
  }
}
