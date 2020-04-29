/**
 * This module provides interfaces to slack, There us one generic
 * and also an intenal one and external reporting user errors.
 * @module slack
 */
/** Do not Remove this line (tsdoc) */

import * as request from 'request';
import { utils } from '../common/utils';

export const slackMsg: (m: any, smtp?: boolean) => void = (m: any, smtp?: boolean): void => { // sending to slack

    const icon_emoji: string = ':innocent:';

    const logid: string = m && typeof (m) !== 'string' && m.logid
        ? m.logid
        : utils.guid();

    let sl: string;

    if (typeof (m) !== 'string') {
        try {
            m.logid = logid;
            sl = JSON.stringify(m, undefined, 2);
        } catch (err) {
            sl = m;
        }
    } else {
        sl = m;
    }

    const options: any = {
        body: {
            channel: smtp
                ? utils.slack.smtp.channel
                : utils.slack.deploy.channel,
            icon_emoji,
            text: sl || 'Undefined Message',
            username: `${utils.slack.deploy.username} on ${utils.Env.k8_system_name}`,
        },
        json: true,
        method: 'POST',
        url: utils.slack.url,
    };

    const callback: any = (err: Error, _res: any, body: any): void => {
        if (err) {
            return utils.logError('$slack: error : ', err);
        }
        utils.logInfo(`$slack (msg from ${utils.Env.k8_system_name}): ${body}`);
    };

    if (utils.Env.k8_system !== 'development') {
        request(options, callback);
    }
};

export const slackMsgSmtp: (m: any) => void = (m: any): void => { // sending to slack

    slackMsg(m, true);

};
