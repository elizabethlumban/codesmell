import { _couche } from '../../common/cloudant.functions';
import { utils } from '../../common/utils';
import { IInsertDocs, IIShopzBody } from '../../common/interfaces';
import { ILog } from '../../common/rabbitmq';
// tslint:disable-next-line:no-commented-code
// import { _db2 } from '../../common/db2.functions';

class AttachEmailCloudant {

    public attachEmailCloudant = (reqID: string, from: string[], subj: string, htmlbody: string, msgtransid: string): Promise<any> =>

        new Promise(async (resolve, reject) => {

            const fileid: any = _couche.guid();
            const strBody: string = `from: ${from} <br/>subject: ${subj + htmlbody}`;
            const form: IIShopzBody = {
                attachmenttype: 'Shopz',
                editor: strBody,
                key: 'Shopz',
                reqid: reqID,
            };
            let t1: string = new Date().toISOString();
            t1 = t1.replace('T', ' ');
            t1 = t1.replace('Z', '');

            const formdoc: IInsertDocs = {
                attachmenttype: 'Shopz Order',
                contenttype: 'text/html; charset=UTF-8',
                created: t1,
                createdby: 'Shopz',
                description: subj,
                doctype: 0,
                download: 0,
                file: `shopz-${fileid}.html`,
                fileid: '',
                id: '',
                reqid: reqID,
                status: 'Received',
                template: 'esw.request.shopz.preview.dialog',
                transid: msgtransid,
            };

            _couche
                .insert('req_docs', form, fileid)
                .then(async (resp) => {
                    formdoc.id = resp;
                    formdoc.fileid = resp;

                    return resolve(formdoc);
                })
                .catch((err: Error) => {
                    return reject({
                          ...err,
                            location: '$attach.ts (attachEmailCloudant)', //params.location,
                            reason:  'Insert to req_docs couch db failed',
                    });
            });

        })

    public makeLog = (body: any): ILog => {

        return {
            action: '',
            created: utils.normalizedDate(),
            createdby: 'abc@company.com',
            createdbyname: 'ES ESW Service',
            event: utils.guid(),
            id: utils.guid(),
            logdb: body.logdb || 'REQ',
            message: '',
            refid: body.reqid,
            status: 200,
            transid: body.transid,
            type: 'request',
        };
    }

}

export const attachEmail: AttachEmailCloudant = new AttachEmailCloudant();
