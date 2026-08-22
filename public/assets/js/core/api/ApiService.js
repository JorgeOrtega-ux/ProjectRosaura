import { HttpClient } from './HttpClient.js';

/**
 * ApiService — Extiende HttpClient para proporcionar acceso compatible al transport layer.
 * Los endpoints específicos de dominio se han segregado en CanvasApiService y AdminApiService.
 */
export class ApiService extends HttpClient {}