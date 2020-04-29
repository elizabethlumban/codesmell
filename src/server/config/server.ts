import { RabbitMQCompose } from '../common/rabbitmq.compose';
import { RabbitMQSMTP } from '../common/rabbitmq.smtp';
import { slackMsg } from '../slack/slack';
import { IEnv, utils } from '../common/utils';
import { utc } from 'moment';

export class Server {

    public rmq: RabbitMQCompose;
    public cmq: RabbitMQSMTP;
    public pack: IEnv;

    constructor() {

        this.rmq = new RabbitMQCompose();
        this.cmq = new RabbitMQSMTP();
        this.pack = utils.Env;

        process
            .on('uncaughtException', (err: Error) => {
                utils.logError(`$server (uncaught): uncaughtException`, err);
            })
            .on('unhandledRejection', (reason: any, p: any) => {
                const err: any = {
                    p,
                    reason,
                };
                utils.logError(`$server (unhandledRejection)`, err);
            })
            .on('exit', (code: any) => {
                utils.logInfo(`$server (exit): fatal error, system shutting down : ${code}`);
                slackMsg(code);
                setTimeout(
                    () => { process.exit(1); }
                    , 1000);
            });

    }

    public start = () => {
        const msg: string = `😇  $app (start): ${this.pack.packname}@${this.pack.version}` +
            ` started up on ${this.pack.k8_system_name} at ${utc(new Date()).format()}` +
            ` with pid ${process.pid} (node ${process.version})`;
        console.info('\x1b[32m%s\x1b[0m', msg);
        slackMsg(msg);
    }

}
