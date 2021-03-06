import {IConfig, IHttpConfig, IRedisConfig, IRequest, ITranspost, TransportType} from "./interfaces";
import {TransportRedis} from "./transport-redis";
import {Request} from "./request";
import * as crypto from "crypto"
import {EventEmitter} from "events";

export type CB = (e: ICgoEvent) => any;
export interface ICgoEvent {
    transport: string;
    type?: string;
    data: any;
}

const TRANSPORT_NAMES = ['redis', 'http'];

export class Client {
    private defaultRedisConfig: IRedisConfig = {
        host: 'localhost',
        port: 6379,
        db: 0
    };
    private defaultHttpConfig: IHttpConfig = {};

    private namespace: string = null;
    private secret: string = null;
    private redisConfig: IRedisConfig;
    private httpConfig: IHttpConfig;

    private transports: Array<ITranspost> = [];

    private ee: EventEmitter = new EventEmitter();

    private listeners: {[index: string]: Array<CB>} = {
        redisError: []
    };
    private transportIsActive: {[index: string]: boolean} = {};

    constructor(config: IConfig) {
        this.redisConfig = config.hasOwnProperty('redis') ? Object.assign({}, this.defaultRedisConfig, config.redis) : null;
        this.httpConfig = config.hasOwnProperty('http') ? Object.assign({}, this.defaultHttpConfig, config.http) : null;
        this.namespace = config.namespace || null;
        this.secret = config.secret || null;
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
            this.transportIsActive.redis = false;
        }
        if (null != this.httpConfig) {
            this.transports.push(this.transportFactory('http', this.httpConfig));
            this.transportIsActive.http = false;
        }
        // this.ee.addListener('error', this.onError.bind(this));
        this.ee.on('error', this.onError.bind(this));
        this.ee.on('active', this.onActive.bind(this));
    }

    public addRedisErrorListener(cb: CB) {
        this.listeners.redisError.push(cb);
    }

    public isActiveTransport(transportName: string) {
        if (-1 === TRANSPORT_NAMES.indexOf(transportName)) {
            throw new Error(`Unknown transport '${transportName}'`);
        }

        return this.transportIsActive[transportName];
    }

    public isActive() {
        return (null != this.redisConfig && this.isActiveTransport('redis'))
            || (null != this.httpConfig && this.isActiveTransport('http'));
    }

    public publish(request: Request): Promise<boolean>;
    public publish(data: any, channel: string, userIds: string|number|Array<string|number>): Promise<boolean>;
    public publish(data: any, channel: string = null, userIds: string|number|Array<string|number> = null): Promise<boolean> {
        if (!this.isActive()) {
            return Promise.resolve(false);
        }
        let request: Request;
        if (typeof(data) !== 'object' || !(data instanceof Request)) {
            const channelName = this.normalizeChannelName(channel, userIds);
            request = new Request('publish', {
                channel: channelName,
                data
            });
        } else {
            request = data;
        }

        return this.sendRequest_(request);
    }

    public generateClientToken(user: string|number, timestamp: string|number = Math.floor(Date.now() / 1000), info: string = '') {
        if (null == this.secret) {
            throw new Error('"secret" configuration parameter needed to genereate client token');
        }
        timestamp = typeof(timestamp) === 'number' ? timestamp.toString() : timestamp;
        user = typeof(user) === 'number' ? user.toString() : user;
        return crypto.createHmac('sha256', this.secret)
            .update(new Buffer(user, 'utf-8'))
            .update(new Buffer(timestamp, 'utf-8'))
            .update(new Buffer(info, 'utf-8'))
            .digest('hex');
    };

    private onError(e: ICgoEvent) {
        console.error('Client redis error');
        this.listeners.redisError.forEach(cb => cb(e));
    }

    private onActive(e: ICgoEvent) {
        this.transportIsActive[e.transport] = e.data;
    }

    private isNumeric(n: any): boolean {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    private normalizeChannelName (channel: string, userIds: string|number|Array<string|number>): string {
        let channelName;
        let serArray = null == channel ? [] : channel.split(':');
        if (null !== this.namespace && (serArray.length === 0 || serArray[0] !== this.namespace)) {
            serArray.unshift(this.namespace);
        }
        channelName = serArray.join(':');
        const tmpArray = channelName.split('#');
        channelName = tmpArray[0];
        tmpArray.shift();
        let inlineIds = [];
        tmpArray.forEach(item => {
            const tmpArr2 = item.split(',');
            inlineIds = inlineIds.concat(tmpArr2);
        });
        const finalUserIds = inlineIds.length > 0 ? inlineIds.concat(Array.isArray(userIds) ? userIds : [userIds]) : userIds;
        const userIdsArray = this.normalizeUserId(finalUserIds);
        channelName += userIdsArray.length > 0 ? '#' + userIdsArray.join(',') : '';

        return channelName;
    }

    private normalizeUserId (userIds: string|number|Array<string|number>): Array<number> {
        if (null == userIds) {
            return [];
        }
        if (!Array.isArray(userIds)) {
            userIds = [userIds];
        }
        return userIds.map(item => {
            if (!this.isNumeric(item)) {
                console.log('\x1b[33m%s\x1b[0m', `'${item}' is not numeric ID`);
                return null;
            }

            return typeof(item) === 'string' ? parseInt(item) : item;
        }).filter(item => null != item);
    }

    private sendRequest_(request: IRequest, i = 0): Promise<boolean> {
        if (i >= this.transports.length) {
            throw new Error('Can\'t send message by any transport');
        }
        const transport = this.transports[i];

        return transport.sendRequest(request).then(res => {
            return res;
        }).catch( e => {
            i++;
            return this.sendRequest_(request, i);
        });
    }

    private transportFactory(type: TransportType, config: IRedisConfig | IHttpConfig): ITranspost {
        let transport: ITranspost;
        switch (type) {
            case 'redis':
                transport = new TransportRedis(config, this.ee);
                break;
            default:
                throw new Error(`Unknown '${type}' transport type`);
        }

        return transport;
    }

}