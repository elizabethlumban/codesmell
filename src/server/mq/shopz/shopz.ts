
import { cmrSQL } from '../lookup/cmr';
import { envOrgSQL } from '../lookup/envorg';
import { requestSQL } from '../request/request';
import { attachEmail } from '../attachment/attach';
import { customformfn } from '../customform/customform';
import { IAdd, IAnnotation, IInsertParamShopz, IIShopzParse, IMail } from '../../common/interfaces';
import { slackMsgSmtp } from '../../slack/slack';
import { ILog, IMQESApiBase, mq } from '../../common/rabbitmq';
import { utils } from '../../common/utils';
import { default as indexOf } from 'lodash-es/indexOf';
import { _couchesmtp } from '../../common/cloudant.functions.smtp';
import { sendMail } from './notifications';
import { EMailTemplates } from './mail.options';
import { default as each } from 'lodash-es/each';

interface IShopzBody {
    transid: string;
    id: string;
    subject: string;
    status: string;
    action: string; // eg .. submit to sts
}

export interface ICustData {
    custname: string;
    id: string;
    custkey: string;
    market: string;
}

// tslint:disable:no-big-function
class Shopz {

    public custnbr = 'Customer Number';

    public main = async (
        body: string,
        subject: string,
        mailtransid: string,
        mail: IMail,
        mailtype: string,
        from: string[],
        htmlbody: string): Promise<any> => {

        if (!body || subject === '') {
            return this.garbage(mailtransid)
                .then(() => {
                    return `Incoming Garbage - reqid/ti: ${mailtransid} - ${subject}`;
                });
        }

        const mailbody: IIShopzParse = {
            countryCode: '',
            countryName: '',
            countryVal: '',
            custArrDate: '',
            custNoVal: '',
            ownerGroup: '',
            reqValue: '',
            requestStatus: '',
            requestType: '',
        };

        const shopzbodytoMQ: IShopzBody = {
            action: 'submittosts',
            id: '',
            status: 'Unassigned',
            subject,
            transid: mailtransid,
        };
        const strActionReq: string = 'Action Required';
        if (subject.indexOf('COPY') !== -1) {
            mailbody.requestStatus = 'Completed';
            mailbody.ownerGroup = 'SYSTEM';
            mailbody.requestType = 'Shopz Entitled Order';
        } else {
            if (subject.indexOf(strActionReq) !== -1) {
                mailbody.requestStatus = 'Unassigned';
                mailbody.ownerGroup = 'STS';
                mailbody.requestType = 'Shopz Order';
            } else {
                mailbody.requestStatus = 'Action Required';
                mailbody.ownerGroup = 'SYSTEM';
                mailbody.requestType = 'Shopz Order';
            }
        }

        const partialbody: string = body.substring(body.indexOf('Order Information'),
            body.indexOf('Hardware Systems selected by User'));
        /** parse countrval more 706 - France */
        mailbody.countryVal = this.parseEmail('Country', partialbody);
        /** countryCode = 706 */
        mailbody.countryCode = mailbody.countryVal.substring(0, mailbody.countryVal.indexOf('-')).trim();
        /** countryName = France
         *  adding a fix for israel who uses for shopz a different ccode
         */

        if (mailbody.countryCode === '724') {
            /** check if the subject contains parenthesis for Germany */
            if (subject.indexOf('(') > -1) {
                let ch_start: number;
                let ch_end: number;

                ch_start = subject.indexOf('Order');
                ch_end = subject.indexOf('(');
                mailbody.reqValue = subject.substring(ch_start + 5, ch_end).trim();
            } else {
                mailbody.reqValue = subject.substring((subject.indexOf('Order') + 5), subject.indexOf('from'));
            }
        } else {
            mailbody.reqValue = subject.substring((subject.indexOf('Order') + 5), subject.indexOf('from'));
        }

        mailbody.countryName = mailbody.countryVal.substring((mailbody.countryVal.indexOf('-') + 1), mailbody.countryVal.length).trim();
        /** custArrDate or Due Date = April 20, 2017 */

        mailbody.custArrDate = this.parseEmail('Customer Arrival Date', partialbody);
        /** customer number */
        mailbody.custNoVal = this.parseEmail('Customer Number', partialbody);

        /** customer name retrieved from CMR table in ESW#CMR */
        const r_customerName: ICustData[] = await cmrSQL
            .queryCMR(mailbody.custNoVal, mailbody.countryCode)
            .catch((err: Error) => {
                this.logError(err);

                return err;
            });

        let strCustID: string;
        let strCustname: string;
        let strCustkey: string;
        let strCMRMarket: string;
        let sendmailflag: string = 'false';

        if (!r_customerName[0]) {
            const r_dummycustdata: ICustData[] = await cmrSQL.queryCMRDummy(mailbody.countryCode)
                .catch((err: Error) => this.logError(err));
            if (r_dummycustdata[0] === undefined) {
                strCustID = '';
                strCustname = '';
                strCustkey = '';
                strCMRMarket ='';
            } else {
                strCustID = r_dummycustdata[0].id;
                strCustname = r_dummycustdata[0].custname;
                strCustkey = r_dummycustdata[0].custkey;
                strCMRMarket = r_dummycustdata[0].market;
            }
        } else {
            strCustID = r_customerName[0].id;
            strCustname = r_customerName[0].custname;
            strCustkey = r_customerName[0].custkey;
            strCMRMarket = r_customerName[0].market;
        }

        /** currency retrieved from ${utils.Env.k8_db2schema}.ENV#ORG */
        let strISO: string;
        let strMarket: string;
        let strCurr: string;
        let strCountryName: string;
        /* 2495 requirement */
        let fMarket: string;

        if (mailbody.countryCode !== '') {
            const ccarray: any[] = ['702', '706', '708', '865', '866'];
            const r_envOrg: any[] = (indexOf(ccarray, mailbody.countryCode) > -1) ?

                await envOrgSQL
                    .getCurrIsoMarketCCByName(mailbody.countryCode, mailbody.countryName)
                    .catch((err: Error) => this.logError(err)) :
                await envOrgSQL
                    .getCurrIsoMarketByCC(mailbody.countryCode)
                    .catch((err: Error) => this.logError(err));

            if (r_envOrg[0] === undefined) {
                strISO = '';
                strMarket = '';
                strCurr = '';
                strCountryName = '';
            } else {
                strISO = r_envOrg[0].iso;
                strMarket = r_envOrg[0].market;
                strCurr = r_envOrg[0].curr;
                strCountryName = r_envOrg[0].country;
            }
        } else {
            strISO = '';
            strMarket = '';
            strCurr = '';
            strCountryName = '';
        }
         /* 2495 requirement if country = US, use MARKET from ESW#CMR table*/
        if (mailbody.countryCode === '897') {
            fMarket = strCMRMarket;
        } else {
            fMarket = strMarket;
        }

        const insertParams: IInsertParamShopz = {
            CCODE: mailbody.countryCode,
            COUNTRY: strCountryName,
            CURR: strCurr,
            CUSTID: strCustID,
            CUSTNAME: strCustname,
            DUEDATE: mailbody.custArrDate,
            ID: mailtransid,
            ISO: strISO,
            MARKET: fMarket,
            OWNERGR: mailbody.ownerGroup,
            RELTYPE: 'NA',
            RELTYPEDISPLAY: 'Opportunity Exemption Code',
            RELTYPEVALUE: '92 - System Default',
            REQ: mailbody.reqValue,
            REQEMAIL: 'abc@company.com',
            REQNAME: 'ES ESW Service',
            REQTYPE: mailbody.requestType,
            STATUS: mailbody.requestStatus,
            SUBJECT: subject,
            TRANSID: mailtransid,
        };

        shopzbodytoMQ.id = insertParams.ID;
        /** Germany cc = 724 */
        if (mailbody.countryCode === '724') {
            const requestid: any = await requestSQL.searchShopzReq(mailbody.reqValue)
                .catch((err: Error) => this.logError(err));
            /** Germany shopz not yet created */
            if (requestid[0] === undefined) {
                try {
                    await requestSQL.insertRequest(insertParams);
                } catch (error) {
                    return this.logError(error);
                }
                try {
                    await requestSQL.insertReqUsers(insertParams.ID, insertParams.TRANSID, insertParams.REQNAME, insertParams.REQEMAIL);
                } catch (error) {
                    return this.logError(error);
                }
                try {
                    await customformfn.insertShopzCustomForm(insertParams, insertParams.TRANSID, from, subject, htmlbody, mailtransid);
                } catch (error) {
                    return this.logError(error);
                }
                try {
                    await attachEmail.attachEmailCloudant(mailtransid, from, subject, htmlbody, mailtransid);
                } catch (error) {
                    return this.logError(error);
                }
                sendmailflag = 'true';
            }
        } else {
            try {
                await requestSQL.insertRequest(insertParams);
            } catch (error) {
                return this.logError(error);
            }
            try {
                await requestSQL.insertReqUsers(insertParams.ID, insertParams.TRANSID, insertParams.REQNAME, insertParams.REQEMAIL);
            } catch (error) {
                return this.logError(error);
            }
            try {
                await customformfn.insertShopzCustomForm(insertParams, insertParams.TRANSID, from, subject, htmlbody, mailtransid);
            } catch (error) {
                return this.logError(error);
            }
            try {
                await attachEmail.attachEmailCloudant(mailtransid, from, subject, htmlbody, mailtransid);
            } catch (error) {
                return this.logError(error);
            }
            if (subject.indexOf(strActionReq) !== -1) {
                return this.toMQ(shopzbodytoMQ);
            }
            sendmailflag = 'true';
        }
        /*tslint:disable-next-line:cyclomatic-complexity*/
        let annotation: string | IAnnotation = '';
        if (mailtype === 'incoming mail') {
            annotation = {
                id: mailtransid.trim(),
                processed: 'MQ',
                processedat: new Date().toISOString(),
            };

            slackMsgSmtp(`$shopz (incoming mail) - ti: ${mailtransid.trim()} - ${subject}`);
            await _couchesmtp
                .getDoc('smtp', mailtransid.trim())
                .then(async (couchmailbody: any) => {
                    couchmailbody.processed = true;
                    couchmailbody.annotation = annotation;
                    await _couchesmtp
                        .insert('smtp', couchmailbody, mailtransid.trim())
                        .catch((err: Error) => this.logError(err));
                })
                .catch((err: Error) => {
                    utils.logError(`$shopz (_couchesmtp) : error)`, {
                        message: err.message,
                        name: `get document ${mailtransid.trim()} from smtp`,
                    });
                });

        } else {
            annotation = {
                id: mailtransid.trim(),
                reprocessed: 'MQ',
                reprocessedat: new Date().toISOString(),
            };

            slackMsgSmtp(`$shopz (reprocessing mail) - ti: ${mailtransid.trim()} - ${subject}`);
            mail.processed = 'true';
            mail.annotation = annotation;
            await _couchesmtp
                .insert('smtp', mail, mailtransid.trim())
                .catch((err: Error) => this.logError(err));

        }

        if (strCustkey !== '' && sendmailflag === 'true') {
            await cmrSQL.queryShopzFocal(strCustkey)
                .then((response) => {
                    if (response.length > 0) {
                        const recipients: any[] = [];
                        each(response, (rec: any) => {
                            recipients.push(rec.contactemail);
                        });

                        const unique_recipients: string[] = recipients.filter((item: any, pos: number) => {
                            return recipients.indexOf(item) === pos;
                        });
                        const sellermailbody: IAdd = {
                            cc: '',
                            country: strCountryName,
                            custname: strCustname,
                            custnbr: mailbody.custNoVal,
                            id: insertParams.ID,
                            mailTemplate: EMailTemplates.shopzmail,
                            recipients: '',
                            shopzmailbody: htmlbody,
                            subject,
                            transid: mailtransid,
                        };
                        sellermailbody.recipients = unique_recipients.join(', ');

                        const log: ILog = this.makeLog(insertParams);

                        log.logdb = 'REQ';
                        log.type = 'request';
                        log.action = 'newrequest';
                        log.event = 'Send email';
                        log.message = `Sent email to ShopZ Focal  ${sellermailbody.recipients}`;

                        sendMail(sellermailbody, { ...log });
                    }
                })
                .catch((err: Error) => this.logError(err));
        }

        return `parsing done - reqid/ti: ${insertParams.ID} - ${subject}`;

    }

    private logError = (err: Error) => {
        utils.logError(`$shopz (logError): error)`, err);
    }

    private makeLog = (body: any): ILog => {

        return {
            action: '',
            created: utils.normalizedDate(),
            createdby: 'abc@company.com',
            createdbyname: 'ES ESW Service',
            event: utils.guid(),
            id: utils.guid(),
            logdb: 'REQ',
            message: '',
            refid: body.ID,
            status: 200,
            transid: body.TRANSID,
            type: 'request',
        };
    }

    private parseEmail = (flag: string, body: string): any => {
        let start: number;
        let end: number;
        let finalVal: any;
        let partialbody: string;

        if (flag === 'Country') {
            start = body.indexOf('Country');
            end = body.indexOf(this.custnbr);
            finalVal = body.substring(start + 8, end).trim();
        }
        if (flag === this.custnbr) {
            start = body.indexOf(this.custnbr);
            end = body.indexOf('ShopzSeries Order Id');
            finalVal = body.substring(start + 16, end).trim();
        }
        if (flag === 'Customer Arrival Date') {
            start = body.indexOf('Customer Requested Arrival date');
            partialbody = body.substring(start + 32, start + 53).trim();

            finalVal = partialbody.indexOf('-') !== -1
                ? partialbody.substring(0, partialbody.indexOf('-'))
                : partialbody;
        }

        return finalVal;
    }
    private toMQ = (body: IShopzBody): void => {

        const esapi: IMQESApiBase = {
            api: {
                action: body.action,
                esnumber: undefined,
                func: 'statuschange',
                id: body.id,
                previous_owner: undefined,
                status: body.status,
            },
            channel: 'action.esapi',
        };
        mq.logESApi(esapi);
    }

    private garbage = async (mailtransid: string): Promise<any> =>

        new Promise(async (resolve) => {

            await _couchesmtp
                .getDoc('smtp', mailtransid.trim())
                .then(async (couchmailbody: any) => {
                    couchmailbody.garbage = true;
                    couchmailbody.processed = true;
                    await _couchesmtp
                        .insert('smtp', couchmailbody, mailtransid.trim())
                        .catch((err: Error) => this.logError(
                            {
                                message: err.message,
                                name: `insert document ${mailtransid.trim()} from smtp`,
                            }));
                    resolve();
                })
                .catch((err: Error) => {
                    utils.logError(`$shopz (_garbage) : error)`, {
                        message: err.message,
                        name: `get document ${mailtransid.trim()} from smtp`,
                    });
                    resolve();
                });
        })

}

export const shopz: Shopz = new Shopz();
