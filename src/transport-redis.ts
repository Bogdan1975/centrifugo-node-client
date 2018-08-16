import {IAsyncRedisClient, ICallBack, IRedisConfig, IRequest} from "./interfaces";
import {RedisClient, createClient} from "redis";
import EventEmitter = NodeJS.EventEmitter;
import {ICgoEvent} from "./client";



const {promisify} = require('util');

export class TransportRedis {
    private config: IRedisConfig;
    private connection: IAsyncRedisClient = null;

    private rpushAsync: any;

    private ee: EventEmitter;
    private isRedisActive: boolean;

    constructor(config: IRedisConfig, ee?: EventEmitter) {
        this.ee = ee;
        this.config = config;
        this.isRedisActive = false;
        try {
            this.getConnection();
        } catch (e) {
            console.error('NODE REDIS', e);
        }
    }

    private getConnection(): IAsyncRedisClient {
        if (null == this.connection) {
            let connection: RedisClient;
            try {
                connection = createClient(this.config);
            } catch (e) {
                console.log('createClient failed');
                console.log(JSON.stringify(e));
            }
            (<any>connection).rpushAsync = promisify(connection.rpush).bind(connection);
            this.connection = <IAsyncRedisClient>connection;
            this.connection.on('error', this.onError.bind(this));
            this.connection.on('connect', this.onConnect.bind(this));
        }

        return this.connection;
    }

    public onError(e:any) {
        console.error(JSON.stringify(e));
        if (this.ee) {
            const cgoEvent: ICgoEvent = {
                transport: 'redis',
                type: 'error',
                data: e
            };
            this.ee.emit('error', cgoEvent);
        }
        if (e instanceof Error && 'ENOTFOUND' === (<any>e).code) {
            this.isRedisActive = false;
            if (this.ee) {
                const cgoEvent: ICgoEvent = {
                    transport: 'redis',
                    type: 'active',
                    data: false
                };
                this.ee.emit('active', cgoEvent);
            }
        }
    }

    public sendRequest(request: IRequest, cb: ICallBack = () => {}) {
        const connection = this.getConnection();
        const queueKey = this.getQueueKey();
        if (!this.isRedisActive) {
            return Promise.reject();
        }

        return connection.rpushAsync(queueKey, JSON.stringify({method: request.getMethod(),params: request.getParams()})).then (res => {
            if (!res) {
                throw new Error('Unknown error during message sending');
            }
             return true;
        });
    }

    private onConnect() {
        this.isRedisActive = true;
        if (this.ee) {
            const cgoEvent: ICgoEvent = {
                transport: 'redis',
                type: 'active',
                data: true
            };
            this.ee.emit('active', cgoEvent);
        }
    }

    private getQueueKey() {
        return 'centrifugo.api';
    }
}