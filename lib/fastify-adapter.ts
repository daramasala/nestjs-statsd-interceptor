import { RequestResponseAdapter } from './request-response-adapter';

export class FastifyAdapter implements RequestResponseAdapter {
  constructor(private readonly request: any, private readonly response: any) {}
  get route() {
    return this.response.context.config.url;
  }

  get path() {
    return this.request.req.url;
  }

  get method() {
    return this.request.req.method;
  }

  get protocol() {
    return '';
  }

  get statusCode() {
    return this.response.statusCode;
  }

  get baseUrl() {
    return '';
  }
}
