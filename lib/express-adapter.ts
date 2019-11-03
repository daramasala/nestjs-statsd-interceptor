// import { Request, Response } from 'express';
import { RequestResponseAdapter } from './request-response-adapter';

export class ExpressAdapter implements RequestResponseAdapter {
  constructor(private readonly request: any, private readonly response: any) {}
  get route() {
    return this.request.route && this.request.route.path
      ? this.request.route.path
      : '';
  }

  get path() {
    return this.request.path;
  }

  get method() {
    return this.request.method;
  }

  get protocol() {
    return this.request.protocol;
  }

  get statusCode() {
    return this.response.statusCode;
  }

  get baseUrl() {
    return this.request.baseUrl;
  }
}
