
import { _db2 } from '../../common/db2.functions';
import { IInsertReqRelated } from '../../common/interfaces';
import { utils } from '../../common/utils';
import { ILog } from '../../common/rabbitmq';

class ReqRelatedSqlFunctions {
    constructor() {/* */ }

    public insertReqRelated = async (body: IInsertReqRelated): Promise<any> =>
        new Promise((resolve, reject) => {
            const hrstart: any = process.hrtime();
            const guid: any = utils.guid();
            const sql: string = `INSERT INTO ${utils.Env.k8_db2schema}.ESW#REQ_RELATED (ID, REQID, RELTYPE, VALUE,RELTYPEDISPLAY, FLAG)
               VALUES (?,?,?,?,?,?)`;
            let params: any;
            params = [
                guid,
                body.reqid,
                body.reltype,
                body.reltypevalue,
                body.reltypedisplay,
                '1',
            ];

            const log: ILog = this.makeLog(body);
            log.action = 'related';
            log.event = 'insert';
            log.message = 'Inserting Reqrelated Item';

            _db2
                .runInsert(sql, params, log)
                .then((results) => {
                    utils.logInfo('$reqrelated (insertReqRelated):', 'insertReqRequest', process.hrtime(hrstart));
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

}
export const reqRelatedSQL: ReqRelatedSqlFunctions = new ReqRelatedSqlFunctions();
