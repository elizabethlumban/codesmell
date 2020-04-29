
import { _db2 } from '../../common/db2.functions';
import { IUpdateDocs } from '../../common/interfaces';
import { utils } from '../../common/utils';
import { ILog } from '../../common/rabbitmq';

class DocsSqlFunctions {
    constructor() {/* */ }

    public insertDocs = (paramsdocs: any): Promise<any> =>

        new Promise((resolve, reject) => {
            const hrstart: any = process.hrtime();
            const sql: string = `INSERT INTO ${utils.Env.k8_db2schema}.ESW#REQ_DOCS (ID,REQID,CREATED,CREATEDBY,
             FILE,ATTACHMENTTYPE,DESCRIPTION,"CONTENT-TYPE",FILEID,DOCTYPE,TEMPLATE,DOWNLOAD,STATUS) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`;

            const log: ILog = this.makeLog(paramsdocs);
            log.action = 'newfile';
            log.event = 'insert';

            const shopzsubj: string = paramsdocs.machineserialno === undefined
            ? paramsdocs.description
            : '';

            const shopzno: string = paramsdocs.machineserialno === undefined
            ? shopzsubj.substring((shopzsubj.indexOf('Order') + 5), shopzsubj.indexOf('from'))
            : '';

            const msglog: string = paramsdocs.machineserialno === undefined ? `new upload Order ${shopzno}`
            : `new upload - ${paramsdocs.machineserialno} - ${paramsdocs.status} `;
            log.message = msglog;

            const params: any = [
                paramsdocs.id,
                paramsdocs.reqid,
                paramsdocs.created,
                paramsdocs.createdby,
                paramsdocs.file,
                paramsdocs.attachmenttype,
                paramsdocs.description,
                paramsdocs.contenttype,
                paramsdocs.fileid,
                paramsdocs.doctype,
                paramsdocs.template,
                paramsdocs.download,
                paramsdocs.status,
                paramsdocs.transid,
            ];

            _db2
                .runInsert(sql, params, log)
                .then((results) => {
                    utils.logInfo('$docs (insertDocs):', 'insertDocs', process.hrtime(hrstart));
                    resolve(results);
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
    public updateDocStatus = async (updateParams: IUpdateDocs): Promise<any> =>

        new Promise((resolve, reject) => {
            const hrstart: any = process.hrtime();
            const sql: string = `UPDATE ${utils.Env.k8_db2schema}.ESW#REQ_DOCS
            SET STATUS = '${updateParams.status}' WHERE ID='${updateParams.id}'`;
            let params: any;
            params = [
                updateParams.status,
                updateParams.id,
            ];

            const log: ILog = this.makeLog(updateParams);
            log.action = 'documentation';
            log.event = 'update';
            log.message = `Update document STATUS into '${updateParams.status}'`;

            _db2
                .runStatement(sql, params, log)
                .then(() => {
                    utils.logInfo('$docs (updateDocStatus):', 'updateDocStatus', process.hrtime(hrstart));
                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        })

}

export const docsSQL: DocsSqlFunctions = new DocsSqlFunctions();
