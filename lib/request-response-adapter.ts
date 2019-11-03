export interface RequestResponseAdapter {
  readonly route: string;
  readonly path: string;
  readonly statusCode: number;
  readonly method: string;
  readonly protocol: string | null;
  readonly baseUrl: string | null;
}
