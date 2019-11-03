# NestJS StatsD Interceptor
An [interceptor](https://docs.nestjs.com/interceptors) for [NestJS](https://nestjs.com/) that reports HTTP statistics to a statsd agent.

Uses [hot-shots](https://www.npmjs.com/package/hot-shots) and based on [node-connect-datadog](https://github.com/DataDog/node-connect-datadog).

# Installation and Usage
```
npm i nestjs-statsd-interceptor
```

There are 2 options for using this library:

1. Automatically register a global interceptor - by importing the module.
2. Using the interceptor class directly.

## Automatically register a global interceptor
Import and configure the module, e.g. in your `app` module:

```
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StatsDInterceptorModule } from './nestjs-statsd-interceptor/nestjs-statsd-interceptor.module';

@Module({
  imports: [StatsDInterceptorModule.configure()],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

This will register a global interceptor.

You can pass a `StatsDInterceptorOptions` object to the `configure()` method to configure the global interceptor.

## Using the interceptor class directly
Import the interceptor class and use it where you want.

One way of doing this is:

```
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { StatsDInterceptor } from './nestjs-statsd-interceptor/statsd.interceptor';

@Module({
  controllers: [AppController],
  providers: [AppService,
    {
      provide: APP_INTERCEPTOR,
      useValue: new StatsDInterceptor({
        method: true,
        path: true,
        protocol: true,
        responseCode: true,
      }),
    },
],
})
export class AppModule {}
```

# Configuration
Pass an options object to the module's `configure()` method or to the interceptor's constructor:

```
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
```