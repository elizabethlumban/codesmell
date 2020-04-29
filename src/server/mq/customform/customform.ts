import { _couche } from '../../common/cloudant.functions';
import { utils } from '../../common/utils';
import { IInsertDocs, IIShopzBody } from '../../common/interfaces';
import { docsSQL } from '../docs/docs';

class CustomFormFunctions {
    constructor() {/* */ }

    public insertShopzCustomForm = (params: any, reqID: string, from: string[], subj: string, htmlbody: string,
    msgtransid: string): Promise<any> =>

        new Promise(async (resolve, reject) => {
            let form: any;

                form = {
                    _id: params.ID,
                    additionalinfoshopz: '',
                    id: params.ID,
                    template: 'esw.request.new.shopz.form',
                };

            _couche
                .insert('customform', form, params.ID)
                .then(() => {
                    return resolve();

                })
                .catch((err: Error) => {
                    return reject(err);
                });

            /** insert shopz mail in req_docs couchdb */
            const hrstart: any = process.hrtime();
            const fileid: any = _couche.guid();
            const strBody: string = `from: ${from} <br/>subject: ${subj + htmlbody}`;

            const form1: IIShopzBody = {
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
                .insert('req_docs', form1, fileid)
                .then((resp) => {
                    formdoc.id = resp;
                    formdoc.fileid = resp;

                    this
                        .toDB2(formdoc)
                        .then(() => {
                            utils.logInfo('$attach (attachEmailCloudant):', 'attachEmailCloudant', process.hrtime(hrstart));
                            resolve();
                        })
                        .catch((err: Error) => {
                            reject(err);
                        });
                })
                .catch((err) => {
                   return reject(err);
                });

            })

        public toDB2: any = (formdoc: IInsertDocs): any =>

        new Promise((resolve, reject) => {
            docsSQL
                .insertDocs(formdoc)
                .then((result) => {
                    resolve(result);
                })
                .catch((err: Error) => {
                    reject(err);
                });
        })

      public insertLMFSCustomForm = (params: any): Promise<any> =>

        new Promise(async (resolve, reject) => {
            let form: any;
                const yr: any = new Date(params.PERIOD).getFullYear().toString();
                const monthnbr: number = new Date(params.PERIOD).getMonth();
                const monthname: any = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];

                form = {
                    _id: params.ID,
                    lmfsmonth: monthname[monthnbr],
                    lmfsyear: yr,
                    template: 'esw.request.lmfs.monthly.report.form',
                };
            _couche
                .insert('customform', form, params.ID)
                .then(() => {

                   return resolve();
                })
                .catch((err: Error) => {
                   return reject(err);
                });
        })
}
export const customformfn: CustomFormFunctions = new CustomFormFunctions();
