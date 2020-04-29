import { Channel, connect, Connection } from 'amqplib';
import { Credentials } from './cfenv';
import { IEnv, IToken, utils } from './utils';

export interface ILog {
    id: string;
    transid: string;
    created: string;
    createdby: string;
    createdbyname: string;
    status: number;
    type: string;
    refid: string;
    event: string;
    action: string;
    message: string;
    logdb: string;
}

interface IAnnotation extends IToken {
    time: string;
    transid: string;
}

export interface IMQESLog {
    annotation: IAnnotation;
    msg: string;
    meta?: {
        reqid: string;
        fileid?: string;
    };
    module: IEnv;
    status: number;
    err?: Error;
    request: {
        body: {},
        params: {},
        query: {},
        url: string,
    };
    browser: {
        agent: string,
        ip: string,
    };
}

export interface IlogDetail {
    log: ILog;
    sql: any;
}

export interface IMQLogBase {
    channel: string;
    log: IlogDetail;
}

export interface IMQESBase {
    channel: string;
    log: IMQESLog;
}

export interface IMQMailBase {
    channel: string;
    mail: any;
}

export interface IMQESApi {
    action: string;
    esnumber?: string;
    func: string;
    id: string;
    previous_owner?: string;
    status: string;
}

export interface IMQESActApi {
    action: string;
    func: string;
    id: string;
    previous_owner: string;
    reqid: string;
}

export interface IMQESApiBase {
    channel: string;
    api: IMQESApi;
}

export interface IMQESActApiBase {
    channel: string;
    api: IMQESActApi;
}

export class RabbitMQ {

    public channel?: Channel;
    private exchange: string = 'topics';
    private mqurl: string;
    private operational: boolean = false;
    private retries: number = 0;

    constructor() {

        this.mqurl = Credentials('rabbitmq').url;

        this.start();
    }

    public start = () => {
        connect(this.mqurl)
            .then((conn: Connection) => {
                return conn.createChannel();
            })
            .then((channel: Channel) => {
                return channel.assertExchange(
                    this.exchange,
                    'topic', // the type of exchange
                    { durable: false },
                )
                    .then(() => {

                        this.channel = channel;
                        this.operational = true;
                        this.retries = 0;

                        this.channel.on('close', (): void => {
                            utils.logInfo(`$rabbitmq (createChannel): channel closed`);

                            utils.logInfo(`$rabbitmq (createChannel): retrying 60 seconds`);

                            this.retries += 1;

                            setTimeout(() => {
                                this.start();
                            }, 60000);

                        });

                        utils.logInfo(`$rabbitmq (createChannel): channel created`);
                    });
            })
            .catch((err: Error) => {
                utils.logError(`$rabbitmq (createChannel): error`, {
                    location: '$rabbitmq (createChannel)',
                    message: err.message,
                    name: err.name,
                    retries: this.retries,
                });

                utils.logInfo(`$rabbitmq (createChannel): retrying 60 seconds`);

                this.retries += 1;
                setTimeout(() => {
                    this.start();
                }, 60000);
            });
    }

    public logMsg = (mqlog: any) => {

        if (this.channel && this.operational) {
            this.channel.publish(
                this.exchange,
                mqlog.channel,
                new Buffer(JSON.stringify(mqlog.log)),
                { persistent: true },
            );
        }
    }

    public sentMail = (mqlog: IMQMailBase) => {

        console.info(`$rabbitmq (sentMail): sending mail to MQ`);

        if (this.channel && this.operational) {
            this.channel.publish(
                this.exchange,
                mqlog.channel,
                new Buffer(JSON.stringify(mqlog.mail)),
                { persistent: true },
            );
        }
    }

    public logESApi = (mqlog: IMQESApiBase) => {
        this.mqPublish(mqlog);
    }

    public logESActApi = (mqlog: IMQESActApiBase) => {
        this.mqPublish(mqlog);
    }

    public mqPublish = (mqlog: IMQESActApiBase | IMQESApiBase) => {

        console.info(`$rabbitmq (mqPublish): sending mail to MQ`);

        if (this.channel && this.operational) {
            this.channel.publish(
                this.exchange,
                mqlog.channel,
                new Buffer(JSON.stringify(mqlog.api)),
                { persistent: true },
            );
        }
    }

    public logErr = (msg: any) => {

        if (this.channel && this.operational) {

            this.channel.publish(
                this.exchange,
                'core.error.log',
                new Buffer(msg),
                { persistent: true },
            );

            console.info(' [>] Sent %s', msg);
        }
    }

}

export interface IMQ {
    logErr: (msg: any) => void;
    logMsg: (msg: IMQESBase) => void;
}

export const mq: RabbitMQ = new RabbitMQ();
