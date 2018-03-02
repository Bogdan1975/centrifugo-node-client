export class Request {
    private method: string;
    private params: any;

    constructor(method: string, params: any) {
        this.method = method;
        this.params = params;
    }

    getMethod(): string {
        return this.method;
    }

    getParams(): any {
        return this.params;
    }
}