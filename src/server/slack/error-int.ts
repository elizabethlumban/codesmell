/**
 * @module slack-error-int
 */

import * as request from 'request';
import { utils } from '../common/utils';

export const slackMsgInt: (m: any) => void = (m: any): void => { // sending to slack

    const icon_emoji: string = ':innocent:';

    let sl: string;

    if (typeof (m) !== 'string') {
        try {
            sl = JSON.stringify(m, undefined, 2);
        } catch (err) {
            sl = m;
        }
    } else {
        sl = m;
    }

    const options: any = {
        body: {
            channel: utils.slack.internal.channel,
            icon_emoji,
            text: sl || 'Undefined Message',
            username: `${utils.slack.internal.username} on ${utils.Env.k8_system_name}`,
        },
        json: true,
        method: 'POST',
        url: utils.slack.url,
    };

    const callback: any = (err: Error, _res: any, body: any): void => {
        if (err) {
            return utils.logError(`$slack-int (slackMsgInt): error`, err);
        }
        utils.logInfo(`$slack-int (slackMsgInt): ev: 'slack confirmation' ${body}`);
    };

    if (utils.Env.k8_system !== 'development') {
        request(options, callback);
    } else {
        utils.logWarn(`$slack.error-int: You are on local so the following slack error will not be sent : \n `, m);
    }
};
