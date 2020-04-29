
import { shopz } from './shopz/shopz';
import { lmfs } from './lmfs/lmfs';
import { default as includes } from 'lodash-es/includes';
import { slackMsgSmtp } from '../slack/slack';
import { utils } from '../common/utils';
import { IMail } from '../common/interfaces';

const timeout: any = (ms: number): Promise<any> => {
    const time: number = 1000 * (Math.floor((Math.random() * ms) + 1));
    utils.logInfo(`$handle (Timeout): timeout for ${time} seconds`);

    return new Promise((resolve) => setTimeout(resolve, time));
};

class Handle {
    constructor() { /**/
    }

    public main = async (mail: any, mailtype: string) => {

        // tslint:disable-next-line:no-commented-code
        const f_mailtype: string = 'incoming mail';

        const f_mail: IMail = (mailtype === f_mailtype)
            ? mail
            : mail.doc;
        const msgbody: string = (mailtype === f_mailtype)
            ? mail.text
            : mail.doc.body.text;
        const msgsubject: string = (mailtype === f_mailtype)
            ? mail.subject
            : mail.doc.body.subject;
        const msgtransid: string = (mailtype === f_mailtype)
            ? mail.transid
            : mail.doc.body.transid;
        const f_subject: string = (mailtype === f_mailtype)
            ? mail.subject
            : mail.doc.body.subject;

        if (includes(f_subject, 'SCRT')) {

            await timeout(60);

            await lmfs.main(msgbody, msgsubject, msgtransid, f_mail, mailtype)
                .then((response: string) => {
                    utils.logInfo(`$handle (SCRT): ${utils.time()} - ${response}`);
                    slackMsgSmtp(`👌 $handle (SCRT): ${utils.time()} - ${response}`);
                });

        } else {

            const f_from: string[] = (mailtype === f_mailtype)
                ? mail.from[0]
                : mail.doc.body.from[0];
            const f_html: string = (mailtype === f_mailtype)
                ? mail.html
                : mail.doc.body.html;

            await shopz.main(msgbody, msgsubject, msgtransid, f_mail, mailtype, f_from, f_html)
                .then((response: string) => {
                    utils.logInfo(`$handle (shopz): ${response}`);
                    slackMsgSmtp(`👌 $handle (shopz): ${response}`);
                });
        }
    }

}

export const handle: Handle = new Handle();
