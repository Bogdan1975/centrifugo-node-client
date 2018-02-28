export interface IRedisConfig {
    host?: string;
    port?: number;
    db?: number;
}

export interface IHttpConfig {

}

export interface IConfig {
    http?: IHttpConfig,
    redis?: IRedisConfig,
}

export interface ITranspost {

}

export type TransportType = 'redis' | 'http';