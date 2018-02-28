import {IConfig, IHttpConfig, IRedisConfig, ITranspost, TransportType} from "./interfaces";
import {TransportRedis} from "./transport-redis";

export class Client {
    private defaultRedisConfig: IRedisConfig = {
        host: 'localhost',
        port: 6379,
        db: 0
    };
    private defaultHttpConfig: IHttpConfig = {};

    private redisConfig: IRedisConfig;
    private httpConfig: IHttpConfig;

    private transports: Array<ITranspost> = [];

    constructor(config: IConfig) {
        this.redisConfig = config.hasOwnProperty('redis') ? Object.assign({}, this.defaultRedisConfig, config.redis) : null;
        this.httpConfig = config.hasOwnProperty('http') ? Object.assign({}, this.defaultHttpConfig, config.http) : null;
        if (null != this.httpConfig) {
            if (null == this.redisConfig) {
                console.log('\x1b[31m%s\x1b[0m', 'Http transport is not implemented yet');
                throw new Error('Http transport is not implemented yet');
            } else {
                console.log('\x1b[33m%s\x1b[0m', 'Http transport is not implemented yet');
            }
            this.httpConfig = null;
        }
        if (null != this.redisConfig) {
            this.transports.push(this.transportFactory('redis', this.redisConfig));
        }
        if (null != this.httpConfig) {
            this.transports.push(this.transportFactory('http', this.httpConfig));
        }
    }

    private transportFactory(type: TransportType, config: IRedisConfig | IHttpConfig): ITranspost {
        let transport: ITranspost;
        switch (type) {
            case 'redis':
                transport = new TransportRedis(config);
                break;
            default:
                throw new Error(`Unknown '${type}' transport type`);
        }

        return transport;
    }
}