import { _db2 } from '../../common/db2.functions';
import { IBodyFile, IInsertDocs, IUploadForm } from '../../common/interfaces';
import { _couche } from '../../common/cloudant.functions';
import { db2doc, ICosFile, ICosFileMeta, ICosReturn } from './db2.doc';
import * as moment from 'moment';
import { utils } from '../../common/utils';
import { ILog } from '../../common/rabbitmq';
import { docsSQL } from '../docs/docs';

class UploadSqlFunctions {
    constructor() {/* */ }
    /**
     *  This will insert data at FILES_B, FILES_C, DOCUMENTATION couchdb, DOCS db2 table
     */

    public uploaddoc = (msgObj: any, req: any, mailtype: string): Promise<any> =>

        new Promise(async (resolve, reject) => {
            let neweditor: string | IBodyFile = msgObj.html;
            const docid: string = utils.guid();
            const filecid: string = utils.guid();

            req.files = {};
            const t1: any = moment.utc(new Date().getTime()).format('YYYY-MM-DD HH:mm:ss');
            // tslint:disable-next-line:no-commented-code
            const f_mailtype: string = 'incoming mail';

            try {

                const meta: ICosFileMeta = {
                    created: t1,
                    reqid: req.ID,
                    transid: req.TRANSID,
                };

                const texttobeuploaded: any = mailtype === f_mailtype ? msgObj.html : msgObj.body.html;
                const upload: ICosFile = {
                    Body: texttobeuploaded,
                    MetaData: meta,
                    fileid: filecid,
                };

                const metaReturn: ICosReturn = await db2doc.cosUpload(upload);

                neweditor = {
                    fileid: metaReturn.fileid,
                    location: 'COS',
                };
            } catch (err) {
                return reject(err);
            }

            try {

                const meta: ICosFileMeta = {
                    created: t1,
                    reqid: req.ID,
                    transid: req.TRANSID,
                };

                const filename: string = mailtype === f_mailtype ? msgObj.attachments[0].name
                    : Object.keys(msgObj._attachments)[0];

                const filedata: any = mailtype === f_mailtype ? new Buffer(msgObj.attachments[0].data, 'binary')
                : new Buffer(msgObj._attachments[filename].data, 'base64');

                const f_contenttype: string = mailtype === f_mailtype ? msgObj.attachments[0].content_type
                    : msgObj._attachments[filename].content_type;

                const upload: ICosFile = {
                    Body: filedata,
                    MetaData: meta,
                    fileid: utils.guid(),
                };

                const metaReturn: ICosReturn = await db2doc.cosUpload(upload);

                req.files[filename] = {
                    bucketname: `es-esw-req-docs-${utils.Env.k8_system}`,
                    content_type: f_contenttype,
                    fileid: metaReturn.fileid, // await toFilenet(body, fi),
                    location: 'COS',
                    meta: metaReturn,
                };

            } catch (err) {

                return reject({
                    ...err,
                    location: '$upload.ts (uploaddoc)',
                    reason: 'Insert to COS failed',
                    transid: req.TRANSID,
                });
            }

            const u_subj: string = _db2._cu(req.SUBJECT);
            const ibmconfi: string = `Confidential:`;
            let subj1: string;
            if (u_subj.indexOf('ON HOLD') > -1) {
                subj1 = (req.SUBJECT).replace('SCRT or FCRT Report has been put on hold for System', '');
            } else if (u_subj.indexOf('ACCEPTED') > -1) {
                subj1 = (req.SUBJECT).replace('SCRT or FCRT Report has been accepted for System', '');
            } else if (u_subj.indexOf('RESUBMITTED') > -1) {
                subj1 = (req.SUBJECT).replace('SCRT or FCRT Report has been resubmitted for System', '');
            } else if (u_subj.indexOf('REJECTED') > -1) {
                subj1 = (req.SUBJECT).replace('SCRT or FCRT Report has been rejected for System', '');
            } else {
                subj1 = (req.SUBJECT).replace('SCRT or FCRT Report has been submitted for System', '');
            }
            const subj2: string = ibmconfi.concat(subj1);

            const form: IUploadForm = {
                _id: docid,
                ['content-type']: req['content-type'],
                attachmenttype: 'LMFS Report',
                content: {},
                created: t1,
                createdby: 'LMFS',
                description: subj2,
                editor: neweditor,
                files: req.files,
                form: 'doc',
                machineserialno: req.MACHINESERIALNO,
                reqid: req.ID,
            };
            const formdoc: IInsertDocs = {
                attachmenttype: 'LMFS Report',
                contenttype: 'text/html; charset=UTF-8',
                created: t1,
                createdby: 'LMFS',
                description: subj2,
                doctype: 0,
                download: 0,
                file: '',
                fileid: docid,
                id: docid,
                machineserialno: req.MACHINESERIALNO,
                reqid: req.ID,
                status: req.DOCSTATUS,
                template: 'esw.request.document.preview.dialog',
                transid: req.TRANSID,
            };
            _couche.insert('req_docs', form, docid)
                .then(() => {
                    this
                        .toDB2(formdoc)
                        .then(() => {
                            resolve();
                        })
                        .catch((err: Error) => {
                            reject(err);
                        });

                })
                .catch((err: Error) => {
                    return reject({
                        ...err,
                        location: '$upload.ts (uploaddoc)',
                        reason: 'Insert to REQ_DOCS failed',
                        transid: req.TRANSID,
                    });
                });

                return resolve();

        })

  public toDB2: any = (formdoc: IInsertDocs): any =>

        new Promise(async (resolve, reject) => {
            docsSQL
                .insertDocs(formdoc)
                .then((result) => {
                    resolve(result);
                })
                .catch((err: Error) => {
                    reject(err);
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

export const uploadSQL: UploadSqlFunctions = new UploadSqlFunctions();
