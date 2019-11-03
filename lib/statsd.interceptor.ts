import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { StatsD } from 'hot-shots';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { tap } from 'rxjs/operators';
import { HttpAdapterHost } from '@nestjs/core/helpers/http-adapter-host';
import { ExpressAdapter } from './express-adapter';
import { RequestResponseAdapter } from './request-response-adapter';
import { FastifyAdapter } from './fastify-adapter';

export interface StatsDInterceptorOptions {
  /**
   * A StatsD client (from hot-shots package). If null then a new client is created with default options
   */
  statsD?: StatsD;
  /**
   * The stat name under which to send the metrics
   */
  stat?: string;
  /**
   * Array of tags to attach to the metric
   */
  tags?: string[];
  /**
   * If true, create metrics for distinct paths
   */
  path?: boolean;
  /**
   * If true, add the baseUrl to the metric's route
   */
  baseUrl?: boolean;
  /**
   * If true, create metrics for distinct methods
   */
  method?: boolean;
  /**
   * If true, create metrics for distinct protocols
   */
  protocol?: boolean;
  /**
   * If true, create metrics for distinct status codes
   */
  responseCode?: boolean;
  delim?: string;
  /**
   * An adapter that will be used to extract path, route, etc. from the request-response pair.
   */
  adapter?: (request: any, response: any) => RequestResponseAdapter;
}

export const STATSD_INTERCEPTOR_OPTIONS_PROVIDER =
  'STATSD_INTERCEPTOR_OPTIONS_PROVIDER';
const HTTP_ADAPTER_HOST = 'HttpAdapterHost';

@Injectable()
export class StatsDInterceptor implements NestInterceptor {
  private readonly metricClient: StatsD;
  private readonly stat: string;
  private readonly tags: string[];
  private readonly path: boolean;
  private readonly baseUrl: boolean;
  private readonly method: boolean;
  private readonly protocol: boolean;
  private readonly responseCode: boolean;
  private readonly DELIM: string;
  private readonly REGEX_PIPE: RegExp;
  private readonly adapter?: (request: any, response: any) => RequestResponseAdapter;

  @Optional()
  @Inject(HTTP_ADAPTER_HOST)
  protected readonly httpAdapterHost?: HttpAdapterHost;

  constructor(
    @Inject(STATSD_INTERCEPTOR_OPTIONS_PROVIDER)
    options: StatsDInterceptorOptions,
  ) {
    this.metricClient = options.statsD || new StatsD();
    this.stat = options.stat || 'node.express.router';
    this.tags = options.tags || [];
    this.path = options.path || false;
    this.baseUrl = options.baseUrl || false;
    this.method = options.method || false;
    this.protocol = options.protocol || false;
    this.responseCode = options.responseCode || false;
    this.DELIM = options.delim || '-';
    this.REGEX_PIPE = /\|/g;
    this.adapter = options.adapter;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const requestTime = process.hrtime();
    const httpContext = context.switchToHttp();
    return next
      .handle()
      .pipe(tap(x => this.onResponse(httpContext, requestTime)));
  }

  wrapRequest(request: any, response: any): RequestResponseAdapter {
    if (this.adapter) {
      return this.adapter(request, response);
    }
    const type = this.httpAdapterHost
      ? (this.httpAdapterHost.httpAdapter as any).getType()
      : 'express';
    if (type === 'express') {
      return new ExpressAdapter(request, response);
    } else if (type === 'fastify') {
      return new FastifyAdapter(request, response);
    } else {
      throw new Error('Unhandled http adapter type ' + type);
    }
  }

  onResponse(context: HttpArgumentsHost, requestTime: [number, number]) {
    const responseTime = process.hrtime();
    const [seconds1, microSeconds1] = requestTime;
    const [seconds2, microSeconds2] = responseTime;
    const startTime = Math.round(seconds1 * 1000 + microSeconds1 / 1e6);
    const endTime = Math.round(seconds2 * 1000 + microSeconds2 / 1e6);
    const statTags = [...this.tags];
    const req = context.getRequest();
    const res = context.getResponse();
    const adapter = this.wrapRequest(req, res);

    const route = this.getRoute(adapter);
    if (route.length > 0) {
      statTags.push(`route:${route}`);
    }
    if (this.method !== false) {
      const method = adapter.method;
      statTags.push(`method:${method.toLowerCase()}`);
    }

    if (this.protocol && adapter.protocol) {
      statTags.push(`protocol:${adapter.protocol}`);
    }

    if (this.path !== false) {
      statTags.push(`path:${adapter.path}`);
    }

    if (this.responseCode) {
      const statusCode = adapter.statusCode;
      statTags.push(`response_code:${statusCode}`);
      this.metricClient.increment(
        `${this.stat}.response_code.${statusCode}`,
        1,
        statTags,
      );
      this.metricClient.increment(
        `${this.stat}.response_code.all`,
        1,
        statTags,
      );
    }

    this.metricClient.histogram(
      `${this.stat}.response_time`,
      endTime - startTime,
      1,
      statTags,
    );
  }

  /**
   * Checks if str is a regular expression and stringifies it if it is.
   * Returns a string with all instances of the pipe character replaced with
   * the delimiter.
   * @param  {*}       str  The string to check for pipe chars
   * @return {string}       The input string with pipe chars replaced
   */
  replacePipeChar(str: string | RegExp): string {
    if (str instanceof RegExp) {
      str = str.toString();
    }

    return str && str.replace(this.REGEX_PIPE, this.DELIM);
  }

  getRoute(adapter: RequestResponseAdapter) {
    const routePath = adapter.route;
    const normalizedBaseUrl = this.baseUrl ? adapter.baseUrl : '';
    return normalizedBaseUrl + this.replacePipeChar(routePath);
  }
}
