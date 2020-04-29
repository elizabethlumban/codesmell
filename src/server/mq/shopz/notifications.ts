import { ILog, IMQMailBase, mq } from '../../common/rabbitmq';
import { IMailElements, mailTemplates } from './mail.options';
import { IAdd, IMail, IShopzSellerMail } from '../../common/interfaces';

const toMQ: any = (mail: IMail): void => {
    const mqm: IMQMailBase = {
        channel: 'comment.mail',
        mail,
    };

    mq.sentMail(mqm);
};

const getReceipients: any = (recipients: string): any[] => {

    if (!recipients || recipients === '') {
        return [];
    }

    return recipients.split(', ');

};

export const sendMail: (body: IAdd, log: ILog) => void = (body: IAdd, log: ILog): void => {

    const templ: IMailElements = mailTemplates.getTemplate(body.mailTemplate, body);

    const newlog: ILog = {
        ...log,
        message: `to: ${body.recipients} - cc: ${body.cc}`,
    };

    const mail: IShopzSellerMail = {
        cc: getReceipients(body.cc),
        contact: 'abc@company.com>',
        log: newlog,
        recipients: getReceipients(body.recipients),
        subject: templ.subject,
        template: 'standard.mail',
        transid: body.transid,
        values: {
            body: templ.body.replace(/(?:\r\n|\r|\n)/g, ''),
        },
    };

    toMQ(mail);
};
