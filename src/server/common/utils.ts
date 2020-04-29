import { printHRTime } from 'print-hrtime';
import * as moment from 'moment';
import { slackMsgInt } from '../slack/error-int';
import { Credentials } from './cfenv';

export interface IToken {
    email: string;
    name: string;
    roles: string;
    ctr: string[];
    unit: string[];
    engagementoption: string[];
    transid: string;
    profile: {
        email: string;
        name: string;
    };
}

export interface IRoles {
    admin: boolean;
    other: boolean;
    reader: boolean;
    sales: boolean;
    sts: boolean;
    allowed: boolean;
    squad: number;
    squadname: string;
    role: string;
}

export interface IBody {
    email?: string;
    p_email: string;
    p_name: string;
    p_roles: IRoles;
    p_ctr: any[];
    p_unit: any[];
    p_engagementoption: any[];
    id?: string;
    query?: {};
    profile: {
        email: string;
        name: string;
    };
    transid: string;
    [propName: string]: any;
}

export interface IProfile {
    email: string;
    name: string;
    roles: any;
    ctr: any[];
    unit: any[];
    engagementoption: any[];
    profile: {
        email: string;
        name: string;
    };
    transid: string;
}

export interface IEnv {
    NODE_ENV: string;
    app: string;
    packname: string;  // name from package.json
    description: string; // description from package.json
    version: string; // version from package.json
    k8_system: string;
    k8_system_name: string;
    k8_appurl: string;
    k8_db2schema: string;
}

class Utils {

    public pack: any = require('../../../package.json');

    public Env: IEnv = {
        NODE_ENV: process.env.NODE_ENV || 'local',
        app: process.env.APP || this.pack.name,
        description: this.pack.description,
        k8_appurl: process.env.K8_APPURL || 'https://blueboard.com',
        k8_db2schema: process.env.K8_DB2SCHEMA || 'ES',
        k8_system: process.env.K8_SYSTEM || 'development',
        k8_system_name: process.env.K8_SYSTEM_NAME || 'ESW Development',
        packname: this.pack.name,
        version: this.pack.version,
    };

    public slack: any = {
        deploy: {
            channel: `#eswm-deploy-${this.Env.k8_system.substr(0, 3)}`,
            username: 'ES-ESW-MQ - (Notification)',
        },
        internal: {
            channel: `eswm-bugs-${this.Env.k8_system.substr(0, 3)}`,
            username: 'ES-ESW-MQ - (Internal)',
        },
        smtp: {
            channel: `#eswm-smtp-${this.Env.k8_system.substr(0, 3)}`,
            username: 'ES-ESW-MQ - (Notification)',
        },
        url: this.slackWebHook,
        user: {
            channel: `#eswm-bugs-${this.Env.k8_system.substr(0, 3)}`,
            username: 'ES-ESW-MQ - (User)',
        },
    };

    private slackHook: string | undefined = undefined;

    public get slackWebHook(): string {

        if (this.slackHook) {
            return this.slackHook;
        }

        const t: string | undefined = Credentials('slackhook');

        if (t === undefined) {
            this.slackHook = 'dummyHook';

            return this.slackHook;
        } else {
            this.slackHook = t;

            return this.slackHook;
        }
    }

    public log = (msg: any) => {
        console.info(`${msg}: pid (${process.pid})`);
    }

    public logInfo = (msg: any, func?: string, hrend?: any) => {

        let hr: string = '';
        const fu: string = func ? `: ${func}` : '';

        if (hrend) {
            hr = ` - ET: ${printHRTime(hrend, { precise: true })}`;
        }

        console.info('\x1b[93m%s\x1b[0m', `${msg}${fu}${hr} - ${this.time()} - pid (${process.pid})`);
    }

    public logWarn = (msg: any, err?: Error) => {
        console.warn('\x1b[32m%s\x1b[0m', `${msg}: ${this.time()} - pid (${process.pid})`, err);
    }

    public logError = (msg: any, err?: any, other?: any, more?: any) => {
        console.error('\x1b[31m%s\x1b[0m', `${msg}: ${this.time()} - pid (${process.pid})\n`, err || '', other || '', more || '');

        if (err) {
            slackMsgInt({
                ...err,
                log: msg,
            });
        }
    }

    public time = (date?: Date): string => {
        if (date) {
            return moment.utc(date).format();
        } else {
            return moment.utc(new Date()).format();
        }
    }

    public guid = (): string => {
        const _p8: any = (s: boolean) => {
            const p: string = (`${Math.random().toString(16)}000000000`).substr(2, 8);

            return s
                ? `-${p.substr(0, 4)}-${p.substr(4, 4)}`
                : p;
        };
        const t: string = _p8(false) + _p8(true) + _p8(true) + _p8(false);

        return t.toLowerCase();
    }

    public normalizeDate = (param: any): string => {
        let normalized: any;
        let tmp: any = new Date(param);

        tmp.setDate(1);
        tmp.setMinutes(tmp.getMinutes() - tmp.getTimezoneOffset());
        tmp = tmp.toISOString();
        tmp = tmp.replace('T', ' ');
        tmp = tmp.replace('Z', '');
        normalized = tmp;

        return normalized;
    }

    public normalizedDate = (param?: any): string => {

        if (param) {
            return moment.utc(param).format('YYYY-MM-DD HH:mm:ss');
        }

        return moment.utc(new Date().getTime()).format('YYYY-MM-DD HH:mm:ss');

    }

    public top: any = (promise: Promise<any>) => {
        return promise
            .then((data: any) => {
                return [undefined, data];
            })
            .catch((err: Error) => [err]);
    }

}

export const utils: Utils = new Utils();
