import {IRedisConfig} from "./interfaces";

export class TransportRedis {
    private config: IRedisConfig;

    constructor(config: IRedisConfig) {
        this.config = config;
    }
}