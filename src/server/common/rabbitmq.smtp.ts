import { Channel, connect, Connection, Message, Replies } from 'amqplib/callback_api';
import { Credentials } from './cfenv';
import { default as each } from 'lodash-es/each';
import { default as last } from 'lodash-es/last';
import { handle } from '../mq/handle';
import { slackMsg } from '../slack/slack';
import { IMail } from './interfaces';
import { utils } from './utils';

const url: any = require('url');

export class RabbitMQSMTP {
    private exchange = 'smtp';
    private routingKey = ['#.mail'];
    private rabbitmqsmtp: string = Credentials('rabbitmq').url;
    private parsedurl: { hostname: string } = url.parse(this.rabbitmqsmtp);

    constructor() {

        this.startRabbit();

    }

    private startRabbit: () => void = () => {
        connect(this.rabbitmqsmtp, { servername: this.parsedurl.hostname }, (err: Error, conn: Connection) => {

            if (err) {
                utils.logError(`$rabbitmq.smtp (connect) error:`, err);

                return;
            }

            conn.on('error', (connErr: Error) => {
                if (connErr.message !== 'Connection closing') {

                    utils.logError(`$rabbitmq.smtp (connect) error`, connErr);

                    return;
                }
            });

            conn.createChannel((connerr: Error, channel: Channel) => {

                if (connerr) {
                    utils.logError(`$rabbitmq.smtp (createChannel) error:`, err);

                    return;
                }

                channel.assertExchange(
                    this.exchange,
                    'topic',
                    { durable: false },
                );

                channel.assertQueue(this.exchange, { exclusive: false }, (assErr: Error, q: Replies.AssertQueue) => {

                    if (assErr) {

                        return utils.logError(`$rabbitmq.smtp - ${utils.time()} - error connecting no exchange`, assErr);
                    }
                    utils.logInfo(`$rabbitmq.smtp (createChannel): ${utils.time()} - ready for messages`);
                    slackMsg(`$rabbitmq.smtp - ${utils.time()} - smtp ready for messages`);

                    each(this.routingKey, (key: string) => this.handle(channel, q, key));

                });
            });
        });
    }

    private handle = (channel: Channel, q: Replies.AssertQueue, key: string) => {

        channel.bindQueue(q.queue, this.exchange, key);

        channel.consume(q.queue, (msg: Message) => {

            utils.logInfo(`$rabbitmq.smtp - ${utils.time()} : (consume) message for service: ${msg.fields.routingKey}`);

            /** t are the log event functions
             * the function is found from the channel
             * It's the second parameter
             * The first parameter is the database
             */

            const paramsArr: any = msg.fields.routingKey.split('.');

            if (last(paramsArr) === 'mail') {

                const mail: IMail = JSON.parse(msg.content.toString('utf8'));
                handle.main(mail, 'reprocessing mail');
                const doc: any = mail.doc;
                if (doc) {
                    utils.logInfo(`$rabbitmq.smtp - ${utils.time()} : new mail transid: ${doc.body.transid} - ${doc.body.subject}`);
                    slackMsg(`$rabbitmq.smtp - ${utils.time()} : new mail transid: ${doc.body.transid} - ${doc.body.subject}`);

                }

            }

        }, { noAck: true });
    }
}
