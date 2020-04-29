import { Channel, connect, Connection, Message, Replies } from 'amqplib/callback_api';
import { Credentials } from './cfenv';
import { default as each } from 'lodash-es/each';
import { default as last } from 'lodash-es/last';
import { handle } from '../mq/handle';
import { slackMsgSmtp } from '../slack/slack';
import { IMail } from './interfaces';
import { utils } from './utils';

const url: any = require('url');

export class RabbitMQCompose {

    private exchange = 'topics';
    private routingKey = ['#.mail'];
    private rabbitmqurl: string = Credentials('rabbitmq_compose').url;
    private parsedurl: { hostname: string } = url.parse(this.rabbitmqurl);

    constructor() {

        this.startRabbit();

    }

    private startRabbit: () => void = () => {

        connect(`${this.rabbitmqurl}?heartbeat=60`, { servername: this.parsedurl.hostname }, (err: Error, conn: Connection) => {

            if (err) {
                utils.logError(`$rabbitmq.compose (connect): error:`, err);

                return setTimeout(this.startRabbit, 5000);
            }

            conn.on('error', (connErr: Error) => {
                if (connErr.message !== 'Connection closing') {
                    return utils.logError(`$rabbitmq.compose (connect) on error`, connErr);
                }
            });

            conn.on('close', () => {
                utils.logInfo(`$rabbitmq.compose (connect) reconnecting`);

                return setTimeout(this.startRabbit, 5000);
            });

            conn.createChannel((connerr: Error, channel: Channel) => {

                if (connerr) {
                    utils.logError(`$rabbitmq.compose (createChannel) error:`, err);

                    return;
                }

                channel.assertExchange(
                    this.exchange,
                    'topic',
                    { durable: false },
                );

                channel.assertQueue(this.exchange, { exclusive: false }, (assErr: Error, q: Replies.AssertQueue) => {

                    if (assErr) {

                        return utils.logError(`$rabbitmq.compose - ${utils.time()} - error connecting no exchange`, assErr);

                    }
                    utils.logInfo(`$rabbitmq.compose (createChannel): ${utils.time()} - ready for messages`);
                    slackMsgSmtp(`$rabbitmq.compose - ${utils.time()} - SMTP ready for messages`);

                    each(this.routingKey, (key: string) => this.handle(channel, q, key));

                });
            });
        });
    }

    private handle = (channel: Channel, q: Replies.AssertQueue, key: string) => {

        channel.bindQueue(q.queue, this.exchange, key);

        channel.consume(q.queue, (msg: Message) => {

            utils.logInfo(`$rabbitmq.compose - ${utils.time()} : (consume) message for service: ${msg.fields.routingKey}`);

            /** t are the log event functions
             * the function is found from the channel
             * It's the second parameter
             * The first parameter is the database
             */

            const paramsArr: any = msg.fields.routingKey.split('.');

            if (last(paramsArr) === 'mail') {
                const mail: IMail = JSON.parse(msg.content.toString('utf8'));
                handle.main(mail, 'incoming mail');
                utils.logInfo(`$rabbitmq.compose - ${utils.time()} : incomming mail - ti: ${mail.transid} - ${mail.subject}`);
                slackMsgSmtp(`📩 $rabbitmq.compose - ${utils.time()} : incomming mail - ti: ${mail.transid} - ${mail.subject}`);

            }

        }, { noAck: true });
    }
}
