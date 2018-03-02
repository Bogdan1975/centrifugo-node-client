import {RedisClient} from "redis";

export interface IRedisConfig {
    host?: string;
    port?: number;
    db?: number;
    password?: string;
}

export interface IHttpConfig {

}

export interface IConfig {
    namespace?: string;
    secret?: string;
    http?: IHttpConfig;
    redis?: IRedisConfig;
}

export interface ITranspost {
    sendRequest(request: IRequest, cb?: ICallBack): any;
}

export type TransportType = 'redis' | 'http';

export interface IRequest {
    getMethod(): string;
    getParams(): any;
}

export type ICallBack = (err, res) => any;

export interface IAsyncRedisClient extends RedisClient {
    rpushAsync(queueName: string, data: any): Promise<any>;
}