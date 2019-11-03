import { Module, Global, DynamicModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  StatsDInterceptor,
  StatsDInterceptorOptions,
  STATSD_INTERCEPTOR_OPTIONS_PROVDER,
} from './statsd.interceptor';

const provider = {
  provide: APP_INTERCEPTOR,
  useClass: StatsDInterceptor,
};

@Global()
@Module({})
export class StatsDInterceptorModule {
  static configure(options: StatsDInterceptorOptions = {}): DynamicModule {
    return {
      module: StatsDInterceptorModule,
      providers: [
        {
          provide: STATSD_INTERCEPTOR_OPTIONS_PROVDER,
          useValue: options,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: StatsDInterceptor,
        },
      ],
      // exports: [provider],
    };
  }
}
