//`import { EMailTemplates } from './interfaces';
import { utils } from '../../common/utils';
import { IAdd } from '../../common/interfaces';

export interface IMailElements {
    body: string;
    subject: string;
}

interface IRawParams {
    [key: string]: any;
}

export enum EMailTemplates {
    shopzmail = 'shopzMailTmpl',
}

class MailTemplates implements IRawParams {

    [k: string]: any;

    private url: string = `${utils.Env.k8_appurl}/esw/request`;

    public getTemplate: any = (template: string, body: IAdd): EMailTemplates => {

        return this[template](body);

    }

    public shopzMailTmpl: any = (body: IAdd): IMailElements => {

        return {
            body: `<p><strong style='font-size: medium;'>A new Shopz order was received and logged</strong></p>
<br/>

<span>Country: </span><span>${body.country}</span><br/>
<span>Customer Number: </span><span>${body.custnbr}</span><br/>
<span>Customer Name: </span><span>${body.custname}</span><br/>
<span>Shopz Order Number: </span><span>${body.custname}</span><br/>
<br/>
<br/>

<span>Links: </span><br/>
ESW-Main-Ref: <strong><a target="_blank" href="${this.url}/${body.id}">Click here for ESW Request</a></strong>
<br/>
<br/>
${body.shopzmailbody}

        `,
            subject: `${body.subject}`,
        };
    }
}

export const mailTemplates: MailTemplates = new MailTemplates();
