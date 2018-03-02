import {IAsyncRedisClient, ICallBack, IRedisConfig, IRequest} from "./interfaces";
import {RedisClient, createClient} from "redis";


const {promisify} = require('util');

export class TransportRedis {
    private config: IRedisConfig;
    private connection: IAsyncRedisClient = null;

    private rpushAsync: any;

    constructor(config: IRedisConfig) {
        this.config = config;
    }

    private getConnection(): IAsyncRedisClient {
        if (null == this.connection) {
            // const redis = require("redis");
            // const connection = redis.createClient(this.config);
            const connection = createClient(this.config);
            (<any>connection).rpushAsync = promisify(connection.rpush).bind(connection);
            this.connection = <IAsyncRedisClient>connection;
        }

        return this.connection;
    }

    public sendRequest(request: IRequest, cb: ICallBack = () => {}) {
        const connection = this.getConnection();
        const queueKey = this.getQueueKey();

        return connection.rpushAsync(queueKey, JSON.stringify({method: request.getMethod(),params: request.getParams()})).then (res => {
            if (!res) {
                throw new Error('Unknown error during message sending');
            }
             return true;
        });
    }

    private getQueueKey() {
        return 'centrifugo.api';
    }
}