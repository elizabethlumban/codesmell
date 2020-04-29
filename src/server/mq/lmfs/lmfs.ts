'use strcit';

import { cmrSQL } from '../lookup/cmr';
import { envOrgSQL } from '../lookup/envorg';
import * as moment from 'moment';
import { requestSQL } from '../request/request';
import { customformfn } from '../customform/customform';
import { uploadSQL } from '../docs/upload';
import { docsSQL } from '../docs/docs';
import { calculateSQL } from '../request/calculate';
import { default as each } from 'lodash-es/each';
import { IAnnotation, IInsertParam, IMail, IUpdateDocs, IUpdateRequest } from '../../common/interfaces';
import { mq } from '../../common/rabbitmq';
import { utils } from '../../common/utils';
import { _couchesmtp } from '../../common/cloudant.functions.smtp';
import { default as indexOf } from 'lodash-es/indexOf';

interface ILmfsBody {
    custNoVal: string;
    reportingPeriodVal: string;
    countryName: string;
    countryCode: string;
    machineserialno: string;
    transid: string;
    id: string;
    status: string;
    action: string; // eg .. submit to sts
    machinetypemodel?: string;
}

class Lmfs {

    public custnbr = 'Customer Number';
    public repperiod = 'Reporting Period';
    public country = 'Country Name';
    public mactype = 'Machine Serial Number';
    public macmodel = 'Machine Type and Model';

    /*tslint:disable cognitive-complexity*/
    /**
     * @param {string} body
     * @param {*} subject
     * @param {IMail} mail
     * @param {*} attachments
     * @returns {Promise<any>}
     */

    // tslint:disable-next-line:cyclomatic-complexity no-big-function
    public main = async (body: string, subject: any, msgtransid: string, mail: IMail, mailtype: string): Promise<any> => {

        const Lbody: ILmfsBody = {
            action: 'submittosts',
            countryCode: '',
            countryName: '',
            custNoVal: '',
            id: '',
            machineserialno: '',
            machinetypemodel: '',
            reportingPeriodVal: '',
            status: 'Unassigned',
            transid: msgtransid,
        };

        const wholeBody: string = body;
        let partialBody: string;
        partialBody = wholeBody.substring(wholeBody.indexOf('Customer Name'),
            wholeBody.indexOf('LMS Receipt date'));

        Lbody.custNoVal = this.parseEmail(this.custnbr, partialBody);
        Lbody.reportingPeriodVal = this.parseEmail(this.repperiod, partialBody);
        Lbody.countryName = this.parseEmail(this.country, partialBody);
        Lbody.countryCode = this.parseEmail('CC', partialBody);
        Lbody.machinetypemodel = this.parseEmail(this.macmodel, partialBody);

        Lbody.machineserialno = this.parseEmail(this.mactype, partialBody);
        const serialmodeltype: string = `${Lbody.machinetypemodel}${Lbody.machineserialno}`;
        
        const ccarray: any[] = ['702', '706', '708', '865', '866', 'FI', 'FR', 'SI', 'EG', 'GB'];
        const r_envOrg: any = (indexOf(ccarray, Lbody.countryCode) > -1)
            ? Lbody.countryCode.match(/^[0-9]+$/) === null
                ? await envOrgSQL.getCurrIsoMarketByName(Lbody.countryCode, Lbody.countryName)
                    .catch((err: Error) => this.logError(err))
                : await envOrgSQL.getCurrIsoMarketCCByName(Lbody.countryCode, Lbody.countryName)
                    .catch((err: Error) => this.logError(err))
            : Lbody.countryCode.match(/^[0-9]+$/) === null
                ? await envOrgSQL.getCurrIsoMarketByIso(Lbody.countryCode)
                    .catch((err: Error) => this.logError(err))
                : await envOrgSQL.getCurrIsoMarketByCC(Lbody.countryCode)
                    .catch((err: Error) => this.logError(err));

        const f_countryCode: string = Lbody.countryCode.match(/^[0-9]+$/) === null
            ? r_envOrg[0].ccode.trim()
            : Lbody.countryCode;

        /** get customer id and name in ${utils.Env.k8_db2schema}.ESW#CMR table */
        const r_customerName: any = await cmrSQL.queryCMR(Lbody.custNoVal, f_countryCode)
            .catch((err: Error) => this.logError(err));

        let strCustID: string;
        let strCustname: string;
        /* 2495 requirement */
        let strCMRMarket : string;
        let fMarket: string;
        if (r_customerName[0] === undefined) {
            const r_dummycustdata: any = await cmrSQL.queryCMRDummy(f_countryCode)
                .catch((err: Error) => this.logError(err));
            if (r_dummycustdata[0] === undefined) {
                strCustID = '';
                strCustname = '';
                strCMRMarket ='';
            } else {
                strCustID = r_dummycustdata[0].id;
                strCustname = r_dummycustdata[0].custname;
                strCMRMarket = r_dummycustdata[0].market;
            }
        } else {
            strCustID = r_customerName[0].id;
            strCustname = r_customerName[0].custname;
            strCMRMarket = r_customerName[0].market;
        }

     
        const t: string = moment(new Date().getTime()).format('YYMMDD');
        const reqValue: string = `ESW-R-${r_envOrg[0].iso.trim()}-${t}-${Math.floor(10000 + Math.random() * 90000)}`;

       
        const requestid: any = await requestSQL.searchReq(f_countryCode, Lbody.reportingPeriodVal, strCustID)
            .catch((err: Error) => this.logError(err));
        const a: Date = new Date();
        let t1: string = new Date(a.setDate(a.getDate() + 1)).toISOString();
        t1 = t1.replace('T', ' ');
        t1 = t1.replace('Z', '');
        const u_subj: string = this._cu(subject);
       
        let docstatus1: string;

        if (u_subj.indexOf('ON HOLD') > -1) {
            docstatus1 = 'On hold';
        } else if (u_subj.indexOf('ACCEPTED') > -1) {
            docstatus1 = 'Accepted';
        } else if (u_subj.indexOf('RESUBMITTED') > -1) {
            docstatus1 = 'Re-submitted';
        } else if (u_subj.indexOf('REJECTED') > -1) {
            docstatus1 = 'Rejected';
        } else {
            docstatus1 = 'Submitted';
        }

        /* 2495 requirement */
        if (f_countryCode === '897' || r_envOrg[0].iso === 'US') {
            fMarket = strCMRMarket;
        } else {
            fMarket = r_envOrg[0].market;
        }

        const insertParams: IInsertParam = {
            CCODE: f_countryCode,
            COUNTRY: r_envOrg[0].country,
            CURR: r_envOrg[0].curr,
            CUSTID: strCustID,
            CUSTNAME: strCustname,
            DOCSTATUS: docstatus1,
            DUEDATE: t1,
            ID: '',
            ISO: r_envOrg[0].iso,
            MACHINESERIALNO: Lbody.machineserialno,
            MARKET: fMarket,
            OWNERGR: 'STS',
            PERIOD: Lbody.reportingPeriodVal,
            RELTYPE: 'NA',
            RELTYPEDISPLAY: 'Opportunity Exemption Code',
            RELTYPEVALUE: '60 - Inventory adjustments, Evaluation, Recurring',
            REQ: reqValue,
            REQEMAIL: 'wlreport@company.com',
            REQFLAG: '',
            REQNAME: 'Wlc Supportdesk',
            REQTYPE: 'LMFS Automated Report',
            STATUS: 'Unassigned',
            SUBJECT: subject,
            TRANSID: msgtransid,
        };

        if (requestid[0] === undefined) {
            /** no request created yet for this cust no, period and country */
            const e_subj: string = this._cu(subject);
            if (e_subj.indexOf('ON HOLD') > -1) {
                insertParams.REQFLAG = 'LMS On hold';
            } else if (e_subj.indexOf('ACCEPTED') > -1) {
                insertParams.REQFLAG = 'LMS Accepted';
            } else if (e_subj.indexOf('RESUBMITTED') > -1) {
                insertParams.REQFLAG = 'LMS Re-submitted';
            } else if (e_subj.indexOf('REJECTED') > -1) {
                insertParams.REQFLAG = 'LMS Rejected';
            } else {
                insertParams.REQFLAG = 'LMS Submitted';
            }
            /** for scrt mails without any existing REQ data yet, we generate our own ID */
            // modify the subject here

            insertParams.ID = msgtransid;
            Lbody.id = insertParams.ID;

            /** For US/CANADA insert as completed */
            if (f_countryCode === '897' || f_countryCode === '649' || insertParams.ISO === 'US' || insertParams.ISO === 'CA') {
                insertParams.STATUS = 'Completed';
                insertParams.OWNERGR = 'SYSTEM';
            }

            await requestSQL
                .insertReqLMFS(insertParams, 'lmfs')
                .then(() => {
                    requestSQL
                        .insertReqUsers(insertParams.ID, insertParams.TRANSID, insertParams.REQNAME, insertParams.REQEMAIL)
                        .then(() => {
                            if (f_countryCode === '897' || f_countryCode === '649' ||
                                insertParams.ISO === 'US' || insertParams.ISO === 'CA') {
                                //`skip ES creation for US and CA
                            } else {
                                this.toMQ(Lbody);
                            }
                        })
                        .catch((err: Error) => this.logError(err));
                })
                .catch((err: Error) => this.logError(err));
            await customformfn
                .insertLMFSCustomForm(insertParams)
                .catch((err: Error) => this.logError(err));
            await uploadSQL
                .uploaddoc(mail, insertParams, mailtype)
                .catch((err: Error) => this.logError(err));

        } else {
          
            insertParams.ID = requestid[0].reqid;
           
            const requestdocid: any = await requestSQL
                .searchReqDocs(Lbody.countryName, Lbody.reportingPeriodVal, strCustID, serialmodeltype)
                .catch((err: Error) => this.logError(err));
            if (requestdocid[0] === undefined) {
               
                await uploadSQL
                    .uploaddoc(mail, insertParams, mailtype)
                    .catch((err: Error) => this.logError(err));
            } else {
                
                const updatedocparams: IUpdateDocs = {
                    id: requestdocid[0].docid,
                    reqid: requestid[0].reqid,
                    status: docstatus1,
                    transid: msgtransid,
                };
                await docsSQL.updateDocStatus(updatedocparams);
            }
            const docstatus: string[] = await calculateSQL
                .getLMFSDocs(requestid[0].reqid)
                .catch((err: Error) => this.logError(err));
            const arrReqValue: number[] = [];

            each(docstatus, (m: any) => {
                const docstatusval: string = this._cu(m.status);
                if (docstatusval === 'SUBMITTED') {
                    arrReqValue.push(5);
                } else if (docstatusval === 'ON HOLD') {
                    arrReqValue.push(2);
                } else if (docstatusval === 'REJECTED') {
                    arrReqValue.push(1);
                } else if (docstatusval === 'RE-SUBMITTED') {
                    arrReqValue.push(3);
                } else {
        
                    arrReqValue.push(4);
                }
            });

            const reqflagval: string = (Math.min(...arrReqValue) === 1)
                ? 'LMS Rejected'
                : (Math.min(...arrReqValue) === 2)
                    ? 'LMS On hold'
                    : (Math.min(...arrReqValue) === 3)
                        ? 'LMS Re-submitted'
                        : (Math.min(...arrReqValue) === 4)
                            ? 'LMS Accepted'
                            : (Math.min(...arrReqValue) === 5)
                                ? 'LMS Submmited'
                                : '';

            const updateParams: IUpdateRequest = {
                id: requestid[0].reqid,
                status: reqflagval,
                transid: msgtransid,
            };

            await calculateSQL
                .updateRequest(updateParams)
                .catch((err: Error) => this.logError(err));
        }

        let annotation: string | IAnnotation = '';
        if (mailtype === 'incoming mail') {
            annotation = {
                id: requestid[0] === undefined ? msgtransid : requestid[0].reqid,
                processed: 'MQ',
                processedat: new Date().toISOString(),
            };
        } else {
            annotation = {
                id: requestid[0] === undefined ? msgtransid : requestid[0].reqid,
                reprocessed: 'MQ',
                reprocessedat: new Date().toISOString(),
            };
        }

        await _couchesmtp
            .getDoc('smtp', msgtransid.trim())
            .then(async (couchmailbody: any) => {
                couchmailbody.processed = 'true';
                couchmailbody.annotation = annotation;
                await _couchesmtp
                    .insert('smtp', couchmailbody, msgtransid.trim())
                    .catch((err: Error) => this.logError(err));
            })
            .catch((err: Error) => {
                utils.logError(`$lmfs (_couchesmtp) : error)`, {
                    message: err.message,
                    name: `get document ${msgtransid} from smtp`,
                });
            });

        return `$lmfs (main): parsing done - reqid: ${insertParams.ID} - ti: ${msgtransid} - ${subject} `;

    }

    private logError = (err: Error) => {
        utils.logError(`$lmfs`, err);
    }

    private _cu: any = (i: string): string => {
        return i.toUpperCase();
    }

    private parseEmail = (flag: any, body: any): any => {
        let start: any;
        let end: any;
        let finalVal: any;

        if (flag === this.custnbr) {
            start = body.indexOf(this.custnbr);
            end = body.indexOf('Country');
            finalVal = body.substring(start + 25, end).trim();
        }

        if (flag === this.repperiod) {
            start = body.indexOf(this.repperiod);
            end = body.length;
            const partial: string = body.substring(start, end).trim();
            let start1: any;
            let end1: any;

            start1 = partial.indexOf(':');
            end1 = partial.indexOf('-');
            const partial1: string = partial.substring(start1, end1).trim();
            finalVal = utils.normalizeDate(partial1);
        }

        if (flag === this.country) {
            start = body.indexOf(this.country);
            end = body.indexOf('Submitter address');
            finalVal = body.substring(start + 23, end).trim();
        }

        if (flag === 'CC') {
            start = body.indexOf('Country Number');
            end = body.indexOf(this.custnbr);
            finalVal = body.substring(start + 23, end).trim();
        }

        if (flag === this.custnbr) {
            start = body.indexOf(this.custnbr);
            end = body.indexOf(this.country);
            finalVal = body.substring(start + 24, end).trim();
        }

        if (flag === this.mactype) {
            start = body.indexOf(this.mactype);
            end = body.indexOf('Machine Type and Model');
            finalVal = body.substring(start + 24, end).trim();
        }
        if (flag === this.macmodel) {
            start = body.indexOf(this.macmodel);
            end = body.indexOf('Reporting Period');
            finalVal = body.substring(start + 24, end).trim();
        }

        return finalVal;
    }

    private toMQ = (body: ILmfsBody): void => {

        mq.logESApi({
            api: {
                action: body.action,
                esnumber: undefined,
                func: 'statuschange',
                id: body.id,
                previous_owner: undefined,
                status: body.status,
            },
            channel: 'action.esapi',
        });
    }

}

export const lmfs: Lmfs = new Lmfs();
