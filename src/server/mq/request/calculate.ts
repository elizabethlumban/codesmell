import { _db2 } from '../../common/db2.functions';
import { IUpdateRequest } from '../../common/interfaces';
import { utils } from '../../common/utils';
import { ILog } from '../../common/rabbitmq';

class CalculateSqlFunctions {
    constructor() {/* */ }

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
            refid: body.id,
            status: 200,
            transid: body.transid,
            type: 'request',
        };
    }
    public updateRequest = (updateParams: IUpdateRequest): Promise<any> =>

        new Promise(async (resolve, reject) => {
            const sql: string = `UPDATE ${utils.Env.k8_db2schema}.ESW#REQ SET
            REQFLAG = '${updateParams.status}' WHERE id='${updateParams.id}'`;
            let params: any;
            params = [
                updateParams.status,
                updateParams.id,
            ];

            const log: ILog = this.makeLog(updateParams);
            log.action = 'update request';
            log.event = 'update';
            log.message = `Update request REQFLAG into '${updateParams.status}'`;

            const [err] = await utils.top(_db2.runStatement(sql, params, { ...log }));
                                if (err) {
                                    return reject({
                                        ...err,
                                        location: '$calculate.ts (updateRequest)', //params.location,
                                        params,
                                        reason:  `UPDATE of REQFLAG to '${updateParams.status}' FROM REQ failed`,
                                        sql,
                            });
                        }

            resolve();

        })

    public getLMFSDocs: any = (reqid: string): Promise<any> =>
        new Promise(async (resolve, reject) => {
            const sql: string = `SELECT D.STATUS AS STATUS  FROM ${utils.Env.k8_db2schema}.ESW#REQ R,
            ${utils.Env.k8_db2schema}.ESW#REQ_DOCS D WHERE
             R.ID  = D.REQID AND D.REQID = '${reqid}'`;
            const fields: any[] = ['STATUS'];
            const [err, results] = await utils.top(_db2.runQuery(sql, fields));

            if (err) {
                return reject({
                     ...err,
                            location: '$calculate.ts (getCurrIsoMarketCCByName)', //params.location,
                            params: fields,
                            reason:  'SELECT STATUS from ESW#REQ failed',
                            sql,
                });
            }

            return resolve(results);
        })

}
export const calculateSQL: CalculateSqlFunctions = new CalculateSqlFunctions();
